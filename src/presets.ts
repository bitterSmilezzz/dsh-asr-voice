/**
 * dsh-asr-voice — 云端 ASR 预置表（host 与 client 共享，双半区各自编译）。
 *
 * 全部走 OpenAI-compatible `/audio/transcriptions` 端点，统一字段：
 *   baseUrl  +  apiKey  +  model
 * 预置只是「快捷填充」，用户可任意改 baseUrl / model（自定义端点天然兼容
 * 本地/私有部署的 OpenAI-compatible ASR 服务，如 local-ai）。
 *
 * 跨平台说明：云端 ASR 是纯 HTTP，macOS / Windows 行为一致。
 */

/** 一个云端 ASR 预置。 */
export interface CloudPreset {
  /** 稳定 id（settings 里存的 preset 值）。 */
  id: string
  /** 设置页显示名。 */
  label: string
  /** OpenAI-compatible base URL（不含 /audio/transcriptions）。 */
  baseUrl: string
  /** 默认模型（可改）。 */
  defaultModel: string
  /** 简介（设置页提示）。 */
  hint: string
}

/** 内置预置：OpenAI / Groq（国际）+ 硅基流动 / 通义 Qwen-ASR（国产）。 */
export const CLOUD_PRESETS: readonly CloudPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI Whisper',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'whisper-1',
    hint: 'OpenAI 官方 /audio/transcriptions',
  },
  {
    id: 'groq',
    label: 'Groq Whisper',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'whisper-large-v3',
    hint: 'Groq 高速推理，whisper-large-v3',
  },
  {
    id: 'siliconflow',
    label: '硅基流动 SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'FunAudioLLM/SenseVoiceSmall',
    hint: '国产，SenseVoice 系语音识别',
  },
  {
    id: 'dashscope',
    label: '通义/阿里云百炼 Qwen-ASR',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen3-asr-flash',
    hint: '国产，Qwen-ASR（compatible-mode OpenAI 兼容）',
  },
]

/** 按 id 取预置（找不到返回 undefined）。 */
export function presetById(id: string): CloudPreset | undefined {
  return CLOUD_PRESETS.find((p) => p.id === id)
}

/** 预置默认 id。 */
export const DEFAULT_PRESET_ID = 'openai'

/** 云端 ASR 端点（拼在 baseUrl 之后）。 */
export const TRANSCRIBE_PATH = '/audio/transcriptions'

/** 上传/代理的音频大小上限（字节），防滥用。 */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024
