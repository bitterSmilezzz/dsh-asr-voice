/**
 * dsh-asr-voice — host 半区：LLM 提示词优化代理。
 *
 * 浏览器 POST { text } 到 /api/asr-voice/optimize，host 用设置里的
 * OpenAI-compatible chat completions 配置重写为清晰 prompt，返回 { ok, text }。
 * API key 全程在服务端。纯 Node 全局 fetch，跨平台。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isTrusted, readJsonBody, sendJson } from './http.ts';

/** LLM 优化配置面（来自 settings scope）。 */
export interface LlmOptimizeConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/** 提示词优化 system prompt（中英双语指令，要求保留语义、去掉口语、结构化）。 */
const OPTIMIZE_SYSTEM = [
  '你是语音输入的提示词优化器。',
  '把用户口语转写的文字整理成清晰、可直接发给 AI 助手的提示词：',
  '- 去掉语气词、重复、口误（如“嗯”“那个”“就是说”）。',
  '- 补齐标点与分段，修正明显口误。',
  '- 保留用户的真实意图与全部关键信息，不添加原文没有的内容。',
  '- 用原文语言输出（中文保持中文，英文保持英文）。',
  '- 只输出整理后的文本，不要解释、不要加引号或前后缀。',
].join('\n')

/** 调用上游 chat completions 重写文本。 */
async function upstreamOptimize(cfg: LlmOptimizeConfig, text: string): Promise<string> {
  if (!cfg.baseUrl || !cfg.apiKey) {
    throw new Error('LLM optimize not configured: set baseUrl + apiKey in plugin settings');
  }
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model || 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: OPTIMIZE_SYSTEM },
        { role: 'user', content: text },
      ],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: unknown } }[];
    error?: unknown;
  };
  if (!res.ok) {
    const reason = typeof data.error === 'string'
      ? data.error
      : typeof data.error === 'object' && data.error && typeof (data.error as { message?: unknown }).message === 'string'
        ? String((data.error as { message?: string }).message)
        : `upstream LLM failed (HTTP ${res.status})`;
    throw new Error(reason);
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('upstream LLM returned empty result');
  }
  return content.trim();
}

/**
 * 注册 /api/asr-voice/optimize 路由。
 * @param register - webserver 的 register 方法。
 * @param getLlmConfig - 读取当前 LLM 优化配置的 thunk。
 * @returns 路由 disposer（由 ctx.effect 挂载/回收）。
 */
export function registerOptimizeRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  getLlmConfig: () => LlmOptimizeConfig,
): () => void {
  return register({
    kind: 'exact',
    path: '/api/asr-voice/optimize',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!isTrusted(req)) return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
      try {
        const body = (await readJsonBody(req)) as { text?: unknown };
        if (typeof body.text !== 'string' || body.text.trim() === '') {
          return sendJson(res, 400, { ok: false, reason: 'missing text' });
        }
        const optimized = await upstreamOptimize(getLlmConfig(), body.text);
        return sendJson(res, 200, { ok: true, text: optimized });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}
