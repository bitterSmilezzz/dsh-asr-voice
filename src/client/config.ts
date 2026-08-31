/**
 * dsh-asr-voice — client 配置模型。
 *
 * 配置权威源是 host settings 服务（namespace `asr-voice`），本模块持有运行时快照
 * `config`（录音链路同步读取）与设置页的编辑草稿。**API key 不在此处也不在
 * settings**：它落 DSH credentials 服务，本模块只提供按引用名读写的那几个函数。
 *
 * 两条铁律，都是踩过坑得来的：
 *   1. 宿主快照一律先脱冻再用。`SettingsScopeController.derive()` 把 host 值喂进
 *      immer `produce`，产出的快照连同数组元素是**深度冻结**的（所有构建，不只是
 *      dev）。按引用存进可变快照，之后每一次行内编辑都是严格模式下的冻结写——
 *      抛 TypeError 并被 React onChange 吞掉，界面表现成「下拉点了没反应」。
 *   2. 草稿只 rebuild，不 mutate。所有 `with*` 函数返回新对象，行对象永不原地改。
 *
 * settingsScope / credentials 都是「可选服务」：按当前 DSH client 规范由 apply 里的
 * scoped inject 传入（拿不到就只更新本地快照），而不是列成插件级硬依赖。
 */
// Type-only: pulls the settings domain's Context merge (ctx.settingsScope).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { keyRefFor, type KeyRefSource } from '../key-ref.ts'
import { DEFAULT_PRESET_ID, presetById } from '../presets.ts'

/** 单个云端 ASR 供应商配置（无密钥：key 在 credentials，见 keyRefOf）。 */
export interface CloudProviderConfig {
  id: string
  preset: string
  /** 显示名；自定义供应商的凭据引用名由它派生。 */
  name: string
  baseUrl: string
  model: string
  mode: string
}

/** 统一配置对象：与 host settings schema 结构一致（刻意不含 apiKey）。 */
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
      model: string
      mode: string
    }
  }
  optimize: {
    mode: 'heuristic' | 'llm'
    /** llm 模式入框方式：false = 立即填入清洗版 + 后台优化替换；true = 预览卡确认后填入。 */
    preview: boolean
    llm: {
      provider: string
      model: string
    }
  }
  language: string
  behavior: {
    autoSend: boolean
    /** 静音自动停止（默认关 = 手动结束录音）。 */
    silenceStop: boolean
    holdToTalk: boolean
    hotkey: string
    textMode: 'replace' | 'append'
    copyToClipboard: boolean
    /** 单次录音最长时长（毫秒）。 */
    maxRecordMs: number
    /** 静音判定阈值（RMS，0~1）。 */
    silenceRms: number
    /** 静音持续多久即自动停止（毫秒）。 */
    silenceMs: number
  }
  realtime: {
    /** 实时语音对话总开关。 */
    enabled: boolean
    /** 回复播报：browser（speechSynthesis）/ off（只出字）。 */
    tts: 'browser' | 'off'
    /** 进出实时模式的快捷键（'' = 关闭）。 */
    hotkey: string
    turn: {
      /** 转写文字静默多久算「说完了」（毫秒）。 */
      settleMs: number
      /** 静音窗口之后再宽限这么久才提交（毫秒）。 */
      tailMs: number
    }
    /** 单次对话上限（毫秒）。 */
    maxSessionMs: number
    speech: {
      /** 首句最少字数。 */
      firstSentenceMinChars: number
      /** 朗读看门狗（毫秒）。 */
      utteranceWatchdogMs: number
    }
  }
}

/** 顶层可写段（`settings.mutate` 按顶层路径寻址，写回也按这一段一段来）。 */
export type ConfigSection = 'asr' | 'optimize' | 'language' | 'behavior' | 'realtime'

/** 对象形态的顶层段（language 是标量，走 withLanguage）。 */
export type ConfigObjectSection = Exclude<ConfigSection, 'language'>

