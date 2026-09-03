/** dsh-asr-voice — I6：云端 TTS 通道（host 半区）。
 * 浏览器不持 API key（与 ASR 同构）：文本经本插件私有路由上行，host 用 DSH 凭据
 * 打开阿里云百炼 Qwen-TTS-Realtime WebSocket，把 base64 PCM 转回浏览器播放。
 * 协议（官方文档 help.aliyun.com/zh/model-studio/qwen-tts-realtime-api-reference）：
 * WebSocket  URL = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime`
 * 认证          = 握手 `Authorization: Bearer <api_key>`
 * 客户端事件     = session.update（voice/response_format=pcm/sample_rate）→
 * input_text_buffer.append(text) → input_text_buffer.commit →
 * session.finish
 * 服务端事件     = session.created/updated → response.created →
 * response.audio.delta（base64 PCM，可多片）→ response.audio.done →
 * response.done → session.finished；error
 * 设计：一次 HTTP 请求 = 合成一整句。句子由 client 分句泵切成可念块（≤200 字符），
 * 整段 PCM 一次返回即可（数秒语音 ≈ 几十 KB），不需要会话注册表与流式下行——
 * 无状态、无泄漏面，比 TTS 版 RealtimeHost 简单得多。音色默认 Cherry。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** TTS 请求体（浏览器上行，无密钥材料）。 */
export interface TtsRequest {
    /** 要合成的文本（一整句；空或超长拒绝）。 */
    text: string;
    /** 音色（可选，默认 Cherry；只透传给上游，不校验）。 */
    voice?: string;
}
/** 一次合成的结果。 */
export interface TtsResult {
    /** 合成音频：16k 单声道 int16 LE 小端字节（与采集链路同采样率，播放端零重采样）。 */
    pcm: Uint8Array;
    /** 上游标称采样率（未用到，保留供诊断）。 */
    sampleRate: number;
}
/** 建一条 DashScope TTS 连接并合成一整句。 */
export declare function synthesize(apiKey: string, text: string, voice?: string, wssUrl?: string): Promise<TtsResult>;
/** 注册 TTS 路由：POST /api/asr-voice/tts。 */
export declare function registerTtsRoute(register: (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void, getTtsConfig: () => {
    preset: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    mode: string;
} | undefined, ctx: unknown): () => void;
//# sourceMappingURL=realtime-tts.d.ts.map