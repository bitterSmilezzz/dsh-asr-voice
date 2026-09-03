import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { guardRoute, readJsonBody, sendJson } from "./http.js";
/** LLM 优化流超时（ms）：模型卡住/过慢时不把宿主流挂死。 */
const LLM_STREAM_TIMEOUT_MS = 60_000;
/** 提示词优化 system prompt（中英双语指令，要求保留语义、去掉口语、结构化）。 */
const OPTIMIZE_SYSTEM = [
    '你是语音输入的提示词优化器。',
    '把用户口语转写的文字整理成清晰、可直接发给 AI 助手的提示词：',
    '- 去掉语气词、重复、口误（如“嗯”“那个”“就是说”）。',
    '- 补齐标点与分段，修正明显口误。',
    '- 保留用户的真实意图与全部关键信息，不添加原文没有的内容。',
    '- 用原文语言输出（中文保持中文，英文保持英文）。',
    '- 只输出整理后的文本，不要解释、不要加引号或前后缀。',
].join('\n');
/** 单个 provider 模型枚举的竞速超时：上游网络卡死不该拖死整个 /models 响应。 */
const LIST_MODELS_TIMEOUT_MS = 20_000;
/** 给 promise 套整体超时（listModels 是否支持 AbortSignal 不确定，用竞速兜底）。 */
function withTimeout(p, ms) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`listModels timed out after ${ms}ms`)), ms);
        p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
    });
}
/** 枚举 DSH 已配置模型（ctx.llm.listProviders + listModels）。 枚举失败/不可用/超时的 provider 给空模型列表（不阻断整体）。 */
export async function enumerateModels(ctx) {
    const providers = ctx.llm.listProviders();
    const results = await Promise.all(providers.map(async (p) => {
        let models = [];
        try {
            const listed = await withTimeout(Promise.resolve(ctx.llm.listModels(p.id)), LIST_MODELS_TIMEOUT_MS);
            models = listed.map((m) => ({ id: m.id, name: m.name }));
        }
        catch {
            // 该 provider 不可枚举（含超时）：跳过模型（仍保留 provider 行，便于提示）。
        }
        return { provider: p.id, name: p.name, models };
    }));
    return results;
}
/** 用 DSH 的 LLM 通道重写文本（target 缺省 = 当前所选模型）。 */
async function optimizeWithLlm(ctx, text, target) {
    let selection;
    if (target !== undefined && target.provider !== '' && target.model !== '') {
        selection = target;
    }
    else {
        const agentDefaultModel = ctx.get('agentDefaultModel');
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
    // 流式文本累积用数组 + join（避免长响应对每 chunk 反复拼接字符串）。
    const parts = [];
    let failed = false;
    for await (const chunk of ctx.llm.stream(options)) {
        if (chunk.type === 'text-delta')
            parts.push(chunk.text);
        if (chunk.type === 'finish' && chunk.reason !== undefined && chunk.reason.kind === 'error')
            failed = true;
    }
    const output = parts.join('');
    if (failed || output.trim() === '') {
        throw new Error('LLM optimize failed: model returned no text');
    }
    return output.trim();
}
/** 注册 /api/asr-voice/optimize 路由。 请求体：{ text, provider?, model? }——provider/model 须为 DSH 已配置模型； 缺省用当前所选 LLM。 */
export function registerOptimizeRoute(register, ctx) {
    return register({
        kind: 'exact',
        path: '/api/asr-voice/optimize',
        handler: async (req, res) => {
            const denied = guardRoute(req);
            if (denied !== null)
                return sendJson(res, denied.status, denied.payload);
            try {
                const body = (await readJsonBody(req));
                if (typeof body.text !== 'string' || body.text.trim() === '') {
                    return sendJson(res, 400, { ok: false, reason: 'missing text' });
                }
                const target = typeof body.provider === 'string' && typeof body.model === 'string'
                    ? { provider: body.provider, model: body.model }
                    : undefined;
                const optimized = await optimizeWithLlm(ctx, body.text, target);
                return sendJson(res, 200, { ok: true, text: optimized });
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                return sendJson(res, 502, { ok: false, reason });
            }
        },
    });
}
/** 注册 /api/asr-voice/models 路由：枚举 DSH 已配置模型（设置页选择器用）。 */
export function registerModelsRoute(register, ctx) {
    return register({
        kind: 'exact',
        path: '/api/asr-voice/models',
        handler: async (req, res) => {
            const denied = guardRoute(req, ['GET']);
            if (denied !== null)
                return sendJson(res, denied.status, denied.payload);
            try {
                const providers = await enumerateModels(ctx);
                return sendJson(res, 200, { ok: true, providers });
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                return sendJson(res, 502, { ok: false, reason });
            }
        },
    });
}
//# sourceMappingURL=optimize.js.map