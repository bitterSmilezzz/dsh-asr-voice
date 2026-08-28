/**
 * dsh-asr-voice — host 半区：LLM 提示词优化。
 *
 * 提示词优化只使用 **DSH 已配置好的模型**（ctx.llm 通道）：
 *   - 请求可指定 { provider, model }（必须是 DSH 模型列表里已配置的）
 *   - 未指定 → 用当前所选 LLM（ctx.agentDefaultModel.currentSelection()）
 * 要自定义模型，须先到 DSH 原生模型列表添加（本插件不做独立 baseUrl/apiKey）。
 *
 * /api/asr-voice/models 枚举 DSH 已配置模型（供设置页选择器）。
 * API key 由 DSH provider 管理，全程在服务端；跨平台。
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

/** LLM 优化流超时（ms）：模型卡住/过慢时不把宿主流挂死。 */
const LLM_STREAM_TIMEOUT_MS = 60_000

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

/** 一个 DSH 已配置模型的条目（给设置页选择器用）。 */
export interface DshModelEntry {
  id: string
  name: string
}

/** 一个 DSH 已配置 provider 及其模型。 */
export interface DshProviderEntry {
  provider: string
  name: string
  models: DshModelEntry[]
}

/** 模型选择目标（来自设置页选择的 DSH 模型，或当前所选）。 */
export interface OptimizeTarget {
  provider: string
  model: string
}

/**
 * 枚举 DSH 已配置模型（ctx.llm.listProviders + listModels）。
 * 枚举失败/不可用的 provider 给空模型列表（不阻断整体）。
 */
export async function enumerateModels(ctx: Context): Promise<DshProviderEntry[]> {
  const out: DshProviderEntry[] = [];
  for (const p of ctx.llm.listProviders()) {
    let models: DshModelEntry[] = [];
    try {
      const listed = await ctx.llm.listModels(p.id);
      models = listed.map((m) => ({ id: m.id, name: m.name }));
    } catch {
      // 该 provider 不可枚举：跳过模型（仍保留 provider 行，便于提示）。
    }
    out.push({ provider: p.id, name: p.name, models });
  }
  return out;
}

/** 用 DSH 的 LLM 通道重写文本（target 缺省 = 当前所选模型）。 */
async function optimizeWithLlm(ctx: Context, text: string, target?: OptimizeTarget): Promise<string> {
  let selection: OptimizeTarget;
  if (target !== undefined && target.provider !== '' && target.model !== '') {
    selection = target;
  } else {
    const agentDefaultModel = ctx.get('agentDefaultModel') as AgentDefaultModelLike | undefined;
    if (agentDefaultModel === undefined) {
      throw new Error('LLM optimize unavailable: agentDefaultModel service not present');
    }
    const current = agentDefaultModel.currentSelection();
    selection = { provider: current.provider, model: current.model };
  }
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
    // 模型卡住/过慢时不把宿主流挂死（客户端 60s 超时后 host 应停止等待）。
    signal: AbortSignal.timeout(LLM_STREAM_TIMEOUT_MS),
  };
  let output = '';
  let failed = false;
  for await (const chunk of ctx.llm.stream(options)) {
    if (chunk.type === 'text-delta') output += chunk.text;
    if (chunk.type === 'finish' && chunk.reason !== undefined && chunk.reason.kind === 'error') failed = true;
  }
  if (failed || output.trim() === '') {
    throw new Error('LLM optimize failed: model returned no text');
  }
  return output.trim();
}

/**
 * 注册 /api/asr-voice/optimize 路由。
 * 请求体：{ text, provider?, model? }——provider/model 须为 DSH 已配置模型；
 * 缺省用当前所选 LLM。
 */
export function registerOptimizeRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  ctx: Context,
): () => void {
  return register({
    kind: 'exact',
    path: '/api/asr-voice/optimize',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!isTrusted(req)) return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
      try {
        const body = (await readJsonBody(req)) as { text?: unknown; provider?: unknown; model?: unknown };
        if (typeof body.text !== 'string' || body.text.trim() === '') {
          return sendJson(res, 400, { ok: false, reason: 'missing text' });
        }
        const target = typeof body.provider === 'string' && typeof body.model === 'string'
          ? { provider: body.provider, model: body.model }
          : undefined;
        const optimized = await optimizeWithLlm(ctx, body.text, target);
        return sendJson(res, 200, { ok: true, text: optimized });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}

/**
 * 注册 /api/asr-voice/models 路由：枚举 DSH 已配置模型（设置页选择器用）。
 */
export function registerModelsRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  ctx: Context,
): () => void {
  return register({
    kind: 'exact',
    path: '/api/asr-voice/models',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!isTrusted(req)) return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
      if (req.method !== 'GET') return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
      try {
        const providers = await enumerateModels(ctx);
        return sendJson(res, 200, { ok: true, providers });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}

// 保留类型导出（供测试/文档）。
export type { StreamChunk };
