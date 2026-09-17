/** dsh-asr-voice — host 半区：HTTP 小工具（读 body / 写 JSON / 信任围栏）。 纯 Node 标准库 + 全局 fetch（Node 18+），无平台专属依赖 → macOS / Windows 双平台。 */
import type { IncomingMessage, ServerResponse } from 'node:http';

/** body 读取阶段的错误：自带语义化 HTTP 状态码（400 非法 JSON / 408 读取超时 / 413 超限），
 *  由路由 catch 直接映射。早先这些错误只带 message、路由一律回 502，把「客户端发了 30MB
 *  音频」记成「上游故障」——排查时被引向服务商，实际是本地就能判定并立刻纠正的输入问题。
 *  实测：`req.destroy(err)` 抛出的就是这个对象本身（instanceof 存活），超限在 for-await
 *  里直接 throw 也不会毁掉 socket，413 能真正写到客户端。 */
export class HttpBodyError extends Error {
  readonly status: 400 | 408 | 413;
  constructor(status: 400 | 408 | 413, message: string) {
    super(message);
    this.name = 'HttpBodyError';
    this.status = status;
  }
}

/** 从 catch 到的错误取应回的状态码：{@link HttpBodyError} 用自带 status，其余回退 fallback
 *  （路由传 502 = 真正的上游/服务端故障）。 */
export function statusOfBodyError(error: unknown, fallback: number): number {
  return error instanceof HttpBodyError ? error.status : fallback;
}

