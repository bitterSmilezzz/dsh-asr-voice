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
 * 两道兜底（都在 host 侧，不信客户端的自觉）：同时存活会话数上限（8）、单会话绝对 TTL
 * （默认 10 分钟，取 settings `realtime.maxSessionMs`）——客户端也会自停，但页面卡死时
 * 不会发停止请求，云端付费 WS 与心跳 interval 就再没人回收。
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { guardRoute, readRawBody, sendJson, statusOfBodyError } from './http.ts';
import type { RealtimeProviderConnection, RealtimeProviderEvent } from './realtime-provider.ts';

/** 单次 PCM 上行体上限（16k int16 ≈ 每 100ms 3200B；40ms 帧 1280B）。 */
const MAX_PCM_BYTES = 4 * 1024 * 1024

/** 会话空闲上限（毫秒）：没有数据进来也没有消费者，自动拆会话防泄漏。 */
const DEFAULT_SESSION_IDLE_MS = 10 * 60 * 1000

/** 同时存活会话数上限：每个会话 = 1 条 SSE 心跳 interval + 1 条云端付费 WS（按分钟计费），
 *  而 createSession 此前只 randomUUID + set，没有任何数量限制——一个页面刷循环就能开出
 *  任意多条云端连接。8 条足够「多标签页各开一场实时对话」的真实用法。 */
const MAX_SESSIONS = 8

/** 会话绝对上限（毫秒）：与 settings `realtime.maxSessionMs` 的默认值一致（10 分钟）。
 *  客户端也按同一上限自停，但那只是 UI 层的礼貌——页面卡死/被系统挂起时不会发停止请求，
 *  云端付费 WS 与心跳 interval 就永远不回收（见 refreshIdle 的续命问题）。host 必须自己兜底。 */
const DEFAULT_MAX_SESSION_MS = 600_000

/** 空闲定时器重挂的最小间隔（毫秒）：上行是 40ms 一帧，每帧 clearTimeout+setTimeout
 *  等于每秒重挂 25 次（纯浪费，且让 timer 在 event loop 里持续抖动）。节流不影响正确性：
 *  定时器到点会复查 lastActive，真空闲满一个窗口才拆会话。 */
const IDLE_REARM_MIN_MS = 1_000

/** 上游终态报错后的收尾宽限期（毫秒）：错误帧入队后给它这段时间送达客户端（SSE 若正
 *  背压则等 drain 冲刷），到点无条件拆会话。设短值即可——客户端收到错误帧后自己会走
 *  failNow → /close；这个宽限只是「客户端没反应」时的兜底，不是正常路径。 */
