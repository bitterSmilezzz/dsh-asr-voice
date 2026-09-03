import type { IncomingMessage, ServerResponse } from 'node:http';
import type { RealtimeProviderConnection, RealtimeProviderEvent } from './realtime-provider.ts';
/** webserver register 的最小面（与 transcribe.ts 的 register 参数同构）。 */
export type RealtimeRouteRegister = (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void;
/** SSE 下行通道：带背压（partial coalesce / final 必达）与心跳。 */
export declare class SseChannel {
    private readonly res;
    private backedUp;
    /** 背压期间只保留最新一条待发事件（final/stopped 覆盖 partial）。 */
    private coalesced;
    private closed;
    /** 空闲心跳：防止中间代理把长连接掐掉（部分代理 30s 无数据即断）。 */
    private heartbeat;
    private readonly onDisconnect;
    constructor(res: ServerResponse, opts?: {
        heartbeatMs?: number;
        onDisconnect?: () => void;
    });
    /** 排入一条事件：背压时 coalesce，drain 后按序冲刷。 */
    enqueue(ev: RealtimeProviderEvent): void;
    private write;
    /** 结束下行（幂等）：清心跳、断 close 监听。 */
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