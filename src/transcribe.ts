/**
 * dsh-asr-voice — host 半区：云端 ASR 转写代理。
 *
 * 浏览器把原始音频字节 POST 到 /api/asr-voice/transcribe（raw body，
 * Content-Type 为音频 MIME），host 读取配置里的云端 baseUrl/apiKey/model，
 * 以 multipart FormData 转发到 OpenAI-compatible /audio/transcriptions，
 * 返回 { ok, text }。API key 全程在服务端，不进浏览器。
 *
 * 纯 Node 全局 fetch/FormData/Blob（Node 18+），跨平台。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { MAX_AUDIO_BYTES, TRANSCRIBE_PATH } from './presets.ts';
import { isTrusted, readRawBody, sendJson } from './http.ts';

/** 云端 ASR 配置面（来自 settings scope）。 */
export interface CloudAsrConfig {
  baseUrl: string
  apiKey: string
  model: string
}

/** 构造 multipart form，转发到上游 /audio/transcriptions。 */
async function upstreamTranscribe(cfg: CloudAsrConfig, audio: Buffer, mime: string, language: string | undefined): Promise<{ text: string }> {
  if (!cfg.baseUrl || !cfg.apiKey) {
    throw new Error('cloud ASR not configured: set baseUrl + apiKey in plugin settings');
  }
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
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: unknown; error?: unknown; message?: unknown };
  if (!res.ok) {
    const reason = typeof data.error === 'string'
      ? data.error
      : typeof data.error === 'object' && data.error && typeof (data.error as { message?: unknown }).message === 'string'
        ? String((data.error as { message?: string }).message)
        : typeof data.message === 'string'
          ? data.message
          : `upstream ASR failed (HTTP ${res.status})`;
    throw new Error(reason);
  }
  if (typeof data.text !== 'string' || data.text.trim() === '') {
    throw new Error('upstream ASR returned no text');
  }
  return { text: data.text };
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
 * @param getCloudConfig - 读取当前云端 ASR 配置的 thunk。
 * @returns 路由 disposer（由 ctx.effect 挂载/回收）。
 */
export function registerTranscribeRoute(
  register: (def: { kind: 'exact'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void }) => () => void,
  getCloudConfig: () => CloudAsrConfig,
): () => void {
  return register({
    kind: 'exact',
    path: '/api/asr-voice/transcribe',
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      if (!isTrusted(req)) return sendJson(res, 403, { ok: false, reason: 'forbidden: host/origin not trusted' });
      if (req.method !== 'POST') return sendJson(res, 405, { ok: false, reason: 'method not allowed' });
      try {
        const audio = await readRawBody(req, MAX_AUDIO_BYTES);
        if (audio.length === 0) return sendJson(res, 400, { ok: false, reason: 'empty audio body' });
        const mime = String(req.headers['content-type'] ?? 'audio/webm').split(';')[0]?.trim() || 'audio/webm';
        const url = new URL(req.url ?? '/', 'http://localhost');
        const language = url.searchParams.get('language') ?? undefined;
        const { text } = await upstreamTranscribe(getCloudConfig(), audio, mime, language);
        return sendJson(res, 200, { ok: true, text });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return sendJson(res, 502, { ok: false, reason });
      }
    },
  });
}
