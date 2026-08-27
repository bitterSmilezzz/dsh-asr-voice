/**
 * dsh-asr-voice — host 半区：动态获取供应商 ASR 模型列表。
 *
 * GET /api/asr-voice/asr-models?providerId=X —— 用该供应商的 baseUrl+apiKey
 * 调用 OpenAI-compatible `GET {baseUrl}/models`，过滤出 ASR 相关模型
 * （模型名/ID 含 asr/audio/omni/whisper/sensevoice/voice 等），供设置页
 * 「获取模型」按钮把最新模型填进下拉。key 只在服务端，不进浏览器。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isTrusted, sendJson } from './http.ts';
import { resolveApiKey } from './transcribe.ts';

/** 单个供应商配置面（来自 settings providers 列表）。 */
export interface CloudProviderLike {
  id: string
  preset: string
  baseUrl: string
  apiKey: string
  model: string
  mode: string
}

/** 模型名/ID 判定为 ASR 相关的正则。 */
const ASR_MODEL_RE = /(^|[/_.-])(asr|audio|omni|whisper|sensevoice)([/_.-]|$)|(^|[^a-z])(voice|transcri)/i

/** 从上游 /models 响应里提取 ASR 模型条目。 */
function pickAsrModels(raw: unknown): Array<{ id: string; name: string }> {
  const data = raw as { data?: Array<{ id?: unknown; name?: unknown; owned_by?: unknown }> }
  if (!Array.isArray(data?.data)) return []
  const out: Array<{ id: string; name: string }> = []
  for (const m of data.data) {
    if (!m || typeof m !== 'object') continue
    const id = typeof m.id === 'string' ? m.id : ''
    if (id === '') continue
    const name = typeof m.name === 'string' && m.name !== '' ? m.name : id
    if (ASR_MODEL_RE.test(id) || ASR_MODEL_RE.test(name)) out.push({ id, name })
  }
  return out
}

/**
 * 注册 /api/asr-voice/asr-models 路由（GET）。
 * @param register - webserver 的 register 方法。
 * @param getProviders - 读取全部已配置供应商列表的 thunk。
 * @param ctx - host context（供 MiMo key 兜底走 credentials 服务）。
 */
export function registerAsrModelsRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  getProviders: () => CloudProviderLike[],
  ctx: Context,
): () => void {
  return register({
    kind: 'exact',
    path: '/api/asr-voice/asr-models',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!isTrusted(req)) return sendJson(res, 403, { ok: false, reason: 'forbidden' });
      if (req.method !== 'GET') return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
      try {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const providerId = url.searchParams.get('providerId') ?? '';
        const providers = getProviders();
        const provider = providers.find((p) => p.id === providerId);
        if (!provider) return sendJson(res, 400, { ok: false, reason: `provider not found: ${providerId || '(none configured)'}` });
        if (!provider.baseUrl.trim()) return sendJson(res, 400, { ok: false, reason: 'provider baseUrl not set' });
        const apiKey = await resolveApiKey(ctx, {
          id: provider.id, baseUrl: provider.baseUrl, apiKey: provider.apiKey, model: provider.model, mode: provider.mode,
        });
        if (!apiKey) return sendJson(res, 400, { ok: false, reason: 'provider API key not set' });
        const base = provider.baseUrl.replace(/\/+$/, '');
        const upstream = await fetch(`${base}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(20_000),
        });
        const raw = (await upstream.json().catch(() => ({}))) as { error?: unknown; message?: unknown };
        if (!upstream.ok) {
          const errObj = raw.error as { message?: unknown } | undefined
          const reason = typeof raw.error === 'string' ? raw.error
            : typeof errObj?.message === 'string' ? errObj.message
              : typeof raw.message === 'string' ? raw.message
                : `failed to list models (HTTP ${upstream.status})`;
          return sendJson(res, 502, { ok: false, reason });
        }
        const models = pickAsrModels(raw);
        return sendJson(res, 200, { ok: true, providerId, model: provider.model, models });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}