const ERROR_LINGER_MS = 5_000

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
   *  命中背压的那一条**已经写出**（`write` 返回 false 只是「别再写了」，不是「没写」），
   *  所以队列只兜住背压期间新到的事件，等 drain 恢复后按序送出。 */
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
    // 有界：极端积压（客户端几乎不读）时降级防无界增长（会话最终由 disconnect /
    // 空闲守卫拆除）。降级顺序不能破坏「final 必达」契约：先丢队尾 partial（可丢的
    // 中间结果，final 到达后冗余），只有整队都是 final（不可丢的回合边界）才丢最旧
    // 一条——新来的事件绝不顶掉已入队的 final。
    if (this.pending.length > SseChannel.PENDING_CAP) {
      while (this.pending.length > SseChannel.PENDING_CAP) {
        const tail = this.pending[this.pending.length - 1]
        if (tail === undefined || tail.type !== 'partial') break
        this.pending.pop()
      }
      if (this.pending.length > SseChannel.PENDING_CAP) this.pending.shift()
    }
    // 空闲（无背压）才立即冲刷：背压中只入队等 drain 恢复后按序送出。
    if (!this.backedUp) this.flush()
  }

  /** 按序冲刷排队的事件（final 不丢、partial 保最新）；缓冲满则挂 drain 等恢复。
   *  **`write()` 返回 false 只表示内核缓冲已超高水位，事件本身已被接受并会送出**——
   *  因此出队与返回值无关：先出队再据返回值置背压标志。早先「返回 false 就不出队」的
   *  写法会让同一条事件在 drain 后被再写一遍（partial 重放无害，final 重放会让客户端
   *  把同一个回合提交两次）。 */
  private flush(): void {
    if (this.closed || this.backedUp) return
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
      this.pending.shift()
      if (!ok) {
        this.backedUp = true
        this.armDrain()
        return
      }
    }
    this.backedUp = false
  }

  /** 挂一次 drain 监听（同一时间只挂一个；close/disconnect 时摘掉）。 */
  private armDrain(): void {
    if (this.drainHandler !== null) return
    this.drainHandler = () => {
      this.drainHandler = null
      // drain = 内核缓冲已回落到水位之下：先解除背压态，flush 才会真的往下写
      //（flush 自身对背压态早退，避免在背压中反复重试）。
      this.backedUp = false
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

/** 建会话失败（容量已满）：自带 HTTP 状态码，会话路由据此回 503（可重试）而不是 502
 *  （上游故障）。其余建会话失败（provider 连不上）仍是 502。 */
export class RealtimeSessionError extends Error {
  readonly status = 503 as const
  constructor(message: string) {
    super(message)
    this.name = 'RealtimeSessionError'
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
  /** 上次重挂空闲定时器的时刻（重挂节流用，见 IDLE_REARM_MIN_MS）。 */
  idleArmedAt: number
  /** 会话创建时刻（绝对 TTL 判定）。 */
  startedAt: number
  /** 绝对 TTL 定时器（到点无条件拆会话，不看是否有活动）。 */
  ttlTimer: ReturnType<typeof setTimeout> | null
  /** 上游是否已给出**终态**报错（连接已死）。置位后不再接受上行、不再刷新空闲计时，
   *  只等 ERROR_LINGER_MS 到点拆会话。 */
  errored: boolean
}

/** RealtimeHost 构造参数（依赖注入，便于单测）。 */
export interface RealtimeHostOptions {
  /** 每次建会话时创建一条 provider 连接。 */
  createProvider(): Promise<RealtimeProviderConnection> | RealtimeProviderConnection
  /** 会话空闲超时（毫秒，默认 10 分钟）。 */
  idleMs?: number
  /** SSE 心跳间隔（毫秒，默认 15s）。 */
  heartbeatMs?: number
  /** 上游终态报错后的收尾宽限期（毫秒，默认 5s）。测试注入小值以确定性覆盖拆除路径。 */
  errorLingerMs?: number
  /** 同时存活会话上限（默认 8）；超出时 createSession 抛 {@link RealtimeSessionError}。 */
  maxSessions?: number
  /** 单会话绝对上限（毫秒，默认 10 分钟）；非正数 = 不设上限。传函数则每次建会话现读
   *  （settings 可热改，见 src/index.ts 的注入）。 */
  maxSessionMs?: number | (() => number)
  /** 现在的时间（毫秒，测试注入）。 */
  now?: () => number
}

/** 实时转写会话注册表 + 路由。 */
export class RealtimeHost {
  private readonly sessions = new Map<string, RealtimeSession>()
  private readonly opts: Required<Pick<RealtimeHostOptions, 'idleMs' | 'heartbeatMs' | 'errorLingerMs' | 'maxSessions' | 'now'>>
  private readonly createProvider: RealtimeHostOptions['createProvider']
  /** 绝对 TTL 的取值入口（函数则现读，便于 settings 热改）。 */
  private readonly maxSessionMsOf: () => number

  constructor(options: RealtimeHostOptions) {
    this.createProvider = options.createProvider
    this.opts = {
      idleMs: options.idleMs ?? DEFAULT_SESSION_IDLE_MS,
      heartbeatMs: options.heartbeatMs ?? 15_000,
      errorLingerMs: options.errorLingerMs ?? ERROR_LINGER_MS,
      maxSessions: options.maxSessions ?? MAX_SESSIONS,
      now: options.now ?? Date.now,
    }
    const maxSessionMs = options.maxSessionMs ?? DEFAULT_MAX_SESSION_MS
    this.maxSessionMsOf = typeof maxSessionMs === 'function' ? maxSessionMs : () => maxSessionMs
  }

  /** 铸造新会话：host 生成 sid，建 provider 连接。 */
  async createSession(): Promise<{ sid: string }> {
    // 容量检查放在建 provider 连接**之前**：超限时不该先开一条云端付费 WS 再拒绝。
    if (this.sessions.size >= this.opts.maxSessions) {
      throw new RealtimeSessionError(`too many realtime sessions (max ${this.opts.maxSessions})`)
    }
    const sid = randomUUID()
    const conn = await this.createProvider()
    const startedAt = this.opts.now()
    const session: RealtimeSession = {
      sid, conn, sse: null, pending: [], lastActive: startedAt, idleTimer: null,
      idleArmedAt: startedAt, startedAt, ttlTimer: null, errored: false,
    }
    // provider 事件统一走同一个收口：无 SSE 时缓冲（有界），挂上后冲刷。
    conn.onEvent = (ev) => {
      const s = this.sessions.get(sid)
      if (s === undefined) return
      if (s.sse !== null) {
        s.sse.enqueue(ev)
      } else {
        s.pending.push(ev)
        if (s.pending.length > 64) s.pending.shift()
      }
      // 终态报错（连接已死）才收尾：错误帧先入队（无 SSE 时留缓冲，等 SSE 挂上补送），
      // 再进入宽限拆除。非终态错误（如单条转写失败）不动会话——连接还活着，后续回合
      // 照常，拆掉等于用户说错一句就掐掉整场对话。注意这个判定必须在「SSE 已挂」分支
      // 之外：SSE 挂着才是常态，放在分支里等于永不收尾。
      if (ev.type === 'error' && ev.fatal !== false) this.armErrorTeardown(sid)
    }
    this.sessions.set(sid, session)
    this.armIdle(sid)
    this.armTtl(sid)
    return { sid }
  }

  /** 绝对 TTL：到点**无条件**拆会话（不看有没有活动）。会话是「一次对话」而非常驻资源：
   *  只要持续上行 PCM，空闲守卫就永远等不到过期（客户端每帧都在续命），云端 WS 按分钟
   *  计费地开着。TTL 取值在建会话时现读（settings 热改立刻对新会话生效）。 */
  private armTtl(sid: string): void {
    const ms = this.maxSessionMsOf()
    if (!(ms > 0)) return // 非正数 = 显式关闭绝对上限
    const s = this.sessions.get(sid)
    if (s === undefined) return
    s.ttlTimer = setTimeout(() => this.closeSession(sid), ms)
  }

  /** 上游终态报错后的收尾：标记会话已终结 + 把空闲窗口收紧到 ERROR_LINGER_MS。
   *  修的是「僵尸会话」：此前 provider 报错后 host 不拆会话，客户端仍在按 40ms 一帧
   *  上行 PCM，每帧 `feedAudio` → `refreshIdle` 都把 lastActive 顶到现在——死连接的
   *  会话因此永远等不到空闲过期，SSE 一直挂着、麦克风一直开。 */
  private armErrorTeardown(sid: string): void {
    const s = this.sessions.get(sid)
    if (s === undefined || s.errored) return
    s.errored = true
    s.lastActive = this.opts.now()
    this.armIdle(sid, this.opts.errorLingerMs)
  }

/** 空闲守卫：到点复查——期间有任何上行/下行活动会走 refreshIdle 重挂， 真正空闲满 windowMs 才拆会话防泄漏（默认 idleMs；上游终态报错后用更短的收尾宽限）。 */
  private armIdle(sid: string, windowMs: number = this.opts.idleMs): void {
    const s = this.sessions.get(sid)
    if (s === undefined) return
    if (s.idleTimer !== null) clearTimeout(s.idleTimer)
    s.idleArmedAt = this.opts.now()
    s.idleTimer = setTimeout(() => {
      const cur = this.sessions.get(sid)
      if (cur === undefined) return
      const idle = this.opts.now() - cur.lastActive
      if (idle >= windowMs) this.closeSession(sid)
      else this.armIdle(sid, windowMs)
    }, windowMs)
  }

  /** 刷新空闲计时（每次上行/下行活动调用）。已终结的会话不续命——否则死连接被
   *  客户端的持续上行"续命"，永远到不了过期点。 */
  private refreshIdle(sid: string): void {
    const s = this.sessions.get(sid)
    if (s === undefined || s.errored) return
    const now = this.opts.now()
    s.lastActive = now
    // 重挂节流（见 IDLE_REARM_MIN_MS）：上行是 40ms 一帧，每帧重挂定时器纯属浪费。
    // lastActive 每帧都更新，所以节流只推迟「定时器重挂」，不推迟过期判定本身。
    if (now - s.idleArmedAt < IDLE_REARM_MIN_MS) return
    this.armIdle(sid)
  }

  /** 上行 PCM（16k int16 LE）到指定会话。会话不存在**或上游已终态报错**返回 false
   *  （路由据此回 404，客户端停止上行）。 */
  feedAudio(sid: string, pcm: Uint8Array): boolean {
    const s = this.sessions.get(sid)
    if (s === undefined || s.errored) return false
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

  /** 关闭会话：拆 provider、拆 SSE、清定时器（幂等）。
   *  时序说明（**刻意不改**）：这里先摘掉事件汇（`conn.onEvent = null`）再 `conn.close()`，
   *  而 provider（如 realtime-dashscope.ts）的 close 会发 session.finish 并保留 3s 宽限
   *  （CLOSE_GRACE_MS）等上游在途 final——那条 final 到达时事件汇已摘，host 侧收不到任何
   *  事件（客户端 stop 时本就丢弃事件，所以当前无功能损失）。若将来要「收尾取最后一句」，
   *  必须调换顺序：先 conn.close()、宽限结束后再摘事件汇。 */
  closeSession(sid: string): void {
    const s = this.sessions.get(sid)
    if (s === undefined) return
    this.sessions.delete(sid)
    if (s.idleTimer !== null) clearTimeout(s.idleTimer)
    s.idleTimer = null
    if (s.ttlTimer !== null) clearTimeout(s.ttlTimer)
    s.ttlTimer = null
    s.sse?.close()
    s.sse = null
    s.conn.onEvent = null
    try { s.conn.close() } catch { /* noop */ }
  }

  /** 会话是否存活（供测试/诊断）。 */
  hasSession(sid: string): boolean {
    return this.sessions.has(sid)
  }

  /** 当前存活会话数（供测试/诊断）。 */
  sessionCount(): number {
    return this.sessions.size
  }

  /** 释放全部会话（插件卸载/热重载时由 fiber disposer 调用）：逐个 closeSession
   *  （幂等），SSE 心跳、idle timer、provider 连接全部随之释放。 */
  dispose(): void {
    for (const sid of [...this.sessions.keys()]) this.closeSession(sid)
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
            // 容量已满 = 503（重试有意义，不是上游故障）；其余（provider 连不上等）仍按 502。
            const status = error instanceof RealtimeSessionError ? error.status : 502;
            return sendJson(res, status, { ok: false, reason: error instanceof Error ? error.message : String(error) });
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
            // 超限/超时是请求侧问题（413/408），其余（含 sid 不存在）仍按 400 口径。
            return sendJson(res, statusOfBodyError(error, 400), { ok: false, reason: error instanceof Error ? error.message : String(error) });
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
