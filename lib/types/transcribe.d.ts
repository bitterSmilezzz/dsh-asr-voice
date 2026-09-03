/** dsh-asr-voice — host 半区：云端 ASR 转写代理。
 * 浏览器把原始音频字节 POST 到 /api/asr-voice/transcribe（raw body，
 * Content-Type 为音频 MIME），host 读取配置里的云端 baseUrl/model/mode，按
 * src/key-ref.ts 派生的引用名向 DSH credentials 服务解析 API key，转发到上游并返回
 * { ok, text }。API key 全程只在服务端，不进浏览器。
 * 两条通道（mode）：
 * - transcriptions：whisper 式 multipart /audio/transcriptions（OpenAI / Groq /
 * 硅基流动 / 本地 OpenAI-compatible 部署）。
 * - chat：chat.completions + input_audio（base64 data URI）——小米 MiMo-V2.5-ASR、
 * 通义 qwen3-asr-flash 等「音频大模型」的 OpenAI 兼容姿势。
 * - auto：按模型名自动判定（模型名含 asr/audio/omni/sensevoice 走 chat，否则 transcriptions）。
 * key 复用：引用名与官方 LLM provider 同名（OPENAI_API_KEY / MIMO_API_KEY / …），
 * 用户在 DSH 里配过对应 LLM 就自动共用同一把 key，无需在插件设置里重复粘贴。
 * 纯 Node 全局 fetch/FormData/Blob（Node 18+），跨平台。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { KeyRefSource } from './key-ref.ts';
/** 云端 ASR 配置面（来自 settings scope 解析出的当前生效供应商）。 id / preset / name 由 KeyRefSource 提供，name 是自定义供应商的显示名。 */
export interface CloudAsrConfig extends KeyRefSource {
    baseUrl: string;
    /** 遗留密钥位置：一次性迁移完成前仍可直接生效，完成后再无人写入。 */
    apiKey: string;
    model: string;
    mode: string;
}
/** 解析最终 API key：settings 里的遗留值优先（一次性迁移完成前的兼容路径），否则按 派生引用名向 DSH credentials 服务解析，最后退回同名环境变量。预置供应商的引用名与 官方 LLM provider 同名，因此配过对应 LLM 的用户在这里天然命中同一把 key。 */
export declare function resolveApiKey(ctx: Context, cfg: CloudAsrConfig): Promise<string>;
/** 注册 /api/asr-voice/transcribe 路由。
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