/**
 * dsh-asr-voice — host 半区：settings namespace + schema（设置页配置的权威源）。
 *
 * 所有 API key（云端 ASR / LLM 优化）只存 host settings（服务端），
 * 浏览器经 /api/asr-voice/* 代理调用，key 不进前端。
 */
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import z from '@deepseek-ai/schemastery';

/** 插件配置页的 settings namespace：注册后出现在「设置 → 插件 → 配置」分派列表。 */
export const ASR_VOICE_SETTINGS_NAMESPACE: SettingsNamespace = settingsNamespace('asr-voice')

/** 云端 ASR 配置。 */
export const CloudSchema = z.object({
  /** 预置 id（openai | groq | siliconflow | dashscope | custom）。 */
  preset: z.string().default('openai'),
  /** OpenAI-compatible base URL（预置自动填充，可改）。 */
  baseUrl: z.string().default(''),
  /** 服务端保存的 API key（浏览器不可读）。 */
  apiKey: z.string().default(''),
  /** ASR 模型（预置自动填充，可改）。 */
  model: z.string().default(''),
})

/** LLM 提示词优化配置（独立 OpenAI-compatible chat completions）。 */
export const LlmSchema = z.object({
  baseUrl: z.string().default(''),
  apiKey: z.string().default(''),
  model: z.string().default(''),
})

/** 插件设置 schema（与 client 的 AsrVoiceConfig 结构一致）。 */
export const AsrVoiceSettingsSchema = z.object({
  /** ASR 引擎：browser（Web Speech API，默认）/ cloud（云端 OpenAI-compatible）。 */
  asr: z.object({
    provider: z.string().default('browser'),
    cloud: CloudSchema,
  }),
  /** 提示词优化：llm（默认，用当前所选 LLM 重写）/ heuristic（本地启发式，可选）。 */
  optimize: z.object({
    mode: z.string().default('llm'),
    llm: LlmSchema,
  }),
  /** 识别语言：auto（跟随浏览器/系统）/ zh-CN / en-US / …。 */
  language: z.string().default('auto'),
  /** 交互行为。 */
  behavior: z.object({
    /** 识别优化完成后是否自动发送（默认关，防误发）。 */
    autoSend: z.boolean().default(false),
    /** 按住说话模式（可选）。 */
    holdToTalk: z.boolean().default(false),
    /** 快捷键（默认 Ctrl+Shift+Space，可改；'' 表示关闭）。 */
    hotkey: z.string().default('Ctrl+Shift+Space'),
  }),
})

export type AsrVoiceSettings = Schemastery.TypeT<typeof AsrVoiceSettingsSchema>

/** 设置默认值（与 schema default 一致；client 侧也用同一份，避免双源漂移）。 */
export const DEFAULT_SETTINGS: AsrVoiceSettings = {
  asr: { provider: 'browser', cloud: { preset: 'openai', baseUrl: '', apiKey: '', model: '' } },
  optimize: { mode: 'llm', llm: { baseUrl: '', apiKey: '', model: '' } },
  language: 'auto',
  behavior: { autoSend: false, holdToTalk: false, hotkey: 'Ctrl+Shift+Space' },
}
