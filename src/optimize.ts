/**
 * dsh-asr-voice — host 半区：LLM 提示词优化。
 *
 * 浏览器 POST { text } 到 /api/asr-voice/optimize，host 用 LLM 重写为清晰
 * prompt，返回 { ok, text }。两条后端路径，按优先级：
 *   1. 插件独立配置（settings.optimize.llm 的 baseUrl/apiKey/model，OpenAI-compatible）
 *   2. 当前所选 LLM（ctx.agentDefaultModel.currentSelection() + ctx.llm.stream）
 * API key 全程在服务端；纯 Node + 官方 LLM 通道，跨平台。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import type { StreamChunk } from '@deepseek-ai/dsh-llm';
import { isTrusted, readJsonBody, sendJson } from './http.ts';

/** 最小当前模型选择面（由 DSH 的 agentDefaultModel 服务提供，peer 不 import）。 */
interface AgentDefaultModelLike {
  currentSelection(): { provider: string; model: string; reasoningEffort?: string }
}

/** LLM 优化配置面（来自 settings scope 的独立配置）。 */
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

/** 调用上游 OpenAI-compatible chat completions 重写文本（独立配置后端）。 */
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

/** 用 DSH 当前所选 LLM 重写文本（ctx.llm 通道，无需插件单独配 key）。 */
async function optimizeWithCurrentLlm(ctx: Context, text: string): Promise<string> {
  const agentDefaultModel = ctx.get('agentDefaultModel') as AgentDefaultModelLike | undefined;
  if (agentDefaultModel === undefined) {
    throw new Error('LLM optimize unavailable: agentDefaultModel service not present');
  }
  const selection = agentDefaultModel.currentSelection();
  const options = {
    provider: selection.provider,
    model: selection.model,
    system: OPTIMIZE_SYSTEM,
    messages: [
      createUserMessage({
        content: [{ type: 'text', text }],
        source: { kind: 'plugin', plugin: 'dsh-asr-voice' },
      }),
    ],
    temperature: 0.2,
  };
  let output = '';
  let failed = false;
  for await (const chunk of ctx.llm.stream(options)) {
    if (chunk.type === 'text-delta') output += chunk.text;
    if (chunk.type === 'finish' && chunk.reason !== undefined && chunk.reason.kind === 'error') failed = true;
  }
  if (failed || output.trim() === '') {
    throw new Error('LLM optimize failed: current model returned no text');
  }
  return output.trim();
}

/** 优化执行器：独立配置优先，否则用当前所选 LLM。 */
export type OptimizeRunner = (text: string) => Promise<string>

/** 组装优化执行器。 */
export function buildOptimizeRunner(
  ctx: Context,
  getLlmConfig: () => LlmOptimizeConfig,
): OptimizeRunner {
  return async (text: string): Promise<string> => {
    const cfg = getLlmConfig();
    if (cfg.baseUrl && cfg.apiKey) {
      return upstreamOptimize(cfg, text);
    }
    return optimizeWithCurrentLlm(ctx, text);
  };
}

/**
 * 注册 /api/asr-voice/optimize 路由。
 * @param register - webserver 的 register 方法。
 * @param optimize - 优化执行器（buildOptimizeRunner 组装）。
 * @returns 路由 disposer（由 ctx.effect 挂载/回收）。
 */
export function registerOptimizeRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  optimize: OptimizeRunner,
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
        const optimized = await optimize(body.text);
        return sendJson(res, 200, { ok: true, text: optimized });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}

// 保留类型导出（供测试/文档）。
export type { StreamChunk };
