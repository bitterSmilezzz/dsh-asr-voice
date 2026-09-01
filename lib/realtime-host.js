/**
 * dsh-asr-voice — host 半区：实时转写会话注册表 + SSE 下行（I3 交付）。
 *
 * 纯管道：浏览器 PCM 上行（POST audio）→ RealtimeProvider 接缝 → SSE 下行
 * （GET events）。`sid` 由 **host 铸造**（crypto.randomUUID），客户端只拿到
 * 不透明 token，无法伪造会话；4 条 exact 路由全部过 `isTrusted` 信任围栏。
 *
 * 会话生命周期：
 *   - POST   /api/asr-voice/realtime/session   → { ok, sid }（建会话）
 *   - POST   /api/asr-voice/realtime/audio     → { ok }（PCM 上行，?sid=…）
 *   - GET    /api/asr-voice/realtime/events    → SSE 下行（?sid=…）
 *   - POST   /api/asr-voice/realtime/close     → { ok }（关会话，?sid=…）
 *
 * 4 条路由路径互不相同：webserver 的 register 对重复 (kind, path) 直接抛错，
 * 同一路径挂两个 method 会撞——所以关闭走独立的 /close 路径而不是 /session 的 DELETE。
 * SSE 背压：Node `res.write()` 返回 false 表示内核缓冲已满（下行慢于上行）。
 * 这里不无限缓冲——partial（可丢的中间结果）coalesce 成最新一条，final /
 * speech-stopped（不可丢的回合边界）**必须**最终送达。drain 后按序冲刷。
 *
 * 每会话一条 SSE（浏览器是单一消费者）；SSE 断开 / 会话超时都会拆掉整个会话，
 * 防止麦克风数据在 host 侧无人认领地堆积。
 */
