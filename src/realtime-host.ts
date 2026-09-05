/** dsh-asr-voice — host 半区：实时转写会话注册表 + SSE 下行（I3 交付）。
 * 纯管道：浏览器 PCM 上行（POST audio）→ RealtimeProvider 接缝 → SSE 下行
 * （GET events）。`sid` 由 **host 铸造**（crypto.randomUUID），客户端只拿到
 * 不透明 token，无法伪造会话；4 条 exact 路由全部过 `isTrusted` 信任围栏。
 * 会话生命周期：
 * - POST   /api/asr-voice/realtime/session   → { ok, sid }（建会话）
 * - POST   /api/asr-voice/realtime/audio     → { ok }（PCM 上行，?sid=…）
 * - GET    /api/asr-voice/realtime/events    → SSE 下行（?sid=…）
 * - POST   /api/asr-voice/realtime/close     → { ok }（关会话，?sid=…）
 * 4 条路由路径互不相同：webserver 的 register 对重复 (kind, path) 直接抛错，
 * 同一路径挂两个 method 会撞——所以关闭走独立的 /close 路径而不是 /session 的 DELETE。
 * SSE 背压：Node `res.write()` 返回 false 表示内核缓冲已满（下行慢于上行）。
 * 这里不无限缓冲——partial（可丢的中间结果）coalesce 成最新一条，final /
 * speech-stopped（不可丢的回合边界）**必须**最终送达。drain 后按序冲刷。
 * 每会话一条 SSE（浏览器是单一消费者）；SSE 断开 / 会话超时都会拆掉整个会话，
 * 防止麦克风数据在 host 侧无人认领地堆积。
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { guardRoute, readRawBody, sendJson } from './http.ts';
import type { RealtimeProviderConnection, RealtimeProviderEvent } from './realtime-provider.ts';

/** 单次 PCM 上行体上限（16k int16 ≈ 每 100ms 3200B；40ms 帧 1280B）。 */
const MAX_PCM_BYTES = 4 * 1024 * 1024

/** 会话空闲上限（毫秒）：没有数据进来也没有消费者，自动拆会话防泄漏。 */
const DEFAULT_SESSION_IDLE_MS = 10 * 60 * 1000

/** webserver register 的最小面（与 transcribe.ts 的 register 参数同构）。 */
export type RealtimeRouteRegister = (def: {
  kind: 'exact'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
}) => () => void

/** SSE 下行通道：带背压（partial 原位合并 / final 必达）与心跳。 */
export class SseChannel {
  private backedUp = false
  /** 背压期间排队待发的事件（有界）。partial 会被更新的 partial 原位替换（coalesce），
   *  final/speech-stopped 追加保序——drain 后按序冲刷，**任何 final 都不丢**。
   *  此前单一 coalesce 槽会被后续 final/partial 直接覆盖：背压中连续两句收口时，
   *  第一句的 final 被第二句顶掉，客户端永远只看到 partial（缺句）。 */
  private pending: RealtimeProviderEvent[] = []
  /** pending 上限：与会话侧 pending 缓冲同量级；极端积压（客户端几乎不读）时丢最旧
   *  事件降级，会话最终由 disconnect / 空闲守卫拆除。 */
  private static readonly PENDING_CAP = 64
  private closed = false
  /** 空闲心跳：防止中间代理把长连接掐掉（部分代理 30s 无数据即断）。 */
  private heartbeat: ReturnType<typeof setInterval> | null = null
  private readonly onDisconnect: (() => void) | null
  /** 当前挂着的 drain 监听（close/disconnect 时移除，避免监听随响应滞留到 GC）。 */
  private drainHandler: (() => void) | null = null

  constructor(
    private readonly res: ServerResponse,
    opts: { heartbeatMs?: number; onDisconnect?: () => void } = {},
  ) {
    this.onDisconnect = opts.onDisconnect ?? null
    const hb = opts.heartbeatMs ?? 15_000
    if (hb > 0) {
      this.heartbeat = setInterval(() => {
        if (!this.closed && !this.backedUp) {
          try { this.res.write(': ping\n\n') } catch { /* socket gone */ }
        }
      }, hb)
    }
    res.on('close', this.disconnect)
  }

