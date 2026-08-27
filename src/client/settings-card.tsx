/**
 * dsh-asr-voice — client 设置卡片（settings.plugin.item, key: 'asr-voice'）。
 *
 * 「设置 → 插件 → 配置」下的折叠卡片：识别引擎（含多供应商云端）/ 提示词优化 /
 * 语言 / 交互行为（含文本模式、剪贴板）/ 用量统计。
 * 所有控件读写 config 快照（host settings 为权威源），文本输入立即写回。
 */
import * as react from 'react'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { config, setConfig, subscribeConfig, type CloudProviderConfig } from './config.ts'
import { CLOUD_PRESETS, presetById, DEFAULT_PRESET_ID } from '../presets.ts'
import type { LocaleT } from './locales.ts'

/** 设置卡片 props（settings.plugin.item 注入 + 翻译函数）。 */
export interface SettingsCardProps {
  t: LocaleT
}

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

/** 文本输入字段（立即写回 host settings）。 */
function TextRow({ title, desc, value, onChange, wide, type = 'text' }: {
  title: string
  desc?: string
  value: string
  onChange: (v: string) => void
  wide?: boolean
  type?: 'text' | 'password'
}): react.ReactElement {
  return (
    <Field
      title={title}
      desc={desc}
      control={
        <div className="dshav-field">
          <input
            className={wide ? 'dshav-wide' : undefined}
            type={type}
            value={value}
            spellCheck={false}
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

/** 快捷键录制器：点击后捕获下一组组合键；支持清除。 */
function HotkeyRecorder({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: LocaleT }): react.ReactElement {
  const [arming, setArming] = react.useState(false)
  const inputRef = react.useRef<HTMLInputElement | null>(null)

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
        ref={inputRef}
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
  const load = react.useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch('/api/asr-voice/models', { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; providers?: DshProviderEntry[]; reason?: string }
      if (!res.ok || data.ok !== true || data.providers === undefined) throw new Error(data.reason || 'load failed')
      setProviders(data.providers)
      setStatus('ok')
    } catch {
      setStatus('err')
    }
  }, [])
  react.useEffect(() => { void load() }, [load])

  const currentProvider = providers?.find((p) => p.provider === provider)
  const modelOptions = currentProvider?.models ?? []

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

/** 供应商 ASR 模型拉取：点击「获取模型」→ /api/asr-voice/asr-models 动态拉取最新 ASR 模型并可选。 */
function AsrModelFetch({ t, providerId, model, onModel }: {
  t: LocaleT
  providerId: string
  model: string
  onModel: (v: string) => void
}): react.ReactElement {
  const [models, setModels] = react.useState<DshModelEntry[] | null>(null)
  const [status, setStatus] = react.useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [errMsg, setErrMsg] = react.useState('')

  const fetchModels = async (): Promise<void> => {
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch(`/api/asr-voice/asr-models?providerId=${encodeURIComponent(providerId)}`, { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; models?: DshModelEntry[]; reason?: string }
      if (!res.ok || data.ok !== true || !Array.isArray(data.models)) throw new Error(data.reason || 'fetch failed')
      setModels(data.models)
      setStatus('ok')
    } catch (error) {
      setStatus('err')
      setErrMsg(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="dshav-field" style={{ flexWrap: 'wrap' }}>
      <button
        type="button"
        className="dshav-button dshav-button-outline dshav-button-sm"
        onClick={() => { void fetchModels() }}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? t('fetchModelsLoading') : t('fetchModels')}
      </button>
      {status === 'ok' && models !== null && (
        <select
          value={model}
          onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onModel(e.target.value)}
          title={t('fetchModelsPick')}
        >
          <option value="">{model === '' ? t('fetchModelsPick') : t('fetchModelsCurrent')}</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      )}
      {status === 'ok' && models !== null && models.length === 0 ? <span className="dshav-field-hint">{t('fetchModelsEmpty')}</span> : null}
      {status === 'err' ? <span className="dshav-field-hint">{t('fetchModelsFail')}{errMsg ? `：${errMsg}` : ''}</span> : null}
    </div>
  )
}

/** 单个云端供应商编辑器（预置 / baseUrl / key / 模型+拉取 / 通道 / 删除）。 */
function CloudProviderEditor({ t, provider, active, onUpdate, onRemove, onSetActive, removable }: {
  t: LocaleT
  provider: CloudProviderConfig
  active: boolean
  onUpdate: (id: string, mutator: (p: CloudProviderConfig) => void) => void
  onRemove: (id: string) => void
  onSetActive: (id: string) => void
  removable: boolean
}): react.ReactElement {
  const preset = presetById(provider.preset) ?? presetById(DEFAULT_PRESET_ID)
  const presetOptions = [
    ...CLOUD_PRESETS.map((p) => ({ value: p.id, label: p.label })),
    { value: 'custom', label: t('cloudPresetCustom') },
  ]
  return (
    <div className="dshav-stack" style={{ border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, padding: '0 10px', marginBottom: 6 }}>
      <div className="dshav-field-head" style={{ padding: '10px 0 2px' }}>
        <label className="dshav-toggle">
          <input type="radio" name="dshav-active-provider" checked={active} onChange={() => onSetActive(provider.id)} />
          <span>{active ? t('activeProvider') : t('providerInactive')}</span>
        </label>
        <span style={{ flex: 1 }} />
        {removable && (
          <button type="button" className="dshav-button dshav-button-outline dshav-button-sm" onClick={() => onRemove(provider.id)}>
            {t('removeProvider')}
          </button>
        )}
      </div>
      <SelectRow title={t('cloudPresetLabel')} value={provider.preset} options={presetOptions} onChange={(v) => onUpdate(provider.id, (p) => {
        p.preset = v
        const pr = presetById(v)
        if (pr) { p.baseUrl = pr.baseUrl; p.model = pr.defaultModel; p.mode = pr.mode }
      })} />
      <TextRow title={t('cloudBaseUrlLabel')} value={provider.baseUrl} onChange={(v) => onUpdate(provider.id, (p) => { p.baseUrl = v; p.preset = 'custom' })} />
      <TextRow title={t('cloudApiKeyLabel')} value={provider.apiKey} onChange={(v) => onUpdate(provider.id, (p) => { p.apiKey = v })} type="password" />
      <Field
        title={t('cloudModelLabel')}
        desc={t('cloudModelHint')}
        control={<AsrModelFetch t={t} providerId={provider.id} model={provider.model} onModel={(v) => onUpdate(provider.id, (p) => { p.model = v })} />}
      />
      <SelectRow
        title={t('cloudModeLabel')}
        value={provider.mode}
        options={[
          { value: 'auto', label: t('cloudModeAuto') },
          { value: 'transcriptions', label: t('cloudModeTranscriptions') },
          { value: 'chat', label: t('cloudModeChat') },
        ]}
        onChange={(v) => onUpdate(provider.id, (p) => { p.mode = v })}
      />
      {preset ? <p className="dshav-field-hint">{preset.hint}</p> : null}
    </div>
  )
}

/** 用量统计展示（/api/asr-voice/stats，低优先级）。 */
function UsageStats({ t }: { t: LocaleT }): react.ReactElement {
  const [stats, setStats] = react.useState<{ count: number; chars: number; lastAt: number | null; lastProvider: string } | null>(null)
  react.useEffect(() => {
    let live = true
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/asr-voice/stats', { cache: 'no-store' })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; stats?: typeof stats }
        if (live && res.ok && data.ok === true && data.stats) setStats(data.stats)
      } catch { /* ignore */ }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 5000)
    return () => { live = false; window.clearInterval(timer) }
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

/** 生成供应商唯一 id。 */
function providerId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (c?.randomUUID) return c.randomUUID()
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 设置卡片（折叠交互与其他插件一致：可点击 header + chevron 旋转 + 条件 body）。 */
export function VoiceSettingsCard({ t }: SettingsCardProps): react.ReactElement {
  useConfigVersion()
  const [open, setOpen] = react.useState(false)

  // 旧单配置 → 多供应商一次迁移（providers 空且 legacy baseUrl 有值）。
  react.useEffect(() => {
    const cloud = config.asr.cloud
    if (cloud.providers.length === 0 && cloud.baseUrl.trim() !== '') {
      setConfig('asr', () => {
        config.asr.cloud.providers = [{
          id: 'legacy', preset: cloud.preset || 'custom', baseUrl: cloud.baseUrl,
          apiKey: cloud.apiKey, model: cloud.model, mode: cloud.mode,
        }]
        config.asr.cloud.active = 'legacy'
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setProvider = (v: string): void => {
    setConfig('asr', () => { config.asr.provider = v === 'cloud' ? 'cloud' : v === 'browser' ? 'browser' : 'auto' })
  }
  const updateProvider = (id: string, mutator: (p: CloudProviderConfig) => void): void => {
    setConfig('asr', () => {
      const p = config.asr.cloud.providers.find((x) => x.id === id)
      if (p) mutator(p)
    })
  }
  const addProvider = (): void => {
    setConfig('asr', () => {
      const p = presetById(DEFAULT_PRESET_ID)!
      config.asr.cloud.providers.push({
        id: providerId(), preset: p.id, baseUrl: p.baseUrl, apiKey: '', model: p.defaultModel, mode: p.mode,
      })
      if (config.asr.cloud.active === '') config.asr.cloud.active = config.asr.cloud.providers[config.asr.cloud.providers.length - 1]!.id
    })
  }
  const removeProvider = (id: string): void => {
    setConfig('asr', () => {
      config.asr.cloud.providers = config.asr.cloud.providers.filter((p) => p.id !== id)
      if (config.asr.cloud.active === id) config.asr.cloud.active = config.asr.cloud.providers[0]?.id ?? ''
    })
  }
  const setActive = (id: string): void => {
    setConfig('asr', () => { config.asr.cloud.active = id })
  }

  const setOptimizeMode = (v: string): void => {
    setConfig('optimize', () => { config.optimize.mode = v === 'llm' ? 'llm' : 'heuristic' })
  }
  const setLlmProvider = (v: string): void => {
    setConfig('optimize', () => { config.optimize.llm.provider = v; config.optimize.llm.model = '' })
  }
  const setLlmModel = (v: string): void => {
    setConfig('optimize', () => { config.optimize.llm.model = v })
  }

  const setLanguage = (v: string): void => {
    setConfig('language', () => { config.language = v })
  }
  const setAutoSend = (v: boolean): void => {
    setConfig('behavior', () => { config.behavior.autoSend = v })
  }
  const setHoldToTalk = (v: boolean): void => {
    setConfig('behavior', () => { config.behavior.holdToTalk = v })
  }
  const setHotkey = (v: string): void => {
    setConfig('behavior', () => { config.behavior.hotkey = v })
  }
  const setTextMode = (v: string): void => {
    setConfig('behavior', () => { config.behavior.textMode = v === 'append' ? 'append' : 'replace' })
  }
  const setCopyToClipboard = (v: boolean): void => {
    setConfig('behavior', () => { config.behavior.copyToClipboard = v })
  }

  const providers = config.asr.cloud.providers

  return (
    <li className={'dshav-card' + (open ? ' dshav-card-open' : '')}>
      <button
        type="button"
        className="dshav-header"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="dshav-headtext">
          <span className="dshav-name">{t('cardTitle')}</span>
          <p className="dshav-desc">{t('cardCopy')}</p>
        </span>
        <svg
          className={'dshav-chevron' + (open ? ' dshav-open' : '')}
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3.5 5.75 8 10.25l4.5-4.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="dshav-body">
          <div className="dshav-group">
            <span className="dshav-groupTitle">{t('groupAsr')}</span>
            <SelectRow
              title={t('asrProviderLabel')}
              value={config.asr.provider}
              options={[
                { value: 'auto', label: t('asrProviderAuto') },
                { value: 'browser', label: t('asrProviderBrowser') },
                { value: 'cloud', label: t('asrProviderCloud') },
              ]}
              onChange={setProvider}
            />
            {config.asr.provider === 'cloud' && (
              <div className="dshav-stack">
                {providers.length === 0 ? (
                  <p className="dshav-field-hint">{t('providersEmpty')}</p>
                ) : (
                  providers.map((p) => (
                    <CloudProviderEditor
                      key={p.id}
                      t={t}
                      provider={p}
                      active={p.id === config.asr.cloud.active}
                      onUpdate={updateProvider}
                      onRemove={removeProvider}
                      onSetActive={setActive}
                      removable={providers.length > 1}
                    />
                  ))
                )}
                <div className="dshav-field">
                  <button type="button" className="dshav-button dshav-button-outline dshav-button-sm" onClick={addProvider}>
                    {t('addProvider')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="dshav-group">
            <span className="dshav-groupTitle">{t('groupOptimize')}</span>
            <SelectRow
              title={t('optimizeModeLabel')}
              value={config.optimize.mode}
              options={[
                { value: 'heuristic', label: t('optimizeHeuristic') },
                { value: 'llm', label: t('optimizeLlm') },
              ]}
              onChange={setOptimizeMode}
            />
            {config.optimize.mode === 'llm' && (
              <div className="dshav-stack">
                <p className="dshav-field-hint">{t('llmDefaultHint')}</p>
                <ModelPicker
                  t={t}
                  provider={config.optimize.llm.provider}
                  model={config.optimize.llm.model}
                  onProvider={setLlmProvider}
                  onModel={setLlmModel}
                />
                <p className="dshav-field-hint">{t('llmCustomHint')}</p>
              </div>
            )}
          </div>

          <div className="dshav-group">
            <span className="dshav-groupTitle">{t('languageLabel')}</span>
            <SelectRow
              title={t('languageLabel')}
              value={config.language}
              options={[
                { value: 'auto', label: t('languageAuto') },
                { value: 'zh-CN', label: '中文（简体）' },
                { value: 'en-US', label: 'English (US)' },
              ]}
              onChange={setLanguage}
            />
          </div>

          <div className="dshav-group">
            <span className="dshav-groupTitle">{t('groupBehavior')}</span>
            <ToggleRow title={t('autoSendLabel')} desc={t('autoSendDesc')} checked={config.behavior.autoSend} onChange={() => setAutoSend(!config.behavior.autoSend)} />
            <ToggleRow title={t('holdToTalkLabel')} desc={t('holdToTalkDesc')} checked={config.behavior.holdToTalk} onChange={() => setHoldToTalk(!config.behavior.holdToTalk)} />
            <SelectRow
              title={t('textModeLabel')}
              desc={t('textModeDesc')}
              value={config.behavior.textMode}
              options={[
                { value: 'replace', label: t('textModeReplace') },
                { value: 'append', label: t('textModeAppend') },
              ]}
              onChange={setTextMode}
            />
            <ToggleRow title={t('copyToClipboardLabel')} desc={t('copyToClipboardDesc')} checked={config.behavior.copyToClipboard} onChange={() => setCopyToClipboard(!config.behavior.copyToClipboard)} />
            <Field
              title={t('hotkeyLabel')}
              desc={t('hotkeyDesc')}
              control={<HotkeyRecorder value={config.behavior.hotkey} onChange={setHotkey} t={t} />}
            />
          </div>

          <div className="dshav-group">
            <span className="dshav-groupTitle">{t('groupStats')}</span>
            <UsageStats t={t} />
          </div>
        </div>
      ) : null}
    </li>
  )
}
