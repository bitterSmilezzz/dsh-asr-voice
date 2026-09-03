/** dsh-asr-voice — host 半区：实时转写 provider 接缝 + 假 provider（I3 交付）。
 * `RealtimeProvider` 是 host 与上游实时 ASR 之间的最小契约：浏览器 PCM 上行经
 * `RealtimeHost`（realtime-host.ts）转发到这里，provider 回吐流式事件
 * （speech-started / partial / final / speech-stopped / error），再由 host 经
 * SSE 下行推给浏览器。
 * 为什么要有接缝：I3 阶段没有真云端可连（真 provider 是 I5 的 qwen3-asr-flash-realtime，
 * 走 OpenAI-compatible Realtime API over WebSocket）。接缝让 host 通道先于真实上游
 * 建成并单测，I5 只新增一个 `RealtimeProvider` 实现，接缝与 host 通道一行不改。
 * 假 provider 用能量 VAD 把进来的 PCM 切成「句」：句内周期吐 partial、句尾吐 final +
 * speech-stopped——行为形状对齐真流式通道（先 partial 后 final，服务端 VAD 断句），
 * 因此 I4 用它能端到端验证字幕与播放。纯 Node 标准库，macOS / Windows 双平台。
 */
/** 上游实时 ASR 事件（host → 浏览器 SSE 行）。形状对齐 qwen3-asr-flash-realtime： 服务端 VAD 断句（speech_started / speech_stopped），流式转写（先 partial 后 final）。 */
export type RealtimeProviderEvent = 
/** 一句话的中间结果：字幕更新用（可丢、可合并，背压时 coalesce）。 */
{
    type: 'partial';
    text: string;
}
/** 一句话转写完成：回合判定与最终字幕用（背压时不可丢）。 */
 | {
    type: 'final';
    text: string;
}
/** 服务端 VAD 检测到语音起点（对齐 qwen 的 input_audio_buffer.speech_started）。 */
 | {
    type: 'speech-started';
}
/** 服务端 VAD 检测到语音终点（对齐 qwen 的 input_audio_buffer.speech_stopped）。 */
 | {
    type: 'speech-stopped';
}
/** 上游会话级错误（对齐 qwen 的 error）。 */
 | {
    type: 'error';
    code: string;
};
/** 一条与上游 provider 的实时连接。 */
export interface RealtimeProviderConnection {
    /** 上行 PCM：16k 单声道 int16 小端字节（与 capture.ts 的 16k Float32 对齐后量化）。 */
    send(pcm: Uint8Array): void;
    /** 结束会话并释放连接（幂等）。 */
    close(): void;
    /** 上游事件回调（connect 后立即设置；close 后不再回调）。 */
    onEvent: ((ev: RealtimeProviderEvent) => void) | null;
}
/** 实时 ASR provider 工厂：每次会话建立一条新连接。 */
export interface RealtimeProvider {
    connect(): Promise<RealtimeProviderConnection>;
}
/** 假 provider 的 VAD 调参（仅测试/开发用，不进 settings：真 provider 的断句在服务端）。 */
export interface FakeRealtimeTuning {
    /** RMS 判有声阈值（0~1，按 int16 全幅 32768 归一）。 */
    rms: number;
    /** 连续静音多久切一段（毫秒）。 */
    silenceMs: number;
    /** 实际语音短于此不成为一段（毫秒）：杂音不该占一次「回合」。 */
    minSpeechMs: number;
    /** 单段语音长度上限（毫秒）：说个不停也要轮换出 final。 */
    maxSegmentMs: number;
    /** 句内每隔多久吐一次 partial（毫秒）。 */
    partialMs: number;
}
/** 假 provider 默认调参：阈值偏低（假数据通常安静），便于测试造简单波形。 */
export declare const FAKE_REALTIME_DEFAULTS: FakeRealtimeTuning;
/** 创建假 provider（I3 阶段 host 用它驱动整条通道；I5 换成真 provider 实现）。 */
export declare function createFakeRealtimeProvider(tuning?: FakeRealtimeTuning): RealtimeProvider;
//# sourceMappingURL=realtime-provider.d.ts.map