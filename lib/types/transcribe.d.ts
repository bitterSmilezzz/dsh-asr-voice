/**
 * dsh-asr-voice — host 半区：云端 ASR 转写代理。
 *
 * 浏览器把原始音频字节 POST 到 /api/asr-voice/transcribe（raw body，
 * Content-Type 为音频 MIME），host 读取配置里的云端 baseUrl/apiKey/model/mode，
 * 转发到上游并返回 { ok, text }。API key 全程在服务端，不进浏览器。
 *
 * 两条通道（mode）：
 *   - transcriptions：whisper 式 multipart /audio/transcriptions（OpenAI / Groq /
 *     硅基流动 / 本地 OpenAI-compatible 部署）。
 *   - chat：chat.completions + input_audio（base64 data URI）——小米 MiMo-V2.5-ASR、
 *     通义 qwen3-asr-flash 等「音频大模型」的 OpenAI 兼容姿势。
 *   - auto：按模型名自动判定（模型名含 asr/audio/omni/sensevoice 走 chat，否则 transcriptions）。
 *
 * MiMo key 兜底：baseUrl 指向 api.xiaomimimo.com 且设置里 apiKey 为空时，复用 DSH
 * 官方 credentials 服务里的 MIMO_API_KEY（与 DSH 的 mimo LLM provider 同一把 key），
 * 用户无需在插件设置里重复粘贴。
 *
 * 纯 Node 全局 fetch/FormData/Blob（Node 18+），跨平台。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
/** 云端 ASR 配置面（来自 settings scope 解析出的当前生效供应商）。 */
export interface CloudAsrConfig {
    /** 供应商 id（用于统计；旧单配置为 'legacy'）。 */
    id: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    mode: string;
}
/** 解析最终 API key：设置值优先；MiMo 端点留空时复用 DSH 凭据 MIMO_API_KEY。 */
export declare function resolveApiKey(ctx: Context, cfg: CloudAsrConfig): Promise<string>;
/**
 * 注册 /api/asr-voice/transcribe 路由。
 * @param register - webserver 的 register 方法（由调用方从 ctx 传入）。
 * @param getCloudConfig - 读取当前生效云端 ASR 配置的 thunk。
 * @param ctx - host context（供 MiMo key 兜底走 credentials 服务）。
 * @param recordStats - 成功转写后回调（记录用量；可选）。
 * @returns 路由 disposer（由 ctx.effect 挂载/回收）。
 */
export declare function registerTranscribeRoute(register: (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void, getCloudConfig: () => CloudAsrConfig, ctx: Context, recordStats?: (text: string, providerId: string) => void): () => void;
//# sourceMappingURL=transcribe.d.ts.map