  /** 排入一条事件：空闲直写；背压时 partial 原位合并、final/stopped 排队保序。
   *  首次直写即命中背压（write 返回 false）的事件也会入队，等 drain 后再送——
   *  不能只把 backedUp 挂上就让事件丢失。 */
  enqueue(ev: RealtimeProviderEvent): void {
    if (this.closed) return
    if (ev.type === 'partial') {
      // partial 可丢：只保留同句最新一条。队尾是 partial 就原位替换（不后移，
      // 保持与后续 final 的相对顺序——否则迟到的 partial 会排到 final 之后，
      // 客户端先收 final 再收旧 partial，字幕倒退）。
      const tail = this.pending[this.pending.length - 1]
      if (tail?.type === 'partial') {
        this.pending[this.pending.length - 1] = ev
        return
      }
      this.pending.push(ev)
    } else {
      // final / speech-stopped 不可丢：先丢队尾的 partial——它们是刚收口这句的
      // 预览，final 到达后冗余（且晚到的 final 若排在 partial 之后会让客户端
      // 字幕倒退）；再入队保序，任何 final 都最终送达。
      while (this.pending.length > 0) {
        const tail = this.pending[this.pending.length - 1]
        if (tail === undefined || tail.type !== 'partial') break
        this.pending.pop()
      }
      this.pending.push(ev)
    }
    // 有界：极端积压（客户端几乎不读）时丢最旧一条降级，防无界增长
    // （会话最终由 disconnect / 空闲守卫拆除）。
    if (this.pending.length > SseChannel.PENDING_CAP) this.pending.shift()
    // 空闲（无背压）才立即冲刷：背压中只入队等 drain 恢复后按序送出。
    if (!this.backedUp) this.flush()
  }

  /** 按序冲刷排队的事件（final 不丢、partial 保最新）；缓冲满则挂 drain 等恢复。 */
  private flush(): void {
    if (this.closed) return
    while (this.pending.length > 0) {
      const ev = this.pending[0]
      const payload = `data: ${JSON.stringify(ev)}\n\n`
      let ok = false
      try {
        ok = this.res.write(payload)
      } catch {
        this.disconnect()
        return
      }
      if (!ok) {
        this.backedUp = true
        this.armDrain()
        return
      }
      this.pending.shift()
    }
    this.backedUp = false
  }

  /** 挂一次 drain 监听（同一时间只挂一个；close/disconnect 时摘掉）。 */
  private armDrain(): void {
    if (this.drainHandler !== null) return
    this.drainHandler = () => {
      this.drainHandler = null
      this.flush()
    }
    this.res.once('drain', this.drainHandler)
  }

  /** 结束下行（幂等）：清心跳、断 close/drain 监听。 */
  close(): void {
    if (this.closed) return
    this.closed = true
    if (this.heartbeat !== null) clearInterval(this.heartbeat)
    this.heartbeat = null
    this.res.removeListener('close', this.disconnect)
    if (this.drainHandler !== null) this.res.removeListener('drain', this.drainHandler)
    this.drainHandler = null
    try { this.res.end() } catch { /* already ended */ }
  }

  private readonly disconnect = (): void => {
    if (this.closed) return
    this.closed = true
    if (this.heartbeat !== null) clearInterval(this.heartbeat)
    this.heartbeat = null
    this.res.removeListener('close', this.disconnect)
    if (this.drainHandler !== null) this.res.removeListener('drain', this.drainHandler)
    this.drainHandler = null
    this.onDisconnect?.()
  }
}

/** 一个实时转写会话。 */
interface RealtimeSession {
  sid: string
  /** 上游 provider 连接（I3 = 假 provider；I5 = 真云端）。 */
  conn: RealtimeProviderConnection
  /** SSE 下行（单消费者；未挂起为 null）。 */
  sse: SseChannel | null
  /** SSE 未挂起时缓冲的上游事件（有界，防止上行先于下行的丢事件）。 */
  pending: RealtimeProviderEvent[]
  /** 最近一次活动时间戳（空闲超时判定）。 */
  lastActive: number
  /** 空闲清理定时器。 */
  idleTimer: ReturnType<typeof setTimeout> | null
}

