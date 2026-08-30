import { ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema } from "./settings.js";
import { registerTranscribeRoute } from "./transcribe.js";
import { registerOptimizeRoute, registerModelsRoute } from "./optimize.js";
import { registerAsrModelsRoute } from "./asr-models.js";
import { createAsrStats, registerStatsRoute } from "./stats.js";
export const name = 'dsh-asr-voice';
/** 所需 Cordis 服务（服务名，非 entry id）。 */
// settings / agentDefaultModel 不作为硬依赖：settings 用 scoped inject（缺失时仅云端
// ASR 无 key 可用、不影响挂载），agentDefaultModel 在优化路由内 ctx.get 可选读取。
export const inject = ['webServer', 'llm'];
/** 从 settings 解析当前生效的云端 ASR 供应商（多供应商 active/首个，或旧单配置）。 */
function resolveCloudProvider(v) {
    if (!v)
        return undefined;
    const cloud = v.asr.cloud;
    if (Array.isArray(cloud.providers) && cloud.providers.length > 0) {
        const active = cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0];
        return {
            id: active.id || 'provider',
            baseUrl: active.baseUrl ?? '',
            apiKey: active.apiKey ?? '',
            model: active.model ?? '',
            mode: active.mode ?? 'auto',
        };
    }
    // 旧单配置（v0.1 遗留）
    return {
        id: 'legacy',
        baseUrl: cloud.baseUrl ?? '',
        apiKey: cloud.apiKey ?? '',
        model: cloud.model ?? '',
        mode: cloud.mode ?? 'auto',
    };
}
/** 读取全部已配置供应商（多供应商列表；旧单配置合成一个 'legacy'）。 */
function listProviders(v) {
    if (!v)
        return [];
    const cloud = v.asr.cloud;
    if (Array.isArray(cloud.providers) && cloud.providers.length > 0) {
        return cloud.providers.map((p) => ({
            id: p.id || 'provider',
            preset: p.preset ?? 'custom',
            baseUrl: p.baseUrl ?? '',
            apiKey: p.apiKey ?? '',
            model: p.model ?? '',
            mode: p.mode ?? 'auto',
        }));
    }
    if (cloud.baseUrl) {
        return [{
                id: 'legacy',
                preset: cloud.preset ?? 'custom',
                baseUrl: cloud.baseUrl,
                apiKey: cloud.apiKey ?? '',
                model: cloud.model ?? '',
                mode: cloud.mode ?? 'auto',
            }];
    }
    return [];
}
export function apply(ctx) {
    // 插件配置 namespace：设置统一存 host settings 服务（namespace `asr-voice`）。
    let settingsScope;
    ctx.inject(['settings'], (sctx) => {
        settingsScope = sctx.settings.register(ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema);
    });
    const getCloudConfig = () => {
        const cfg = resolveCloudProvider(settingsScope?.get());
        return cfg ?? { id: '', baseUrl: '', apiKey: '', model: '', mode: 'auto' };
    };
    const getProviders = () => listProviders(settingsScope?.get());
    const stats = createAsrStats();
    // 路由随 fiber 生命周期注册/回收。
    ctx.effect(() => registerTranscribeRoute((def) => ctx.webServer.register(def), getCloudConfig, ctx, (text, providerId) => stats.record(text, providerId)), 'asr-voice: transcribe route');
    ctx.effect(() => registerOptimizeRoute((def) => ctx.webServer.register(def), ctx), 'asr-voice: optimize route');
    ctx.effect(() => registerModelsRoute((def) => ctx.webServer.register(def), ctx), 'asr-voice: models route');
    ctx.effect(() => registerAsrModelsRoute((def) => ctx.webServer.register(def), getProviders, ctx), 'asr-voice: asr-models route');
    ctx.effect(() => registerStatsRoute((def) => ctx.webServer.register(def), () => stats.snapshot()), 'asr-voice: stats route');
}
//# sourceMappingURL=index.js.map