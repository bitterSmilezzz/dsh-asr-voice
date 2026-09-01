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
/** 云端 ASR 调用通道：whisper 式 multipart /audio/transcriptions，或 chat-completions input_audio（MiMo / Qwen-ASR）。 */
export type CloudAsrMode = 'auto' | 'transcriptions' | 'chat';
/** 一个云端 ASR 预置。 */
export interface CloudPreset {
    /** 稳定 id（settings 里存的 preset 值）。 */
    id: string;
    /** 设置页显示名。 */
    label: string;
    /** OpenAI-compatible base URL（不含 /audio/transcriptions）。 */
    baseUrl: string;
    /** 默认模型（可改）。 */
    defaultModel: string;
    /** 调用通道（auto = 按模型名自动判定；transcriptions = whisper 式 /audio/transcriptions；chat = chat.completions input_audio）。 */
    mode: CloudAsrMode;
    /** 简介（设置页提示）。 */
    hint: string;
}
/** 内置预置：OpenAI / Groq（国际）+ 硅基流动 / 小米 MiMo / 通义 Qwen-ASR（国产）。 */
export declare const CLOUD_PRESETS: readonly CloudPreset[];
/** 按 id 取预置（找不到返回 undefined）。 */
export declare function presetById(id: string): CloudPreset | undefined;
/**
 * 实时转写 provider 预置（I5：真云端 provider 行）。
 * 与 CLOUD_PRESETS 独立：实时走 WebSocket（wss://…/api-ws/v1/realtime），
 * 不是 OpenAI-compatible HTTP。凭据复用同名官方 LLM provider（keyPreset 指回
 * CLOUD_PRESETS 里的预置 id，`keyRefFor` 因此派生成 `<PRESET>_API_KEY`）。
 */
export interface RealtimePreset {
    /** 稳定 id（settings `realtime.provider` 存的值；'' = 未配置走内置模拟）。 */
    id: string;
    /** 设置页显示名。 */
    label: string;
    /** WebSocket 根地址（不含 model query，由 defaultModel 拼上）。 */
    wssUrl: string;
    /** 默认实时模型（可改）。 */
    defaultModel: string;
    /** 凭据复用哪个 CLOUD_PRESETS 预置（keyRefFor 派生引用名）。 */
    keyPreset: string;
    /** 简介（设置页提示）。 */
    hint: string;
}
/** 内置实时预置：阿里云百炼 Qwen-ASR Realtime（服务端 VAD 断句）。 */
export declare const REALTIME_PRESETS: readonly RealtimePreset[];
/** 按 id 取实时预置（找不到返回 undefined）。 */
export declare function realtimePresetById(id: string): RealtimePreset | undefined;
/** 预置默认 id。 */
export declare const DEFAULT_PRESET_ID = "openai";
/** 云端 ASR 端点（拼在 baseUrl 之后，whisper 式通道用）。 */
export declare const TRANSCRIBE_PATH = "/audio/transcriptions";
/** chat-completions 通道端点（拼在 baseUrl 之后）。 */
export declare const CHAT_COMPLETIONS_PATH = "/chat/completions";
/** 上传/代理的音频大小上限（字节），防滥用。 */
export declare const MAX_AUDIO_BYTES: number;
/** 按模型名自动判定调用通道：chat 音频大模型 vs whisper 式 /audio/transcriptions。 */
export declare function autoModeForModel(model: string): CloudAsrMode;
/** 解析最终调用通道：显式模式优先，auto 按模型名判定。 */
export declare function resolveAsrMode(mode: string, model: string): CloudAsrMode;
//# sourceMappingURL=presets.d.ts.map