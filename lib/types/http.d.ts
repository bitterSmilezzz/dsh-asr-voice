/** dsh-asr-voice — host 半区：HTTP 小工具（读 body / 写 JSON / 信任围栏）。 纯 Node 标准库 + 全局 fetch（Node 18+），无平台专属依赖 → macOS / Windows 双平台。 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** 读取请求原始 body（Buffer），超限报错；读取停滞超过 timeoutMs 则销毁连接。 */
export declare function readRawBody(req: IncomingMessage, maxBytes: number, timeoutMs?: number): Promise<Buffer>;
/** 读取请求 body 并解析为 JSON（超限报错）。 */
export declare function readJsonBody(req: IncomingMessage, maxBytes?: number): Promise<unknown>;
/** 写 JSON 响应。 */
export declare function sendJson(res: ServerResponse, status: number, payload: unknown): void;
/** 信任围栏：只接受本机回环请求，防止任意网页 CSRF 借宿主代理调用云端
 * （消耗用户的 API key / 额度）。要点（与 dsh-retry-settings 的 index.ts、
 * dsh-email 的 web.ts 围栏同款）：
 * - sec-fetch-site === 'cross-site' 一票拒绝（浏览器注入、页面无法伪造）；
 * - Host 严格全等判定回环（127. 宽前缀会被 127.0.0.1.evil.com 之类 DNS rebinding 绕过）；
 * - 带 Origin 的请求要求同源且 Host 本身是回环——仅凭 originName === hostName 时，
 * 解析到 127.0.0.1 的攻击者域名（rebinding 惯用手法）即构成 Host/Origin 相等的
 * "同源"表象，Host 非回环一律不可信；
 * - Origin/Host 解析失败（如字面量 Origin: null）一律不可信，不抛异常冒泡路由。
 */
export declare function isTrusted(req: IncomingMessage): boolean;
/** 路由守卫：信任围栏 + method 白名单。通过返回 null；不通过返回已写好的 403/405 响应值（handler 直接 return 它）。 */
export declare function guardRoute(req: IncomingMessage, methods?: string[]): {
    ok: false;
    status: 403 | 405;
    payload: {
        ok: false;
        reason: string;
    };
} | null;
//# sourceMappingURL=http.d.ts.map