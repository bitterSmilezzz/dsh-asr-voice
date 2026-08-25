/**
 * dsh-asr-voice — client 配置模型。
 *
 * 配置权威源是 host settings 服务（namespace `asr-voice`）。本模块持有运行时
 * 快照 `config`（控制器/组件同步读取），提供 host scope 的绑定与写入。
 * 结构与 host schema（src/settings.ts）保持一致，避免双源漂移。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings domain's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'

/** 统一配置对象：与 host settings schema 结构一致。 */
export interface AsrVoiceConfig {
  asr: {
    provider: 'browser' | 'cloud'
    cloud: {
      preset: string
      baseUrl: string
      apiKey: string
      model: string
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
  }
}

/** 配置默认值（与 host schema 的 default 一致）。 */
export const DEFAULTS: AsrVoiceConfig = {
  asr: { provider: 'browser', cloud: { preset: 'openai', baseUrl: '', apiKey: '', model: '' } },
  optimize: { mode: 'llm', llm: { provider: '', model: '' } },
  language: 'auto',
  behavior: { autoSend: false, holdToTalk: false, hotkey: 'Ctrl+Shift+Space' },
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
let voiceScope: { set(field: string, value: unknown): Promise<void> } | undefined

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
 * 快照并广播。
 * @param ctx - client root context。
 * @returns 订阅 disposer（随 fiber 清理）。
 */
export function bindConfigScope(ctx: ClientContext): () => void {
  const scope = ctx.settingsScope.bind<AsrVoiceConfig>({ namespace: 'asr-voice' })
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
