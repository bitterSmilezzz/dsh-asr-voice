import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RealtimeProviderConnection, RealtimeProviderEvent } from './realtime-provider.ts';
/** webserver register 的最小面（与 transcribe.ts 的 register 参数同构）。 */
export type RealtimeRouteRegister = (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void;
/** SSE 下行通道：带背压（partial 原位合并 / final 必达）与心跳。 */
export declare class SseChannel {
    private readonly res;
    private backedUp;
    /** 背压期间排队待发的事件（有界）。partial 会被更新的 partial 原位替换（coalesce），
     *  final/speech-stopped 追加保序——drain 后按序冲刷，**任何 final 都不丢**。
     *  此前单一 coalesce 槽会被后续 final/partial 直接覆盖：背压中连续两句收口时，
     *  第一句的 final 被第二句顶掉，客户端永远只看到 partial（缺句）。 */
    private pending;
    /** pending 上限：与会话侧 pending 缓冲同量级；极端积压（客户端几乎不读）时丢最旧
     *  事件降级，会话最终由 disconnect / 空闲守卫拆除。 */
    private static readonly PENDING_CAP;
    private closed;
    /** 空闲心跳：防止中间代理把长连接掐掉（部分代理 30s 无数据即断）。 */
    private heartbeat;
    private readonly onDisconnect;
    /** 当前挂着的 drain 监听（close/disconnect 时移除，避免监听随响应滞留到 GC）。 */
    private drainHandler;
    constructor(res: ServerResponse, opts?: {
        heartbeatMs?: number;
        onDisconnect?: () => void;
    });
    /** 排入一条事件：空闲直写；背压时 partial 原位合并、final/stopped 排队保序。
     *  命中背压的那一条**已经写出**（`write` 返回 false 只是「别再写了」，不是「没写」），
     *  所以队列只兜住背压期间新到的事件，等 drain 恢复后按序送出。 */
    enqueue(ev: RealtimeProviderEvent): void;
    /** 按序冲刷排队的事件（final 不丢、partial 保最新）；缓冲满则挂 drain 等恢复。
     *  **`write()` 返回 false 只表示内核缓冲已超高水位，事件本身已被接受并会送出**——
     *  因此出队与返回值无关：先出队再据返回值置背压标志。早先「返回 false 就不出队」的
     *  写法会让同一条事件在 drain 后被再写一遍（partial 重放无害，final 重放会让客户端
     *  把同一个回合提交两次）。 */
    private flush;
    /** 挂一次 drain 监听（同一时间只挂一个；close/disconnect 时摘掉）。 */
    private armDrain;
    /** 结束下行（幂等）：清心跳、断 close/drain 监听。 */
    close(): void;
    private readonly disconnect;
}
/** 建会话失败（容量已满）：自带 HTTP 状态码，会话路由据此回 503（可重试）而不是 502
 *  （上游故障）。其余建会话失败（provider 连不上）仍是 502。 */
export declare class RealtimeSessionError extends Error {
    readonly status: 503;
    constructor(message: string);
}
/** RealtimeHost 构造参数（依赖注入，便于单测）。 */
export interface RealtimeHostOptions {
    /** 每次建会话时创建一条 provider 连接。 */
    createProvider(): Promise<RealtimeProviderConnection> | RealtimeProviderConnection;
    /** 会话空闲超时（毫秒，默认 10 分钟）。 */
    idleMs?: number;
    /** SSE 心跳间隔（毫秒，默认 15s）。 */
    heartbeatMs?: number;
    /** 上游终态报错后的收尾宽限期（毫秒，默认 5s）。测试注入小值以确定性覆盖拆除路径。 */
    errorLingerMs?: number;
    /** 同时存活会话上限（默认 8）；超出时 createSession 抛 {@link RealtimeSessionError}。 */
    maxSessions?: number;
    /** 单会话绝对上限（毫秒，默认 10 分钟）；非正数 = 不设上限。传函数则每次建会话现读
     *  （settings 可热改，见 src/index.ts 的注入）。 */
    maxSessionMs?: number | (() => number);
    /** 现在的时间（毫秒，测试注入）。 */
    now?: () => number;
}
/** 实时转写会话注册表 + 路由。 */
export declare class RealtimeHost {
    private readonly sessions;
    private readonly opts;
    private readonly createProvider;
    /** 绝对 TTL 的取值入口（函数则现读，便于 settings 热改）。 */
    private readonly maxSessionMsOf;
    constructor(options: RealtimeHostOptions);
    /** 铸造新会话：host 生成 sid，建 provider 连接。 */
    createSession(): Promise<{
        sid: string;
    }>;
    /** 绝对 TTL：到点**无条件**拆会话（不看有没有活动）。会话是「一次对话」而非常驻资源：
     *  只要持续上行 PCM，空闲守卫就永远等不到过期（客户端每帧都在续命），云端 WS 按分钟
     *  计费地开着。TTL 取值在建会话时现读（settings 热改立刻对新会话生效）。 */
    private armTtl;
    /** 上游终态报错后的收尾：标记会话已终结 + 把空闲窗口收紧到 ERROR_LINGER_MS。
     *  修的是「僵尸会话」：此前 provider 报错后 host 不拆会话，客户端仍在按 40ms 一帧
     *  上行 PCM，每帧 `feedAudio` → `refreshIdle` 都把 lastActive 顶到现在——死连接的
     *  会话因此永远等不到空闲过期，SSE 一直挂着、麦克风一直开。 */
    private armErrorTeardown;
    /** 空闲守卫：到点复查——期间有任何上行/下行活动会走 refreshIdle 重挂， 真正空闲满 windowMs 才拆会话防泄漏（默认 idleMs；上游终态报错后用更短的收尾宽限）。 */
    private armIdle;
    /** 刷新空闲计时（每次上行/下行活动调用）。已终结的会话不续命——否则死连接被
     *  客户端的持续上行"续命"，永远到不了过期点。 */
    private refreshIdle;
    /** 上行 PCM（16k int16 LE）到指定会话。会话不存在**或上游已终态报错**返回 false
     *  （路由据此回 404，客户端停止上行）。 */
    feedAudio(sid: string, pcm: Uint8Array): boolean;
    /** 挂起 SSE 下行（单消费者）。会话不存在 / 已有下行返回 false。 */
    attachSse(sid: string, res: ServerResponse): boolean;
    /** 关闭会话：拆 provider、拆 SSE、清定时器（幂等）。
     *  时序说明（**刻意不改**）：这里先摘掉事件汇（`conn.onEvent = null`）再 `conn.close()`，
     *  而 provider（如 realtime-dashscope.ts）的 close 会发 session.finish 并保留 3s 宽限
     *  （CLOSE_GRACE_MS）等上游在途 final——那条 final 到达时事件汇已摘，host 侧收不到任何
     *  事件（客户端 stop 时本就丢弃事件，所以当前无功能损失）。若将来要「收尾取最后一句」，
     *  必须调换顺序：先 conn.close()、宽限结束后再摘事件汇。 */
    closeSession(sid: string): void;
    /** 会话是否存活（供测试/诊断）。 */
    hasSession(sid: string): boolean;
    /** 当前存活会话数（供测试/诊断）。 */
    sessionCount(): number;
    /** 释放全部会话（插件卸载/热重载时由 fiber disposer 调用）：逐个 closeSession
     *  （幂等），SSE 心跳、idle timer、provider 连接全部随之释放。 */
    dispose(): void;
    /** 注册 4 条 exact 路由（全部过 isTrusted）。 @returns 全部路由的 disposer（由 ctx.effect 挂载/回收）。 */
    registerRoutes(register: RealtimeRouteRegister): () => void;
}
//# sourceMappingURL=realtime-host.d.ts.map