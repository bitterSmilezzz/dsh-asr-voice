/** dsh-asr-voice — host 半区：HTTP 小工具（读 body / 写 JSON / 信任围栏）。 纯 Node 标准库 + 全局 fetch（Node 18+），无平台专属依赖 → macOS / Windows 双平台。 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** body 读取阶段的错误：自带语义化 HTTP 状态码（400 非法 JSON / 408 读取超时 / 413 超限），
 *  由路由 catch 直接映射。早先这些错误只带 message、路由一律回 502，把「客户端发了 30MB
 *  音频」记成「上游故障」——排查时被引向服务商，实际是本地就能判定并立刻纠正的输入问题。
 *  实测：`req.destroy(err)` 抛出的就是这个对象本身（instanceof 存活），超限在 for-await
 *  里直接 throw 也不会毁掉 socket，413 能真正写到客户端。 */
export declare class HttpBodyError extends Error {
    readonly status: 400 | 408 | 413;
    constructor(status: 400 | 408 | 413, message: string);
}
/** 从 catch 到的错误取应回的状态码：{@link HttpBodyError} 用自带 status，其余回退 fallback
 *  （路由传 502 = 真正的上游/服务端故障）。 */
export declare function statusOfBodyError(error: unknown, fallback: number): number;
/** 读取请求原始 body（Buffer），超限报错；读取停滞超过 timeoutMs 则销毁连接。 */
export declare function readRawBody(req: IncomingMessage, maxBytes: number, timeoutMs?: number): Promise<Buffer>;
/** 读取请求 body 并解析为 JSON（超限报错）。 */
export declare function readJsonBody(req: IncomingMessage, maxBytes?: number): Promise<unknown>;
/** 上游响应体（JSON）大小上限：用户自填的 baseUrl 可以指向任意端点（含不可信的自建
 *  服务），而 `res.json()` 是无上限的——一个「把请求体回显回来」或单纯跑飞的端点就能
 *  让宿主吃下几百 MB（转写本身已占 4~5× 音频大小的瞬时内存）。4MB 远超正常 ASR 文本
 *  与模型列表的量级。 */
export declare const MAX_UPSTREAM_JSON_BYTES: number;
/** 读取上游响应体并解析 JSON（带字节上限）。超限抛错（按上游故障报错），非 JSON 返回 {}
 *  （沿用既有「解析失败 → 空对象 → 用 HTTP 状态码描述错误」的口径）。
 *  实现取舍：**不**用 `res.text()` 再判长度——那等于先把整个响应读进内存，上限就成了
 *  摆设。这里边读边计数，超限立刻 `reader.cancel()` 断掉下载；`content-length` 只是
 *  便宜的快路径（声明就超限时连读都不读），不可信端点完全可以不报或谎报它。 */
export declare function readUpstreamJson(res: Response, maxBytes?: number): Promise<unknown>;
/** 上游文本透出给浏览器前的脱敏：剥掉密钥形状、折叠空白、截断。
 *  上游（或用户自填的恶意 baseUrl）常把请求内容回显进错误体（`Bearer <key>`、内部
 *  URL），而这些文本会经路由的 `reason` 直通浏览器并被客户端当文案显示——等于把 key
 *  印在页面上。这里只做**形状级**剥离（不猜语义），宁可多脱一点。
 *  @param text 上游/错误文本。 @param maxLen 截断长度（超出加省略号）。 */
export declare function redactSecret(text: string, maxLen?: number): string;
/** 写 JSON 响应。 */
export declare function sendJson(res: ServerResponse, status: number, payload: unknown): void;
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