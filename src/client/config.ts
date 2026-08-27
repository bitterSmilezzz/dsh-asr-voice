/**
 * dsh-asr-voice — client 配置模型。
 *
 * 配置权威源是 host settings 服务（namespace `asr-voice`）。本模块持有运行时
 * 快照 `config`（控制器/组件同步读取），提供 host scope 的绑定与写入。
 * 结构与 host schema（src/settings.ts）保持一致，避免双源漂移。
 *
 * settingsScope 是「可选服务」：按当前 DSH client 规范用 `ctx.inject(['settingsScope'], …)`
 * 拿到 binder 后传入 bindConfigScope，而不是把它列为插件级硬依赖（避免 settings
 * 界面未挂载时阻塞整个插件）。
 */
// Type-only: pulls the settings domain's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** 单个云端 ASR 供应商配置。 */
export interface CloudProviderConfig {
  id: string
  preset: string
  baseUrl: string
  apiKey: string
  model: string
  mode: string
}

/** 统一配置对象：与 host settings schema 结构一致。 */
export interface AsrVoiceConfig {
  asr: {
    provider: 'auto' | 'browser' | 'cloud'
    cloud: {
      /** 多供应商列表（v0.2）。 */
      providers: CloudProviderConfig[]
      /** 当前使用的供应商 id（空 = 取第一个）。 */
      active: string
      /** ── 兼容旧单配置（v0.1 遗留，读取回退用） ── */
      preset: string
      baseUrl: string
      apiKey: string
      model: string
      mode: string
    }
  }
  optimize: {
    mode: 'heuristic' | 'llm'
    llm: {
      provider: string
      model: string
    }
  }
  language: string
  behavior: {
    autoSend: boolean
    holdToTalk: boolean
    hotkey: string
    textMode: 'replace' | 'append'
    copyToClipboard: boolean
  }
}

/** 配置默认值（与 host schema 的 default 一致）。 */
export const DEFAULTS: AsrVoiceConfig = {
  asr: { provider: 'auto', cloud: { providers: [], active: '', preset: 'openai', baseUrl: '', apiKey: '', model: '', mode: 'auto' } },
  optimize: { mode: 'llm', llm: { provider: '', model: '' } },
  language: 'auto',
  behavior: { autoSend: false, holdToTalk: false, hotkey: 'Ctrl+Shift+Space', textMode: 'replace', copyToClipboard: true },
}

/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
export const config: AsrVoiceConfig = structuredClone(DEFAULTS)

/** 配置变更订阅（模块级，供组件 useSyncExternalStore / 事件驱动重渲染）。 */
const listeners = new Set<() => void>()

/** 订阅配置变更，返回退订函数。 */
export function subscribeConfig(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
export interface SettingsScopeLike<T> {
  getSnapshot(): { value?: T }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
  unset?(field: string): Promise<void>
}

/** settingsScope 服务的最小面（当前 DSH client 的 SettingsScopeBinder.bind）。 */
export interface SettingsBinderLike {
  bind<T>(spec: { namespace: string }): SettingsScopeLike<T>
}

/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
let voiceScope: SettingsScopeLike<AsrVoiceConfig> | undefined

/** 广播配置变更（设置卡片/录音按钮监听，驱动重渲染）。 */
export function announce(): void {
  window.dispatchEvent(new CustomEvent('dsh-asr-voice:config', { detail: config }))
  for (const fn of listeners) fn()
}

/** 深合并 host 快照到本地 config（只覆盖已存在的顶层键）。 */
export function mergeHostValue(value: Partial<AsrVoiceConfig>): void {
  const assign = (target: Record<string, unknown>, src: unknown): void => {
    if (!src || typeof src !== 'object' || Array.isArray(src)) return
    for (const key of Object.keys(target)) {
      const next = (src as Record<string, unknown>)[key]
      if (next === undefined) continue
      if (key === 'providers' && Array.isArray(next)) {
        // 多供应商列表整表覆盖（避免合并残留已删除的供应商）
        target[key] = next
        continue
      }
      if (target[key] !== null && typeof target[key] === 'object' && !Array.isArray(target[key])) {
        assign(target[key] as Record<string, unknown>, next)
      } else {
        target[key] = next
      }
    }
  }
  assign(config as unknown as Record<string, unknown>, value)
}

/**
 * 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写本地
 * 快照并广播。settingsScope 为可选服务——由调用方（apply 里 scoped inject）
 * 把 binder 传入；拿不到则不绑定，仅用本地快照。
 * @param binder - settingsScope 服务的 binder（SettingsScopeBinder）。
 * @returns 订阅 disposer（随 fiber 清理）。
 */
export function bindConfigScope(binder: SettingsBinderLike): () => void {
  const scope = binder.bind<AsrVoiceConfig>({ namespace: 'asr-voice' })
  voiceScope = scope
  const applySnapshot = (): void => {
    const value = scope.getSnapshot().value
    if (value !== undefined) {
      mergeHostValue(value)
      announce()
    }
  }
  const unsub = scope.subscribe(applySnapshot)
  applySnapshot()
  return unsub
}

/**
 * 更新一个配置字段：改本地快照 → 广播 → 写 host settings。
 * @param field - 顶层字段名。
 * @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
 */
export function setConfig(field: keyof AsrVoiceConfig, mutator: () => void): void {
  mutator()
  announce()
  if (voiceScope !== undefined) {
    void voiceScope.set(field, config[field]).catch(() => {
      window.dispatchEvent(new CustomEvent('dsh-asr-voice:config-error', { detail: { field } }))
    })
  }
}

/** 解析当前生效的云端供应商配置（多供应商 active/首个，或旧单配置）。 */
export function activeCloudProvider(): CloudProviderConfig {
  const cloud = config.asr.cloud
  if (cloud.providers.length > 0) {
    return cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0]!
  }
  // 旧单配置（v0.1 遗留）合成一个
  return { id: 'legacy', preset: cloud.preset, baseUrl: cloud.baseUrl, apiKey: cloud.apiKey, model: cloud.model, mode: cloud.mode }
}

/** 当前生效云端供应商是否已配置（baseUrl + apiKey 均非空）。 */
export function cloudConfigured(): boolean {
  const p = activeCloudProvider()
  return p.baseUrl.trim() !== '' && p.apiKey.trim() !== ''
}
