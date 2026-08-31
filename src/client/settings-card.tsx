/**
 * dsh-asr-voice — client 设置卡片（settings.plugin.item, key: 'asr-voice'）。
 *
 * 三步向导（① 识别方式 → ② 服务商 → ③ 密钥与自检）+ 默认折叠的「高级」。
 * 卡片只编辑一份本地草稿，按「保存」才过线（写回后读回校验，不信 promise）；
 * API key 单独走 credentials 域，既不进草稿也不进浏览器 DOM。
 */
import * as react from 'react'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { CLOUD_PRESETS, presetById } from '../presets.ts'
import {
  addProvider, draftActiveProvider, keyRefOf, newDraft, patchProvider, pickPreset,
  readKeyState, removeProvider, saveKey, settingsWritable, subscribeConfig, withLanguage,
  withLegacyMaterialized, withProviders, withSection, writeDraft,
  type AsrVoiceConfig, type CloudProviderConfig, type ConfigSection, type KeyState,
} from './config.ts'
import type { LocaleKey, LocaleT } from './locales.ts'

/** 设置卡片 props（settings.plugin.item 注入 + 翻译函数）。 */
export interface SettingsCardProps {
  t: LocaleT
}

/** 卡片内的一条提示（idle / 进行中 / 成功 / 失败，统一渲染在动作行下方）。 */
interface Notice {
  kind: 'busy' | 'ok' | 'err'
  text: string
}

/** 模块级模型目录缓存（同会话 60s 内复用，避免重复拉取 /api/asr-voice/models）。 */
let modelsCache: DshProviderEntry[] | null = null
let modelsCacheAt = 0
const MODELS_CACHE_TTL_MS = 60_000

/** 订阅配置变更，驱动重渲染。 */
function useConfigVersion(): number {
  const [v, bump] = react.useReducer((x: number) => x + 1, 0)
  react.useEffect(() => subscribeConfig(bump), [])
  return v
}

/** 统一字段容器（垂直布局：label / control / hint，与官方 fields 一致）。 */
function Field({ title, desc, control }: { title: string; desc?: string | undefined; control: react.ReactNode }): react.ReactElement {
  return (
    <div className="dshav-field-item">
      <div className="dshav-field-head">
        <span className="dshav-field-label">{title}</span>
      </div>
      <div className="dshav-field-control">{control}</div>
      {desc ? <p className="dshav-field-hint">{desc}</p> : null}
    </div>
  )
}

/** 开关字段：checkbox 与标题同行左对齐（官方 checkbox 行排布），desc 作 hint。 */
function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: () => void }): react.ReactElement {
  return (
    <div className="dshav-field-item">
      <label className="dshav-toggle">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span>{title}</span>
      </label>
      {desc ? <p className="dshav-field-hint">{desc}</p> : null}
    </div>
  )
}

/** 数值输入字段（min/max 与 host schema 的同一组约束）。 */
function NumberRow({ title, desc, value, onChange, min, max, step = 1 }: {
  title: string
  desc?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}): react.ReactElement {
  return (
    <Field
      title={title}
      desc={desc}
      control={
        <div className="dshav-field">
          <input
            type="number"
            value={String(value)}
            min={min}
            max={max}
            step={step}
            onChange={(e: react.ChangeEvent<HTMLInputElement>) => {
              // 清空/非法输入不回写：草稿留着上一个合法值。宿主拿到 NaN 会让
              // setTimeout 立刻触发，把每一次录音都切成零长。
              const next = Number(e.target.value)
              if (e.target.value === '' || !Number.isFinite(next)) return
              onChange(Math.min(max, Math.max(min, next)))
            }}
          />
        </div>
      }
    />
  )
}

