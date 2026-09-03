/**
 * dsh-asr-voice — host 半区：云端 ASR 转写代理。
 *
 * 浏览器把原始音频字节 POST 到 /api/asr-voice/transcribe（raw body，
 * Content-Type 为音频 MIME），host 读取配置里的云端 baseUrl/model/mode，按
 * src/key-ref.ts 派生的引用名向 DSH credentials 服务解析 API key，转发到上游并返回
 * { ok, text }。API key 全程只在服务端，不进浏览器。
 *
 * 两条通道（mode）：
 *   - transcriptions：whisper 式 multipart /audio/transcriptions（OpenAI / Groq /
 *     硅基流动 / 本地 OpenAI-compatible 部署）。
 *   - chat：chat.completions + input_audio（base64 data URI）——小米 MiMo-V2.5-ASR、
 *     通义 qwen3-asr-flash 等「音频大模型」的 OpenAI 兼容姿势。
 *   - auto：按模型名自动判定（模型名含 asr/audio/omni/sensevoice 走 chat，否则 transcriptions）。
 *
 * key 复用：引用名与官方 LLM provider 同名（OPENAI_API_KEY / MIMO_API_KEY / …），
 * 用户在 DSH 里配过对应 LLM 就自动共用同一把 key，无需在插件设置里重复粘贴。
 *
 * 纯 Node 全局 fetch/FormData/Blob（Node 18+），跨平台。
 */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CHAT_COMPLETIONS_PATH, MAX_AUDIO_BYTES, TRANSCRIBE_PATH, resolveAsrMode } from './presets.ts';
import { keyRefFor } from './key-ref.ts';
import type { KeyRefSource } from './key-ref.ts';
import { isTrusted, readRawBody, sendJson } from './http.ts';

/** 上游 ASR 请求超时（ms）：上游不可达/卡死时不无限挂起请求。 */
const UPSTREAM_TIMEOUT_MS = 60_000

/**
 * 云端 ASR 配置面（来自 settings scope 解析出的当前生效供应商）。
 * id / preset / name 由 KeyRefSource 提供，name 是自定义供应商的显示名。
 */
export interface CloudAsrConfig extends KeyRefSource {
  baseUrl: string
  /** 遗留密钥位置：一次性迁移完成前仍可直接生效，完成后再无人写入。 */
  apiKey: string
  model: string
  mode: string
}

/** DSH credentials 服务的最小面（可选，供 API key 解析）。 */
interface CredentialsLike {
  resolve(ref: unknown): Promise<{ value?: string } | undefined>
}

/** 模型名 → 上游语言参数（DSH 配置是 auto/zh-CN/en-US，上游要 zh/en）。 */
function upstreamLanguage(language: string | undefined): string | undefined {
  if (!language || language === 'auto') return undefined
  const map: Record<string, string> = { 'zh-CN': 'zh', 'zh': 'zh', 'en-US': 'en', 'en': 'en' }
  return map[language] ?? language
}

/** 从响应里抽错误原因（兼容 { error: string|{message} } 与 { message } 两种形状）。 */
function errorReason(data: { error?: unknown; message?: unknown }, status: number): string {
  if (typeof data.error === 'string' && data.error !== '') return data.error
  if (typeof data.error === 'object' && data.error !== null) {
    const msg = (data.error as { message?: unknown }).message
    if (typeof msg === 'string' && msg !== '') return msg
  }
  if (typeof data.message === 'string' && data.message !== '') return data.message
  return `upstream ASR failed (HTTP ${status})`
}

/** 调试落盘目录：保存浏览器发来的原始音频，便于重放定位（仅诊断用）。 */
function debugDir(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DSH_ASR_DEBUG_DIR
  return env && env !== '' ? env : join(homedir(), '.dsh', 'asr-voice-debug')
}

/** 成功转写是否也落盘（诊断期用 DSH_ASR_DEBUG_KEEP_WAVS=1 dsh web 开启；默认只存失败样本）。 */
function keepAllWavs(): boolean {
  const v = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DSH_ASR_DEBUG_KEEP_WAVS
  return v === '1' || v === 'true' || v === 'yes'
}

