/** dsh-asr-voice — client 设置卡片（settings.plugin.item, key: 'asr-voice'）。
 * 三步向导（① 识别方式 → ② 服务商 → ③ 密钥与自检）+ 默认折叠的「高级」。
 * 卡片只编辑一份本地草稿，按「保存」才过线（写回后读回校验，不信 promise）；
 * API key 单独走 credentials 域，既不进草稿也不进浏览器 DOM。
 */
import * as react from 'react'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { CLOUD_PRESETS, presetById, REALTIME_PRESETS } from '../presets.ts'
import {
  addProvider, draftActiveProvider, keyRefOf, newDraft, patchProvider, pickPreset,
  readKeyState, removeProvider, saveKey, settingsWritable, subscribeConfig, withLanguage,
  withLegacyMaterialized, withProviders, withSection, writeDraft,
  type AsrVoiceConfig, type CloudProviderConfig, type ConfigSection, type KeyState,
} from './config.ts'
import type { LocaleKey, LocaleT } from './locales.ts'
import { bareKeyAllowed, normalizeKey } from './hotkey.ts'

/** 卡片视图选择（插件详情页传入；兜底路径不传）。 */
export type VoiceCardView = 'summary' | 'page'

/** 设置卡片 props（插件详情页注入的 view + 翻译函数）。 */
export interface SettingsCardProps {
  t: LocaleT
  view?: VoiceCardView | undefined
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

/** fetch 超时信号。AbortSignal.timeout 是 Safari 16.4 才有的静态方法：
 *  更早的 Safari（含 16.x）调用它会同步抛 TypeError——三处请求全部当场失败，
 *  用户看到「加载失败」或「AbortSignal.timeout is not a function」，模型列表与
 *  「测试连接」永久不可用。这里回退到 AbortController + 定时器。
 *  定时器在 abort 时清掉；请求正常返回时那个定时器会到点触发一次（对已结束的
 *  请求是空操作，最多滞留 30s），不值得为它把三处调用点改成 try/finally。 */
function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), ms)
  controller.signal.addEventListener('abort', () => window.clearTimeout(timer), { once: true })
  return controller.signal
}

/** 明文 HTTP 且主机不是本机回环 → 提示 key 会明文过网（只警告，不阻断保存）。
 *  回环地址不需要警告：流量不出本机。 */
