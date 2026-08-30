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
// Type-only: pulls the @deepseek-ai/cordis Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver';
// Type-only: pulls ctx.llm (LlmRuntime).
import type {} from '@deepseek-ai/dsh-llm';
// Type-only: pulls ctx.settings (SettingsProvider) merge for scoped inject.
import type {} from '@deepseek-ai/dsh-settings';
import { ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema, type AsrVoiceSettings } from './settings.ts';
import { registerTranscribeRoute, type CloudAsrConfig } from './transcribe.ts';
import { registerOptimizeRoute, registerModelsRoute } from './optimize.ts';
import { registerAsrModelsRoute, type CloudProviderLike } from './asr-models.ts';
import { createAsrStats, registerStatsRoute } from './stats.ts';

/** Host context slice this plugin consumes (webServer/llm/settings via type merges). */
type AsrVoiceHostContext = Context;

export const name = 'dsh-asr-voice';

/** 所需 Cordis 服务（服务名，非 entry id）。 */
// settings / agentDefaultModel 不作为硬依赖：settings 用 scoped inject（缺失时仅云端
// ASR 无 key 可用、不影响挂载），agentDefaultModel 在优化路由内 ctx.get 可选读取。
export const inject = ['webServer', 'llm'];

/** 从 settings 解析当前生效的云端 ASR 供应商（多供应商 active/首个，或旧单配置）。 */
function resolveCloudProvider(v: AsrVoiceSettings | undefined): CloudAsrConfig | undefined {
  if (!v) return undefined
  const cloud = v.asr.cloud
  if (Array.isArray(cloud.providers) && cloud.providers.length > 0) {
    const active = cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0]!
    return {
      id: active.id || 'provider',
      baseUrl: active.baseUrl ?? '',
      apiKey: active.apiKey ?? '',
      model: active.model ?? '',
      mode: active.mode ?? 'auto',
    }
  }
  // 旧单配置（v0.1 遗留）
  return {
    id: 'legacy',
    baseUrl: cloud.baseUrl ?? '',
    apiKey: cloud.apiKey ?? '',
    model: cloud.model ?? '',
    mode: cloud.mode ?? 'auto',
  }
}

/** 读取全部已配置供应商（多供应商列表；旧单配置合成一个 'legacy'）。 */
function listProviders(v: AsrVoiceSettings | undefined): CloudProviderLike[] {
  if (!v) return []
  const cloud = v.asr.cloud
  if (Array.isArray(cloud.providers) && cloud.providers.length > 0) {
    return cloud.providers.map((p) => ({
      id: p.id || 'provider',
      preset: p.preset ?? 'custom',
      baseUrl: p.baseUrl ?? '',
      apiKey: p.apiKey ?? '',
      model: p.model ?? '',
      mode: p.mode ?? 'auto',
    }))
  }
  if (cloud.baseUrl) {
    return [{
      id: 'legacy',
      preset: cloud.preset ?? 'custom',
      baseUrl: cloud.baseUrl,
      apiKey: cloud.apiKey ?? '',
      model: cloud.model ?? '',
      mode: cloud.mode ?? 'auto',
    }]
  }
  return []
}

export function apply(ctx: AsrVoiceHostContext): void {
  // 插件配置 namespace：设置统一存 host settings 服务（namespace `asr-voice`）。
  let settingsScope: { get(): AsrVoiceSettings } | undefined
  ctx.inject(['settings'], (sctx) => {
    settingsScope = sctx.settings.register<typeof ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettings>(ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema);
  });

  const getCloudConfig = (): CloudAsrConfig => {
    const cfg = resolveCloudProvider(settingsScope?.get());
    return cfg ?? { id: '', baseUrl: '', apiKey: '', model: '', mode: 'auto' };
  };
  const getProviders = (): CloudProviderLike[] => listProviders(settingsScope?.get());
  const stats = createAsrStats();

  // 路由随 fiber 生命周期注册/回收。
  ctx.effect(() => registerTranscribeRoute(
    (def) => ctx.webServer.register(def),
    getCloudConfig,
    ctx,
    (text, providerId) => stats.record(text, providerId),
  ), 'asr-voice: transcribe route');
  ctx.effect(() => registerOptimizeRoute((def) => ctx.webServer.register(def), ctx), 'asr-voice: optimize route');
  ctx.effect(() => registerModelsRoute((def) => ctx.webServer.register(def), ctx), 'asr-voice: models route');
  ctx.effect(() => registerAsrModelsRoute((def) => ctx.webServer.register(def), getProviders, ctx), 'asr-voice: asr-models route');
  ctx.effect(() => registerStatsRoute((def) => ctx.webServer.register(def), () => stats.snapshot()), 'asr-voice: stats route');
}