/** 文本输入字段。 */
function TextRow({ title, desc, value, onChange, type = 'text', placeholder }: {
  title: string
  desc?: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'password'
  placeholder?: string
}): react.ReactElement {
  return (
    <Field
      title={title}
      desc={desc}
      control={
        <div className="dshav-field">
          <input
            type={type}
            value={value}
            placeholder={placeholder ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={(e: react.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          />
        </div>
      }
    />
  )
}

/** 选择字段。 */
function SelectRow({ title, desc, value, options, onChange }: {
  title: string
  desc?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}): react.ReactElement {
  return (
    <Field
      title={title}
      desc={desc}
      control={
        <div className="dshav-field">
          <select value={value} onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      }
    />
  )
}

/** 步骤标题：① ② ③ + 一句话说明。 */
function Step({ index, title, desc, children }: { index: string; title: string; desc?: string | undefined; children: react.ReactNode }): react.ReactElement {
  return (
    <div className="dshav-step">
      <div className="dshav-step-head">
        <span className="dshav-step-index">{index}</span>
        <span className="dshav-step-title">{title}</span>
      </div>
      {desc ? <p className="dshav-field-hint">{desc}</p> : null}
      {children}
    </div>
  )
}

/** 一行 chip 单选（点即选中并联动，替代原先层层条件展开的下拉）。 */
function Chips({ items, label, t }: {
  items: { key: string; label: string; selected: boolean; onSelect: () => void; disabled?: boolean }[]
  label: string
  t: LocaleT
}): react.ReactElement {
  return (
    <div className="dshav-chips" role="radiogroup" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="radio"
          aria-checked={item.selected}
          className="dshav-chip"
          data-selected={item.selected ? 'true' : undefined}
          disabled={item.disabled ?? false}
          onClick={item.onSelect}
        >
          {item.label}
        </button>
      ))}
      {items.length === 0 ? <span className="dshav-field-hint">{t('providersEmpty')}</span> : null}
    </div>
  )
}

/** 快捷键录制器：点击后捕获下一组组合键；支持清除。 */
function HotkeyRecorder({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: LocaleT }): react.ReactElement {
  const [arming, setArming] = react.useState(false)

  const handleKeyDown = (e: react.KeyboardEvent<HTMLInputElement>): void => {
    if (!arming) return
    e.preventDefault()
    e.stopPropagation()
    const combo = keyCombo(e)
    if (combo !== '') {
      onChange(combo)
      setArming(false)
    } else if (e.key === 'Escape') {
      setArming(false)
    }
  }

  return (
    <div className="dshav-field">
      <input
        type="text"
        readOnly
        placeholder={t('hotkeyPlaceholder')}
        value={arming ? '' : value}
        onFocus={() => setArming(true)}
        onBlur={() => setArming(false)}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="dshav-button dshav-button-outline dshav-button-sm"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onChange('')}
      >
        {t('hotkeyClear')}
      </button>
    </div>
  )
}

/** 把键盘事件转成规范组合键字符串（修饰键 + 主键，跨平台）。 */
function keyCombo(e: react.KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const key = normalizeKey(e.key)
  if (key === '') return ''
  parts.push(key)
  return parts.join('+')
}

/** DSH 已配置模型条目（来自 /api/asr-voice/models）。 */
interface DshModelEntry { id: string; name: string }
interface DshProviderEntry { provider: string; name: string; models: DshModelEntry[] }

/** 优化模型选择器：从 DSH 已配置模型列表选择（留空 = 当前所选 LLM）。 */
function ModelPicker({ t, provider, model, onProvider, onModel }: {
  t: LocaleT
  provider: string
  model: string
  onProvider: (v: string) => void
  onModel: (v: string) => void
}): react.ReactElement {
  const [providers, setProviders] = react.useState<DshProviderEntry[] | null>(null)
  const [status, setStatus] = react.useState<'loading' | 'ok' | 'err'>('loading')
  // 模块级缓存：模型目录同一会话内不频繁变化，卡片重复挂载/刷新时避免重复拉取。
  const load = react.useCallback(async () => {
    if (modelsCache !== null && Date.now() - modelsCacheAt < MODELS_CACHE_TTL_MS) {
      setProviders(modelsCache)
      setStatus('ok')
      return
    }
    setStatus('loading')
    try {
      // 超时兜底：host /models 链路挂起时 UI 不能永久 loading（catch → err 提示）。
      const res = await fetch('/api/asr-voice/models', { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; providers?: DshProviderEntry[]; reason?: string }
      if (!res.ok || data.ok !== true || data.providers === undefined) throw new Error(data.reason || 'load failed')
      modelsCache = data.providers
      modelsCacheAt = Date.now()
      setProviders(data.providers)
    } catch {
      setStatus('err')
    }
  }, [])
  react.useEffect(() => { void load() }, [load])

  const modelOptions = providers?.find((p) => p.provider === provider)?.models ?? []

  return (
    <>
      <Field
        title={t('llmProviderLabel')}
        control={
          <div className="dshav-field">
            <select value={provider} onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onProvider(e.target.value)}>
              <option value="">{t('llmCurrentDefault')}</option>
              {(providers ?? []).map((p) => <option key={p.provider} value={p.provider}>{p.name}</option>)}
            </select>
          </div>
        }
      />
      <Field
        title={t('llmModelLabel')}
        control={
          <div className="dshav-field">
            <select
              value={model}
              disabled={provider === ''}
              onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onModel(e.target.value)}
            >
              <option value="">{t('llmCurrentDefault')}</option>
              {modelOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        }
      />
      {status === 'err' ? <p className="dshav-field-hint">{t('loadFailed')}</p> : null}
      {status === 'ok' && provider !== '' && modelOptions.length === 0 ? <p className="dshav-field-hint">{t('llmModelsEmpty')}</p> : null}
    </>
  )
}

