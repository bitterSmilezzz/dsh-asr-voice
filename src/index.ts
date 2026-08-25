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
import type { IncomingMessage, ServerResponse } from 'node:http';
// Type-only: pulls the @deepseek-ai/cordis Context merge (ctx.webServer).
import type {} from '@deepseek-ai/dsh-host-webserver';
// Type-only: pulls ctx.llm (LlmRuntime).
import type {} from '@deepseek-ai/dsh-llm';
import { ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema, type AsrVoiceSettings } from './settings.ts';
import { registerTranscribeRoute, type CloudAsrConfig } from './transcribe.ts';
import { buildOptimizeRunner, registerOptimizeRoute, type LlmOptimizeConfig } from './optimize.ts';

/** 最小 settings 面（本插件只用 register + scope.get）。 */
interface SettingsLike {
  register<T>(ns: unknown, schema: unknown, options?: { base?: unknown; validate?: unknown }): { get(): T };
}

/** Host context slice this plugin consumes (webServer/llm/agentDefaultModel from type merges). */
type AsrVoiceHostContext = Context & {
  settings: SettingsLike;
  webServer: {
    register(def: {
      kind: 'exact';
      path: string;
      handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
    }): () => void;
  };
};

export const name = 'dsh-asr-voice';

/** 所需 Cordis 服务（服务名，非 entry id）。 */
export const inject = ['webServer', 'settings', 'llm', 'agentDefaultModel'];

export function apply(ctx: AsrVoiceHostContext): void {
  // 插件配置 namespace：设置统一存 host settings 服务（namespace `asr-voice`）。
  const scope = ctx.settings.register<AsrVoiceSettings>(ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema);

  const getCloudConfig = (): CloudAsrConfig => {
    const v = scope.get();
    return {
      baseUrl: v.asr.cloud.baseUrl,
      apiKey: v.asr.cloud.apiKey,
      model: v.asr.cloud.model,
    };
  };

  const getLlmConfig = (): LlmOptimizeConfig => {
    const v = scope.get();
    return {
      baseUrl: v.optimize.llm.baseUrl,
      apiKey: v.optimize.llm.apiKey,
      model: v.optimize.llm.model,
    };
  };

  // 优化执行器：独立配置优先，否则用当前所选 LLM。
  const optimize = buildOptimizeRunner(ctx, getLlmConfig);

  // 路由随 fiber 生命周期注册/回收。
  ctx.effect(() => registerTranscribeRoute((def) => ctx.webServer.register(def), getCloudConfig), 'asr-voice: transcribe route');
  ctx.effect(() => registerOptimizeRoute((def) => ctx.webServer.register(def), optimize), 'asr-voice: optimize route');
}
