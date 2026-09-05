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
     *  首次直写即命中背压（write 返回 false）的事件也会入队，等 drain 后再送——
     *  不能只把 backedUp 挂上就让事件丢失。 */
    enqueue(ev: RealtimeProviderEvent): void;
    /** 按序冲刷排队的事件（final 不丢、partial 保最新）；缓冲满则挂 drain 等恢复。 */
    private flush;
    /** 挂一次 drain 监听（同一时间只挂一个；close/disconnect 时摘掉）。 */
    private armDrain;
    /** 结束下行（幂等）：清心跳、断 close/drain 监听。 */
    close(): void;
    private readonly disconnect;
}
/** RealtimeHost 构造参数（依赖注入，便于单测）。 */
export interface RealtimeHostOptions {
    /** 每次建会话时创建一条 provider 连接。 */
    createProvider(): Promise<RealtimeProviderConnection> | RealtimeProviderConnection;
    /** 会话空闲超时（毫秒，默认 10 分钟）。 */
    idleMs?: number;
    /** SSE 心跳间隔（毫秒，默认 15s）。 */
    heartbeatMs?: number;
    /** 现在的时间（毫秒，测试注入）。 */
    now?: () => number;
}
/** 实时转写会话注册表 + 路由。 */
export declare class RealtimeHost {
    private readonly sessions;
    private readonly opts;
    private readonly createProvider;
    constructor(options: RealtimeHostOptions);
    /** 铸造新会话：host 生成 sid，建 provider 连接。 */
    createSession(): Promise<{
        sid: string;
    }>;
    /** 空闲守卫：到点复查——期间有任何上行/下行活动会走 refreshIdle 重挂， 真正空闲满 idleMs 才拆会话防泄漏。 */
    private armIdle;
    /** 刷新空闲计时（每次上行/下行活动调用）。 */
    private refreshIdle;
    /** 上行 PCM（16k int16 LE）到指定会话。会话不存在返回 false。 */
    feedAudio(sid: string, pcm: Uint8Array): boolean;
    /** 挂起 SSE 下行（单消费者）。会话不存在 / 已有下行返回 false。 */
    attachSse(sid: string, res: ServerResponse): boolean;
    /** 关闭会话：拆 provider、拆 SSE、清定时器（幂等）。 */
    closeSession(sid: string): void;
    /** 会话是否存活（供测试/诊断）。 */
    hasSession(sid: string): boolean;
    /** 注册 4 条 exact 路由（全部过 isTrusted）。 @returns 全部路由的 disposer（由 ctx.effect 挂载/回收）。 */
    registerRoutes(register: RealtimeRouteRegister): () => void;
}
//# sourceMappingURL=realtime-host.d.ts.map