/** 配置默认值（与 host schema 的 default 一致）。 */
export const DEFAULTS: AsrVoiceConfig = {
  asr: { provider: 'auto', cloud: { providers: [], active: '', preset: 'openai', baseUrl: '', model: '', mode: 'auto' } },
  optimize: { mode: 'llm', preview: false, llm: { provider: '', model: '' } },
  language: 'auto',
  behavior: { autoSend: false, silenceStop: false, holdToTalk: false, hotkey: 'Ctrl+Shift+Space', textMode: 'replace', copyToClipboard: true, maxRecordMs: 120_000, silenceRms: 0.02, silenceMs: 2_500 },
  realtime: { enabled: false, tts: 'browser', hotkey: '', turn: { settleMs: 900, tailMs: 300 }, maxSessionMs: 600_000, speech: { firstSentenceMinChars: 12, utteranceWatchdogMs: 60_000 } },
}

/** 运行时配置快照：初始为默认值，scope 订阅与写回共同维护。 */
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
  getSnapshot(): { value?: T; writable?: boolean }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
}

/** settingsScope 服务的最小面（当前 DSH client 的 SettingsScopeBinder.bind）。 */
export interface SettingsBinderLike {
  bind<T>(spec: { namespace: string }): SettingsScopeLike<T>
}

/** credentials RPC 的单条视图（脱敏后的配置态，永不含密钥本身）。 */
export interface CredentialStateLike {
  configured: boolean
  source?: string | undefined
  writable: boolean
}

type RpcOutcome<T> = { ok: true; value: T } | { ok: false; error?: { message?: string } }

/** DSH credentials 域的 client 面（connection.api.credentials 的最小形状）。 */
export interface CredentialsApiLike {
  describe(payload: { refs: string[] }): Promise<{ result: RpcOutcome<{ credentials?: Record<string, CredentialStateLike> }> }>
  set(payload: { ref: string; value: string }): Promise<{ result: RpcOutcome<unknown> }>
  unset(payload: { ref: string }): Promise<{ result: RpcOutcome<unknown> }>
}

/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
let voiceScope: SettingsScopeLike<AsrVoiceConfig> | undefined
let credentialsApi: CredentialsApiLike | undefined

/** 广播配置变更（设置卡片/录音按钮监听，驱动重渲染）。 */
export function announce(): void {
  // detail 传一份脱开的拷贝：消费方绝不拿到全局真相的可变引用（防意外污染 config）。
  const detail = structuredClone(config)
  window.dispatchEvent(new CustomEvent('dsh-asr-voice:config', { detail }))
  for (const fn of listeners) fn()
}

/** 是否普通数据对象（数组与 null 都不算）。 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 数值字段：非有限数（NaN/Infinity/字符串/缺省）一律退回本地值。 */
function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 逐字段重建供应商行：只取本客户端认识的字段（宿主多出来的键一律不带走）。 */
function normalizeProvider(row: unknown): CloudProviderConfig {
  const src = isPlainObject(row) ? row : {}
  return {
    id: str(src.id),
    preset: str(src.preset) === '' ? 'openai' : str(src.preset),
    name: str(src.name),
    baseUrl: str(src.baseUrl),
    model: str(src.model),
    mode: str(src.mode) === '' ? 'auto' : str(src.mode),
  }
}

/**
 * 把 host 快照并回本地 config（只覆盖认识的键）。
 *
 * 每个进来的对象/数组都先落成自己的拷贝：宿主值是深度冻结的，漏一个引用进来就是
 * 一处「改了不生效」的静默故障（见文件头铁律 1）。
 */
export function mergeHostValue(value: Partial<AsrVoiceConfig>): void {
  if (!isPlainObject(value)) return
  const assign = (target: Record<string, unknown>, src: Record<string, unknown>): void => {
    for (const key of Object.keys(target)) {
      const next = src[key]
      if (next === undefined) continue
      const current = target[key]
      if (typeof current === 'number') {
        target[key] = num(next, current)
        continue
      }
      if (Array.isArray(next)) {
        target[key] = key === 'providers' ? next.map(normalizeProvider) : structuredClone(next)
        continue
      }
      if (isPlainObject(current) && isPlainObject(next)) {
        assign(current, next)
        continue
      }
      target[key] = isPlainObject(next) ? structuredClone(next) : next
    }
  }
  assign(config as unknown as Record<string, unknown>, value as unknown as Record<string, unknown>)
}

