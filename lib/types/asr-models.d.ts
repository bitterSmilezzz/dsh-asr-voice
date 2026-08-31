/**
 * dsh-asr-voice — host 半区：动态获取供应商 ASR 模型列表。
 *
 * GET /api/asr-voice/asr-models?providerId=X —— 用该供应商的 baseUrl+apiKey
 * 调用 OpenAI-compatible `GET {baseUrl}/models`，过滤出 ASR 相关模型
 * （模型名/ID 含 asr/audio/omni/whisper/sensevoice/voice 等），供设置页
 * 「获取模型」按钮把最新模型填进下拉。key 只在服务端，不进浏览器。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { KeyRefSource } from './key-ref.ts';
/** 单个供应商配置面（来自 settings providers 列表）。 */
export interface CloudProviderLike extends KeyRefSource {
    baseUrl: string;
    apiKey: string;
    model: string;
    mode: string;
}
/**
 * 注册 /api/asr-voice/asr-models 路由（GET）。
 * @param register - webserver 的 register 方法。
 * @param getProviders - 读取全部已配置供应商列表的 thunk。
 * @param ctx - host context（供 MiMo key 兜底走 credentials 服务）。
 */
export declare function registerAsrModelsRoute(register: (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void, getProviders: () => CloudProviderLike[], ctx: Context): () => void;
//# sourceMappingURL=asr-models.d.ts.map