/** 用量统计展示（/api/asr-voice/stats，低优先级）。 */
function UsageStats({ t }: { t: LocaleT }): react.ReactElement {
  const [stats, setStats] = react.useState<{ count: number; chars: number; lastAt: number | null; lastProvider: string } | null>(null)
  react.useEffect(() => {
    let live = true
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/asr-voice/stats', { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; stats?: typeof stats }
        if (live && res.ok && data.ok === true && data.stats) setStats(data.stats)
      } catch { /* ignore */ }
    }
    void load()
    // 只在页面可见时轮询：标签页切走/隐藏后暂停，回来立即补一次。
    const tick = (): void => { if (!document.hidden) void load() }
    const timer = window.setInterval(tick, 5000)
    const onVisible = (): void => { if (!document.hidden) void load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { live = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  if (stats === null) return <p className="dshav-field-hint">{t('statsEmpty')}</p>
  const lastAt = stats.lastAt ? new Date(stats.lastAt).toLocaleTimeString() : null
  return (
    <div className="dshav-field-item">
      <div className="dshav-field-head"><span className="dshav-field-label">{t('statsTitle')}</span></div>
      <p className="dshav-field-hint">
        {t('statsCount', { n: stats.count })} · {t('statsChars', { n: stats.chars })}
        {stats.count > 0 && lastAt ? ` · ${t('statsLastAt', { time: lastAt })}` : ''}
        {stats.lastProvider ? ` · ${stats.lastProvider}` : ''}
      </p>
    </div>
  )
}

/** 主键规范化（忽略纯修饰键，统一 Space / 字母大写）。 */
function normalizeKey(key: string): string {
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta' || key === 'Escape') return ''
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  const map: Record<string, string> = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace' }
  return map[key] ?? key
}

/** 段名 → 分组标题（保存失败时告诉用户到底是哪一段没落盘）。 */
const SECTION_TITLE: Record<ConfigSection, LocaleKey> = {
  asr: 'groupAsr', optimize: 'groupOptimize', language: 'languageLabel', behavior: 'groupBehavior', realtime: 'groupRealtime',
}

/** 设置卡片：外层折叠与其他插件卡一致（header + chevron + 条件 body）。 */
export function VoiceSettingsCard({ t }: SettingsCardProps): react.ReactElement {
  const version = useConfigVersion()
  const [open, setOpen] = react.useState(false)
  const [showAdvanced, setShowAdvanced] = react.useState(false)
  const [draft, setDraft] = react.useState<AsrVoiceConfig>(() => withLegacyMaterialized(newDraft()))
  const [dirty, setDirty] = react.useState(false)
  const [notice, setNotice] = react.useState<Notice | null>(null)
  const [keyInput, setKeyInput] = react.useState('')
  const [keyBusy, setKeyBusy] = react.useState(false)
  const [keyState, setKeyState] = react.useState<KeyState | null>(null)
  const [tested, setTested] = react.useState<{ models: DshModelEntry[] } | null>(null)
  const [testing, setTesting] = react.useState(false)

  const writable = settingsWritable()
  const provider = draftActiveProvider(draft)
  const ref = keyRefOf(provider)
  const cloudMode = draft.asr.provider !== 'browser'

  const edit = (fn: (current: AsrVoiceConfig) => AsrVoiceConfig): void => {
    setDraft(fn)
    setDirty(true)
    setNotice(null)
  }

  // 宿主快照更新且本地没有未保存编辑 → 草稿跟随权威源。
  react.useEffect(() => {
    if (!dirty) setDraft(withLegacyMaterialized(newDraft()))
  }, [version, dirty])

  // 密钥态按引用名查（provider 对象每次编辑都是新的，按对象依赖会疯狂发请求）。
  react.useEffect(() => {
    let live = true
    setKeyState(null)
    void readKeyState(provider).then((state) => { if (live) setKeyState(state) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  /** 写回草稿；返回是否全部落盘（读回校验失败会给出段名）。 */
  const commit = async (): Promise<boolean> => {
    if (!dirty) return true
    setNotice({ kind: 'busy', text: t('savingHint') })
    const failed = await writeDraft(draft)
    if (failed !== undefined) {
      setNotice({ kind: 'err', text: `${t('saveNotApplied', { section: t(SECTION_TITLE[failed]) })}` })
      return false
    }
    setDirty(false)
    setNotice({ kind: 'ok', text: t('savedHint') })
    return true
  }

  /** 保存密钥（先落草稿，行不存在时不能往对应引用里写 key）。 */
  const commitKey = async (): Promise<void> => {
    setKeyBusy(true)
    if (dirty && !(await commit())) { setKeyBusy(false); return }
    const reason = await saveKey(provider, keyInput)
    setKeyBusy(false)
    if (reason !== undefined) {
      setNotice({ kind: 'err', text: `${t('keySaveFailed')}：${reason}` })
      return
    }
    setKeyInput('')
    setKeyState(await readKeyState(provider))
    setNotice({ kind: 'ok', text: t('keySavedHint', { ref }) })
  }

  /**
   * 测试连接 = 用该供应商列一次模型。
   * 选它而不是录一段音：不用麦克风、不打扰人，且一次性验掉 key + baseUrl + 网络三件事，
   * 返回的模型还能直接填进高级里的模型选择。
   */
  const testConnection = async (): Promise<void> => {
    setTesting(true)
    if (dirty && !(await commit())) { setTesting(false); return }
    try {
      const res = await fetch(`/api/asr-voice/asr-models?providerId=${encodeURIComponent(provider.id)}`, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; models?: DshModelEntry[]; reason?: string }
      if (!res.ok || data.ok !== true || !Array.isArray(data.models)) throw new Error(data.reason ?? 'request failed')
      if (data.models.length === 0) {
        setNotice({ kind: 'err', text: t('fetchModelsEmpty') })
      } else {
        setTested({ models: data.models })
        setNotice({ kind: 'ok', text: t('testOk', { n: data.models.length }) })
      }
    } catch (error) {
      setNotice({ kind: 'err', text: `${t('testFail')}：${error instanceof Error ? error.message : String(error)}` })
    } finally {
      setTesting(false)
    }
  }

  /** 选预置：已有对应行就切过去，否则新建一行并设为当前。 */
  const choosePreset = (presetId: string): void => {
    edit((current) => {
      const existing = current.asr.cloud.providers.find((p) => p.preset === presetId)
      if (existing === undefined) return addProvider(current, presetId).draft
      // 已有行只切当前，不覆盖用户改过的端点；Base URL 空了才补回预置值。
      const filled = existing.baseUrl.trim() === '' ? pickPreset(current, existing.id, presetId) : current
      return withProviders(filled, filled.asr.cloud.providers, existing.id)
    })
    setTested(null)
  }

  const presetChips = CLOUD_PRESETS.map((preset) => ({
    key: preset.id,
    label: preset.label,
    selected: provider.preset === preset.id,
    onSelect: () => choosePreset(preset.id),
    disabled: !writable,
  }))
  const customChips = draft.asr.cloud.providers
    .filter((p) => presetById(p.preset) === undefined)
    .map((p) => ({
      key: `row-${p.id}`,
      label: p.name.trim() === '' ? t('cloudPresetCustom') : p.name,
      selected: p.id === provider.id,
      onSelect: () => { edit((current) => withProviders(current, current.asr.cloud.providers, p.id)); setTested(null) },
      disabled: !writable,
    }))
  const addChip = {
    key: 'add-custom',
    label: t('addProvider'),
    selected: false,
    onSelect: () => { edit((current) => addProvider(current, 'custom', t('cloudPresetCustom')).draft) },
    disabled: !writable,
  }

  const engineChips = [
    { key: 'auto', label: t('engineAuto'), selected: draft.asr.provider === 'auto', onSelect: () => edit((c) => withSection(c, 'asr', { provider: 'auto' as const })), disabled: !writable },
    { key: 'browser', label: t('engineBrowser'), selected: draft.asr.provider === 'browser', onSelect: () => edit((c) => withSection(c, 'asr', { provider: 'browser' as const })), disabled: !writable },
    { key: 'cloud', label: t('engineCloud'), selected: draft.asr.provider === 'cloud', onSelect: () => edit((c) => withSection(c, 'asr', { provider: 'cloud' as const })), disabled: !writable },
  ]

  const needKey = keyState !== null && !keyState.configured && keyState.failure === null
  const keyNameMissing = presetById(provider.preset) === undefined && provider.name.trim() === ''

  return (
    <li className={'dshav-card' + (open ? ' dshav-card-open' : '')}>
      <button type="button" className="dshav-header" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="dshav-headtext">
          <span className="dshav-name">{t('cardTitle')}</span>
          <p className="dshav-desc">{t('cardCopy')}</p>
        </span>
        <svg className={'dshav-chevron' + (open ? ' dshav-open' : '')} width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3.5 5.75 8 10.25l4.5-4.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="dshav-body">
          {!writable ? <p className="dshav-field-hint" role="alert">{t('readOnlyDoc')}</p> : null}
          {cloudMode && provider.baseUrl.trim() === '' ? (
            <p className="dshav-field-hint">{t('howTo')}</p>
          ) : null}

          <div className="dshav-group">
            <Step index="①" title={t('stepEngineTitle')} desc={t(draft.asr.provider === 'browser' ? 'engineHintBrowser' : draft.asr.provider === 'cloud' ? 'engineHintCloud' : 'engineHintAuto')}>
              <Chips items={engineChips} label={t('stepEngineTitle')} t={t} />
            </Step>
          </div>

          {cloudMode ? (
            <>
              <div className="dshav-group">
                <Step index="②" title={t('stepProviderTitle')} desc={t('stepProviderHint')}>
                  <Chips items={[...presetChips, ...customChips, addChip]} label={t('stepProviderTitle')} t={t} />
                  {presetById(provider.preset) !== undefined ? (
                    <p className="dshav-field-hint">{presetById(provider.preset)?.hint}</p>
                  ) : null}
                </Step>
              </div>

              <div className="dshav-group">
                <Step index="③" title={t('stepKeyTitle')} desc={keyNameMissing ? t('keyNameNeeded') : undefined}>
                  {keyState === null ? (
                    <p className="dshav-field-hint">{t('keyChecking')}</p>
                  ) : keyState.failure !== null ? (
                    <p className="dshav-field-hint" role="alert">{t('keyQueryFailed')}：{keyState.failure}</p>
                  ) : keyState.configured ? (
                    <p className="dshav-ok-line">
                      ✓ {t('keyConfigured', { ref })}
                      {keyState.source !== '' ? <span className="dshav-field-hint"> · {keyState.source}</span> : null}
                    </p>
                  ) : (
                    <p className="dshav-field-hint">{t('keyNeedsValue', { ref })}</p>
                  )}
                  {!keyNameMissing ? (
                    <div className="dshav-field">
                      <input
                        type="password"
                        value={keyInput}
                        placeholder={keyState?.configured === true ? t('keyKeepPlaceholder') : t('keyPastePlaceholder')}
                        spellCheck={false}
                        autoComplete="off"
                        disabled={!writable || keyState?.writable === false}
                        onChange={(e: react.ChangeEvent<HTMLInputElement>) => setKeyInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="dshav-button dshav-button-outline dshav-button-sm"
                        disabled={keyBusy || !writable || keyInput.trim() === ''}
                        onClick={() => { void commitKey() }}
                      >
                        {keyBusy ? t('keySaving') : t('keySave')}
                      </button>
                    </div>
                  ) : null}
                  {needKey && keyInput.trim() === '' ? <p className="dshav-field-hint">{t('keyKeepHint')}</p> : null}
                  <div className="dshav-field">
                    <button
                      type="button"
                      className="dshav-button dshav-button-primary dshav-button-sm"
                      disabled={testing || !writable || provider.baseUrl.trim() === ''}
                      onClick={() => { void testConnection() }}
                    >
                      {testing ? t('testBusy') : dirty ? t('testAndSave') : t('testConnection')}
                    </button>
                  </div>
                </Step>
              </div>
            </>
          ) : null}

          <div className="dshav-group">
            <div className="dshav-actions">
              <p className="dshav-status" aria-live="polite" data-kind={notice === null ? undefined : notice.kind === 'busy' ? undefined : notice.kind === 'ok' ? 'ok' : 'err'}>{notice?.text ?? ''}</p>
              {dirty ? (
                <button type="button" className="dshav-button dshav-button-outline dshav-button-sm" disabled={!writable} onClick={() => { setDraft(withLegacyMaterialized(newDraft())); setDirty(false); setNotice(null) }}>
                  {t('discard')}
                </button>
              ) : null}
              <button type="button" className="dshav-button dshav-button-primary dshav-button-sm" disabled={!dirty || !writable} onClick={() => { void commit() }}>
                {t('save')}
              </button>
            </div>
            {dirty ? <p className="dshav-field-hint">{t('unsavedHint')}</p> : null}
          </div>

          <div className="dshav-group">
            <button type="button" className="dshav-advanced-toggle" aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}>
              <span>{t('advancedTitle')}</span>
              <span className="dshav-field-hint">{showAdvanced ? t('advancedCollapse') : t('advancedHint')}</span>
            </button>
            {showAdvanced ? (
              <div className="dshav-stack">
                {cloudMode ? (
                  <>
                    <TextRow
                      title={t('providerNameLabel')}
                      desc={t('providerNameDesc', { ref })}
                      value={provider.name}
                      onChange={(v) => edit((c) => patchProvider(c, provider.id, { name: v }))}
                    />
                    <TextRow
                      title={t('cloudBaseUrlLabel')}
                      desc={t('cloudBaseUrlDesc')}
                      value={provider.baseUrl}
                      onChange={(v) => edit((c) => patchProvider(c, provider.id, { baseUrl: v }))}
                    />
                    {tested === null ? (
                      <TextRow title={t('cloudModelLabel')} desc={t('cloudModelDesc')} value={provider.model} onChange={(v) => edit((c) => patchProvider(c, provider.id, { model: v }))} />
                    ) : (
                      <SelectRow
                        title={t('cloudModelLabel')}
                        desc={t('cloudModelPicked')}
                        value={provider.model}
                        options={[{ value: provider.model, label: provider.model === '' ? t('fetchModelsPick') : provider.model }, ...tested.models.map((m) => ({ value: m.id, label: m.name }))]}
                        onChange={(v) => edit((c) => patchProvider(c, provider.id, { model: v }))}
                      />
                    )}
                    <SelectRow
                      title={t('cloudModeLabel')}
                      desc={t('cloudModeDesc')}
                      value={provider.mode}
                      options={[
                        { value: 'auto', label: t('cloudModeAuto') },
                        { value: 'transcriptions', label: t('cloudModeTranscriptions') },
                        { value: 'chat', label: t('cloudModeChat') },
                      ]}
                      onChange={(v) => edit((c) => patchProvider(c, provider.id, { mode: v }))}
                    />
                    {draft.asr.cloud.providers.length > 1 ? (
                      <Field
                        title={t('providerListLabel')}
                        desc={t('providerListDesc')}
                        control={
                          <div className="dshav-provider-list">
                            {draft.asr.cloud.providers.map((p) => (
                              <div className="dshav-provider-row" key={p.id}>
                                <label className="dshav-toggle">
                                  <input
                                    type="radio"
                                    name="dshav-active-provider"
                                    checked={p.id === draft.asr.cloud.active}
                                    disabled={!writable}
                                    onChange={() => edit((c) => withProviders(c, c.asr.cloud.providers, p.id))}
                                  />
                                  <span>{rowLabel(p, t)}</span>
                                </label>
                                <button
                                  type="button"
                                  className="dshav-button dshav-button-outline dshav-button-sm"
                                  disabled={!writable}
                                  onClick={() => edit((c) => removeProvider(c, p.id))}
                                >
                                  {t('removeProvider')}
                                </button>
                              </div>
                            ))}
                          </div>
                        }
                      />
                    ) : null}
                  </>
                ) : null}

                <SelectRow
                  title={t('languageLabel')}
                  value={draft.language}
                  options={[
                    { value: 'auto', label: t('languageAuto') },
                    { value: 'zh-CN', label: '中文（简体）' },
                    { value: 'en-US', label: 'English (US)' },
                  ]}
                  onChange={(v) => edit((c) => withLanguage(c, v))}
                />

                <span className="dshav-groupTitle">{t('groupOptimize')}</span>
                <SelectRow
                  title={t('optimizeModeLabel')}
                  value={draft.optimize.mode}
                  options={[
                    { value: 'heuristic', label: t('optimizeHeuristic') },
                    { value: 'llm', label: t('optimizeLlm') },
                  ]}
                  onChange={(v) => edit((c) => withSection(c, 'optimize', { mode: v === 'llm' ? 'llm' : 'heuristic' }))}
                />
                {draft.optimize.mode === 'llm' ? (
                  <div className="dshav-stack">
                    <p className="dshav-field-hint">{t('llmDefaultHint')}</p>
                    <ModelPicker
                      t={t}
                      provider={draft.optimize.llm.provider}
                      model={draft.optimize.llm.model}
                      onProvider={(v) => edit((c) => withSection(c, 'optimize', { llm: { provider: v, model: '' } }))}
                      onModel={(v) => edit((c) => withSection(c, 'optimize', { llm: { ...c.optimize.llm, model: v } }))}
                    />
                    <ToggleRow
                      title={t('optimizePreviewLabel')}
                      desc={t('optimizePreviewDesc')}
                      checked={draft.optimize.preview}
                      onChange={() => edit((c) => withSection(c, 'optimize', { preview: !c.optimize.preview }))}
                    />
                  </div>
                ) : null}

                <span className="dshav-groupTitle">{t('groupBehavior')}</span>
                <ToggleRow title={t('autoSendLabel')} desc={t('autoSendDesc')} checked={draft.behavior.autoSend} onChange={() => edit((c) => withSection(c, 'behavior', { autoSend: !c.behavior.autoSend }))} />
                <ToggleRow title={t('silenceStopLabel')} desc={t('silenceStopDesc')} checked={draft.behavior.silenceStop} onChange={() => edit((c) => withSection(c, 'behavior', { silenceStop: !c.behavior.silenceStop }))} />
                <ToggleRow title={t('holdToTalkLabel')} desc={t('holdToTalkDesc')} checked={draft.behavior.holdToTalk} onChange={() => edit((c) => withSection(c, 'behavior', { holdToTalk: !c.behavior.holdToTalk }))} />
                <SelectRow
                  title={t('textModeLabel')}
                  desc={t('textModeDesc')}
                  value={draft.behavior.textMode}
                  options={[
                    { value: 'replace', label: t('textModeReplace') },
                    { value: 'append', label: t('textModeAppend') },
                  ]}
                  onChange={(v) => edit((c) => withSection(c, 'behavior', { textMode: v === 'append' ? 'append' : 'replace' }))}
                />
                <ToggleRow title={t('copyToClipboardLabel')} desc={t('copyToClipboardDesc')} checked={draft.behavior.copyToClipboard} onChange={() => edit((c) => withSection(c, 'behavior', { copyToClipboard: !c.behavior.copyToClipboard }))} />
                <Field title={t('hotkeyLabel')} desc={t('hotkeyDesc')} control={<HotkeyRecorder value={draft.behavior.hotkey} onChange={(v) => edit((c) => withSection(c, 'behavior', { hotkey: v }))} t={t} />} />
                <NumberRow title={t('maxRecordMsLabel')} desc={t('maxRecordMsDesc')} value={draft.behavior.maxRecordMs} min={5_000} max={600_000} step={1_000} onChange={(v) => edit((c) => withSection(c, 'behavior', { maxRecordMs: v }))} />
                <NumberRow title={t('silenceMsLabel')} desc={t('silenceMsDesc')} value={draft.behavior.silenceMs} min={200} max={60_000} step={100} onChange={(v) => edit((c) => withSection(c, 'behavior', { silenceMs: v }))} />
                <NumberRow title={t('silenceRmsLabel')} desc={t('silenceRmsDesc')} value={draft.behavior.silenceRms} min={0} max={1} step={0.005} onChange={(v) => edit((c) => withSection(c, 'behavior', { silenceRms: v }))} />

                <span className="dshav-groupTitle">{t('groupRealtime')}</span>
                <ToggleRow title={t('realtimeEnableLabel')} desc={t('realtimeEnableDesc')} checked={draft.realtime.enabled} onChange={() => edit((c) => withSection(c, 'realtime', { enabled: !c.realtime.enabled }))} />
                <SelectRow
                  title={t('realtimeTtsLabel')}
                  desc={t('realtimeTtsDesc')}
                  value={draft.realtime.tts}
                  options={[
                    { value: 'browser', label: t('realtimeTtsBrowser') },
                    { value: 'off', label: t('realtimeTtsOff') },
                  ]}
                  onChange={(v) => edit((c) => withSection(c, 'realtime', { tts: v === 'off' ? 'off' : 'browser' }))}
                />
                <Field title={t('realtimeHotkeyLabel')} desc={t('realtimeHotkeyDesc')} control={<HotkeyRecorder value={draft.realtime.hotkey} onChange={(v) => edit((c) => withSection(c, 'realtime', { hotkey: v }))} t={t} />} />
                <NumberRow title={t('realtimeSettleMsLabel')} desc={t('realtimeSettleMsDesc')} value={draft.realtime.turn.settleMs} min={200} max={10_000} step={100} onChange={(v) => edit((c) => withSection(c, 'realtime', { turn: { ...c.realtime.turn, settleMs: v } }))} />
                <NumberRow title={t('realtimeTailMsLabel')} desc={t('realtimeTailMsDesc')} value={draft.realtime.turn.tailMs} min={0} max={5_000} step={100} onChange={(v) => edit((c) => withSection(c, 'realtime', { turn: { ...c.realtime.turn, tailMs: v } }))} />
                <NumberRow title={t('realtimeMaxSessionLabel')} desc={t('realtimeMaxSessionDesc')} value={draft.realtime.maxSessionMs} min={30_000} max={3_600_000} step={30_000} onChange={(v) => edit((c) => withSection(c, 'realtime', { maxSessionMs: v }))} />
                <NumberRow title={t('realtimeFirstSentenceLabel')} desc={t('realtimeFirstSentenceDesc')} value={draft.realtime.speech.firstSentenceMinChars} min={1} max={200} onChange={(v) => edit((c) => withSection(c, 'realtime', { speech: { ...c.realtime.speech, firstSentenceMinChars: v } }))} />
                <NumberRow title={t('realtimeWatchdogLabel')} desc={t('realtimeWatchdogDesc')} value={draft.realtime.speech.utteranceWatchdogMs} min={1_000} max={300_000} step={1_000} onChange={(v) => edit((c) => withSection(c, 'realtime', { speech: { ...c.realtime.speech, utteranceWatchdogMs: v } }))} />

                <span className="dshav-groupTitle">{t('groupStats')}</span>
                <UsageStats t={t} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

/** 供应商行显示名（列表里区分同名预置）。 */
function rowLabel(p: CloudProviderConfig, t: LocaleT): string {
  const preset = presetById(p.preset)
  const base = p.name.trim() !== '' ? p.name : preset?.label ?? t('cloudPresetCustom')
  return p.baseUrl.trim() === '' ? base : `${base} · ${p.baseUrl.replace(/^https?:\/\//, '')}`
}
