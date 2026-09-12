/** 建连/关闭兜底超时（毫秒）：本机回环远低于此，云端握手一般也在内。 */
const CONNECT_TIMEOUT_MS = 15_000;
/** close() 后等 `session.finished` 的最长期限：服务端要先吐完在途 final。 */
const CLOSE_GRACE_MS = 3_000;
/** 默认 VAD：官方推荐值（低阈值灵敏度高，400ms 断句响应快）。 */
const DEFAULT_VAD = { threshold: 0.0, silenceDurationMs: 400 };
/** 一条与 qwen3-asr-flash-realtime 的实时连接。 */
class DashscopeRealtimeConnection {
    opts;
    /** CONNECTING 期上行缓冲上限：40ms 帧 ≈ 1.3s 语音；满了丢最旧（保新不保旧）。 */
    static PENDING_AUDIO_CAP = 32;
    ws;
    closed = false;
    sessionUpdateSent = false;
    /** 建连超时：close() 也要清（否则连接在 CONNECTING 中被关，15s 后 fail() 空转一次）。 */
    connectTimer;
    /** CONNECTING 期暂存的待发音频帧（有界；open 后按序冲刷，会话开头的帧不丢）。 */
    pendingAudio = [];
    onEvent = null;
    constructor(url, opts) {
        this.opts = opts;
        this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${opts.apiKey}` } });
        const fail = (code) => {
            if (this.closed)
                return;
            this.closed = true;
            clearTimeout(this.connectTimer);
            this.pendingAudio.length = 0; // 未送出的缓冲帧随连接作废
            try {
                this.ws.close();
            }
            catch { /* already closed */ }
            this.onEvent?.({ type: 'error', code });
        };
        this.connectTimer = setTimeout(() => fail('provider-timeout'), opts.connectTimeoutMs ?? CONNECT_TIMEOUT_MS);
        this.ws.onopen = () => {
            clearTimeout(this.connectTimer);
            if (this.closed)
                return;
            this.sendSessionUpdate();
            // 协议要求 session.update 先行：冲刷必须在 sendSessionUpdate 之后。
            try {
                this.flushPendingAudio();
            }
            catch { /* socket died during flush */ }
        };
        this.ws.onerror = () => {
            clearTimeout(this.connectTimer);
            fail('provider-unreachable');
        };
        this.ws.onclose = (ev) => {
            clearTimeout(this.connectTimer);
            // closed 已置位 = 由 close()/fail() 主动收尾（graceful 或已报过错），不重复报。
            // 走到这里 = 对端主动关闭且未报过错，用**规范定义的 wasClean**（关闭握手是否
            // 走完）分辨两种收尾：
            //   wasClean=false（code 1006）= 握手没走完 = RST/销毁式断连 → provider-unreachable
            //   wasClean=true（code 1000 等）= 对端正常挥手关闭 → provider-closed
            // 不能靠「onerror 有没有先到」来区分：undici 对销毁式断连是否补发 error 随 Node
            // 版本而变（22 只发 close、26 先发 error），同一个异常断连会因此在 22 上报
            // provider-closed、在 26 上报 provider-unreachable——实测两版 wasClean 一致，
            // 才是可依赖的判据。
            if (this.closed)
                return;
            this.closed = true;
            this.onEvent?.({ type: 'error', code: ev.wasClean === false ? 'provider-unreachable' : 'provider-closed' });
        };
        this.ws.onmessage = (msg) => {
            if (this.closed)
                return;
            const ev = this.mapServerEvent(String(msg.data));
            if (ev !== null)
                this.onEvent?.(ev);
        };
    }
    /** 连接建立后第一时间发 session.update（pcm/16000/server_vad）。 */
    sendSessionUpdate() {
        if (this.sessionUpdateSent || this.closed)
            return;
        this.sessionUpdateSent = true;
        const { vad } = this.opts;
        const v = vad === undefined ? DEFAULT_VAD : { ...DEFAULT_VAD, ...vad };
        const session = {
            input_audio_format: 'pcm',
            sample_rate: 16000,
            turn_detection: { type: 'server_vad', threshold: v.threshold, silence_duration_ms: v.silenceDurationMs },
        };
        if (this.opts.language !== undefined && this.opts.language !== '') {
            session.input_audio_transcription = { language: this.opts.language };
        }
        this.sendRaw({ type: 'session.update', session });
    }
    /** 上行一段 int16 LE PCM：base64 后走 input_audio_buffer.append。 */
    send(pcm) {
        if (this.closed || pcm.byteLength === 0)
            return;
        if (this.ws.readyState !== WebSocket.OPEN) {
            // CONNECTING（会话开头 ~100-500ms 握手窗口）：帧进有界缓冲，open 后按序冲刷，
            // 不再静默丢弃——否则开麦头几百毫秒的语音直接蒸发。缓冲满丢最旧（实时音频
            // 没有重放价值，保新不保旧）；CLOSING/CLOSED 无意义，维持丢弃。
            if (this.ws.readyState !== WebSocket.CONNECTING)
                return;
            if (this.pendingAudio.length >= DashscopeRealtimeConnection.PENDING_AUDIO_CAP)
                this.pendingAudio.shift();
            this.pendingAudio.push(pcm);
            return;
        }
        this.flushPendingAudio();
        const base64 = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).toString('base64');
        this.sendRaw({ type: 'input_audio_buffer.append', audio: base64 });
    }
    /** 把 CONNECTING 期缓冲的音频帧按序送出（open 后调用；随帧转 base64，不提前编码）。 */
    flushPendingAudio() {
        if (this.pendingAudio.length === 0)
            return;
        const frames = this.pendingAudio.splice(0);
        for (const frame of frames) {
            const base64 = Buffer.from(frame.buffer, frame.byteOffset, frame.byteLength).toString('base64');
            this.sendRaw({ type: 'input_audio_buffer.append', audio: base64 });
        }
    }
    /** 结束会话（幂等）：先发 session.finish，等 session.finished 或超时再关 WS。 */
    close() {
        if (this.closed)
            return;
        this.closed = true;
        clearTimeout(this.connectTimer);
        // VAD 模式下必须先发 session.finish 再关连接，否则服务端丢弃在途 final。
        try {
            this.sendRaw({ type: 'session.finish' });
        }
        catch { /* socket gone */ }
        const dispose = () => {
            // 兜底关闭也要摘掉监听：收尾期间加的 onFinished 挂在 ws 上，不摘会随连接
            // 一起滞留到 GC，且 session.finished 迟到时会 clear 一个已触发的 timer（无害
            // 但仍是无效操作）。幂等：ws.close() 对已关连接无副作用。
            this.ws.removeEventListener('message', onFinished);
            try {
                this.ws.close();
            }
            catch { /* already closed */ }
        };
        // 收到 session.finished 提前关；到点兜底强制关。
        const timer = setTimeout(dispose, CLOSE_GRACE_MS);
        const onFinished = (msg) => {
            try {
                const parsed = JSON.parse(String(msg.data));
                if (parsed.type === 'session.finished') {
                    clearTimeout(timer);
                    this.ws.removeEventListener('message', onFinished);
                    dispose();
                }
            }
            catch { /* non-JSON (ping etc.) ignore */ }
        };
        this.ws.addEventListener('message', onFinished);
    }
    /** 发一条客户端事件（JSON 文本帧）。 */
    sendRaw(payload) {
        this.ws.send(JSON.stringify(payload));
    }
    /** 服务端事件 → 接缝事件；无关事件（session.created/updated 等）返回 null。 */
    mapServerEvent(raw) {
        let parsed;
        try {
            parsed = JSON.parse(raw);
        }
        catch {
            return null; // 非 JSON（心跳注释等）忽略
        }
        switch (parsed.type) {
            case 'input_audio_buffer.speech_started':
                return { type: 'speech-started' };
            case 'input_audio_buffer.speech_stopped':
                return { type: 'speech-stopped' };
            case 'conversation.item.input_audio_transcription.text':
                // text=已确认前缀 + stash=仍在处理的草稿后缀：拼接才是当前完整预览。
                return { type: 'partial', text: `${parsed.text ?? ''}${parsed.stash ?? ''}` };
            case 'conversation.item.input_audio_transcription.completed':
                return { type: 'final', text: parsed.transcript ?? '' };
            case 'conversation.item.input_audio_transcription.failed':
                return { type: 'error', code: 'transcription-failed' };
            case 'error':
                return { type: 'error', code: parsed.error?.code ?? 'provider-error' };
            case 'session.finished':
                // 服务端收尾完成：连接使命结束，本地不必再报错（close() 兜底会关）。
                return null;
            default:
                return null; // session.created/updated/committed/item.created 等不需要
        }
    }
}
/** 真云端实时 provider 工厂（I5：host 侧 createProvider 用它）。 */
export function createDashscopeRealtimeProvider(opts) {
    const wssUrl = (opts.wssUrl ?? 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime').replace(/\/+$/, '');
    const model = opts.model ?? 'qwen3-asr-flash-realtime';
    const url = `${wssUrl}?model=${encodeURIComponent(model)}`;
    return {
        connect: async () => {
            if (!opts.apiKey)
                throw new Error('dashscope realtime: no API key');
            return new DashscopeRealtimeConnection(url, opts);
        },
    };
}
//# sourceMappingURL=realtime-dashscope.js.map