/** 结构等价（忽略键序）：写回校验用它，避免 {a,b} 与 {b,a} 被误判成没落盘。 */
function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => jsonEqual(item, b[index]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!jsonEqual(a[key], b[key])) return false
    }
    return true
  }
  return false
}

/**
 * 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写本地快照并广播。
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

/** 绑定 credentials 域（可选：拿不到时设置页只显示「本机未启用凭据服务」）。 */
export function bindCredentialsApi(api: CredentialsApiLike | undefined): void {
  credentialsApi = api
}

/** 设置页是否具备写回宿主的能力。 */
export function settingsWritable(): boolean {
  return voiceScope?.getSnapshot().writable ?? false
}

// ── 草稿：设置页只编辑这份副本，按「保存」才过线 ─────────────────────────

/** 复制一份当前配置作为可编辑草稿（与宿主快照完全脱开，随便改都不碰冻结）。 */
export function newDraft(): AsrVoiceConfig {
  return structuredClone(config)
}

/** 浅并一层对象段，返回新草稿。 */
export function withSection<K extends ConfigObjectSection>(
  draft: AsrVoiceConfig, key: K, patch: Partial<AsrVoiceConfig[K]>,
): AsrVoiceConfig {
  return { ...draft, [key]: { ...draft[key], ...patch } }
}

/** 整段录音链路的时长与静音参数（从配置快照取，recorder 不认 settings 层）。 */
export interface RecordBehavior {
  /** 单次录音最长时长（毫秒）。 */
  maxRecordMs: number
  /** 是否静音自动停止。 */
  silenceStop: boolean
  /** 静音判定阈值（RMS，0~1）。 */
  silenceRms: number
  /** 静音持续多久即自动停止（毫秒）。 */
  silenceMs: number
}

/** 取当前配置的录音参数快照（配置 → recorder 的唯一搬运处）。 */
export function recordBehavior(source: AsrVoiceConfig = config): RecordBehavior {
  const { maxRecordMs, silenceStop, silenceRms, silenceMs } = source.behavior
  return { maxRecordMs, silenceStop, silenceRms, silenceMs }
}

/** 实时语音对话参数（会话、引擎、播报共用同一份快照）。 */
export interface RealtimeTuning {
  /** 按钮是否存在。 */
  enabled: boolean
  /** 回复播报方式。 */
  tts: 'browser' | 'off'
  /** 对话快捷键（'' = 关闭）。 */
  hotkey: string
  /** 转写静默多久算说完（毫秒）。 */
  settleMs: number
  /** 说完后再宽限这么久才提交（毫秒）。 */
  tailMs: number
  /** 单次对话上限（毫秒）。 */
  maxSessionMs: number
  /** 首句最少字数。 */
  firstSentenceMinChars: number
  /** 单句朗读看门狗（毫秒）。 */
  utteranceWatchdogMs: number
  /** 识别语言（同时用于挑选朗读音色）。 */
  language: string
}

/** 取当前配置的实时对话快照（配置 → 会话/引擎/播报的唯一搬运处）。 */
export function realtimeTuning(source: AsrVoiceConfig = config): RealtimeTuning {
  const { enabled, tts, hotkey, turn, maxSessionMs, speech } = source.realtime
  return {
    enabled, tts, hotkey, maxSessionMs, language: source.language,
    settleMs: turn.settleMs, tailMs: turn.tailMs,
    firstSentenceMinChars: speech.firstSentenceMinChars,
    utteranceWatchdogMs: speech.utteranceWatchdogMs,
  }
}

/** 改识别语言（顶层标量段）。 */
export function withLanguage(draft: AsrVoiceConfig, language: string): AsrVoiceConfig {
  return { ...draft, language }
}

