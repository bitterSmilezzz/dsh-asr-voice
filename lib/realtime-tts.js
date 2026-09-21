import { guardRoute, readJsonBody, sendJson } from "./http.js";
import { resolveApiKey } from "./transcribe.js";
/** 文本长度上限（字符）：client 分句泵已切 ≤200 的块，这里防御性设上限。 */
const MAX_TEXT_CHARS = 500;
/** 合成等待上限（毫秒）：一句语音正常远低于此。 */
const TTS_TIMEOUT_MS = 20_000;
/** 合成 PCM 累计上限（字节）：4MB ≈ 16k 单声道 130 秒语音，仍远超「一整句」的正常量级。
 *  此前只受 20s 墙钟约束——上游（或用户自填的 wssUrl）狂发 delta 时，20 秒足够堆出
 *  几百 MB，宿主直接 OOM。上限从 8MB 下调到 4MB：响应路径还要再放大一层
 *  （PCM Buffer → base64 字符串 → JSON.stringify → byteLength Buffer，sendJson
 *  同时持有约 4 份），8MB PCM 的瞬时峰值接近 40MB/请求，与 MAX_INFLIGHT 相乘就是
 *  宿主内存的主要风险面。 */
const MAX_PCM_BYTES = 4 * 1024 * 1024;
/** 合成在途上限：与兄弟路由 transcribe/optimize 的 MAX_INFLIGHT 同值同语义。
 *  TTS 每条请求都会开一条**云端付费 WebSocket**并堆一份 PCM，无上限时异常页面
 *  循环 POST 会让宿主同时持有 N 条 dashscope WS + N 份音频缓冲。
 *  超限立刻拒绝，连 body 都不读（并发峰值就是内存峰值）。 */
