/**
 * dsh-asr-voice — I5：真云端实时 provider（阿里云百炼 Qwen-ASR-Realtime）。
 *
 * 协议（对齐 OpenAI Realtime 兼容面，官方文档：
 * help.aliyun.com/zh/model-studio/qwen-asr-realtime-api）：
 *   WebSocket  URL = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=<model>`
 *   认证          = 握手阶段 `Authorization: Bearer <api_key>`（失败 = HTTP 401/403）
 *   客户端事件     = session.update（pcm / 16000 / server_vad）→ input_audio_buffer.append
 *                   （base64 PCM）→ … → session.finish（推完必须先发，再关连接）
 *   服务端事件     = session.created / speech_started / speech_stopped /
 *                   conversation.item.input_audio_transcription.text（partial：
 *                   text=已确认前缀 + stash=草稿后缀，拼接即完整预览）/
 *                   …completed（final：transcript）/ …failed / error / session.finished
 *
 * 接缝契约（src/realtime-provider.ts）：connect() → RealtimeProviderConnection，
 * send(pcm) 上行 int16 LE / onEvent 事件下行 / close() 幂等。I5 只替换 host 侧
 * `createProvider` 的工厂，RealtimeHost 的会话注册表与 4 条路由一行不改。
 *
 * 依赖：Node 全局 WebSocket（undici，Node 22+ 稳定；本仓 tsconfig host 用 Node 类型），
 * 握手带自定义头已由 test/ws-auth.test.mjs 给出真实 socket 上线证据。
 */
import type { RealtimeProvider } from './realtime-provider.ts';
/** 真 provider 的构造参数（host 半区按配置注入）。 */
export interface DashscopeRealtimeOptions {
    /** DSH 凭据解析出的 API key（Bearer 后接的内容）。 */
    apiKey: string;
    /** 模型名（URL query `model=`，默认 qwen3-asr-flash-realtime）。 */
    model?: string;
    /** WebSocket 根地址（不含 query），默认百炼公共域名。 */
    wssUrl?: string;
    /** 识别语言（可选；省略 = 服务端自动检测）。 */
    language?: string;
    /** 服务端 VAD 参数（可选；默认对齐官方推荐）。 */
    vad?: {
        /** VAD 灵敏度（-1~1，推荐 0.0）。 */
        threshold?: number;
        /** 静音持续多久断句（ms，200~6000，推荐 400）。 */
        silenceDurationMs?: number;
    };
}
/** 真云端实时 provider 工厂（I5：host 侧 createProvider 用它）。 */
export declare function createDashscopeRealtimeProvider(opts: DashscopeRealtimeOptions): RealtimeProvider;
//# sourceMappingURL=realtime-dashscope.d.ts.map