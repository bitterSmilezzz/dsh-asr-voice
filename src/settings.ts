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
export const ASR_VOICE_SETTINGS_NAMESPACE = 'asr-voice'

/** 单个云端 ASR 供应商配置（密钥不在此处，见文件头）。 */
export const CloudProviderSchema = z.object({
  /** 供应商唯一 id（新增时由前端生成，如 crypto.randomUUID）。 */
  id: z.string().default(''),
  /** 预置 id（openai | groq | siliconflow | mimo | dashscope | custom）。 */
  preset: z.string().default('openai'),
  /** 显示名；自定义供应商同时是凭据引用名的派生依据（见 src/key-ref.ts）。 */
  name: z.string().default(''),
  /** OpenAI-compatible base URL（预置自动填充，可改）。 */
  baseUrl: z.string().default(''),
  /** 遗留密钥位置：只由 src/index.ts 的一次性迁移读取并搬进 credentials，之后恒为空。 */
  apiKey: z.string().default('').role('secret'),
  /** ASR 模型（预置自动填充，可改；可经「获取模型」动态拉取）。 */
  model: z.string().default(''),
  /** 调用通道：auto（按模型名判定）/ transcriptions（whisper 式）/ chat（MiMo/Qwen-ASR）。 */
  mode: z.string().default('auto'),
})

/** 云端 ASR 配置：多供应商列表 + active（含旧单配置兼容字段）。 */
// 显式注解为 any：数组 default 会让推断类型引用 cosmokit 的 Dict，声明发射时报
// TS2883（不可移植）；业务类型用下方手写 AsrVoiceSettings 接口兜底。
export const CloudSchema: any = z.object({
  /** 多供应商列表（新 shape）。 */
  providers: z.array(CloudProviderSchema).default([] as never[]),
  /** 当前使用的供应商 id（空 = 取第一个）。 */
  active: z.string().default(''),
  /** ── 兼容旧单配置（v0.1 遗留；读取时回退，写回优先新 shape） ── */
  preset: z.string().default('openai'),
  baseUrl: z.string().default(''),
  /** 遗留密钥位置，同 CloudProviderSchema.apiKey。 */
  apiKey: z.string().default('').role('secret'),
  model: z.string().default(''),
  mode: z.string().default('auto'),
})

/** LLM 提示词优化目标（DSH 已配置模型的 provider/model；空 = 用当前所选 LLM）。 */
export const LlmSchema = z.object({
  provider: z.string().default(''),
  model: z.string().default(''),
})

/** 插件设置 schema（与 client 的 AsrVoiceConfig 结构一致）。 */
export const AsrVoiceSettingsSchema: any = z.object({
  /** ASR 引擎：auto（默认，浏览器 Web Speech 优先、失败自动切云端）/ browser / cloud。 */
  asr: z.object({
    provider: z.string().default('auto'),
    cloud: CloudSchema,
  }),
  /** 提示词优化：llm（默认，用当前所选 LLM 重写）/ heuristic（本地启发式，可选）。 */
  optimize: z.object({
    mode: z.string().default('llm'),
    /** LLM 模式下的入框方式：false（默认）= 停止录音立即填入清洗版文本，优化后台完成后自动替换（不覆盖用户编辑）；true = 等优化完成弹预览卡确认后填入。 */
    preview: z.boolean().default(false),
    llm: LlmSchema,
  }),
  /** 识别语言：auto（跟随浏览器/系统）/ zh-CN / en-US / …。 */
  language: z.string().default('auto'),
  /** 交互行为。 */
  behavior: z.object({
    /** 识别优化完成后是否自动发送（默认关，防误发）。 */
    autoSend: z.boolean().default(false),
    /** 静音自动停止（默认关 = 只有手动点击/快捷键结束录音）。 */
    silenceStop: z.boolean().default(false),
    /** 按住说话模式（可选）。 */
    holdToTalk: z.boolean().default(false),
    /** 快捷键（默认 Ctrl+Shift+Space，可改；'' 表示关闭）。 */
    hotkey: z.string().default('Ctrl+Shift+Space'),
    /** 文本输入模式：replace（完整替换草稿，默认）/ append（在已有文字后插入）。 */
    textMode: z.string().default('replace'),
    /** 生成内容自动加入剪贴板（默认开）。 */
    copyToClipboard: z.boolean().default(true),
  }),
})

/**
 * 业务侧类型（手写，不依赖 schema 推断——schema 已注解为 Schemastery.Schema
 * 以便声明可移植，TypeT 会退化为 any）。
 */
export interface AsrVoiceCloudProvider {
  id: string
  preset: string
  /** 显示名（自定义行的凭据引用派生依据）。 */
  name: string
  baseUrl: string
  /** 遗留密钥位置：只有 host 读得到（role('secret') 使它不上线），迁移后即恒为空。 */
  apiKey: string
  model: string
  mode: string
}

export interface AsrVoiceSettings {
  asr: {
    provider: string
    cloud: {
      providers: AsrVoiceCloudProvider[]
      active: string
      preset: string
      baseUrl: string
      apiKey: string
      model: string
      mode: string
    }
  }
  optimize: {
    mode: string
    /** LLM 模式入框方式：false（默认）= 快速入框+后台优化替换；true = 预览卡确认。 */
    preview: boolean
    llm: { provider: string; model: string }
  }
  language: string
  behavior: {
    autoSend: boolean
    /** 静音自动停止（默认关 = 手动关麦）。 */
    silenceStop: boolean
    holdToTalk: boolean
    hotkey: string
    textMode: string
    copyToClipboard: boolean
  }
}

/** 设置默认值（与 schema default 一致；client 侧也用同一份，避免双源漂移）。 */
export const DEFAULT_SETTINGS: AsrVoiceSettings = {
  asr: { provider: 'auto', cloud: { providers: [], active: '', preset: 'openai', baseUrl: '', apiKey: '', model: '', mode: 'auto' } },
  optimize: { mode: 'llm', preview: false, llm: { provider: '', model: '' } },
  language: 'auto',
  behavior: { autoSend: false, silenceStop: false, holdToTalk: false, hotkey: 'Ctrl+Shift+Space', textMode: 'replace', copyToClipboard: true },
}