/** 从请求 UA 推断浏览器短名（落盘标签用，如 Chrome150/Edge/Safari18）。 */
function uaTag(req: IncomingMessage): string {
  const ua = String(req.headers['user-agent'] ?? '')
  const ver = (re: RegExp): string => {
    const m = ua.match(re)
    return m?.[1] !== undefined ? m[1] : ''
  }
  if (/Edg\//.test(ua)) return `Edge${ver(/Edg\/(\d+)/)}`
  if (/Chrome\//.test(ua)) return `Chrome${ver(/Chrome\/(\d+)/)}`
  if (/Version\//.test(ua) && /Safari\//.test(ua)) return `Safari${ver(/Version\/(\d+)/)}`
  if (/Firefox\//.test(ua)) return `Firefox${ver(/Firefox\/(\d+)/)}`
  return 'UA'
}

/** 目录里最多保留的音频个数（超出删最旧，防长期诊断撑爆磁盘）。 */
const MAX_KEPT_FILES = 100

/** 把原始音频落盘（fire-and-forget，绝不阻断路由）。 */
async function saveDebugAudio(audio: Buffer, mime: string, tag: string): Promise<void> {
  try {
    const dir = debugDir()
    await mkdir(dir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeTag = tag.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'unknown'
    await writeFile(join(dir, `${stamp}-${audio.length}B-${safeTag}.${extForMime(mime)}`), audio)
    const entries = await readdir(dir).catch(() => [] as string[])
    if (entries.length > MAX_KEPT_FILES) {
      for (const name of entries.sort().slice(0, entries.length - MAX_KEPT_FILES)) {
        await unlink(join(dir, name)).catch(() => {})
      }
    }
  } catch {
    // 诊断落盘失败不影响主流程
  }
}

/** whisper 式 multipart /audio/transcriptions。 */
async function upstreamTranscribeMultipart(cfg: CloudAsrConfig, audio: Buffer, mime: string, language: string | undefined, apiKey: string): Promise<{ text: string }> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const form = new FormData();
  const ext = extForMime(mime);
  // Buffer → fresh Uint8Array<ArrayBuffer> so it satisfies BlobPart under
  // the DOM/undici typings (Node Buffer is Uint8Array<ArrayBufferLike>).
  const bytes = new Uint8Array(audio.byteLength);
  bytes.set(audio);
  form.append('file', new Blob([bytes], { type: mime }), `recording.${ext}`);
  const model = cfg.model || 'whisper-1';
  form.append('model', model);
  if (language && language !== 'auto') form.append('language', language);
  const res = await fetch(`${base}${TRANSCRIBE_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    // 上游卡死时及时失败（客户端 60s 超时后 host 不应继续占着请求）。
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: unknown; error?: unknown; message?: unknown };
  if (!res.ok) {
    throw new Error(errorReason(data, res.status));
  }
  if (typeof data.text !== 'string' || data.text.trim() === '') {
    throw new Error('upstream ASR returned no text');
  }
  return { text: data.text };
}

/** chat-completions + input_audio（base64 data URI）：MiMo / Qwen-ASR 通道。 */
async function upstreamTranscribeChat(cfg: CloudAsrConfig, audio: Buffer, mime: string, language: string | undefined, apiKey: string): Promise<{ text: string }> {
  const base = cfg.baseUrl.replace(/\/+$/, '');
  const model = cfg.model || 'mimo-v2.5-asr';
  const dataUri = `data:${mime};base64,${audio.toString('base64')}`;
  const lang = upstreamLanguage(language);
  const payload: Record<string, unknown> = {
    model,
    messages: [
      { role: 'user', content: [{ type: 'input_audio', input_audio: { data: dataUri } }] },
    ],
  };
  if (lang !== undefined) payload.asr_options = { language: lang };
  const res = await fetch(`${base}${CHAT_COMPLETIONS_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: unknown } }[]
    error?: unknown
    message?: unknown
  };
  if (!res.ok) {
    throw new Error(errorReason(data, res.status));
  }
  // 兼容 content 为字符串或多模态数组（[{type:'text',text:'…'}]）两种形状。
  let content = data.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    // 循环拼接替代 map+join：避免为最常见的单元素数组分配中间数组。
    let acc = ''
    for (const p of content) {
      const t = (p as { text?: unknown }).text
      if (typeof t === 'string') acc += t
    }
    content = acc
  }
  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error(`upstream ASR returned no text (${audio.length}B ${mime})`);
  }
  // auto 语言模式会带 <chinese>/<english> 等标签，去掉。
  // 仅在 auto（未显式指定语言）时清洗，且只匹配已知语言标签，
  // 避免误删口述内容中的尖括号（如「用 <div> 包起来」）。
  const text = (lang === undefined
    ? content.replace(/<\/?(?:chinese|english|zh|en|ja|japanese|ko|korean)>/gi, '')
    : content
  ).trim();
  if (text === '') throw new Error(`upstream ASR returned no text (${audio.length}B ${mime})`);
  return { text };
}

/** 按 mode 分发到对应通道。 */
async function upstreamTranscribe(cfg: CloudAsrConfig, audio: Buffer, mime: string, language: string | undefined, apiKey: string): Promise<{ text: string }> {
  const mode = resolveAsrMode(cfg.mode, cfg.model || '');
  if (mode === 'chat') return upstreamTranscribeChat(cfg, audio, mime, language, apiKey);
  return upstreamTranscribeMultipart(cfg, audio, mime, language, apiKey);
}

/**
 * 解析最终 API key：settings 里的遗留值优先（一次性迁移完成前的兼容路径），否则按
 * 派生引用名向 DSH credentials 服务解析，最后退回同名环境变量。预置供应商的引用名与
 * 官方 LLM provider 同名，因此配过对应 LLM 的用户在这里天然命中同一把 key。
 */
export async function resolveApiKey(ctx: Context, cfg: CloudAsrConfig): Promise<string> {
  const legacy = cfg.apiKey.trim();
  if (legacy !== '') return legacy;
  const ref = keyRefFor(cfg);
  const credentials = ctx.get('credentials') as CredentialsLike | undefined;
  if (credentials !== undefined) {
    try {
      const hit = await credentials.resolve(ref);
      if (hit?.value) return hit.value;
    } catch { /* fall through to env */ }
  }
  // 兜底：环境变量（DSH 进程若以 export 方式注入也能读到）。
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return globalProcess?.env?.[ref] ?? '';
}

/** 根据 MIME 推断文件扩展名（用于 multipart filename；不影响转写）。 */
function extForMime(mime: string): string {
  const m = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
  };
  return map[m] ?? 'bin';
}

