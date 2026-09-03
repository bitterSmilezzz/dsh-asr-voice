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
/** 16k 采样率（与 client 的 PCM_SAMPLE_RATE 一致；host 不 import client，本地定义）。 */
const SAMPLE_RATE = 16_000;
/** 分析窗长（毫秒）：VAD 的时间分辨率，不开放。 */
const WINDOW_MS = 20;
/** 假 provider 默认调参：阈值偏低（假数据通常安静），便于测试造简单波形。 */
export const FAKE_REALTIME_DEFAULTS = {
    rms: 0.02,
    silenceMs: 600,
    minSpeechMs: 200,
    maxSegmentMs: 8_000,
    partialMs: 600,
};
/** int16 小端字节块 → RMS（0~1）。 */
function rmsInt16(data) {
    const n = data.byteLength >> 1;
    if (n === 0)
        return 0;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let sum = 0;
    for (let i = 0; i < n; i++) {
        const s = view.getInt16(i * 2, true) / 0x8000;
        sum += s * s;
    }
    return Math.sqrt(sum / n);
}
/** 假 provider 的连接实现：能量 VAD 把 PCM 切成句，按句吐 partial → final。 */
class FakeRealtimeConnection {
    tuning;
    onEvent = null;
    silenceWindows;
    minSpeechWindows;
    maxSegmentWindows;
    partialWindows;
    /** 攒窗缓冲（一个分析窗的 int16 字节）。 */
    win = new Uint8Array((SAMPLE_RATE * WINDOW_MS) / 1000 * 2);
    winLen = 0;
    speaking = false;
    silenceRun = 0;
    speechWindows = 0;
    sincePartial = 0;
    /** 已交出的句数（final 序号）。 */
    segNo = 0;
    closed = false;
    constructor(tuning) {
        this.tuning = tuning;
        this.silenceWindows = Math.max(1, Math.round(tuning.silenceMs / WINDOW_MS));
        this.minSpeechWindows = Math.max(1, Math.round(tuning.minSpeechMs / WINDOW_MS));
        this.maxSegmentWindows = Math.max(this.minSpeechWindows + 1, Math.round(tuning.maxSegmentMs / WINDOW_MS));
        this.partialWindows = Math.max(1, Math.round(tuning.partialMs / WINDOW_MS));
    }
    emit(ev) {
        if (!this.closed)
            this.onEvent?.(ev);
    }
    /** 处理一个完整分析窗（int16 字节，长度 = 窗采样数 × 2）。 */
    handleWindow(bytes) {
        const voiced = rmsInt16(bytes) > this.tuning.rms;
        if (!this.speaking) {
            if (!voiced)
                return;
            this.speaking = true;
            this.silenceRun = 0;
            this.speechWindows = 1;
            this.sincePartial = this.partialWindows; // 开句立即吐一次 partial
            this.emit({ type: 'speech-started' });
            this.emit({ type: 'partial', text: `模拟转写·第${this.segNo + 1}段` });
            return;
        }
        if (voiced) {
            this.speechWindows += 1; // minSpeech/maxSegment 只数「有声」窗，静音窗不拉长语音时长
            this.silenceRun = 0;
        }
        else {
            this.silenceRun += 1;
        }
        this.sincePartial += 1;
        if (this.sincePartial >= this.partialWindows) {
            this.sincePartial = 0;
            this.emit({ type: 'partial', text: `模拟转写·第${this.segNo + 1}段…` });
        }
        // 静音闭合一段，或说到段上限强制轮换：都算「这一句说完了」。
        if (this.silenceRun >= this.silenceWindows || this.speechWindows >= this.maxSegmentWindows) {
            this.closeSegment();
        }
    }
    /** 收口当前段：段长达标交 final（杂音/咳嗽不占回合），太短只发 VAD 边界。 */
    closeSegment() {
        this.speaking = false;
        if (this.speechWindows >= this.minSpeechWindows) {
            this.segNo += 1;
            this.emit({ type: 'speech-stopped' });
            this.emit({ type: 'final', text: `模拟转写·第${this.segNo}段` });
        }
        else {
            this.emit({ type: 'speech-stopped' });
        }
    }
    send(pcm) {
        if (this.closed || pcm.byteLength === 0)
            return;
        const bytes = pcm instanceof Uint8Array ? pcm : new Uint8Array(pcm);
        let i = 0;
        while (i < bytes.byteLength) {
            const take = Math.min(bytes.byteLength - i, this.win.byteLength - this.winLen);
            this.win.set(bytes.subarray(i, i + take), this.winLen);
            this.winLen += take;
            i += take;
            if (this.winLen >= this.win.byteLength) {
                const full = this.win.slice();
                this.winLen = 0;
                this.handleWindow(full);
            }
        }
    }
    close() {
        if (this.closed)
            return;
        // 收尾：正在说的一段也交掉，别让最后一句凭空消失（对齐真实通道的 session.finish）。
        // 必须在置 closed=true 之前 emit——emit() 会拒绝已关闭连接上的事件。
        if (this.speaking)
            this.closeSegment();
        this.closed = true;
    }
}
/** 创建假 provider（I3 阶段 host 用它驱动整条通道；I5 换成真 provider 实现）。 */
export function createFakeRealtimeProvider(tuning = FAKE_REALTIME_DEFAULTS) {
    return {
        connect: async () => new FakeRealtimeConnection(tuning),
    };
}
//# sourceMappingURL=realtime-provider.js.map