/** 读取请求原始 body（Buffer），超限报错；读取停滞超过 timeoutMs 则销毁连接。 */
export async function readRawBody(req: IncomingMessage, maxBytes: number, timeoutMs = 60_000): Promise<Buffer> {
  const parts: Buffer[] = [];
  let size = 0;
  const timer = setTimeout(() => {
    // 慢速/停滞上传不该长期占用 handler 与 socket；destroy 让 for-await 抛错走错误分支。
    // 注：destroy 会连 socket 一起收掉，408 实际到不了客户端（连接已断）——状态码只用于
    // 日志/测试口径，与 413 不同（后者 socket 仍活，响应真的送达）。
    req.destroy(new HttpBodyError(408, `request body read timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  try {
    for await (const chunk of req) {
      const buf = chunk as Buffer;
      size += buf.length;
      if (size > maxBytes) throw new HttpBodyError(413, `request body exceeds ${maxBytes} bytes`);
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
    throw new HttpBodyError(400, 'invalid JSON body');
  }
}

/** 上游响应体（JSON）大小上限：用户自填的 baseUrl 可以指向任意端点（含不可信的自建
 *  服务），而 `res.json()` 是无上限的——一个「把请求体回显回来」或单纯跑飞的端点就能
 *  让宿主吃下几百 MB（转写本身已占 4~5× 音频大小的瞬时内存）。4MB 远超正常 ASR 文本
 *  与模型列表的量级。 */
export const MAX_UPSTREAM_JSON_BYTES = 4 * 1024 * 1024

/** 读取上游响应体并解析 JSON（带字节上限）。超限抛错（按上游故障报错），非 JSON 返回 {}
 *  （沿用既有「解析失败 → 空对象 → 用 HTTP 状态码描述错误」的口径）。
 *  实现取舍：**不**用 `res.text()` 再判长度——那等于先把整个响应读进内存，上限就成了
 *  摆设。这里边读边计数，超限立刻 `reader.cancel()` 断掉下载；`content-length` 只是
 *  便宜的快路径（声明就超限时连读都不读），不可信端点完全可以不报或谎报它。 */
export async function readUpstreamJson(res: Response, maxBytes = MAX_UPSTREAM_JSON_BYTES): Promise<unknown> {
  const declared = Number(res.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) {
    await res.body?.cancel().catch(() => { /* 取消失败无所谓：连接由 GC/超时收掉 */ });
    throw new Error(`upstream response too large (${declared} > ${maxBytes} bytes)`);
  }
  if (res.body === null) return {};
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  let overflow = false;
  for (;;) {
    const step = await reader.read().catch(() => ({ done: true as const, value: undefined }));
    if (step.done) break;
    size += step.value.byteLength;
    if (size > maxBytes) {
      overflow = true;
      await reader.cancel().catch(() => { /* 同上 */ });
      break;
    }
    parts.push(step.value);
  }
  if (overflow) throw new Error(`upstream response too large (> ${maxBytes} bytes)`);
  const text = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength))).toString('utf8');
  if (text === '') return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

/** 上游文本透出给浏览器前的脱敏：剥掉密钥形状、折叠空白、截断。
 *  上游（或用户自填的恶意 baseUrl）常把请求内容回显进错误体（`Bearer <key>`、内部
 *  URL），而这些文本会经路由的 `reason` 直通浏览器并被客户端当文案显示——等于把 key
 *  印在页面上。这里只做**形状级**剥离（不猜语义），宁可多脱一点。
 *  @param text 上游/错误文本。 @param maxLen 截断长度（超出加省略号）。 */
export function redactSecret(text: string, maxLen = 200): string {
  const redacted = text
    // 认证头回显（最典型的泄漏形状）
    .replace(/\bBearer\s+\S+/gi, '<redacted>')
    // OpenAI 系密钥（sk-… / sk-proj-…）
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, '<redacted>')
    // 本插件自己的凭据引用名（上游若回显请求头/环境变量名会带上它）
    .replace(/\bASR_VOICE_[A-Z0-9_]+/g, '<redacted>')
    .replace(/\s+/g, ' ')
    .trim();
  return redacted.length > maxLen ? `${redacted.slice(0, maxLen)}…` : redacted;
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

/** 信任围栏：只接受本机回环请求，防止任意网页 CSRF 借宿主代理调用云端
 * （消耗用户的 API key / 额度）。要点（与 dsh-retry-settings 的 index.ts、
 * dsh-email 的 web.ts 围栏同款）：
 * - sec-fetch-site === 'cross-site' 一票拒绝（浏览器注入、页面无法伪造）；
 * - Host 严格全等判定回环（127. 宽前缀会被 127.0.0.1.evil.com 之类 DNS rebinding 绕过）；
 * - 带 Origin 的请求要求**同源（scheme+host+port）**且 Host 本身是回环——只比主机名时
 * http://localhost:5173 上的任意页面（dev server / 预览服务 / 本机任何 web 应用）都算
 * 「与宿主同源」，能借宿主代理花用户的 key（此时 Sec-Fetch-Site 是 same-site，拦不住）；
 * 同理，解析到 127.0.0.1 的攻击者域名（rebinding 惯用手法）也只构成 Host/Origin 相等的
 * "同源"表象，Host 非回环一律不可信；
 * - Origin/Host 解析失败（如字面量 Origin: null）一律不可信，不抛异常冒泡路由。
 */
export function isTrusted(req: IncomingMessage): boolean {
  const site = req.headers['sec-fetch-site'];
  if (typeof site === 'string' && site === 'cross-site') return false;
  const stripBrackets = (h: string): string => (h.startsWith('[') && h.endsWith(']') ? h.slice(1, -1) : h);
  const loopbackOf = (h: string): boolean =>
    h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h);
  // 同源判定必须带上端口：浏览器的同源 = scheme + host + **port**，只比主机名会把
  // http://localhost:5173 的页面当成与宿主 http://localhost:3080 同源。默认端口（80/443）
  // 两侧都归一化掉——`Host: localhost:80` 与 `Origin: http://localhost` 在浏览器眼里本就
  // 同源，不该因一侧显式写了默认端口而判成跨源（非默认端口则必须逐字一致）。
  const stripDefaultPort = (h: string): string => h.replace(/:(?:80|443)$/, '');
  let hostName = '';
  let hostWithPort = '';
  try {
    const hostUrl = new URL(`http://${String(req.headers.host ?? 'invalid.invalid')}`);
    hostName = stripBrackets(hostUrl.hostname.toLowerCase());
    hostWithPort = stripDefaultPort(hostUrl.host.toLowerCase());
  } catch {
    return false;
  }
  const hostLoopback = loopbackOf(hostName);
  const originHeader = req.headers.origin;
  if (originHeader === undefined) return hostLoopback; // 无 Origin（curl/页面导航）：只信回环 Host
  let originHost = '';
  try {
    originHost = stripDefaultPort(new URL(String(originHeader)).host.toLowerCase());
  } catch {
    return false; // Origin: null / 畸形 → 不可信
  }
  // 有 Origin：必须**同源（含端口）**且 Host 本是回环。仅凭主机名相等时，攻击者可注册
  // 一个解析到 127.0.0.1 的域名（如 127.0.0.1.evil.com，DNS rebinding 惯用手法），本机浏览器
  // 访问它即构成 Host/Origin 相等的"同源"请求——与"无 Origin 但 Host 非回环 → 拒绝"的
  // 既有口径一致：Host 非回环一律不可信。
  return hostLoopback && originHost === hostWithPort;
}

/** 路由守卫：信任围栏 + method 白名单。通过返回 null；不通过返回已写好的 403/405 响应值（handler 直接 return 它）。 */
export function guardRoute(
  req: IncomingMessage,
  methods: string[] = ['POST'],
): { ok: false; status: 403 | 405; payload: { ok: false; reason: string } } | null {
  if (!isTrusted(req)) return { ok: false, status: 403, payload: { ok: false, reason: 'forbidden: host/origin not trusted' } };
  if (!methods.includes(req.method ?? '')) return { ok: false, status: 405, payload: { ok: false, reason: 'method not allowed' } };
  return null;
}