import { randomUUID } from 'node:crypto';
import { isTrusted, readRawBody, sendJson } from "./http.js";
/** 单次 PCM 上行体上限（16k int16 ≈ 每 100ms 3200B；40ms 帧 1280B）。 */
const MAX_PCM_BYTES = 4 * 1024 * 1024;
/** 会话空闲上限（毫秒）：没有数据进来也没有消费者，自动拆会话防泄漏。 */
const DEFAULT_SESSION_IDLE_MS = 10 * 60 * 1000;
/** SSE 下行通道：带背压（partial coalesce / final 必达）与心跳。 */
export class SseChannel {
    res;
    backedUp = false;
    /** 背压期间只保留最新一条待发事件（final/stopped 覆盖 partial）。 */
    coalesced = null;
    closed = false;
    /** 空闲心跳：防止中间代理把长连接掐掉（部分代理 30s 无数据即断）。 */
    heartbeat = null;
    onDisconnect;
    constructor(res, opts = {}) {
        this.res = res;
        this.onDisconnect = opts.onDisconnect ?? null;
        const hb = opts.heartbeatMs ?? 15_000;
        if (hb > 0) {
            this.heartbeat = setInterval(() => {
                if (!this.closed && !this.backedUp) {
                    try {
                        this.res.write(': ping\n\n');
                    }
                    catch { /* socket gone */ }
                }
            }, hb);
        }
        res.on('close', () => this.disconnect());
    }
    /** 排入一条事件：背压时 coalesce，drain 后按序冲刷。 */
    enqueue(ev) {
        if (this.closed)
            return;
        if (this.backedUp) {
            // 背压中：partial 会被更新的 partial/final 覆盖；final/stopped 覆盖 partial。
            // 只要「最新状态」最终送达即可，中间 partial 丢了不伤正确性。
            this.coalesced = ev;
            return;
        }
        this.write(ev);
    }
    write(ev) {
        const payload = `data: ${JSON.stringify(ev)}\n\n`;
        let ok = false;
        try {
            ok = this.res.write(payload);
        }
        catch {
            this.disconnect();
            return;
        }
        if (!ok) {
            this.backedUp = true;
            this.res.once('drain', () => {
                this.backedUp = false;
                const pending = this.coalesced;
                this.coalesced = null;
                if (pending !== null)
                    this.write(pending);
            });
        }
    }
    /** 结束下行（幂等）：清心跳、断 close 监听。 */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        if (this.heartbeat !== null)
            clearInterval(this.heartbeat);
        this.heartbeat = null;
        this.res.removeListener('close', this.disconnect);
        try {
            this.res.end();
        }
        catch { /* already ended */ }
    }
    disconnect = () => {
        if (this.closed)
            return;
        this.closed = true;
        if (this.heartbeat !== null)
            clearInterval(this.heartbeat);
        this.heartbeat = null;
        this.onDisconnect?.();
    };
}
/** 实时转写会话注册表 + 路由。 */
export class RealtimeHost {
    sessions = new Map();
    opts;
    createProvider;
    constructor(options) {
        this.createProvider = options.createProvider;
        this.opts = {
            idleMs: options.idleMs ?? DEFAULT_SESSION_IDLE_MS,
            heartbeatMs: options.heartbeatMs ?? 15_000,
            now: options.now ?? Date.now,
        };
    }
    /** 铸造新会话：host 生成 sid，建 provider 连接。 */
    async createSession() {
        const sid = randomUUID();
        const conn = await this.createProvider();
        const session = { sid, conn, sse: null, pending: [], lastActive: this.opts.now(), idleTimer: null };
        // provider 事件统一走同一个收口：无 SSE 时缓冲（有界），挂上后冲刷。
        conn.onEvent = (ev) => {
            const s = this.sessions.get(sid);
            if (s === undefined)
                return;
            if (s.sse !== null) {
                s.sse.enqueue(ev);
                return;
            }
            s.pending.push(ev);
            if (s.pending.length > 64)
                s.pending.shift();
        };
        this.sessions.set(sid, session);
        // 空闲守卫：没数据、没消费者太久就拆掉，防泄漏。
        session.idleTimer = setTimeout(() => {
            const s = this.sessions.get(sid);
            if (s === undefined)
                return;
            const idle = this.opts.now() - s.lastActive;
            if (idle >= this.opts.idleMs)
                this.closeSession(sid);
            else
                this.refreshIdle(sid);
        }, this.opts.idleMs);
        return { sid };
    }
    /** 刷新空闲计时（每次上行/下行活动调用）。 */
    refreshIdle(sid) {
        const s = this.sessions.get(sid);
        if (s === undefined)
            return;
        s.lastActive = this.opts.now();
        if (s.idleTimer !== null)
            clearTimeout(s.idleTimer);
        s.idleTimer = setTimeout(() => {
            const cur = this.sessions.get(sid);
            if (cur === undefined)
                return;
            const idle = this.opts.now() - cur.lastActive;
            if (idle >= this.opts.idleMs)
                this.closeSession(sid);
            else
                this.refreshIdle(sid);
        }, this.opts.idleMs);
    }
    /** 上行 PCM（16k int16 LE）到指定会话。会话不存在返回 false。 */
    feedAudio(sid, pcm) {
        const s = this.sessions.get(sid);
        if (s === undefined)
            return false;
        this.refreshIdle(sid);
        s.conn.send(pcm);
        return true;
    }
    /** 挂起 SSE 下行（单消费者）。会话不存在 / 已有下行返回 false。 */
    attachSse(sid, res) {
        const s = this.sessions.get(sid);
        if (s === undefined || s.sse !== null)
            return false;
        this.refreshIdle(sid);
        const channel = new SseChannel(res, {
            heartbeatMs: this.opts.heartbeatMs,
            onDisconnect: () => this.closeSession(sid),
        });
        s.sse = channel;
        // 冲刷挂 SSE 前缓冲的上游事件（上行先于下行的部分不丢）。
        if (s.pending.length > 0) {
            for (const ev of s.pending)
                channel.enqueue(ev);
            s.pending = [];
        }
        return true;
    }
    /** 关闭会话：拆 provider、拆 SSE、清定时器（幂等）。 */
    closeSession(sid) {
        const s = this.sessions.get(sid);
        if (s === undefined)
            return;
        this.sessions.delete(sid);
        if (s.idleTimer !== null)
            clearTimeout(s.idleTimer);
        s.idleTimer = null;
        s.sse?.close();
        s.sse = null;
        s.conn.onEvent = null;
        try {
            s.conn.close();
        }
        catch { /* noop */ }
    }
    /** 会话是否存活（供测试/诊断）。 */
    hasSession(sid) {
        return this.sessions.has(sid);
    }
    /**
     * 注册 4 条 exact 路由（全部过 isTrusted）。
     * @returns 全部路由的 disposer（由 ctx.effect 挂载/回收）。
     */
    registerRoutes(register) {
        const disposers = [
            register({
                kind: 'exact',
                path: '/api/asr-voice/realtime/session',
                handler: async (req, res) => {
                    if (!isTrusted(req))
                        return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
                    if (req.method !== 'POST')
                        return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
                    try {
                        const { sid } = await this.createSession();
                        return sendJson(res, 200, { ok: true, sid });
                    }
                    catch (error) {
                        return sendJson(res, 502, { ok: false, reason: error instanceof Error ? error.message : String(error) });
                    }
                },
            }),
            register({
                kind: 'exact',
                path: '/api/asr-voice/realtime/audio',
                handler: async (req, res) => {
                    if (!isTrusted(req))
                        return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
                    if (req.method !== 'POST')
                        return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
                    const sid = sidOf(req);
                    if (sid === '')
                        return sendJson(res, 400, { ok: false, reason: 'missing sid' });
                    try {
                        const pcm = await readRawBody(req, MAX_PCM_BYTES);
                        if (pcm.length === 0)
                            return sendJson(res, 400, { ok: false, reason: 'empty audio body' });
                        if (!this.feedAudio(sid, pcm))
                            return sendJson(res, 404, { ok: false, reason: 'no such session' });
                        return sendJson(res, 200, { ok: true });
                    }
                    catch (error) {
                        return sendJson(res, 400, { ok: false, reason: error instanceof Error ? error.message : String(error) });
                    }
                },
            }),
            register({
                kind: 'exact',
                path: '/api/asr-voice/realtime/events',
                handler: async (req, res) => {
                    if (!isTrusted(req))
                        return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
                    if (req.method !== 'GET')
                        return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
                    const sid = sidOf(req);
                    if (sid === '')
                        return sendJson(res, 400, { ok: false, reason: 'missing sid' });
                    if (!this.hasSession(sid))
                        return sendJson(res, 404, { ok: false, reason: 'no such session' });
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
                handler: async (req, res) => {
                    if (!isTrusted(req))
                        return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
                    if (req.method !== 'POST')
                        return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
                    const sid = sidOf(req);
                    if (sid === '')
                        return sendJson(res, 400, { ok: false, reason: 'missing sid' });
                    this.closeSession(sid);
                    return sendJson(res, 200, { ok: true });
                },
            }),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }
}
/** 从查询串取 sid（缺省返回空串）。 */
function sidOf(req) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const sid = url.searchParams.get('sid') ?? '';
    return sid.trim();
}
//# sourceMappingURL=realtime-host.js.map