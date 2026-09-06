/** dsh-asr-voice — host 半区（组合器）。
 * 职责：
 * - 注册插件配置 namespace `asr-voice`（设置页「语音输入」卡片的权威源）
 * - /api/asr-voice/transcribe —— 云端 ASR 代理（浏览器上传音频，host 转发；支持多供应商）
 * - /api/asr-voice/optimize    —— LLM 提示词优化代理
 * - /api/asr-voice/models      —— 枚举 DSH 已配置模型（优化模型选择器）
 * - /api/asr-voice/asr-models  —— 动态获取某供应商的 ASR 模型（设置页「获取模型」）
 * - /api/asr-voice/stats       —— ASR 用量统计（计费相关，低优先级）
 * - 启动时一次性迁移：settings 里的遗留明文 key → DSH credentials，随后抹掉明文
 * LLM 优化默认走 DSH 当前所选 LLM（ctx.agentDefaultModel + ctx.llm），无需
 * 插件单独配 key。云端 ASR 支持多供应商（asr.cloud.providers + active），但
 * settings 里只有 baseUrl / model / mode 等无密钥元数据：API key 存 DSH
 * credentials（引用名见 src/key-ref.ts），浏览器只经私有 JSON 路由调用，拿不到 key。
 * 纯 Node HTTP + 官方 LLM 通道，无平台专属二进制 → macOS / Windows 双平台。
 */
import type { Context } from '@deepseek-ai/cordis';
import { type AsrVoiceSettings } from './settings.ts';
import { type CloudAsrConfig } from './transcribe.ts';
import { type CloudProviderLike } from './asr-models.ts';
/** Host context slice this plugin consumes (webServer/llm/settings via type merges). */
type AsrVoiceHostContext = Context;
export declare const name = "dsh-asr-voice";
/** 所需 Cordis 服务（服务名，非 entry id）。 */
export declare const inject: string[];
/**
 * 供应商行归一化：settings 深层结构（多供应商/旧单配置）里同一组字段的取值
 * 规则一致（缺省 preset=openai、mode=auto、其余空串），所有读取路径共用
 * 这一个视图，避免四处维护同一份兜底规则。
 * @param row 供应商原始行（name/id 均可缺省：name 用于显示，id 用于引用派生）。
 * @param idFallback 行缺 id 时的兜底 id。
 * @param modeOverride 显式 mode（undefined = 取行内 mode，缺省 'auto'）。
 */
export declare function providerView(row: {
    id?: string;
    preset?: string;
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    mode?: string;
}, idFallback: string, modeOverride?: string): {
    id: string;
    preset: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    mode: string;
};
/** 从 settings 解析当前生效的云端 ASR 供应商（多供应商 active/首个，或旧单配置）。
 * 内部导出：单测直连。 */
export declare function resolveCloudProvider(v: AsrVoiceSettings | undefined): CloudAsrConfig | undefined;
/** 读取全部已配置供应商（多供应商列表；旧单配置合成一个 'legacy'）。
 * 内部导出：单测直连。 */
export declare function listProviders(v: AsrVoiceSettings | undefined): CloudProviderLike[];
/** DSH credentials 服务的最小面（可选服务，本插件不把它列为硬依赖）。 */
interface CredentialsLike {
    set(ref: unknown, value: string): Promise<void>;
}
/** 一次性迁移：把 settings 里遗留的明文 API key 搬进 DSH credentials，全部搬成功后抹掉明文。
 * 任一条搬不动（凭据服务缺席、该引用被只读来源拒绝）就整批原样留着——抹掉一把无处可寻的
 * key 比留一份本机明文更糟。{@link resolveApiKey} 始终先读 settings，所以未迁移状态下功能
 * 不降级；迁移成功后 settings 里的 key 恒为空，密钥只剩 credentials 一个来源。
 * 内部导出（非插件公共 API）：scope/credentials/log 全部可注入，node 单测直连。
 */
export declare function migrateLegacyKeys(scope: {
    get(): AsrVoiceSettings;
    update(patch: object): Promise<void>;
}, credentials: CredentialsLike | undefined, log: {
    warn(message: string): void;
    info(message: string): void;
}): Promise<void>;
export declare function apply(ctx: AsrVoiceHostContext): void;
export {};
//# sourceMappingURL=index.d.ts.map