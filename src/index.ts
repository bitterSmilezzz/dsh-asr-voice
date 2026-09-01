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
 *   - 启动时一次性迁移：settings 里的遗留明文 key → DSH credentials，随后抹掉明文
 *
 * LLM 优化默认走 DSH 当前所选 LLM（ctx.agentDefaultModel + ctx.llm），无需
 * 插件单独配 key。云端 ASR 支持多供应商（asr.cloud.providers + active），但
 * settings 里只有 baseUrl / model / mode 等无密钥元数据：API key 存 DSH
 * credentials（引用名见 src/key-ref.ts），浏览器只经私有 JSON 路由调用，拿不到 key。
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
import { keyRefFor } from './key-ref.ts';
import { registerTranscribeRoute, resolveApiKey, type CloudAsrConfig } from './transcribe.ts';
import { registerOptimizeRoute, registerModelsRoute } from './optimize.ts';
import { registerAsrModelsRoute, type CloudProviderLike } from './asr-models.ts';
import { createAsrStats, registerStatsRoute } from './stats.ts';
import { RealtimeHost } from './realtime-host.ts';
import { createFakeRealtimeProvider, type RealtimeProvider } from './realtime-provider.ts';
import { createDashscopeRealtimeProvider } from './realtime-dashscope.ts';
import { realtimePresetById } from './presets.ts';

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
      preset: active.preset ?? 'openai',
      name: active.name ?? '',
      baseUrl: active.baseUrl ?? '',
      apiKey: active.apiKey ?? '',
      model: active.model ?? '',
      mode: active.mode ?? 'auto',
    }
  }
  // 旧单配置（v0.1 遗留）
  return {
    id: 'legacy',
    preset: cloud.preset ?? 'openai',
    name: '',
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
      preset: p.preset ?? 'openai',
      name: p.name ?? '',
      baseUrl: p.baseUrl ?? '',
      apiKey: p.apiKey ?? '',
      model: p.model ?? '',
      mode: p.mode ?? 'auto',
    }))
  }
  if (cloud.baseUrl) {
    return [{
      id: 'legacy',
      preset: cloud.preset ?? 'openai',
      name: '',
      baseUrl: cloud.baseUrl,
      apiKey: cloud.apiKey ?? '',
      model: cloud.model ?? '',
      mode: cloud.mode ?? 'auto',
    }]
  }
  return []
}

/** DSH credentials 服务的最小面（可选服务，本插件不把它列为硬依赖）。 */
interface CredentialsLike {
  set(ref: unknown, value: string): Promise<void>
}

/**
 * 一次性迁移：把 settings 里遗留的明文 API key 搬进 DSH credentials，全部搬成功后抹掉明文。
 *
 * 任一条搬不动（凭据服务缺席、该引用被只读来源拒绝）就整批原样留着——抹掉一把无处可寻的
 * key 比留一份本机明文更糟。{@link resolveApiKey} 始终先读 settings，所以未迁移状态下功能
 * 不降级；迁移成功后 settings 里的 key 恒为空，密钥只剩 credentials 一个来源。
 */
async function migrateLegacyKeys(
  scope: { get(): AsrVoiceSettings; update(patch: object): Promise<void> },
  credentials: CredentialsLike | undefined,
  log: { warn(message: string): void; info(message: string): void },
): Promise<void> {
  if (credentials === undefined) return
  // scope.get() 交回来的是深度冻结的解析快照，改之前必须先脱冻。
  const cloud = structuredClone(scope.get().asr.cloud)
  const pending: Array<{ ref: string; key: string }> = []
  for (const row of cloud.providers) {
    const key = (row.apiKey ?? '').trim()
    if (key === '') continue
    pending.push({ ref: keyRefFor(row), key })
    row.apiKey = ''
  }
  const legacyKey = (cloud.apiKey ?? '').trim()
  if (legacyKey !== '') {
    pending.push({ ref: keyRefFor({ preset: cloud.preset, name: '', id: 'legacy' }), key: legacyKey })
  }
  if (pending.length === 0) return
  for (const item of pending) {
    try {
      await credentials.set(item.ref, item.key)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      log.warn(`credentials.set(${item.ref}) refused: ${reason}; legacy keys left in place`)
      return
    }
  }
  const patch: Record<string, unknown> = { providers: cloud.providers }
  if (legacyKey !== '') patch.apiKey = ''
  await scope.update({ asr: { cloud: patch } })
  log.info(`moved ${pending.length} API key(s) from plugin settings into DSH credentials`)
}