/**
 * 注册 /api/asr-voice/transcribe 路由。
 * @param register - webserver 的 register 方法（由调用方从 ctx 传入）。
 * @param getCloudConfig - 读取当前生效云端 ASR 配置的 thunk。
 * @param ctx - host context（供 MiMo key 兜底走 credentials 服务）。
 * @param recordStats - 成功转写后回调（记录用量；可选）。
 * @returns 路由 disposer（由 ctx.effect 挂载/回收）。
 */
export function registerTranscribeRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  getCloudConfig: () => CloudAsrConfig,
  ctx: Context,
  recordStats?: (text: string, providerId: string) => void,
): () => void {
  return register({
    kind: 'exact',
    path: '/api/asr-voice/transcribe',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!isTrusted(req)) return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
      let audio: Buffer = Buffer.alloc(0)
      let mime = 'audio/webm'
      let ua = 'UA'
      try {
        audio = await readRawBody(req, MAX_AUDIO_BYTES);
        if (audio.length === 0) return sendJson(res, 400, { ok: false, reason: 'empty audio body' });
        mime = String(req.headers['content-type'] ?? 'audio/webm').split(';')[0]?.trim() || 'audio/webm';
        const url = new URL(req.url ?? '/', 'http://localhost');
        // 诊断标记：从请求 UA 推断浏览器，让每个落盘文件的标签自带浏览器身份。
        ua = uaTag(req);
        // 纯抓取请求（诊断）：保存转换前的原始录音后直接返回，不调用上游。
        if (url.searchParams.get('capture') === '1') {
          void saveDebugAudio(audio, mime, `raw-${ua}`);
          return sendJson(res, 200, { ok: true, saved: true });
        }
        const language = url.searchParams.get('language') ?? undefined;
        const cfg = getCloudConfig();
        if (!cfg.baseUrl.trim()) {
          return sendJson(res, 400, { ok: false, reason: 'cloud ASR not configured: set baseUrl in plugin settings' });
        }
        const apiKey = await resolveApiKey(ctx, cfg);
        if (!apiKey) {
          return sendJson(res, 400, { ok: false, reason: `no API key: set the credential ${keyRefFor(cfg)} in DSH (a same-named LLM key is reused automatically)` });
        }
        const { text } = await upstreamTranscribe(cfg, audio, mime, language, apiKey);
        // 诊断抓取：成功音频在 DSH_ASR_DEBUG_KEEP_WAVS=1 时全存；识别结果过短
        // （≤8 字符，覆盖 "yeah"/单个语气词 等疑似听错/幻觉）时总是落盘，便于重放定位。
        if (keepAllWavs() || text.trim().length <= 8) void saveDebugAudio(audio, mime, `${ua}-ok-${text.slice(0, 18)}`);
        // 用量统计（可选，dev 功能）。
        recordStats?.(text, cfg.id);
        return sendJson(res, 200, { ok: true, text });
      } catch (error) {
        const base = error instanceof Error ? error.message : String(error);
        const reason = audio.length > 0 ? `${base} (audio ${audio.length}B, ${mime})` : base;
        // 失败时把原始音频落盘到 ~/.dsh/asr-voice-debug/（重放定位用，不影响主流程）。
        if (audio.length > 0) void saveDebugAudio(audio, mime, `${ua}-${base}`);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}
