/** 建连/关闭兜底超时（毫秒）：本机回环远低于此，云端握手一般也在内。 */
const CONNECT_TIMEOUT_MS = 15_000;
/** close() 后等 `session.finished` 的最长期限：服务端要先吐完在途 final。 */
const CLOSE_GRACE_MS = 3_000;
/** 默认 VAD：官方推荐值（低阈值灵敏度高，400ms 断句响应快）。 */
const DEFAULT_VAD = { threshold: 0.0, silenceDurationMs: 400 };
/** 一条与 qwen3-asr-flash-realtime 的实时连接。 */
class DashscopeRealtimeConnection {
    opts;
    ws;
    closed = false;
    sessionUpdateSent = false;
    /** 建连超时：close() 也要清（否则连接在 CONNECTING 中被关，15s 后 fail() 空转一次）。 */
    connectTimer;
    onEvent = null;
    constructor(url, opts) {
        this.opts = opts;
        this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${opts.apiKey}` } });
        const fail = (code) => {
            if (this.closed)
                return;
            this.closed = true;
            clearTimeout(this.connectTimer);
            try {
                this.ws.close();
            }
            catch { /* already closed */ }
            this.onEvent?.({ type: 'error', code });
        };
        this.connectTimer = setTimeout(() => fail('provider-timeout'), CONNECT_TIMEOUT_MS);
        this.ws.onopen = () => {
            clearTimeout(this.connectTimer);
            if (this.closed)
                return;
            this.sendSessionUpdate();
        };
        this.ws.onerror = () => {
            clearTimeout(this.connectTimer);
            fail('provider-unreachable');
        };
        this.ws.onclose = () => {
            clearTimeout(this.connectTimer);
            if (this.closed)
                return;
            this.closed = true;
            // 正常由 close() 主动关闭（已发 session.finish）→ 不报错；对端异常断开才算错。
            if (!this.byGracefulClose)
                this.onEvent?.({ type: 'error', code: 'provider-closed' });
        };
        this.ws.onmessage = (msg) => {
            if (this.closed)
                return;
            const ev = this.mapServerEvent(String(msg.data));
            if (ev !== null)
                this.onEvent?.(ev);
        };
    }
    /** 是否正由 close() 的优雅收尾阶段关闭（避免 onclose 误报 error）。 */
    byGracefulClose = false;
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
        // undici 的 send() 在 CONNECTING/CLOSING 态会抛 InvalidStateError：连接尚未就绪时静默丢弃
        // （host 侧只在会话建立后才开始上行，正常不会丢；此处只是防御）。
        if (this.ws.readyState !== WebSocket.OPEN)
            return;
        const base64 = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).toString('base64');
        this.sendRaw({ type: 'input_audio_buffer.append', audio: base64 });
    }
    /** 结束会话（幂等）：先发 session.finish，等 session.finished 或超时再关 WS。 */
    close() {
        if (this.closed)
            return;
        this.byGracefulClose = true;
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