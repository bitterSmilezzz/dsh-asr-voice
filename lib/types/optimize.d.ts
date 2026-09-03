/**
 * dsh-asr-voice — host 半区：LLM 提示词优化。
 *
 * 提示词优化只使用 **DSH 已配置好的模型**（ctx.llm 通道）：
 *   - 请求可指定 { provider, model }（必须是 DSH 模型列表里已配置的）
 *   - 未指定 → 用当前所选 LLM（ctx.agentDefaultModel.currentSelection()）
 * 要自定义模型，须先到 DSH 原生模型列表添加（本插件不做独立 baseUrl/apiKey）。
 *
 * /api/asr-voice/models 枚举 DSH 已配置模型（供设置页选择器）。
 * API key 由 DSH provider 管理，全程在服务端；跨平台。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
/** 一个 DSH 已配置模型的条目（给设置页选择器用）。 */
export interface DshModelEntry {
    id: string;
    name: string;
}
/** 一个 DSH 已配置 provider 及其模型。 */
export interface DshProviderEntry {
    provider: string;
    name: string;
    models: DshModelEntry[];
}
/** 模型选择目标（来自设置页选择的 DSH 模型，或当前所选）。 */
export interface OptimizeTarget {
    provider: string;
    model: string;
}
/**
 * 枚举 DSH 已配置模型（ctx.llm.listProviders + listModels）。
 * 枚举失败/不可用/超时的 provider 给空模型列表（不阻断整体）。
 */
export declare function enumerateModels(ctx: Context): Promise<DshProviderEntry[]>;
/**
 * 注册 /api/asr-voice/optimize 路由。
 * 请求体：{ text, provider?, model? }——provider/model 须为 DSH 已配置模型；
 * 缺省用当前所选 LLM。
 */
export declare function registerOptimizeRoute(register: (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void, ctx: Context): () => void;
/**
 * 注册 /api/asr-voice/models 路由：枚举 DSH 已配置模型（设置页选择器用）。
 */
export declare function registerModelsRoute(register: (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void, ctx: Context): () => void;
//# sourceMappingURL=optimize.d.ts.map