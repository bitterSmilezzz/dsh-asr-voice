/**
 * dsh-asr-voice — host 半区（组合器）。
 *
 * 职责：
 *   - 注册插件配置 namespace `asr-voice`（设置页「语音输入」卡片的权威源）
 *   - /api/asr-voice/transcribe —— 云端 ASR 代理（浏览器上传音频，host 转发；支持多供应商）
 *   - /api/asr-voice/optimize    —— LLM 提示词优化代理
 *   - /api/asr-voice/models      —— 枚举 DSH 已配置模型（优化模型选择器）
 *   - /api/asr-voice/asr-models  —— 动态获取某供应商的 ASR 模型（设置页「获取模型」）
 *   - /api/asr-voice/stats       —— ASR 用量统计（计费相关，低优先级）
 *
 * LLM 优化默认走 DSH 当前所选 LLM（ctx.agentDefaultModel + ctx.llm），无需
 * 插件单独配 key。云端 ASR 支持多供应商（asr.cloud.providers + active）。
 * API key 全程在服务端，浏览器只经私有 JSON 路由调用。
 * 纯 Node HTTP + 官方 LLM 通道，无平台专属二进制 → macOS / Windows 双平台。
 */
import type { Context } from '@deepseek-ai/cordis';
/** Host context slice this plugin consumes (webServer/llm/settings via type merges). */
type AsrVoiceHostContext = Context;
export declare const name = "dsh-asr-voice";
/** 所需 Cordis 服务（服务名，非 entry id）。 */
export declare const inject: string[];
export declare function apply(ctx: AsrVoiceHostContext): void;
export {};
//# sourceMappingURL=index.d.ts.map