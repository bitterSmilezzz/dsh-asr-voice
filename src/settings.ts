/**
 * dsh-asr-voice — host 半区：settings namespace + schema（设置页配置的权威源）。
 *
 * 所有 API key（云端 ASR / LLM 优化）只存 host settings（服务端），
 * 浏览器经 /api/asr-voice/* 代理调用，key 不进前端。
 *
 * 云端 ASR 支持**多供应商**（v0.2）：`asr.cloud.providers` 为供应商列表（每个含
 * 自己的 baseUrl/apiKey/model/mode），`asr.cloud.active` 指定当前使用的供应商 id。
 * 兼容旧单配置：仍保留 preset/baseUrl/apiKey/model/mode 顶层字段，读取时若无
 * providers 则回退到旧单配置（向后兼容，写回优先新 shape）。
 */
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';

/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export const ASR_VOICE_SETTINGS_NAMESPACE: SettingsNamespace = settingsNamespace('asr-voice')

/** 单个云端 ASR 供应商配置。 */
export const CloudProviderSchema = z.object({
  /** 供应商唯一 id（新增时由前端生成，如 crypto.randomUUID）。 */
  id: z.string().default(''),
  /** 预置 id（openai | groq | siliconflow | mimo | dashscope | custom）。 */
  preset: z.string().default('openai'),
  /** OpenAI-compatible base URL（预置自动填充，可改）。 */
  baseUrl: z.string().default(''),
  /** 服务端保存的 API key（浏览器不可读；MiMo 端点留空可复用 DSH 凭据 MIMO_API_KEY）。 */
  apiKey: z.string().default(''),
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
  apiKey: z.string().default(''),
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
  baseUrl: string
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
