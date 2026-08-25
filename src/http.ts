/**
 * dsh-asr-voice — host 半区：HTTP 小工具（读 body / 写 JSON / 信任围栏）。
 * 纯 Node 标准库 + 全局 fetch（Node 18+），无平台专属依赖 → macOS / Windows 双平台。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/** 读取请求原始 body（Buffer），超限报错。 */
export async function readRawBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const parts: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > maxBytes) throw new Error(`request body exceeds ${maxBytes} bytes`);
    parts.push(buf);
  }
  return Buffer.concat(parts);
}

/** 读取请求 body 并解析为 JSON（超限报错）。 */
export async function readJsonBody(req: IncomingMessage, maxBytes = 256 * 1024): Promise<unknown> {
  const raw = await readRawBody(req, maxBytes);
  if (raw.length === 0) return {};
  try {
    return JSON.parse(raw.toString('utf8')) as unknown;
  } catch {
    throw new Error('invalid JSON body');
  }
}

/** 写 JSON 响应。 */
export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/**
 * 信任围栏：只接受本机回环 Host 或同源 Origin，防止任意网页 CSRF 借宿主
 * 代理调用云端（消耗用户的 API key / 额度）。与伞下其他插件一致。
 */
export function isTrusted(req: IncomingMessage): boolean {
  const hostHeader = req.headers.host;
  const originHeader = req.headers.origin;
  const hostname = (String(hostHeader ?? '').replace(/^\[(.*)\]$/, '$1').split(':')[0] ?? '').toLowerCase();
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.startsWith('127.');
  if (loopback) return true;
  const originHost = originHeader === undefined ? '' : new URL(String(originHeader)).hostname.toLowerCase();
  const originLoopback = originHost === 'localhost' || originHost === '127.0.0.1' || originHost === '::1' || originHost.startsWith('127.');
  return originLoopback;
}