/** 写整个 providers 列表（保持 active 指向还在的行）。 */
export function withProviders(draft: AsrVoiceConfig, providers: CloudProviderConfig[], active?: string): AsrVoiceConfig {
  const nextActive = active ?? (providers.some((p) => p.id === draft.asr.cloud.active) ? draft.asr.cloud.active : providers[0]?.id ?? '')
  return withSection(draft, 'asr', { cloud: { ...draft.asr.cloud, providers, active: nextActive } })
}

/** 按 id 打补丁到某一供应商行（重建行对象，永不原地改）。 */
export function patchProvider(draft: AsrVoiceConfig, id: string, patch: Partial<CloudProviderConfig>): AsrVoiceConfig {
  const rows = draft.asr.cloud.providers
  const index = rows.findIndex((p) => p.id === id)
  if (index === -1) {
    // 目标还是 v0.1 的合成行（列表为空）：直接 map 命中不了任何行，改动静默消失。
    const synthesized = draftActiveProvider(draft)
    if (synthesized.id !== id) return draft
    return withProviders(draft, [...rows, { ...synthesized, ...patch }], id)
  }
  return withProviders(draft, rows.map((p, i) => (i === index ? { ...p, ...patch } : p)))
}

/** 选预置：连带把 baseUrl / model / mode 刷成该预置的推荐值。 */
export function pickPreset(draft: AsrVoiceConfig, id: string, presetId: string): AsrVoiceConfig {
  const preset = presetById(presetId)
  if (!preset) return patchProvider(draft, id, { preset: presetId })
  return patchProvider(draft, id, { preset: presetId, baseUrl: preset.baseUrl, model: preset.defaultModel, mode: preset.mode })
}

/**
 * 新增一行供应商，返回新草稿与新行 id。
 * presetId 命中内置预置时按预置填充；未命中（'custom'）建一行空白自定义端点。
 */
export function addProvider(draft: AsrVoiceConfig, presetId = DEFAULT_PRESET_ID, name = ''): { draft: AsrVoiceConfig; id: string } {
  const preset = presetById(presetId)
  const id = newProviderId()
  const row: CloudProviderConfig = preset
    ? { id, preset: preset.id, name: preset.label, baseUrl: preset.baseUrl, model: preset.defaultModel, mode: preset.mode }
    : { id, preset: 'custom', name, baseUrl: '', model: '', mode: 'auto' }
  return { draft: withProviders(draft, [...draft.asr.cloud.providers, row], id), id }
}

/** 删除一行供应商。 */
export function removeProvider(draft: AsrVoiceConfig, id: string): AsrVoiceConfig {
  return withProviders(draft, draft.asr.cloud.providers.filter((p) => p.id !== id))
}

/** 草稿里当前生效的供应商（无行时按旧单配置合成一行 legacy，id 固定以便凭据引用稳定）。 */
export function draftActiveProvider(draft: AsrVoiceConfig): CloudProviderConfig {
  const cloud = draft.asr.cloud
  return cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0]
    ?? { id: 'legacy', preset: cloud.preset, name: '', baseUrl: cloud.baseUrl, model: cloud.model, mode: cloud.mode }
}

/**
 * 把 v0.1 旧单配置在**草稿里**落成一行 providers（id 固定 'legacy'，凭据引用名随之
 * 稳定）。宿主端本来就优先读 providers，所以这一步只影响编辑中的这份副本，不自动写回。
 */
export function withLegacyMaterialized(draft: AsrVoiceConfig): AsrVoiceConfig {
  const cloud = draft.asr.cloud
  if (cloud.providers.length > 0 || cloud.baseUrl.trim() === '') return draft
  const row: CloudProviderConfig = {
    id: 'legacy', preset: cloud.preset, name: '', baseUrl: cloud.baseUrl, model: cloud.model, mode: cloud.mode,
  }
  return withProviders(draft, [row], 'legacy')
}

/** 某供应商的 API key 凭据引用名。 */
export function keyRefOf(p: KeyRefSource): string {
  return keyRefFor(p)
}

/**
 * 保存草稿：只把真正改过的顶层段写回 host，然后**读回校验**。
 *
 * `SettingsScope.set` 会把失败吞掉并重载宿主状态（promise 成功不代表落盘），所以
 * 判定标准只能是写完之后宿主那边到底剩什么——这也正是官方设置卡的做法。
 * @returns 未落盘的段名，undefined 表示全部落定。
 */
