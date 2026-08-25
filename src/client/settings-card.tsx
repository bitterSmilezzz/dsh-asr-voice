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

/** 一行开关。 */
function ToggleRow({ title, desc, checked, onChange }: { title: string; desc?: string; checked: boolean; onChange: () => void }): react.ReactElement {
  return (
    <div className="dshav-row">
      <div className="dshav-rowText">
        <span className="dshav-rowTitle">{title}</span>
        {desc ? <p className="dshav-rowDesc">{desc}</p> : null}
      </div>
      <label className="dshav-field">
        <input type="checkbox" checked={checked} onChange={onChange} />
      </label>
    </div>
  )
}

/** 文本输入行（立即写回 host settings）。 */
function TextRow({ title, desc, value, onChange, wide, type = 'text' }: {
  title: string
  desc?: string
  value: string
  onChange: (v: string) => void
  wide?: boolean
  type?: 'text' | 'password'
}): react.ReactElement {
  return (
    <div className="dshav-row">
      <div className="dshav-rowText">
        <span className="dshav-rowTitle">{title}</span>
        {desc ? <p className="dshav-rowDesc">{desc}</p> : null}
      </div>
      <div className="dshav-field">
        <input
          className={wide ? 'dshav-wide' : undefined}
          type={type}
          value={value}
          spellCheck={false}
          onChange={(e: react.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

/** 选择行。 */
function SelectRow({ title, desc, value, options, onChange }: {
  title: string
  desc?: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}): react.ReactElement {
  return (
    <div className="dshav-row">
      <div className="dshav-rowText">
        <span className="dshav-rowTitle">{title}</span>
        {desc ? <p className="dshav-rowDesc">{desc}</p> : null}
      </div>
      <div className="dshav-field">
        <select value={value} onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
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
        className="dshav-button dshav-button-ghost"
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
    setConfig('asr', () => { config.asr.provider = v === 'cloud' ? 'cloud' : 'browser' })
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
  const setLlmBase = (v: string): void => {
    setConfig('optimize', () => { config.optimize.llm.baseUrl = v })
  }
  const setLlmKey = (v: string): void => {
    setConfig('optimize', () => { config.optimize.llm.apiKey = v })
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
    <li className="dshav-card">
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
            {preset && <p className="dshav-rowDesc">{preset.hint}</p>}
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
            <TextRow title={t('llmBaseUrlLabel')} value={config.optimize.llm.baseUrl} onChange={setLlmBase} />
            <TextRow title={t('llmApiKeyLabel')} value={config.optimize.llm.apiKey} onChange={setLlmKey} type="password" />
            <TextRow title={t('llmModelLabel')} value={config.optimize.llm.model} onChange={setLlmModel} />
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
        <div className="dshav-row">
          <div className="dshav-rowText">
            <span className="dshav-rowTitle">{t('hotkeyLabel')}</span>
            <p className="dshav-rowDesc">{t('hotkeyDesc')}</p>
          </div>
          <HotkeyRecorder value={config.behavior.hotkey} onChange={setHotkey} t={t} />
        </div>
      </div>
        </div>
      ) : null}
    </li>
  )
}