const MAX_INFLIGHT = 4;
/** 建一条 DashScope TTS 连接并合成一整句。 */
export async function synthesize(apiKey, text, voice = 'Cherry', wssUrl = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime') {
    if (!apiKey)
        throw new Error('cloud tts: no API key');
    if (text.trim() === '')
        throw new Error('cloud tts: empty text');
    if (text.length > MAX_TEXT_CHARS)
        throw new Error(`cloud tts: text too long (${text.length} > ${MAX_TEXT_CHARS})`);
    const url = `${wssUrl.replace(/\/+$/, '')}?model=${encodeURIComponent('qwen3-tts-flash-realtime')}`;
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    return await new Promise((resolve, reject) => {
        const chunks = [];
        let pcmBytes = 0;
        let settled = false;
        let sessionReady = false;
        let textSent = false;
        let audioDone = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                try {
                    ws.close();
                }
                catch { /* noop */ }
                reject(new Error('cloud tts: timeout'));
            }
        }, TTS_TIMEOUT_MS);
        const finish = (pcm) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            // 收完先优雅关：session.finish 通知服务端清理（socket 保持打开到 finally 才 close，
            // 否则这条帧会被 close 截断）。
            try {
                ws.send(JSON.stringify({ type: 'session.finish', event_id: ev() }));
            }
            catch { /* noop */ }
            resolve({ pcm, sampleRate: 16000 });
        };
        const fail = (code) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            try {
                ws.close();
            }
            catch { /* noop */ }
            reject(new Error(`cloud tts: ${code}`));
        };
        ws.onopen = () => {
            // 连接建立后先配会话（音色/格式/采样率），再送文本触发合成。
            try {
                ws.send(JSON.stringify({
                    type: 'session.update',
                    event_id: ev(),
                    session: { voice, response_format: 'pcm', sample_rate: 16000 },
                }));
            }
            catch {
                fail('socket-closed');
            }
        };
        ws.onmessage = (msg) => {
            if (settled)
                return;
            let evt;
            try {
                evt = JSON.parse(String(msg.data));
            }
            catch {
                return;
            }
            switch (evt.type) {
                case 'session.updated':
                    sessionReady = true;
                    break;
                case 'response.audio.delta':
                    if (evt.delta !== undefined && evt.delta !== '') {
                        const delta = Buffer.from(evt.delta, 'base64');
                        pcmBytes += delta.length;
                        // 累计超限即收口失败：一句正常语音远达不到 8MB，到这里就是上游异常。
                        if (pcmBytes > MAX_PCM_BYTES) {
                            fail('response-too-large');
                            break;
                        }
                        chunks.push(delta);
                    }
                    break;
                case 'response.audio.done':
                    audioDone = true;
                    // 音频数据收齐：合成完成，直接收口（不再等 response.done——部分模型不保证送达）。
                    if (chunks.length > 0)
                        finish(Buffer.concat(chunks));
                    break;
                case 'response.done':
                    // 兜底：某些实现只发 response.done 不发 audio.done。
                    if (!audioDone && chunks.length > 0)
                        finish(Buffer.concat(chunks));
                    break;
                case 'error':
                    fail(evt.error?.code ?? 'provider-error');
                    break;
                default:
                    break;
            }
            // 会话就绪且还没送文本：append + commit 触发合成（只送一次）。
            if (sessionReady && !textSent) {
                textSent = true;
                try {
                    ws.send(JSON.stringify({ type: 'input_text_buffer.append', event_id: ev(), text }));
                    ws.send(JSON.stringify({ type: 'input_text_buffer.commit', event_id: ev() }));
                }
                catch {
                    fail('socket-closed');
                }
            }
        };
        ws.onerror = () => fail('provider-unreachable');
        ws.onclose = () => {
            // 对端先断：已收到音频就按结果收口，否则是异常断连。
            clearTimeout(timer);
            if (settled)
                return;
            if (chunks.length > 0) {
                finish(Buffer.concat(chunks));
            }
            else {
                fail('provider-closed');
            }
        };
    }).finally(() => {
        // session.finish 是异步入队的：立刻 close 会把这条帧截断，让出几毫秒再关。
        setTimeout(() => { try {
            ws.close();
        }
        catch { /* noop */ } }, 50);
    });
}
/** 简单的 event_id（协议要求会话内唯一；这里一次请求一个连接，随机即可）。 */
function ev() {
    return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
/** 注册 TTS 路由：POST /api/asr-voice/tts。签名与兄弟路由（transcribe/optimize）同构。 */
export function registerTtsRoute(register, getTtsConfig, ctx) {
    let inflight = 0;
    return register({
        kind: 'exact',
        path: '/api/asr-voice/tts',
        handler: async (req, res) => {
            const denied = guardRoute(req);
            if (denied !== null)
                return sendJson(res, denied.status, denied.payload);
            // 在途上限：超限立刻拒绝，连 body 都不读（并发峰值就是内存峰值）。
            // 与 transcribe/optimize 的 MAX_INFLIGHT 同值同语义。
            if (inflight >= MAX_INFLIGHT) {
                return sendJson(res, 503, { ok: false, reason: 'too many concurrent requests' });
            }
            inflight += 1;
            try {
                let body;
                try {
                    body = (await readJsonBody(req));
                }
                catch {
                    return sendJson(res, 400, { ok: false, reason: 'invalid JSON body' });
                }
                // JSON 字面量 null / 非对象：`body.text` 会在 null 上抛 TypeError 逃出 handler
                // （webserver 兜底成空体 400，客户端拿不到原因）——显式归 400。
                if (typeof body !== 'object' || body === null) {
                    return sendJson(res, 400, { ok: false, reason: 'invalid JSON body: expected an object' });
                }
                const text = (body.text ?? '').trim();
                if (text === '')
                    return sendJson(res, 400, { ok: false, reason: 'empty text' });
                if (text.length > MAX_TEXT_CHARS)
                    return sendJson(res, 400, { ok: false, reason: `text too long (${text.length} > ${MAX_TEXT_CHARS})` });
                const cfg = getTtsConfig() ?? { id: 'tts', preset: 'dashscope', name: '', baseUrl: '', apiKey: '', model: '', mode: 'chat' };
                const apiKey = await resolveApiKey(ctx, cfg);
                if (!apiKey) {
                    return sendJson(res, 400, { ok: false, reason: 'no API key: set the credential DASHSCOPE_API_KEY in DSH (a same-named LLM key is reused automatically)' });
                }
                try {
                    const { pcm } = await synthesize(apiKey, text, body.voice);
                    return sendJson(res, 200, { ok: true, audio: Buffer.from(pcm).toString('base64'), sampleRate: 16000 });
                }
                catch (error) {
                    const reason = error instanceof Error ? error.message : String(error);
                    return sendJson(res, 502, { ok: false, reason });
                }
            }
            finally {
                inflight -= 1;
            }
        },
    });
}
//# sourceMappingURL=realtime-tts.js.map