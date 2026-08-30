/**
 * dsh-asr-voice — host 半区：HTTP 小工具（读 body / 写 JSON / 信任围栏）。
 * 纯 Node 标准库 + 全局 fetch（Node 18+），无平台专属依赖 → macOS / Windows 双平台。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** 读取请求原始 body（Buffer），超限报错；读取停滞超过 timeoutMs 则销毁连接。 */
export declare function readRawBody(req: IncomingMessage, maxBytes: number, timeoutMs?: number): Promise<Buffer>;
/** 读取请求 body 并解析为 JSON（超限报错）。 */
export declare function readJsonBody(req: IncomingMessage, maxBytes?: number): Promise<unknown>;
/** 写 JSON 响应。 */
export declare function sendJson(res: ServerResponse, status: number, payload: unknown): void;
/**
 * 信任围栏：只接受本机回环或同源请求，防止任意网页 CSRF 借宿主代理调用云端
 * （消耗用户的 API key / 额度）。要点：
 *  - sec-fetch-site === 'cross-site' 一票拒绝（浏览器注入、页面无法伪造）；
 *  - Host 严格全等判定回环（127. 宽前缀会被 127.0.0.1.evil.com 之类 DNS rebinding 绕过）；
 *  - Host 为回环也要求带 Origin 时同源——网页 fetch('http://localhost:…') 的 Host 恰是回环，
 *    只查 Host 等于不设防；
 *  - Origin/Host 解析失败（如字面量 Origin: null）一律不可信，不抛异常冒泡路由。
 */
export declare function isTrusted(req: IncomingMessage): boolean;
//# sourceMappingURL=http.d.ts.map