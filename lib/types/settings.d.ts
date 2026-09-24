/** dsh-asr-voice — host 半区：settings namespace + schema（设置页配置的权威源）。
 * **API key 不在这里**：云端 ASR 的 key 统一存 DSH credentials 服务，引用名由
 * `src/key-ref.ts` 派生（预置供应商与官方 LLM provider 同名，配过 LLM 就直接复用，
 * 用户一次都不用填）；LLM 提示词优化不存 key，它走 DSH 官方通道 ctx.llm。settings
 * 只存有 baseUrl / model / mode 等**无密钥**的供应商元数据，因此浏览器拿到整份
 * 文档也拿不到 key，客户端整段回写也不可能顺手删掉谁的密钥。
 * 两个 `apiKey` 字段是 v0.1/v0.2 的遗留位置，本版本保留只为让 `src/index.ts` 的
 * 一次性迁移读到旧值并搬进 credentials：字段一旦从 schema 消失，schemastery 会把
 * 旧文档里的值直接剥掉，迁移就再也看不见它。它们声明为 `role('secret')`，从此不经
 * `settings.describe` 渡到浏览器（此前是明文过境的，迁移后请自行清理
 * `~/.dsh/settings.yaml` 中的历史残留）。下一版本再删除字段本身。
 * 云端 ASR 支持**多供应商**（v0.2）：`asr.cloud.providers` 为供应商列表（每个含
 * 自己的 name/baseUrl/model/mode），`asr.cloud.active` 指定当前使用的供应商 id。
 * 兼容旧单配置：仍保留 preset/baseUrl/model/mode 顶层字段，读取时若无 providers
 * 则回退到旧单配置（向后兼容，写回优先新 shape）。
 */
import z from '@deepseek-ai/schemastery';
/**
 * 插件配置的 settings namespace = host 半区 `cordis.patch.yml` 的 entry `id`。
 *
 * DSH 0.1.7 起 host/client 两侧都用它定位 entry（官方实现：
 * `SettingsForms`/`ConfigForms` 内部按 `row.options.id === ns` 查找）。⚠ 它**不是**
 * npm 包名（`@bittersmilezzz/dsh-asr-voice`）：拿错字符串 host 侧 update 会抛
 * `No configurable plugin entry`、client 侧拿到 unavailable 快照 → 设置卡渲染成功但
 * 读写静默失效。一致性由 test/entry-id-parity.test.mjs 钉住（读 cordis.patch.yml）。
 *
 * client 半区不重复定义字面量，直接从本模块 re-export（见 src/client/config.ts），
 * 避免 host/client 两个字符串各自漂移。
 */
