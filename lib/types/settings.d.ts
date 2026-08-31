/**
 * dsh-asr-voice — host 半区：settings namespace + schema（设置页配置的权威源）。
 *
 * **API key 不在这里**：云端 ASR 的 key 统一存 DSH credentials 服务，引用名由
 * `src/key-ref.ts` 派生（预置供应商与官方 LLM provider 同名，配过 LLM 就直接复用，
 * 用户一次都不用填）；LLM 提示词优化不存 key，它走 DSH 官方通道 ctx.llm。settings
 * 只存有 baseUrl / model / mode 等**无密钥**的供应商元数据，因此浏览器拿到整份
 * 文档也拿不到 key，客户端整段回写也不可能顺手删掉谁的密钥。
 *
 * 两个 `apiKey` 字段是 v0.1/v0.2 的遗留位置，本版本保留只为让 `src/index.ts` 的
 * 一次性迁移读到旧值并搬进 credentials：字段一旦从 schema 消失，schemastery 会把
 * 旧文档里的值直接剥掉，迁移就再也看不见它。它们声明为 `role('secret')`，从此不经
 * `settings.describe` 渡到浏览器（此前是明文过境的，迁移后请自行清理
 * `~/.dsh/settings.yaml` 中的历史残留）。下一版本再删除字段本身。
 *
 * 云端 ASR 支持**多供应商**（v0.2）：`asr.cloud.providers` 为供应商列表（每个含
 * 自己的 name/baseUrl/model/mode），`asr.cloud.active` 指定当前使用的供应商 id。
 * 兼容旧单配置：仍保留 preset/baseUrl/model/mode 顶层字段，读取时若无 providers
 * 则回退到旧单配置（向后兼容，写回优先新 shape）。
 */
import z from '@deepseek-ai/schemastery';
/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export declare const ASR_VOICE_SETTINGS_NAMESPACE = "asr-voice";
/** 单个云端 ASR 供应商配置（密钥不在此处，见文件头）。 */
export declare const CloudProviderSchema: z<Schemastery.ObjectS<{
    /** 供应商唯一 id（新增时由前端生成，如 crypto.randomUUID）。 */
    id: z<string, string>;
    /** 预置 id（openai | groq | siliconflow | mimo | dashscope | custom）。 */
    preset: z<string, string>;
    /** 显示名；自定义供应商同时是凭据引用名的派生依据（见 src/key-ref.ts）。 */
    name: z<string, string>;
    /** OpenAI-compatible base URL（预置自动填充，可改）。 */
    baseUrl: z<string, string>;
    /** 遗留密钥位置：只由 src/index.ts 的一次性迁移读取并搬进 credentials，之后恒为空。 */
    apiKey: z<string, string>;
    /** ASR 模型（预置自动填充，可改；可经「获取模型」动态拉取）。 */
    model: z<string, string>;
    /** 调用通道：auto（按模型名判定）/ transcriptions（whisper 式）/ chat（MiMo/Qwen-ASR）。 */
    mode: z<string, string>;
}>, Schemastery.ObjectT<{
    /** 供应商唯一 id（新增时由前端生成，如 crypto.randomUUID）。 */
    id: z<string, string>;
    /** 预置 id（openai | groq | siliconflow | mimo | dashscope | custom）。 */
    preset: z<string, string>;
    /** 显示名；自定义供应商同时是凭据引用名的派生依据（见 src/key-ref.ts）。 */
    name: z<string, string>;
    /** OpenAI-compatible base URL（预置自动填充，可改）。 */
    baseUrl: z<string, string>;
    /** 遗留密钥位置：只由 src/index.ts 的一次性迁移读取并搬进 credentials，之后恒为空。 */
    apiKey: z<string, string>;
    /** ASR 模型（预置自动填充，可改；可经「获取模型」动态拉取）。 */
    model: z<string, string>;
    /** 调用通道：auto（按模型名判定）/ transcriptions（whisper 式）/ chat（MiMo/Qwen-ASR）。 */
    mode: z<string, string>;
}>>;
/** 云端 ASR 配置：多供应商列表 + active（含旧单配置兼容字段）。 */
export declare const CloudSchema: any;
/** LLM 提示词优化目标（DSH 已配置模型的 provider/model；空 = 用当前所选 LLM）。 */
export declare const LlmSchema: z<Schemastery.ObjectS<{
    provider: z<string, string>;
    model: z<string, string>;
}>, Schemastery.ObjectT<{
    provider: z<string, string>;
    model: z<string, string>;
}>>;
/** 插件设置 schema（与 client 的 AsrVoiceConfig 结构一致）。 */
export declare const AsrVoiceSettingsSchema: any;
/**
 * 业务侧类型（手写，不依赖 schema 推断——schema 已注解为 Schemastery.Schema
 * 以便声明可移植，TypeT 会退化为 any）。
 */
export interface AsrVoiceCloudProvider {
    id: string;
    preset: string;
    /** 显示名（自定义行的凭据引用派生依据）。 */
    name: string;
    baseUrl: string;
    /** 遗留密钥位置：只有 host 读得到（role('secret') 使它不上线），迁移后即恒为空。 */
    apiKey: string;
    model: string;
    mode: string;
}
export interface AsrVoiceSettings {
    asr: {
        provider: string;
        cloud: {
            providers: AsrVoiceCloudProvider[];
            active: string;
            preset: string;
            baseUrl: string;
            apiKey: string;
            model: string;
            mode: string;
        };
    };
    optimize: {
        mode: string;
        /** LLM 模式入框方式：false（默认）= 快速入框+后台优化替换；true = 预览卡确认。 */
        preview: boolean;
        llm: {
            provider: string;
            model: string;
        };
    };
    language: string;
    behavior: {
        autoSend: boolean;
        /** 静音自动停止（默认关 = 手动关麦）。 */
        silenceStop: boolean;
        holdToTalk: boolean;
        hotkey: string;
        textMode: string;
        copyToClipboard: boolean;
    };
}
/** 设置默认值（与 schema default 一致；client 侧也用同一份，避免双源漂移）。 */
export declare const DEFAULT_SETTINGS: AsrVoiceSettings;
//# sourceMappingURL=settings.d.ts.map