/** dsh-asr-voice — host 半区：ASR 用量统计（计费相关，最小实现）。
 * 记录每次成功转写的次数、累计字符数与最近一次的时间/供应商，经
 * /api/asr-voice/stats 暴露给设置页展示。进程内内存（低优先级特性，
 * 不落盘——重启清零，仅作参考）。
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
/** 用量快照。 */
export interface AsrStats {
    /** 成功转写次数。 */
    count: number;
    /** 累计转写字符数（近似计费量纲）。 */
    chars: number;
    /** 最近一次成功转写时间（ms 时间戳；null = 尚未使用）。 */
    lastAt: number | null;
    /** 最近一次使用的供应商 id。 */
    lastProvider: string;
}
/** 创建用量计数器（进程内）。 */
export declare function createAsrStats(): {
    record(text: string, providerId: string): void;
    snapshot(): AsrStats;
};
/** 注册 /api/asr-voice/stats 路由（GET）：返回用量快照。 */
export declare function registerStatsRoute(register: (def: {
    kind: 'exact';
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}) => () => void, getStats: () => AsrStats): () => void;
//# sourceMappingURL=stats.d.ts.map