export declare const ASR_VOICE_SETTINGS_NAMESPACE = "dsh-asr-voice";
/** 单个云端 ASR 供应商配置（密钥不在此处，见文件头）。 */
export declare const CloudProviderSchema: z<Schemastery.ObjectS<NoInfer<{
    /** 供应商唯一 id（新增时由前端生成，如 crypto.randomUUID）。 */
    id: z<string, string, "defined">;
    /** 预置 id（openai | groq | siliconflow | mimo | dashscope | custom）。 */
    preset: z<string, string, "defined">;
    /** 显示名；自定义供应商同时是凭据引用名的派生依据（见 src/key-ref.ts）。 */
    name: z<string, string, "defined">;
    /** OpenAI-compatible base URL（预置自动填充，可改）。 */
    baseUrl: z<string, string, "defined">;
    /** 遗留密钥位置：只由 src/index.ts 的一次性迁移读取并搬进 credentials，之后恒为空。 */
    apiKey: z<string, string, "defined">;
    /** ASR 模型（预置自动填充，可改；可经「获取模型」动态拉取）。 */
    model: z<string, string, "defined">;
    /** 调用通道：auto（按模型名判定）/ transcriptions（whisper 式）/ chat（MiMo/Qwen-ASR）。 */
    mode: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    /** 供应商唯一 id（新增时由前端生成，如 crypto.randomUUID）。 */
    id: z<string, string, "defined">;
    /** 预置 id（openai | groq | siliconflow | mimo | dashscope | custom）。 */
    preset: z<string, string, "defined">;
    /** 显示名；自定义供应商同时是凭据引用名的派生依据（见 src/key-ref.ts）。 */
    name: z<string, string, "defined">;
    /** OpenAI-compatible base URL（预置自动填充，可改）。 */
    baseUrl: z<string, string, "defined">;
    /** 遗留密钥位置：只由 src/index.ts 的一次性迁移读取并搬进 credentials，之后恒为空。 */
    apiKey: z<string, string, "defined">;
    /** ASR 模型（预置自动填充，可改；可经「获取模型」动态拉取）。 */
    model: z<string, string, "defined">;
    /** 调用通道：auto（按模型名判定）/ transcriptions（whisper 式）/ chat（MiMo/Qwen-ASR）。 */
    mode: z<string, string, "defined">;
}>>, "plain">;
/** 云端 ASR 配置：多供应商列表 + active（含旧单配置兼容字段）。 */
export declare const CloudSchema: any;
/** LLM 提示词优化目标（DSH 已配置模型的 provider/model；空 = 用当前所选 LLM）。 */
export declare const LlmSchema: z<Schemastery.ObjectS<NoInfer<{
    provider: z<string, string, "defined">;
    model: z<string, string, "defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    provider: z<string, string, "defined">;
    model: z<string, string, "defined">;
}>>, "plain">;
/** 插件设置 schema（与 client 的 AsrVoiceConfig 结构一致）。 */
export declare const AsrVoiceSettingsSchema: any;
/** 业务侧类型（手写，不依赖 schema 推断——schema 已注解为 Schemastery.Schema 以便声明可移植，TypeT 会退化为 any）。 */
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
        /** 单次录音最长时长（毫秒）。 */
        maxRecordMs: number;
        /** 静音判定阈值（RMS，0~1）。 */
        silenceRms: number;
        /** 静音持续多久即自动停止（毫秒）。 */
        silenceMs: number;
    };
    realtime: {
        /** 实时语音对话总开关。 */
        enabled: boolean;
        /** 实时引擎：browser | segmented | cloud。 */
        engine: string;
        /** 云端实时 provider（engine=cloud 时；'' = 内置模拟）。 */
        provider: string;
        /** 回复播报：browser | off。 */
        tts: string;
        /** 云端 TTS 音色（仅 tts=cloud 生效）。 */
        ttsVoice: string;
        /** 进出实时模式的快捷键（'' = 关闭）。 */
        hotkey: string;
        /** 语音插话（默认关）：播报期间恢复收音，人声持续超出回声门才打断。 */
        bargeIn: boolean;
        turn: {
            /** 转写文字静默多久算「说完了」（毫秒）。 */
            settleMs: number;
            /** 静音窗口之后再宽限这么久才提交（毫秒）。 */
            tailMs: number;
        };
        /** 声学切段（仅 engine=segmented 生效）：只看 RMS，阈值是设备噪声底的函数。 */
        vad: {
            /** 采集帧长（毫秒）：越小越省延迟，越大越省调度开销。 */
            frameMs: number;
            /** RMS 高于此值算有声（0~1）。 */
            rms: number;
            /** 自动校准：实际判据 = max(rms, 静音期噪声底×3)，换设备免重校。 */
            rmsAuto: boolean;
            /** 连续静音多久切一段（毫秒）。 */
            silenceMs: number;
            /** 段前保留（毫秒）：不留就会切掉第一个音节。 */
            prerollMs: number;
            /** 实际语音短于此不成为一段（毫秒）。 */
            minSpeechMs: number;
            /** 单段语音长度上限（毫秒）。 */
            maxSegmentMs: number;
            /** 待转写队列上限（不含在途那段）。 */
            maxPending: number;
        };
        /** 单次对话上限（毫秒）：到点自动结束，麦克风不无人值守常开。 */
        maxSessionMs: number;
        speech: {
            /** 首句最少字数。 */
            firstSentenceMinChars: number;
            /** 朗读看门狗（毫秒）。 */
            utteranceWatchdogMs: number;
        };
    };
}
//# sourceMappingURL=settings.d.ts.map