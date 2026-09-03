import { guardRoute, sendJson } from "./http.js";
/** 创建用量计数器（进程内）。 */
export function createAsrStats() {
    const s = { count: 0, chars: 0, lastAt: null, lastProvider: '' };
    return {
        record(text, providerId) {
            s.count += 1;
            s.chars += text.length;
            s.lastAt = Date.now();
            s.lastProvider = providerId;
        },
        snapshot() {
            return { ...s };
        },
    };
}
/** 注册 /api/asr-voice/stats 路由（GET）：返回用量快照。 */
export function registerStatsRoute(register, getStats) {
    return register({
        kind: 'exact',
        path: '/api/asr-voice/stats',
        handler: async (req, res) => {
            const denied = guardRoute(req, ['GET']);
            if (denied !== null)
                return sendJson(res, denied.status, denied.payload);
            return sendJson(res, 200, { ok: true, stats: getStats() });
        },
    });
}
//# sourceMappingURL=stats.js.map