/**
 * 实时 provider 工厂（I5）：按 `realtime.provider` 设置分派。
 *  '' / 'builtin' → 内置假 provider（I3/I4 开发态，不花配额）；
 *  预置 id（如 'dashscope-realtime'）→ 真云端 provider，凭据复用 DSH credentials
 *  （keyPreset 指回 CLOUD_PRESETS 预置，`keyRefFor` 派生成 `<PRESET>_API_KEY`，
 *  配过同名 LLM 的用户天然命中同一把 key）。无 key 时 connect 抛错，让会话路由
 *  502 带原因，客户端可见「provider-unreachable」而不是静默降级。
 */
function createRealtimeProvider(
  ctx: AsrVoiceHostContext,
  getSettings: () => AsrVoiceSettings | undefined,
): RealtimeProvider {
  const pid = getSettings()?.realtime.provider ?? ''
  if (pid === '' || pid === 'builtin') return createFakeRealtimeProvider()
  const preset = realtimePresetById(pid)
  if (preset === undefined) return createFakeRealtimeProvider()
  return {
    connect: async () => {
      const apiKey = await resolveApiKey(ctx, {
        id: preset.id,
        preset: preset.keyPreset,
        name: preset.label,
        baseUrl: '',
        apiKey: '',
        model: preset.defaultModel,
        mode: 'chat',
      })
      if (apiKey === '') {
        throw new Error(
          `realtime provider ${pid}: no API key — set the credential ${keyRefFor({ preset: preset.keyPreset, name: preset.label, id: preset.id })} in DSH (a same-named LLM key is reused automatically)`,
        )
      }
      return createDashscopeRealtimeProvider({ apiKey, model: preset.defaultModel, wssUrl: preset.wssUrl }).connect()
    },
  }
}

export function apply(ctx: AsrVoiceHostContext): void {
  // 插件配置 namespace：设置统一存 host settings 服务（namespace `asr-voice`）。
  let settingsScope: { get(): AsrVoiceSettings; update(patch: object): Promise<void> } | undefined
  ctx.inject(['settings'], (sctx) => {
    const scope = sctx.settings.register<typeof ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettings>(ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema);
    settingsScope = scope
    // 遗留明文 key → credentials：启动时跑一次，迁移完成后每次都是空转早退。
    const logger = sctx.logger('asr-voice')
    sctx.effect(() => {
      const migrating = migrateLegacyKeys(scope, sctx.get('credentials') as CredentialsLike | undefined, logger)
        .catch((error: unknown) => { logger.warn(`legacy key migration stopped: ${error instanceof Error ? error.message : String(error)}`) })
      return async () => { await migrating }
    }, 'asr-voice: migrate legacy api keys')
  });

  const getCloudConfig = (): CloudAsrConfig => {
    const cfg = resolveCloudProvider(settingsScope?.get());
    return cfg ?? { id: '', preset: 'openai', name: '', baseUrl: '', apiKey: '', model: '', mode: 'auto' };
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

  // 实时转写通道（I3）：会话注册表 + SSE 下行 + RealtimeProvider 接缝。
  // I3/I4 阶段 host 用假 provider 驱动整条管道；I5 按 settings `realtime.provider`
  // 分派到真云端（qwen3-asr-flash-realtime）或内置模拟——接缝与路由一行不改。
  ctx.effect(() => {
    const host = new RealtimeHost({
      createProvider: () => createRealtimeProvider(ctx, () => settingsScope?.get()).connect(),
    });
    const disposeRoutes = host.registerRoutes((def) => ctx.webServer.register(def));
    return () => disposeRoutes();
  }, 'asr-voice: realtime routes');
}
