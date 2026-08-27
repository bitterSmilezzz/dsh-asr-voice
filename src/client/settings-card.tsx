/**
 * dsh-asr-voice — client 设置卡片（settings.plugin.item, key: 'asr-voice'）。
 *
 * 「设置 → 插件 → 配置」下的折叠卡片：识别引擎 / 提示词优化 / 语言 / 交互行为。
 * 所有控件读写 config 快照（host settings 为权威源），文本输入立即写回。
 */
import * as react from 'react'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { config, setConfig, subscribeConfig } from './config.ts'
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

/** 主键规范化（忽略纯修饰键，统一 Space / 字母大写）。 */
function normalizeKey(key: string): string {
  if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta' || key === 'Escape') return ''
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  const map: Record<string, string> = { ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace' }
  return map[key] ?? key
}

/** 设置卡片（折叠交互与其他插件一致：可点击 header + chevron 旋转 + 条件 body）。 */
export function VoiceSettingsCard({ t }: SettingsCardProps): react.ReactElement {
  useConfigVersion()
  const [open, setOpen] = react.useState(false)
  const preset = presetById(config.asr.cloud.preset) ?? presetById(DEFAULT_PRESET_ID)

  const setProvider = (v: string): void => {
    setConfig('asr', () => { config.asr.provider = v === 'cloud' ? 'cloud' : v === 'browser' ? 'browser' : 'auto' })
  }
  const setPreset = (id: string): void => {
    setConfig('asr', () => {
      config.asr.cloud.preset = id
      const p = presetById(id)
      if (p) {
        config.asr.cloud.baseUrl = p.baseUrl
        config.asr.cloud.model = p.defaultModel
      }
    })
  }
  const setCloudBase = (v: string): void => {
    setConfig('asr', () => { config.asr.cloud.baseUrl = v; config.asr.cloud.preset = 'custom' })
  }
  const setCloudKey = (v: string): void => {
    setConfig('asr', () => { config.asr.cloud.apiKey = v })
  }
  const setCloudModel = (v: string): void => {
    setConfig('asr', () => { config.asr.cloud.model = v })
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

  const presetOptions = [
    ...CLOUD_PRESETS.map((p) => ({ value: p.id, label: p.label })),
    { value: 'custom', label: t('cloudPresetCustom') },
  ]

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
            <SelectRow title={t('cloudPresetLabel')} value={config.asr.cloud.preset} options={presetOptions} onChange={setPreset} />
            <TextRow title={t('cloudBaseUrlLabel')} value={config.asr.cloud.baseUrl} onChange={setCloudBase} />
            <TextRow title={t('cloudApiKeyLabel')} value={config.asr.cloud.apiKey} onChange={setCloudKey} type="password" />
            <TextRow title={t('cloudModelLabel')} desc={t('cloudModelHint')} value={config.asr.cloud.model} onChange={setCloudModel} wide />
            {preset && <p className="dshav-field-hint">{preset.hint}</p>}
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
        <Field
          title={t('hotkeyLabel')}
          desc={t('hotkeyDesc')}
          control={<HotkeyRecorder value={config.behavior.hotkey} onChange={setHotkey} t={t} />}
        />
      </div>
        </div>
      ) : null}
    </li>
  )
}