/** RealtimeHost 构造参数（依赖注入，便于单测）。 */
export interface RealtimeHostOptions {
  /** 每次建会话时创建一条 provider 连接。 */
  createProvider(): Promise<RealtimeProviderConnection> | RealtimeProviderConnection
  /** 会话空闲超时（毫秒，默认 10 分钟）。 */
  idleMs?: number
  /** SSE 心跳间隔（毫秒，默认 15s）。 */
  heartbeatMs?: number
  /** 现在的时间（毫秒，测试注入）。 */
  now?: () => number
}

/** 实时转写会话注册表 + 路由。 */
export class RealtimeHost {
  private readonly sessions = new Map<string, RealtimeSession>()
  private readonly opts: Required<Pick<RealtimeHostOptions, 'idleMs' | 'heartbeatMs' | 'now'>>
  private readonly createProvider: RealtimeHostOptions['createProvider']

  constructor(options: RealtimeHostOptions) {
    this.createProvider = options.createProvider
    this.opts = {
      idleMs: options.idleMs ?? DEFAULT_SESSION_IDLE_MS,
      heartbeatMs: options.heartbeatMs ?? 15_000,
      now: options.now ?? Date.now,
    }
  }

  /** 铸造新会话：host 生成 sid，建 provider 连接。 */
  async createSession(): Promise<{ sid: string }> {
    const sid = randomUUID()
    const conn = await this.createProvider()
    const session: RealtimeSession = { sid, conn, sse: null, pending: [], lastActive: this.opts.now(), idleTimer: null }
    // provider 事件统一走同一个收口：无 SSE 时缓冲（有界），挂上后冲刷。
    conn.onEvent = (ev) => {
      const s = this.sessions.get(sid)
      if (s === undefined) return
      if (s.sse !== null) { s.sse.enqueue(ev); return }
      s.pending.push(ev)
      if (s.pending.length > 64) s.pending.shift()
    }
    this.sessions.set(sid, session)
    this.armIdle(sid)
    return { sid }
  }

/** 空闲守卫：到点复查——期间有任何上行/下行活动会走 refreshIdle 重挂， 真正空闲满 idleMs 才拆会话防泄漏。 */
  private armIdle(sid: string): void {
    const s = this.sessions.get(sid)
    if (s === undefined) return
    if (s.idleTimer !== null) clearTimeout(s.idleTimer)
    s.idleTimer = setTimeout(() => {
      const cur = this.sessions.get(sid)
      if (cur === undefined) return
      const idle = this.opts.now() - cur.lastActive
      if (idle >= this.opts.idleMs) this.closeSession(sid)
      else this.armIdle(sid)
    }, this.opts.idleMs)
  }

  /** 刷新空闲计时（每次上行/下行活动调用）。 */
  private refreshIdle(sid: string): void {
    const s = this.sessions.get(sid)
    if (s === undefined) return
    s.lastActive = this.opts.now()
    this.armIdle(sid)
  }

  /** 上行 PCM（16k int16 LE）到指定会话。会话不存在返回 false。 */
  feedAudio(sid: string, pcm: Uint8Array): boolean {
    const s = this.sessions.get(sid)
    if (s === undefined) return false
    this.refreshIdle(sid)
    s.conn.send(pcm)
    return true
  }

  /** 挂起 SSE 下行（单消费者）。会话不存在 / 已有下行返回 false。 */
  attachSse(sid: string, res: ServerResponse): boolean {
    const s = this.sessions.get(sid)
    if (s === undefined || s.sse !== null) return false
    this.refreshIdle(sid)
    const channel = new SseChannel(res, {
      heartbeatMs: this.opts.heartbeatMs,
      onDisconnect: () => this.closeSession(sid),
    })
    s.sse = channel
    // 冲刷挂 SSE 前缓冲的上游事件（上行先于下行的部分不丢）。
    if (s.pending.length > 0) {
      for (const ev of s.pending) channel.enqueue(ev)
      s.pending = []
    }
    return true
  }

