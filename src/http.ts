/**
 * dsh-asr-voice — host 半区：HTTP 小工具（读 body / 写 JSON / 信任围栏）。
 * 纯 Node 标准库 + 全局 fetch（Node 18+），无平台专属依赖 → macOS / Windows 双平台。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/** 读取请求原始 body（Buffer），超限报错；读取停滞超过 timeoutMs 则销毁连接。 */
export async function readRawBody(req: IncomingMessage, maxBytes: number, timeoutMs = 60_000): Promise<Buffer> {
  const parts: Buffer[] = [];
  let size = 0;
  const timer = setTimeout(() => {
    // 慢速/停滞上传不该长期占用 handler 与 socket；destroy 让 for-await 抛错走错误分支。
    req.destroy(new Error(`request body read timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  try {
    for await (const chunk of req) {
      const buf = chunk as Buffer;
      size += buf.length;
      if (size > maxBytes) throw new Error(`request body exceeds ${maxBytes} bytes`);
      parts.push(buf);
    }
  } finally {
    clearTimeout(timer);
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
 * 信任围栏：只接受本机回环或同源请求，防止任意网页 CSRF 借宿主代理调用云端
 * （消耗用户的 API key / 额度）。要点：
 *  - sec-fetch-site === 'cross-site' 一票拒绝（浏览器注入、页面无法伪造）；
 *  - Host 严格全等判定回环（127. 宽前缀会被 127.0.0.1.evil.com 之类 DNS rebinding 绕过）；
 *  - Host 为回环也要求带 Origin 时同源——网页 fetch('http://localhost:…') 的 Host 恰是回环，
 *    只查 Host 等于不设防；
 *  - Origin/Host 解析失败（如字面量 Origin: null）一律不可信，不抛异常冒泡路由。
 */
export function isTrusted(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site'];
  if (typeof site === 'string' && site === 'cross-site') return false;
  const stripBrackets = (h: string): string => (h.startsWith('[') && h.endsWith(']') ? h.slice(1, -1) : h);
  const loopbackOf = (h: string): boolean =>
    h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h);
  let hostName = '';
  try {
    hostName = stripBrackets(new URL(`http://${String(req.headers.host ?? 'invalid.invalid')}`).hostname.toLowerCase());
  } catch {
    return false;
  }
  const hostLoopback = loopbackOf(hostName);
  const originHeader = req.headers.origin;
  if (originHeader === undefined) return hostLoopback; // 无 Origin（curl/页面导航）：只信回环 Host
  let originName = '';
  try {
    originName = stripBrackets(new URL(String(originHeader)).hostname.toLowerCase());
  } catch {
    return false; // Origin: null / 畸形 → 不可信
  }
  // 有 Origin：必须与 Host 同源。回环限制放开为「与 Host 一致」——LAN 同源访问
  // （Origin 与 Host 都是局域网地址）同样可信，跨源网页无论如何都被拒。
  return originName === hostName;
}
