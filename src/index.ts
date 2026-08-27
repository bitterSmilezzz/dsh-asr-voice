/**
 * dsh-asr-voice — host 半区（组合器）。
 *
 * 职责：
 *   - 注册插件配置 namespace `asr-voice`（设置页「语音输入」卡片的权威源）
 *   - /api/asr-voice/transcribe —— 云端 ASR 代理（浏览器上传原始音频，host 转发）
 *   - /api/asr-voice/optimize    —— LLM 提示词优化代理
 *
 * LLM 优化默认走 DSH 当前所选 LLM（ctx.agentDefaultModel + ctx.llm），无需
 * 插件单独配 key；独立 OpenAI-compatible 配置为可选高级项。
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

/** Host context slice this plugin consumes (webServer/llm/settings via type merges). */
type AsrVoiceHostContext = Context;

export const name = 'dsh-asr-voice';

/** 所需 Cordis 服务（服务名，非 entry id）。 */
// settings / agentDefaultModel 不作为硬依赖：settings 用 scoped inject（缺失时仅云端
// ASR 无 key 可用、不影响挂载），agentDefaultModel 在优化路由内 ctx.get 可选读取。
export const inject = ['webServer', 'llm'];

export function apply(ctx: AsrVoiceHostContext): void {
  // 插件配置 namespace：设置统一存 host settings 服务（namespace `asr-voice`）。
  // settings 为可选服务：用 scoped inject 挂载（与当前官方插件一致），缺失时
  // getCloudConfig 返回空配置（云端 ASR 报「未配置」，浏览器 ASR 不受影响）。
  let settingsScope: { get(): AsrVoiceSettings } | undefined
  ctx.inject(['settings'], (sctx) => {
    settingsScope = sctx.settings.register<AsrVoiceSettings>(ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema);
  });

  const getCloudConfig = (): CloudAsrConfig => {
    const v = settingsScope?.get();
    return {
      baseUrl: v?.asr.cloud.baseUrl ?? '',
      apiKey: v?.asr.cloud.apiKey ?? '',
      model: v?.asr.cloud.model ?? '',
    };
  };

  // 路由随 fiber 生命周期注册/回收。
  ctx.effect(() => registerTranscribeRoute((def) => ctx.webServer.register(def), getCloudConfig), 'asr-voice: transcribe route');
  ctx.effect(() => registerOptimizeRoute((def) => ctx.webServer.register(def), ctx), 'asr-voice: optimize route');
  ctx.effect(() => registerModelsRoute((def) => ctx.webServer.register(def), ctx), 'asr-voice: models route');
}
