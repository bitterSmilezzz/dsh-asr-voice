import { keyRefFor } from "./key-ref.js";
import { isTrusted, sendJson } from "./http.js";
import { resolveApiKey } from "./transcribe.js";
/**
 * 模型名/ID 判定为 ASR 相关的正则。
 * 只匹配真正的语音识别模型：词边界处的 asr/audio/omni/whisper/transcri，
 * 以及裸 sensevoice（SenseVoiceSmall 中段）。刻意排除 tts/voice（会误抓
 * tts-voiceclone/voicedesign 等语音合成模型）。
 */
const ASR_MODEL_RE = /(^|[/_.-])(asr|audio|omni|whisper|transcri)([/_.-]|$)|sensevoice/i;
/** 从上游 /models 响应里提取 ASR 模型条目。 */
function pickAsrModels(raw) {
    const data = raw;
    if (!Array.isArray(data?.data))
        return [];
    const out = [];
    for (const m of data.data) {
        if (!m || typeof m !== 'object')
            continue;
        const id = typeof m.id === 'string' ? m.id : '';
        if (id === '')
            continue;
        const name = typeof m.name === 'string' && m.name !== '' ? m.name : id;
        if (ASR_MODEL_RE.test(id) || ASR_MODEL_RE.test(name))
            out.push({ id, name });
    }
    return out;
}
/**
 * 注册 /api/asr-voice/asr-models 路由（GET）。
 * @param register - webserver 的 register 方法。
 * @param getProviders - 读取全部已配置供应商列表的 thunk。
 * @param ctx - host context（供 MiMo key 兜底走 credentials 服务）。
 */
export function registerAsrModelsRoute(register, getProviders, ctx) {
    return register({
        kind: 'exact',
        path: '/api/asr-voice/asr-models',
        handler: async (req, res) => {
            if (!isTrusted(req))
                return sendJson(res, 403, { ok: false, reason: 'forbidden' });
            if (req.method !== 'GET')
                return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
            try {
                const url = new URL(req.url ?? '/', 'http://localhost');
                const providerId = url.searchParams.get('providerId') ?? '';
                const providers = getProviders();
                const provider = providers.find((p) => p.id === providerId);
                if (!provider)
                    return sendJson(res, 400, { ok: false, reason: `provider not found: ${providerId || '(none configured)'}` });
                if (!provider.baseUrl.trim())
                    return sendJson(res, 400, { ok: false, reason: 'provider baseUrl not set' });
                const apiKey = await resolveApiKey(ctx, {
                    id: provider.id, preset: provider.preset, name: provider.name,
                    baseUrl: provider.baseUrl, apiKey: provider.apiKey, model: provider.model, mode: provider.mode,
                });
                if (!apiKey)
                    return sendJson(res, 400, { ok: false, reason: `no API key: set the credential ${keyRefFor(provider)} in DSH` });
                const base = provider.baseUrl.replace(/\/+$/, '');
                const upstream = await fetch(`${base}/models`, {
                    headers: { Authorization: `Bearer ${apiKey}` },
                    signal: AbortSignal.timeout(20_000),
                });
                const raw = (await upstream.json().catch(() => ({})));
                if (!upstream.ok) {
                    const errObj = raw.error;
                    const reason = typeof raw.error === 'string' ? raw.error
                        : typeof errObj?.message === 'string' ? errObj.message
                            : typeof raw.message === 'string' ? raw.message
                                : `failed to list models (HTTP ${upstream.status})`;
                    return sendJson(res, 502, { ok: false, reason });
                }
                const models = pickAsrModels(raw);
                return sendJson(res, 200, { ok: true, providerId, model: provider.model, models });
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                return sendJson(res, 502, { ok: false, reason });
            }
        },
    });
}
//# sourceMappingURL=asr-models.js.map