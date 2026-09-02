/** 读取请求原始 body（Buffer），超限报错；读取停滞超过 timeoutMs 则销毁连接。 */
export async function readRawBody(req, maxBytes, timeoutMs = 60_000) {
    const parts = [];
    let size = 0;
    const timer = setTimeout(() => {
        // 慢速/停滞上传不该长期占用 handler 与 socket；destroy 让 for-await 抛错走错误分支。
        req.destroy(new Error(`request body read timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    try {
        for await (const chunk of req) {
            const buf = chunk;
            size += buf.length;
            if (size > maxBytes)
                throw new Error(`request body exceeds ${maxBytes} bytes`);
            parts.push(buf);
        }
    }
    finally {
        clearTimeout(timer);
    }
    return Buffer.concat(parts);
}
/** 读取请求 body 并解析为 JSON（超限报错）。 */
export async function readJsonBody(req, maxBytes = 256 * 1024) {
    const raw = await readRawBody(req, maxBytes);
    if (raw.length === 0)
        return {};
    try {
        return JSON.parse(raw.toString('utf8'));
    }
    catch {
        throw new Error('invalid JSON body');
    }
}
/** 写 JSON 响应。 */
export function sendJson(res, status, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
    });
    res.end(body);
}
/**
 * 信任围栏：只接受本机回环请求，防止任意网页 CSRF 借宿主代理调用云端
 * （消耗用户的 API key / 额度）。要点（与 dsh-retry-settings 的 index.ts、
 * dsh-email 的 web.ts 围栏同款）：
 *  - sec-fetch-site === 'cross-site' 一票拒绝（浏览器注入、页面无法伪造）；
 *  - Host 严格全等判定回环（127. 宽前缀会被 127.0.0.1.evil.com 之类 DNS rebinding 绕过）；
 *  - 带 Origin 的请求要求同源且 Host 本身是回环——仅凭 originName === hostName 时，
 *    解析到 127.0.0.1 的攻击者域名（rebinding 惯用手法）即构成 Host/Origin 相等的
 *    "同源"表象，Host 非回环一律不可信；
 *  - Origin/Host 解析失败（如字面量 Origin: null）一律不可信，不抛异常冒泡路由。
 */
export function isTrusted(req) {
    const site = req.headers['sec-fetch-site'];
    if (typeof site === 'string' && site === 'cross-site')
        return false;
    const stripBrackets = (h) => (h.startsWith('[') && h.endsWith(']') ? h.slice(1, -1) : h);
    const loopbackOf = (h) => h === 'localhost' || h === '::1' || /^127\.\d+\.\d+\.\d+$/.test(h);
    let hostName = '';
    try {
        hostName = stripBrackets(new URL(`http://${String(req.headers.host ?? 'invalid.invalid')}`).hostname.toLowerCase());
    }
    catch {
        return false;
    }
    const hostLoopback = loopbackOf(hostName);
    const originHeader = req.headers.origin;
    if (originHeader === undefined)
        return hostLoopback; // 无 Origin（curl/页面导航）：只信回环 Host
    let originName = '';
    try {
        originName = stripBrackets(new URL(String(originHeader)).hostname.toLowerCase());
    }
    catch {
        return false; // Origin: null / 畸形 → 不可信
    }
    // 有 Origin：必须同源且 Host 本身是回环。仅凭 originName === hostName 时，攻击者可注册
    // 一个解析到 127.0.0.1 的域名（如 127.0.0.1.evil.com，DNS rebinding 惯用手法），本机浏览器
    // 访问它即构成 Host/Origin 相等的"同源"请求——与"无 Origin 但 Host 非回环 → 拒绝"的
    // 既有口径一致：Host 非回环一律不可信。
    return hostLoopback && originName === hostName;
}
//# sourceMappingURL=http.js.map