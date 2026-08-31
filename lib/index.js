import { ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema } from "./settings.js";
import { keyRefFor } from "./key-ref.js";
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
            preset: active.preset ?? 'openai',
            name: active.name ?? '',
            baseUrl: active.baseUrl ?? '',
            apiKey: active.apiKey ?? '',
            model: active.model ?? '',
            mode: active.mode ?? 'auto',
        };
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
            preset: p.preset ?? 'openai',
            name: p.name ?? '',
            baseUrl: p.baseUrl ?? '',
            apiKey: p.apiKey ?? '',
            model: p.model ?? '',
            mode: p.mode ?? 'auto',
        }));
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
            }];
    }
    return [];
}
/**
 * 一次性迁移：把 settings 里遗留的明文 API key 搬进 DSH credentials，全部搬成功后抹掉明文。
 *
 * 任一条搬不动（凭据服务缺席、该引用被只读来源拒绝）就整批原样留着——抹掉一把无处可寻的
 * key 比留一份本机明文更糟。{@link resolveApiKey} 始终先读 settings，所以未迁移状态下功能
 * 不降级；迁移成功后 settings 里的 key 恒为空，密钥只剩 credentials 一个来源。
 */
async function migrateLegacyKeys(scope, credentials, log) {
    if (credentials === undefined)
        return;
    // scope.get() 交回来的是深度冻结的解析快照，改之前必须先脱冻。
    const cloud = structuredClone(scope.get().asr.cloud);
    const pending = [];
    for (const row of cloud.providers) {
        const key = (row.apiKey ?? '').trim();
        if (key === '')
            continue;
        pending.push({ ref: keyRefFor(row), key });
        row.apiKey = '';
    }
    const legacyKey = (cloud.apiKey ?? '').trim();
    if (legacyKey !== '') {
        pending.push({ ref: keyRefFor({ preset: cloud.preset, name: '', id: 'legacy' }), key: legacyKey });
    }
    if (pending.length === 0)
        return;
    for (const item of pending) {
        try {
            await credentials.set(item.ref, item.key);
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            log.warn(`credentials.set(${item.ref}) refused: ${reason}; legacy keys left in place`);
            return;
        }
    }
    const patch = { providers: cloud.providers };
    if (legacyKey !== '')
        patch.apiKey = '';
    await scope.update({ asr: { cloud: patch } });
    log.info(`moved ${pending.length} API key(s) from plugin settings into DSH credentials`);
}
export function apply(ctx) {
    // 插件配置 namespace：设置统一存 host settings 服务（namespace `asr-voice`）。
    let settingsScope;
    ctx.inject(['settings'], (sctx) => {
        const scope = sctx.settings.register(ASR_VOICE_SETTINGS_NAMESPACE, AsrVoiceSettingsSchema);
        settingsScope = scope;
        // 遗留明文 key → credentials：启动时跑一次，迁移完成后每次都是空转早退。
        const logger = sctx.logger('asr-voice');
        sctx.effect(() => {
            const migrating = migrateLegacyKeys(scope, sctx.get('credentials'), logger)
                .catch((error) => { logger.warn(`legacy key migration stopped: ${error instanceof Error ? error.message : String(error)}`); });
            return async () => { await migrating; };
        }, 'asr-voice: migrate legacy api keys');
    });
    const getCloudConfig = () => {
        const cfg = resolveCloudProvider(settingsScope?.get());
        return cfg ?? { id: '', preset: 'openai', name: '', baseUrl: '', apiKey: '', model: '', mode: 'auto' };
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