export async function writeDraft(draft: AsrVoiceConfig): Promise<ConfigSection | undefined> {
  const scope = voiceScope
  // 比对基准是**宿主真相**，不是本地快照：本函数会把草稿并进本地快照，用本地快照
  // 当基准会让「写回被吞掉后再点一次保存」算出零变更，于是静默报成功。
  const host = scope?.getSnapshot().value
  const changed = (['asr', 'optimize', 'language', 'behavior'] as const)
    .filter((key) => !jsonEqual(host?.[key] ?? config[key], draft[key]))
  if (scope === undefined) {
    // 没有宿主通道（settings 服务未挂载）：本地快照仍然生效，只是重启后回到旧值。
    mergeHostValue(draft)
    announce()
    return undefined
  }
  for (const key of changed) await scope.set(key, draft[key])
  mergeHostValue(draft)
  announce()
  const resolved = scope.getSnapshot().value
  return resolved === undefined ? undefined : changed.find((key) => !jsonEqual(resolved[key], draft[key]))
}

// ── 密钥：只经 credentials 通道，值不回流到 config ──────────────────────

/** 一个供应商的密钥配置态（写视图：只知道有没有、能不能写、来自哪）。 */
export interface KeyState {
  ref: string
  configured: boolean
  writable: boolean
  source: string
  /** 查询本身失败时的原始原因（null 表示查询成功）。 */
  failure: string | null
}

function outcomeError<T>(result: RpcOutcome<T>): string | null {
  if (result.ok) return null
  return result.error?.message ?? 'credential request rejected'
}

/** 查某供应商的密钥是否已配置。 */
export async function readKeyState(p: KeyRefSource): Promise<KeyState> {
  const ref = keyRefFor(p)
  if (credentialsApi === undefined) {
    return { ref, configured: false, writable: false, source: '', failure: 'credentials service unavailable' }
  }
  try {
    const response = await credentialsApi.describe({ refs: [ref] })
    const failure = outcomeError(response.result)
    if (failure !== null) return { ref, configured: false, writable: true, source: '', failure }
    const view = response.result.ok === true ? response.result.value.credentials?.[ref] : undefined
    return {
      ref,
      configured: view?.configured ?? false,
      writable: view?.writable ?? true,
      source: view?.source ?? '',
      failure: null,
    }
  } catch (error) {
    return { ref, configured: false, writable: true, source: '', failure: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * 写入或清除某供应商的密钥。
 * @param p - 供应商身份（决定引用名）。
 * @param value - 新密钥；空串表示清除。
 * @returns 原始失败原因，undefined 表示成功。
 */
export async function saveKey(p: KeyRefSource, value: string): Promise<string | undefined> {
  const ref = keyRefFor(p)
  if (credentialsApi === undefined) return 'credentials service unavailable'
  const key = value.trim()
  try {
    const response = key === '' ? await credentialsApi.unset({ ref }) : await credentialsApi.set({ ref, value: key })
    const failure = outcomeError(response.result)
    if (failure !== null) return failure
    // 读回校验：只读来源（如环境变量）能拒绝落盘而不报错。
    const state = await readKeyState(p)
    if (key !== '' && !state.configured) return state.failure ?? `credential ${ref} did not persist`
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

/** 当前生效供应商是否已配到可调用云端 ASR 的程度（密钥不再在本地快照里，由服务端判定）。 */
export function cloudConfigured(): boolean {
  return activeCloudProvider().baseUrl.trim() !== ''
}

/** 运行时快照里当前生效的云端供应商（录音链路只关心「配好了没」）。 */
function activeCloudProvider(): CloudProviderConfig {
  const cloud = config.asr.cloud
  return cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0]
    ?? { id: 'legacy', preset: cloud.preset, name: '', baseUrl: cloud.baseUrl, model: cloud.model, mode: cloud.mode }
}

/** 生成供应商唯一 id。 */
function newProviderId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