  /** 关闭会话：拆 provider、拆 SSE、清定时器（幂等）。 */
  closeSession(sid: string): void {
    const s = this.sessions.get(sid)
    if (s === undefined) return
    this.sessions.delete(sid)
    if (s.idleTimer !== null) clearTimeout(s.idleTimer)
    s.idleTimer = null
    s.sse?.close()
    s.sse = null
    s.conn.onEvent = null
    try { s.conn.close() } catch { /* noop */ }
  }

  /** 会话是否存活（供测试/诊断）。 */
  hasSession(sid: string): boolean {
    return this.sessions.has(sid)
  }

/** 注册 4 条 exact 路由（全部过 isTrusted）。 @returns 全部路由的 disposer（由 ctx.effect 挂载/回收）。 */
  registerRoutes(register: RealtimeRouteRegister): () => void {
    const disposers = [
      register({
        kind: 'exact',
        path: '/api/asr-voice/realtime/session',
        handler: async (req: IncomingMessage, res: ServerResponse) => {
          const denied = guardRoute(req);
          if (denied !== null) return sendJson(res, denied.status, denied.payload);
          try {
            const { sid } = await this.createSession();
            return sendJson(res, 200, { ok: true, sid });
          } catch (error) {
            return sendJson(res, 502, { ok: false, reason: error instanceof Error ? error.message : String(error) });
          }
        },
      }),
      register({
        kind: 'exact',
        path: '/api/asr-voice/realtime/audio',
        handler: async (req: IncomingMessage, res: ServerResponse) => {
          const denied = guardRoute(req);
          if (denied !== null) return sendJson(res, denied.status, denied.payload);
          const sid = sidOf(req);
          if (sid === '') return sendJson(res, 400, { ok: false, reason: 'missing sid' });
          try {
            const pcm = await readRawBody(req, MAX_PCM_BYTES);
            if (pcm.length === 0) return sendJson(res, 400, { ok: false, reason: 'empty audio body' });
            if (!this.feedAudio(sid, pcm)) return sendJson(res, 404, { ok: false, reason: 'no such session' });
            return sendJson(res, 200, { ok: true });
          } catch (error) {
            return sendJson(res, 400, { ok: false, reason: error instanceof Error ? error.message : String(error) });
          }
        },
      }),
      register({
        kind: 'exact',
        path: '/api/asr-voice/realtime/events',
        handler: async (req: IncomingMessage, res: ServerResponse) => {
          const denied = guardRoute(req, ['GET']);
          if (denied !== null) return sendJson(res, denied.status, denied.payload);
          const sid = sidOf(req);
          if (sid === '') return sendJson(res, 400, { ok: false, reason: 'missing sid' });
          if (!this.hasSession(sid)) return sendJson(res, 404, { ok: false, reason: 'no such session' });
          // SSE：先把头写出去（背压/断连交给 SseChannel），再挂会话。
          res.writeHead(200, {
            'content-type': 'text/event-stream; charset=utf-8',
            'cache-control': 'no-cache, no-store',
            'connection': 'keep-alive',
            'x-accel-buffering': 'no',
          });
          res.flushHeaders();
          if (!this.attachSse(sid, res)) {
            // 已有下行消费者（或会话刚被拆）：本连接直接收掉。
            res.end();
          }
        },
      }),
      register({
        kind: 'exact',
        path: '/api/asr-voice/realtime/close',
        handler: async (req: IncomingMessage, res: ServerResponse) => {
          const denied = guardRoute(req);
          if (denied !== null) return sendJson(res, denied.status, denied.payload);
          const sid = sidOf(req);
          if (sid === '') return sendJson(res, 400, { ok: false, reason: 'missing sid' });
          this.closeSession(sid);
          return sendJson(res, 200, { ok: true });
        },
      }),
    ];
    return () => { for (const dispose of disposers) dispose() };
  }
}

/** 从查询串取 sid（缺省返回空串）。 */
function sidOf(req: IncomingMessage): string {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const sid = url.searchParams.get('sid') ?? '';
  return sid.trim();
}