function isInsecureBaseUrl(url: string): boolean {
  if (!/^http:\/\//i.test(url.trim())) return false
  let host = ''
  try {
    // URL.hostname 对 IPv6 保留方括号（如 '[::1]'），两种写法都要认。
    host = new URL(url.trim()).hostname.toLowerCase()
  } catch {
    return false
  }
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' && host !== '[::1]'
}

/** 统一字段容器（垂直布局：label / control / hint，与官方 fields 一致）。
 * a11y：label 用 htmlFor 关联控件，id 由 useId 生成后经 render-prop 传给调用方
 * 挂到真实控件上；屏幕阅读器可读出字段名，点击标题聚焦控件。
 * control(ids) 收到 { controlId, labelId }：普通控件挂 controlId；
 * 组合控件（radio 组等）用 labelId 做 aria-labelledby 命名分组，
 * 并传 labelAs='span'（htmlFor 指向非 labelable 元素是无效关联）。 */
interface FieldIds { controlId: string; labelId: string }
function Field({ title, desc, control, labelAs = 'label' }: { title: string; desc?: string | undefined; control: (ids: FieldIds) => react.ReactNode; labelAs?: 'label' | 'span' }): react.ReactElement {
  const controlId = react.useId()
  const labelId = react.useId()
  // labelAs='span'：控件不是 labelable 元素（如挂在 role=radiogroup 的 div 上）时，
  // <label htmlFor> 是无效关联——点标题毫无反应，还会让 a11y 树里出现一个假标签。
  // 这种情况渲染 span 并只保留 id，由调用方用 aria-labelledby 命名分组。
  return (
    <div className="dshav-field-item">
      <div className="dshav-field-head">
        {labelAs === 'span'
          ? <span className="dshav-field-label" id={labelId}>{title}</span>
          : <label className="dshav-field-label" id={labelId} htmlFor={controlId}>{title}</label>}
      </div>
      <div className="dshav-field-control">{control({ controlId, labelId })}</div>
      {desc ? <p className="dshav-field-hint">{desc}</p> : null}
    </div>
  )
}

/** 开关字段：官方 Switch 与标题同行（对齐官方设置面板控件），desc 作 hint。 */
function ToggleRow({ title, desc, checked, onChange, disabled }: { title: string; desc?: string; checked: boolean; onChange: () => void; disabled?: boolean }): react.ReactElement {
  return (
    <div className={disabled ? 'dshav-field-item dshav-field-disabled' : 'dshav-field-item'}>
      <div className="dshav-toggle">
        <Switch checked={checked} onChange={onChange} label={title} disabled={disabled === true} />
        {/* 官方 Switch 是 <button role="switch">，标题文字只是旁边的 span：
            点文字没反应。挂 onClick 补上（span 不进 Tab 序列，不引入第二套键盘语义）。 */}
        <span onClick={() => { if (disabled !== true) onChange() }}>{title}</span>
      </div>
      {desc ? <p className="dshav-field-hint">{desc}</p> : null}
    </div>
  )
}

/** 数值输入字段（min/max 与 host schema 的同一组约束）。
 *  本地 string state 允许逐字输入 "0." 等中间态，blur 时 clamp 回写。 */
function NumberRow({ title, desc, value, onChange, min, max, step = 1 }: {
  title: string
  desc?: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}): react.ReactElement {
  const [editValue, setEditValue] = react.useState<string>(String(value))
  // value prop 从外部变化（清空/重置）时同步本地，但编辑中不覆盖。
  const [isFocused, setFocused] = react.useState(false)
  react.useEffect(() => {
    if (!isFocused) setEditValue(String(value))
  }, [value, isFocused])
  const commit = react.useCallback((): void => {
    const n = Number(editValue)
    if (editValue === '' || !Number.isFinite(n)) {
      setEditValue(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, n))
    setEditValue(String(clamped))
    onChange(clamped)
  }, [editValue, value, min, max, onChange])
  return (
    <Field
      title={title}
      desc={desc}
      control={({ controlId }) => (
        <div className="dshav-field">
          <input
            id={controlId}
            type="number"
            value={editValue}
            min={min}
            max={max}
            step={step}
            onFocus={() => setFocused(true)}
            onBlur={() => { setFocused(false); commit() }}
            onChange={(e: react.ChangeEvent<HTMLInputElement>) => {
              setEditValue(e.target.value)
              // 合法且有限时即刻回传（如其他 UI 联动），非法值保留在本地。
              if (e.target.value !== '' && /^-?\d*\.?\d*$/.test(e.target.value)) {
                const n = Number(e.target.value)
                if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
              }
            }}
          />
        </div>
      )}
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
      control={({ controlId }) => (
        <div className="dshav-field">
          <input
            id={controlId}
            type={type}
            value={value}
            placeholder={placeholder ?? ''}
            spellCheck={false}
            autoComplete="off"
            onChange={(e: react.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          />
        </div>
      )}
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
      control={({ controlId }) => (
        <div className="dshav-field">
          <select id={controlId} value={value} onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
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

/** 一行 chip 单选（点即选中并联动，替代原先层层条件展开的下拉）。
 *  a11y：role=radiogroup 里的 radio 必须能只用方向键走完。这里做 roving tabindex
 *  （选中项 tabIndex=0、其余 -1）把整组压成 1 个 Tab 停点，←→↑↓ 在组内循环切换
 *  并把焦点移到新选中项（WAI-ARIA radiogroup 惯例：选中随焦点）。 */
function Chips({ items, label, t }: {
  items: { key: string; label: string; selected: boolean; onSelect: () => void; disabled?: boolean }[]
  label: string
  t: LocaleT
}): react.ReactElement {
  const refs = react.useRef<(HTMLButtonElement | null)[]>([])
  // 选中项是组内唯一的 Tab 停点；万一没有选中项则退到第一个可用项，
  // 否则整组 tabIndex 全是 -1 = 键盘完全不可达。
  const selectedIndex = items.findIndex((item) => item.selected)
  const rovingIndex = selectedIndex !== -1 ? selectedIndex : items.findIndex((item) => item.disabled !== true)

  const move = (from: number, delta: number): void => {
    const count = items.length
    if (count === 0) return
    let next = from
    // 跳过禁用项：disabled 按钮不可聚焦，焦点落上去会静默丢失。
    for (let step = 0; step < count; step += 1) {
      next = (next + delta + count) % count
      if (items[next]?.disabled !== true) break
    }
    const target = items[next]
    if (target === undefined || target.disabled === true) return
    target.onSelect()
    refs.current[next]?.focus()
  }

  return (
    <div className="dshav-chips" role="radiogroup" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item.key}
          ref={(el) => { refs.current[index] = el }}
          type="button"
          role="radio"
          aria-checked={item.selected}
          tabIndex={index === rovingIndex ? 0 : -1}
          className="dshav-chip"
          data-selected={item.selected ? 'true' : undefined}
          disabled={item.disabled ?? false}
          onClick={item.onSelect}
          onKeyDown={(e) => {
            const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
              : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
            if (delta === 0) return
            e.preventDefault()
            move(index, delta)
          }}
        >
          {item.label}
        </button>
      ))}
      {items.length === 0 ? <span className="dshav-field-hint">{t('providersEmpty')}</span> : null}
    </div>
  )
}

/** 快捷键录制器：点击后捕获下一组组合键；支持清除。 */
function HotkeyRecorder({ inputId, value, onChange, t }: { inputId: string; value: string; onChange: (v: string) => void; t: LocaleT }): react.ReactElement {
  const [arming, setArming] = react.useState(false)

  const handleKeyDown = (e: react.KeyboardEvent<HTMLInputElement>): void => {
    if (!arming) return
    // Tab / Shift+Tab 必须原样放行：它们既不是可录组合键，也不是取消键，
    // 之前无条件 preventDefault 会吞掉默认焦点移动——键盘用户一旦进入这个
    // 录制框就再也 Tab 不出去（键盘陷阱）。其余按键保持原有拦截语义
    // （不冒泡到 window 上的全局快捷键监听）。
    if (e.key === 'Tab') return
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
        id={inputId}
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

/** 把键盘事件转成规范组合键字符串（修饰键 + 主键，跨平台）。
 *  无修饰键时只录 F 功能键：单字母/数字/符号/空格/回车/方向键会劫持输入
 *  （parseHotkey 同口径拒绝，两端一致）。 */
function keyCombo(e: react.KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta' || e.key === 'Escape') return ''
  if (parts.length === 0 && !bareKeyAllowed(e.key)) return ''
  parts.push(normalizeKey(e.key))
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
      const res = await fetch('/api/asr-voice/models', { cache: 'no-store', signal: timeoutSignal(30_000) })
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
        control={({ controlId }) => (
          <div className="dshav-field">
            <select id={controlId} value={provider} onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onProvider(e.target.value)}>
              <option value="">{t('llmCurrentDefault')}</option>
              {(providers ?? []).map((p) => <option key={p.provider} value={p.provider}>{p.name}</option>)}
            </select>
          </div>
        )}
      />
      <Field
        title={t('llmModelLabel')}
        control={({ controlId }) => (
          <div className="dshav-field">
            <select
              id={controlId}
              value={model}
              disabled={provider === ''}
              onChange={(e: react.ChangeEvent<HTMLSelectElement>) => onModel(e.target.value)}
            >
              <option value="">{t('llmCurrentDefault')}</option>
              {modelOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
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
        const res = await fetch('/api/asr-voice/stats', { cache: 'no-store', signal: timeoutSignal(10_000) })
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


/** 段名 → 分组标题（保存失败时告诉用户到底是哪一段没落盘）。 */
const SECTION_TITLE: Record<ConfigSection, LocaleKey> = {
  asr: 'groupAsr', optimize: 'groupOptimize', language: 'languageLabel', behavior: 'groupBehavior', realtime: 'groupRealtime',
}

/** 设置卡片：插件详情页按 view 渲染（summary 一行 / page 表单），兜底路径自绘折叠外壳。 */
export function VoiceSettingsCard({ t, view }: SettingsCardProps): react.ReactElement {
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

/** 测试连接 = 用该供应商列一次模型。 选它而不是录一段音：不用麦克风、不打扰人，且一次性验掉 key + baseUrl + 网络三件事， 返回的模型还能直接填进高级里的模型选择。 */
  const testConnection = async (): Promise<void> => {
    setTesting(true)
    if (dirty && !(await commit())) { setTesting(false); return }
    try {
      const res = await fetch(`/api/asr-voice/asr-models?providerId=${encodeURIComponent(provider.id)}`, { cache: 'no-store', signal: timeoutSignal(30_000) })
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

  // 插件详情页（view === 'page'）：官方页面已画标题/外壳，跳过折叠头、body 常开；
  // 卡片容器与 body 分隔线由 dshav-card-page / dshav-body-page 透明化。
  const pageView = view === 'page'
  if (view === 'summary') return <>{t('cardCopy')}</>

  return (
    <li className={'dshav-card' + (open || pageView ? ' dshav-card-open' : '') + (pageView ? ' dshav-card-page' : '')}>
      {pageView ? null : (
        <button type="button" className="dshav-header" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="dshav-headtext">
            <span className="dshav-name">{t('cardTitle')}</span>
            <span className="dshav-desc">{t('cardCopy')}</span>
          </span>
          <svg className={'dshav-chevron' + (open ? ' dshav-open' : '')} width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.5 5.75 8 10.25l4.5-4.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {open || pageView ? (
        <div className={'dshav-body' + (pageView ? ' dshav-body-page' : '')}>
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
                        aria-label={t('stepKeyTitle')}
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
                      onChange={(v) => { edit((c) => patchProvider(c, provider.id, { name: v })); setTested(null) }}
                    />
                    <TextRow
                      title={t('cloudBaseUrlLabel')}
                      desc={t('cloudBaseUrlDesc')}
                      value={provider.baseUrl}
                      onChange={(v) => { edit((c) => patchProvider(c, provider.id, { baseUrl: v })); setTested(null) }}
                    />
                    {/* 明文 http:// + 非回环主机：API key 会明文过网。只警告不阻断
                        （自建内网网关常是 http，硬拦会把它们挡在门外）。 */}
                    {isInsecureBaseUrl(provider.baseUrl) ? (
                      <p className="dshav-warn" role="alert">{t('insecureBaseUrl')}</p>
                    ) : null}
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
                        // 控件是 role=radiogroup 的 div（非 labelable），htmlFor 关联无效
                        labelAs="span"
                        control={({ controlId, labelId }) => (
                          <div className="dshav-provider-list" id={controlId} role="radiogroup" aria-labelledby={labelId}>
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
                        )}
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
                <Field title={t('hotkeyLabel')} desc={t('hotkeyDesc')} control={({ controlId }) => <HotkeyRecorder inputId={controlId} value={draft.behavior.hotkey} onChange={(v) => edit((c) => withSection(c, 'behavior', { hotkey: v }))} t={t} />} />
                <NumberRow title={t('maxRecordMsLabel')} desc={t('maxRecordMsDesc')} value={draft.behavior.maxRecordMs} min={5_000} max={600_000} step={1_000} onChange={(v) => edit((c) => withSection(c, 'behavior', { maxRecordMs: v }))} />
                <NumberRow title={t('silenceMsLabel')} desc={t('silenceMsDesc')} value={draft.behavior.silenceMs} min={200} max={60_000} step={100} onChange={(v) => edit((c) => withSection(c, 'behavior', { silenceMs: v }))} />
                <NumberRow title={t('silenceRmsLabel')} desc={t('silenceRmsDesc')} value={draft.behavior.silenceRms} min={0} max={1} step={0.005} onChange={(v) => edit((c) => withSection(c, 'behavior', { silenceRms: v }))} />

                <span className="dshav-groupTitle">{t('groupRealtime')}</span>
                <ToggleRow title={t('realtimeEnableLabel')} desc={t('realtimeEnableDesc')} checked={draft.realtime.enabled} onChange={() => edit((c) => withSection(c, 'realtime', { enabled: !c.realtime.enabled }))} />
                <SelectRow
                  title={t('realtimeEngineLabel')}
                  desc={t('realtimeEngineDesc')}
                  value={draft.realtime.engine}
                  options={[
                    { value: 'browser', label: t('realtimeEngineBrowser') },
                    { value: 'segmented', label: t('realtimeEngineSegmented') },
                    { value: 'cloud', label: t('realtimeEngineCloud') },
                  ]}
                  onChange={(v) => edit((c) => withSection(c, 'realtime', { engine: v === 'segmented' ? 'segmented' : v === 'cloud' ? 'cloud' : 'browser' }))}
                />
                {draft.realtime.engine === 'cloud' && (
                  <SelectRow
                    title={t('realtimeProviderLabel')}
                    desc={t('realtimeProviderDesc')}
                    value={draft.realtime.provider}
                    options={REALTIME_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
                    onChange={(v) => edit((c) => withSection(c, 'realtime', { provider: v }))}
                  />
                )}
                <SelectRow
                  title={t('realtimeTtsLabel')}
                  desc={t('realtimeTtsDesc')}
                  value={draft.realtime.tts}
                  options={[
                    { value: 'browser', label: t('realtimeTtsBrowser') },
                    { value: 'cloud', label: t('realtimeTtsCloud') },
                    { value: 'off', label: t('realtimeTtsOff') },
                  ]}
                  onChange={(v) => edit((c) => withSection(c, 'realtime', { tts: v === 'off' ? 'off' : v === 'cloud' ? 'cloud' : 'browser' }))}
                />
                {draft.realtime.tts === 'cloud' && (
                  <TextRow title={t('realtimeTtsVoiceLabel')} desc={t('realtimeTtsVoiceDesc')} value={draft.realtime.ttsVoice} onChange={(v) => edit((c) => withSection(c, 'realtime', { ttsVoice: v }))} />
                )}
                <Field title={t('realtimeHotkeyLabel')} desc={t('realtimeHotkeyDesc')} control={({ controlId }) => <HotkeyRecorder inputId={controlId} value={draft.realtime.hotkey} onChange={(v) => edit((c) => withSection(c, 'realtime', { hotkey: v }))} t={t} />} />
                <ToggleRow title={t('bargeInLabel')} desc={t('bargeInDesc')} checked={draft.realtime.bargeIn && draft.realtime.engine === 'segmented'} onChange={() => edit((c) => withSection(c, 'realtime', { bargeIn: !c.realtime.bargeIn }))} disabled={draft.realtime.engine !== 'segmented'} />
                <NumberRow title={t('realtimeSettleMsLabel')} desc={t('realtimeSettleMsDesc')} value={draft.realtime.turn.settleMs} min={200} max={10_000} step={100} onChange={(v) => edit((c) => withSection(c, 'realtime', { turn: { ...c.realtime.turn, settleMs: v } }))} />
                <NumberRow title={t('realtimeTailMsLabel')} desc={t('realtimeTailMsDesc')} value={draft.realtime.turn.tailMs} min={0} max={5_000} step={100} onChange={(v) => edit((c) => withSection(c, 'realtime', { turn: { ...c.realtime.turn, tailMs: v } }))} />
                <ToggleRow title={t('vadRmsAutoLabel')} desc={t('vadRmsAutoDesc')} checked={draft.realtime.vad.rmsAuto} onChange={() => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, rmsAuto: !c.realtime.vad.rmsAuto } }))} />
                <NumberRow title={t('vadFrameMsLabel')} desc={t('vadFrameMsDesc')} value={draft.realtime.vad.frameMs} min={10} max={500} step={10} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, frameMs: v } }))} />
                <NumberRow title={t('vadRmsLabel')} desc={t('vadRmsDesc')} value={draft.realtime.vad.rms} min={0} max={1} step={0.005} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, rms: v } }))} />
                <NumberRow title={t('vadSilenceMsLabel')} desc={t('vadSilenceMsDesc')} value={draft.realtime.vad.silenceMs} min={200} max={5_000} step={100} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, silenceMs: v } }))} />
                <NumberRow title={t('vadPrerollMsLabel')} desc={t('vadPrerollMsDesc')} value={draft.realtime.vad.prerollMs} min={0} max={1_000} step={50} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, prerollMs: v } }))} />
                <NumberRow title={t('vadMinSpeechMsLabel')} desc={t('vadMinSpeechMsDesc')} value={draft.realtime.vad.minSpeechMs} min={100} max={3_000} step={50} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, minSpeechMs: v } }))} />
                <NumberRow title={t('vadMaxSegmentMsLabel')} desc={t('vadMaxSegmentMsDesc')} value={draft.realtime.vad.maxSegmentMs} min={1_000} max={30_000} step={500} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, maxSegmentMs: v } }))} />
                <NumberRow title={t('vadMaxPendingLabel')} desc={t('vadMaxPendingDesc')} value={draft.realtime.vad.maxPending} min={1} max={20} onChange={(v) => edit((c) => withSection(c, 'realtime', { vad: { ...c.realtime.vad, maxPending: v } }))} />
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
