/**
 * dsh-asr-voice — client 提示词优化。
 *
 * 两种模式：
 *   - heuristic：本地启发式清洗（免费、离线、即时）——去语气词/口误、补标点、
 *     分段、拉丁语首字母大写。
 *   - llm：把文本 POST 到 host /api/asr-voice/optimize，由服务端用配置的
 *     OpenAI-compatible chat completions 重写（key 不进浏览器）。
 */

/** 常见中文语气词/口头禅（按词删除，保守集合）。 */
const ZH_FILLERS = ['嗯嗯', '嗯', '呃呃', '呃', '啊那个', '那个那个', '那个', '这个这个', '这个', '就是说', '怎么说呢', '然后呢', '然后', '就是', '是吧', '对吧', '好不好', '明白了没']

/** 常见英文语气词（整词删除，大小写不敏感）。不收 like/well 等实义词——
 *  整词删除会把 "I like this"→"I this"、"as well as"→"as as" 这类正常句子削坏。 */
const EN_FILLERS = ['um', 'uh', 'hmm', 'erm', 'you know', 'i mean']

/** 规范化空白：折叠连续空白/换行，转为单个空格；保留段落间空行。 */
function normalizeSpaces(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ *\n */g, '\n')
    .trim()
}

/** 中文字符检测。 */
function hasCjk(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text)
}

/** 删除中文语气词。 */
function stripZhFillers(text: string): string {
  let out = text
  for (const f of ZH_FILLERS) {
    // 只删成词出现（前后是空白/标点/边界），避免误删正常词（如「然后」在长句中被保留）
    out = out.replace(new RegExp(`(^|[\\s，。！？、；：,.!?;:\\n])${escapeRegExp(f)}(?=[\\s，。！？、；：,.!?;:\\n]|$)`, 'g'), '$1')
  }
  return out
}

/** 删除英文语气词（整词）。 */
function stripEnFillers(text: string): string {
  let out = ` ${text} `
  for (const f of EN_FILLERS) {
    out = out.replace(new RegExp(`\\s${escapeRegExp(f)}\\s`, 'gi'), ' ')
  }
  return out.trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 补齐/修正标点：折叠重复标点、拉丁语单词间保证单空格、句末补句号。 */
function fixPunctuation(text: string): string {
  let out = text
  // 重复标点折叠
  out = out.replace(/([，。！？；：,.!?;:]){2,}/g, '$1')
  // 中文标点后不加空格，英文标点后保证一个空格
  if (hasCjk(out)) {
    out = out.replace(/ *([，。！？；：]) */g, '$1')
    out = out.replace(/ *([,.;:!?]) *([\u4e00-\u9fff])/g, '$1 $2')
  } else {
    out = out.replace(/ *([,.;:!?]) */g, '$1 ')
  }
  out = out.replace(/ {2,}/g, ' ')
  // 句末补句号
  const trimmed = out.trimEnd()
  if (trimmed === '') return ''
  const last = trimmed[trimmed.length - 1]!
  if (!/[。！？.!?，,；;：:]/.test(last)) {
    out = hasCjk(trimmed) ? `${trimmed}。` : `${trimmed}.`
  }
  return out
}

/** 拉丁语：每句首字母大写。 */
function sentenceCase(text: string): string {
  if (hasCjk(text)) return text
  return text
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1: string, p2: string) => p1 + p2.toUpperCase())
}

/** 按空行分段，每段作为独立段落（LLM 预览时保留）。 */
function segment(text: string): string {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
    .join('\n\n')
}

/**
 * 本地启发式优化：清洗语气词/口误 → 折叠空白 → 修正标点 → 分段 → 拉丁语句首大写。
 */
export function heuristicOptimize(raw: string): string {
  if (!raw || raw.trim() === '') return ''
  let text = normalizeSpaces(raw)
  text = stripZhFillers(text)
  text = stripEnFillers(text)
  text = normalizeSpaces(text)
  text = fixPunctuation(text)
  text = sentenceCase(text)
  text = segment(text)
  return text
}

/** DSH 已配置模型的 provider/model（可选；空 = 用当前所选 LLM）。 */
export interface OptimizeTarget {
  provider: string
  model: string
}

/** LLM 优化请求超时（毫秒）：模型卡住/过慢时不把 UI 永远钉在「优化中」；超时按失败处理，保留草稿里的清洗版。 */
const OPTIMIZE_TIMEOUT_MS = 60_000

/** 调用 host /api/asr-voice/optimize（用 DSH 已配置模型重写）。 */
export async function llmOptimize(text: string, target?: OptimizeTarget, externalSignal?: AbortSignal): Promise<string> {
  const body: { text: string; provider?: string; model?: string } = { text }
  if (target !== undefined && target.provider !== '' && target.model !== '') {
    body.provider = target.provider
    body.model = target.model
  }
  const controller = new AbortController()
  const onExternalAbort = (): void => controller.abort()
  if (externalSignal !== undefined) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(), OPTIMIZE_TIMEOUT_MS)
  try {
    const res = await fetch('/api/asr-voice/optimize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; text?: string; reason?: string }
    if (!res.ok || data.ok !== true || typeof data.text !== 'string') {
      throw new Error(data.reason || 'optimize failed')
    }
    return data.text
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('optimize timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}
