/**
 * dsh-asr-voice — client 录音按钮（conversation.input.right 工具行）。
 *
 * 流程：点击/快捷键 → 录音（浏览器 Web Speech 实时 / 云端 MediaRecorder）
 *   → 停止 → 转写文本 → 提示词优化（heuristic 即时 / llm 预览卡）
 *   → 填入草稿（inputActions.setDraft），可选自动发送（inputActions.submit）。
 *
 * 动效（microanimations 原则：反馈/定向/愉悦，克制）：
 *   - 录音：多层呼吸光环（back.out 缓动、错开延迟、非机械）+ 实时频谱条
 *     （cloud 真实 RMS / browser 模拟能量，CSS 变量驱动）
 *   - 状态提示条：滑入 + 呼吸点（recording）/ 转圈（transcribing/optimizing）
 *   - 按钮：hover 微缩放、active 按压缩放
 *
 * 独立契约：本组件只依赖官方 slot 标准 kit（inputActions / session / input），
 * 不依赖任何第三方插件；样式 data 标签与命名空间唯一。
 */
import * as react from 'react'
// Type-only: pulls the ui-conversation SlotMap merge (input seats + standard kit).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { cloudConfigured, config } from './config.ts'
import { heuristicOptimize, llmOptimize } from './optimize.ts'
import { createVoiceRecorder, isWebSpeechSupported, type VoiceRecorder } from './recorder.ts'
import { fromTo } from './animate.ts'
import type { LocaleT } from './locales.ts'

/** 输入动作最小面（来自官方 standard kit 的 inputActions prop）。 */
interface InputActionsLike {
  setDraft(text: string): void
  submit(): void
}

/** 组件收到的 owner share + standard kit 最小面（结构类型，参照官方契约）。 */
export interface VoiceButtonProps {
  sessionId?: string
  input?: { draft?: string; phase?: string }
  session?: { blank?: boolean; composerPhase?: string }
  inputActions?: InputActionsLike
  /** 本地化翻译函数（由 slot inject 注入）。 */
  t: LocaleT
}

/** 组件内部状态机。 */
type VoiceState = 'idle' | 'recording' | 'transcribing' | 'optimizing'

/** 频谱条柱数。 */
const SPECTRUM_BARS = 12

/** 全局录音控制器：只驱动「最后挂载」的实例（当前可见会话）。 */
export const voiceController = {
  toggle: (): void => { current?.toggle() },
  isRecording: (): boolean => current?.isRecording() ?? false,
  /** 是否处于 busy（录音 / 识别 / 优化）——快捷键据此区分"打断"与"开始"。 */
  isBusy: (): boolean => current?.isBusy() ?? false,
  mount(instance: { toggle(): void; isRecording(): boolean; isBusy(): boolean }): () => void {
    current = instance
    return () => { if (current === instance) current = undefined }
  },
}
let current: { toggle(): void; isRecording(): boolean; isBusy(): boolean } | undefined

/** 麦克风图标。 */
function MicIcon(): react.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  )
}

/** 录音状态图标（实心圆点，带呼吸）。 */
function RecDot(): react.ReactElement {
  return <span className="dshav-rec-dot" />
}

/** 转圈（transcribing / optimizing）。 */
function Spinner(): react.ReactElement {
  return <span className="dshav-spinner" aria-hidden="true" />
}

/**
 * 录音按钮 + 状态提示条 + 预览卡。
 * @param props - slot 注入的 owner share + 标准 kit + 翻译函数。
 */
export function VoiceButton(props: VoiceButtonProps): react.ReactElement {
  const { inputActions, t } = props
  // 只有拿不到标准 kit 的 inputActions（无可用会话/惰性输入栏）才禁用。
  // 注意：不按 session.blank 禁用——新版 DSH 里空白会话（hero 新对话）的输入栏
  // 完全可用（可打字/发送首条消息），语音输入应同样可用；实测 blank 时点麦克风
  // 无任何响应（disabled 吞掉点击），玩家以为是坏按钮。
  const disabled = !inputActions
  const [state, setState] = react.useState<VoiceState>('idle')
  const [error, setError] = react.useState<string | null>(null)
  const [notice, setNotice] = react.useState<string | null>(null)
  const [interim, setInterim] = react.useState<string>('')
  const [preview, setPreview] = react.useState<{ original: string; optimized: string } | null>(null)
  // 快速路径标志：optimizing 状态下草稿已填入（区别于预览卡路径的等待）。
  const [optimizingDraft, setOptimizingDraft] = react.useState(false)

  const wrapRef = react.useRef<HTMLSpanElement | null>(null)
  const hintRef = react.useRef<HTMLSpanElement | null>(null)
  const spectrumRef = react.useRef<HTMLSpanElement | null>(null)
  const recorderRef = react.useRef<VoiceRecorder | null>(null)
  const optimizeControllerRef = react.useRef<AbortController | null>(null)
  const stateRef = react.useRef<VoiceState>('idle')
  stateRef.current = state
  // 打断标志：cancel() 置位后，迟到的 onDone/onFail/优化结果一律丢弃。
  const cancelledRef = react.useRef(false)
  // 会话代际：begin() 递增，异步回调捕获自己的代际；cancel→立即 begin 时
  // 旧 promise 的 finally 用代际差异识别并丢弃，避免改写新会话状态。
  const generationRef = react.useRef(0)
  // 草稿最新值（props 异步回写）与本次填入的值——后台优化替换时防覆盖用户编辑。
  const draftRef = react.useRef<string>('')
  const insertedRef = react.useRef<string | null>(null)
  react.useEffect(() => {
    draftRef.current = props.input?.draft ?? ''
  }, [props.input?.draft])
  // 错误/提示自动消散（6s），避免状态条永久悬挂；也可点 × 手动关闭。
  react.useEffect(() => {
    if (error === null && notice === null) return
    const timer = setTimeout(() => {
      setError(null)
      setNotice(null)
    }, 6000)
    return () => clearTimeout(timer)
  }, [error, notice])
  const dismissHint = (): void => {
    setError(null)
    setNotice(null)
  }

  // 挂载/卸载：注册到全局控制器（快捷键驱动当前实例）。
  const instance = react.useMemo(() => ({
    toggle: () => {
      if (stateRef.current === 'idle') { void begin() } else if (stateRef.current === 'recording') { void finish() } else { cancel() }
    },
    isRecording: () => stateRef.current === 'recording',
    isBusy: () => stateRef.current !== 'idle',
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  react.useEffect(() => voiceController.mount(instance), [instance])

  const setPhase = (next: VoiceState): void => {
    stateRef.current = next
    setState(next)
  }

  const showError = (code: string, detail?: string): void => {
    // 静音守卫：录音整段静音（麦克风未采到声）→ 明确提示 + 输入设备名，误打误撞的 ASR 报错。
    if (code === 'transcribe' && detail?.startsWith('no-sound')) {
      const label = detail.slice('no-sound'.length).replace(/^:/, '')
      const shown = label.length > 80 ? `${label.slice(0, 80)}…` : label
      setError(`${t('errNoSound')}${shown ? `（${shown}）` : ''}`)
      setNotice(null)
      setPhase('idle')
      return
    }
    const msg = code === 'mic-denied' || code === 'no-mic'
      ? t('errNoMic')
      : code === 'no-speech-support'
        ? t('errNoSpeechSupport')
        : code === 'network'
          ? t('errWebSpeechNetwork')
          : code === 'cloud-not-configured'
            ? t('errCloudNotConfigured')
            : code === 'optimize'
              ? `${t('errOptimize')}${detail ? `: ${detail}` : ''}`
              : `${t('errTranscribe')}${detail ? `: ${detail}` : ''}`
    setError(msg)
    setNotice(null)
    setPhase('idle')
  }

  /** 解析最终引擎：auto = 浏览器优先（Web Speech 可用时），否则回落到已配置的云端。 */
  const resolveEngine = (): 'browser' | 'cloud' => {
    const provider = config.asr.provider
    if (provider === 'cloud') return 'cloud'
    if (provider === 'browser') return 'browser'
    // auto
    if (!isWebSpeechSupported()) return cloudConfigured() ? 'cloud' : 'browser'
    return 'browser'
  }

  /** 启动指定引擎的录音（云端自动兜底：auto 模式下浏览器失败 → 云端重试一次）。 */
  const startWithEngine = (engine: 'browser' | 'cloud'): void => {
    let recorder: VoiceRecorder
    try {
      recorder = createVoiceRecorder(engine, config.language, (code) => {
        if (code === 'no-speech') {
          // 无语音：当作正常结束，给一个轻提示（非错误）。
          setPhase('idle')
          setError(null)
          setNotice(t('noSpeechDetected'))
          return
        }
        // auto 兜底：浏览器不可用（网络/权限被浏览器 Web Speech 拒）且云端已配置 → 重试云端。
        const recoverable = code === 'network' || code === 'not-allowed' || code === 'service-not-allowed' || code === 'no-speech-support'
        if (engine === 'browser' && config.asr.provider === 'auto' && recoverable && cloudConfigured()) {
          setNotice(t('fallbackToCloud'))
          startWithEngine('cloud')
          return
        }
        showError(code)
      }, config.behavior.silenceStop)
    } catch {
      if (engine === 'browser' && config.asr.provider === 'auto' && cloudConfigured()) {
        setNotice(t('fallbackToCloud'))
        startWithEngine('cloud')
        return
      }
      showError('no-speech-support')
      return
    }
    recorderRef.current = recorder
    recorder.onInterim = (text) => setInterim(text)
    recorder.onState = (s) => { if (s === 'transcribing') setPhase('transcribing') }
    recorder.onLevel = (rms) => {
      // 频谱条：CSS 变量驱动柱高（避免每帧 React 渲染）
      if (spectrumRef.current) spectrumRef.current.style.setProperty('--level', rms.toFixed(3))
    }
    // 结果统一经 onDone/onFail 送达（手动 / 静音自动停止 / 超时自动停止三条路径收敛），
    // 由 handleTranscribed 消费文本、showTranscribeError 消费错误。
    recorder.onDone = (text) => handleTranscribed(text)
    recorder.onFail = (error) => showTranscribeError(error)
    setPhase('recording')
    startWave()
    recorder.start()
  }

  const begin = async (): Promise<void> => {
    setError(null)
    setNotice(null)
    setInterim('')
    setOptimizingDraft(false)
    cancelledRef.current = false
    // 新会话代际：让旧异步回调（优化/迟到结果）用自己的代际差异识别并丢弃。
    generationRef.current += 1
    optimizeControllerRef.current = new AbortController()
    const engine = resolveEngine()
    if (engine === 'cloud' && !cloudConfigured()) {
      showError('cloud-not-configured')
      return
    }
    if (engine === 'browser' && !isWebSpeechSupported()) {
      showError('no-speech-support')
      return
    }
    startWithEngine(engine)
  }

  /** 转写错误统一入口（onFail）：取消后到达的错误一律丢弃。 */
  const showTranscribeError = (error: unknown): void => {
    if (cancelledRef.current) return
    recorderRef.current = null
    showError('transcribe', String(error instanceof Error ? error.message : error))
  }

  /**
   * 转写完成统一入口（onDone）：默认快速路径（preview=false）——ASR 文本返回后
   * 立即把清洗版填入草稿，LLM 优化在后台跑；preview / autoSend 走等优化路径。
   */
  const handleTranscribed = (text: string): void => {
    if (cancelledRef.current) return
    const myGen = generationRef.current
    recorderRef.current = null
    const cleaned = text.trim()
    if (cleaned === '') { setPhase('idle'); return }

    const mode = config.optimize.mode
    if (mode === 'llm') {
      // 文本本来就干净（无语气词/标点问题）→ 跳过 LLM 优化，直接走填入/发送流程。
      const clean = heuristicOptimize(cleaned)
      // autoSend 保持原流程（说完即发，用优化后文本）；preview = 预览卡确认。
      if (config.behavior.autoSend || config.optimize.preview) {
        if (clean === cleaned) {
          finalize(cleaned)
          return
        }
        setPhase('optimizing')
        void llmOptimize(cleaned, {
          provider: config.optimize.llm.provider,
          model: config.optimize.llm.model,
        }, optimizeControllerRef.current?.signal)
          .then((optimized) => {
            if (cancelledRef.current || generationRef.current !== myGen) return
            if (config.optimize.preview) {
              setPreview({ original: cleaned, optimized })
              setPhase('idle')
            } else {
              finalize(optimized)
            }
          })
          .catch((error: unknown) => {
            if (cancelledRef.current || generationRef.current !== myGen) return
            showError('optimize', String(error instanceof Error ? error.message : error))
          })
        return
      }
      // 快速路径（默认）：立即填入清洗版，优化后台替换。
      const fast = clean || cleaned
      insertedRef.current = fast
      finalize(fast)
      setOptimizingDraft(true)
      setPhase('optimizing')
      void runBackgroundOptimize(cleaned)
      return
    }
    finalize(heuristicOptimize(cleaned))
  }

  /**
   * 快速路径（preview=false 默认）：ASR 文本返回后立即把清洗版填入草稿，
   * LLM 优化在后台跑，完成后仅在用户未编辑草稿时替换。
   */
  const runBackgroundOptimize = async (raw: string): Promise<void> => {
    const myGen = generationRef.current
    try {
      const target = {
        provider: config.optimize.llm.provider,
        model: config.optimize.llm.model,
      }
      const optimized = await llmOptimize(raw, target, optimizeControllerRef.current?.signal)
      // 防覆盖：仅当草稿仍是我们填入的文本时才替换（用户已编辑则保留编辑）。
      if (cancelledRef.current || generationRef.current !== myGen) return
      if (draftRef.current === insertedRef.current && inputActions !== undefined) {
        inputActions.setDraft(optimized)
      }
    } catch {
      // 后台优化失败不打断用户：草稿已可用，仅轻提示（6s 后自动消散，可点 × 关闭）。
      if (cancelledRef.current) return
      setNotice(t('optimizeFailedKeep'))
    } finally {
      // 打断（cancel）后旧 promise 的 finally 不得改写新会话状态：
      // cancel → 立即 begin 时 cancelledRef 已重置，若直接 setPhase('idle')
      // 会把新录音打回 idle。用会话代际标志（toast 由 begin 递增)区分。
      if (cancelledRef.current || generationRef.current !== myGen) return
      insertedRef.current = null
      setOptimizingDraft(false)
      setPhase('idle')
    }
  }

  /** 手动停止：结束录音并进入识别（结果经 onDone 送达）。 */
  const finish = (): void => {
    const recorder = recorderRef.current
    if (!recorder) { setPhase('idle'); return }
    stopWave()
    setNotice(null)
    setPhase('transcribing')
    void recorder.stop().catch(() => { /* 错误经 onFail 送达 */ })
  }

  /** 打断：中止录音 / 转写 / 优化，丢弃一切迟到结果，回到 idle。 */
  const cancel = (): void => {
    if (cancelledRef.current && stateRef.current === 'idle') return
    cancelledRef.current = true
    const recorder = recorderRef.current
    recorderRef.current = null
    optimizeControllerRef.current?.abort()
    optimizeControllerRef.current = null
    if (recorder) recorder.abort()
    stopWave()
    setInterim('')
    insertedRef.current = null
    setOptimizingDraft(false)
    setPreview(null)
    setNotice(null)
    setError(null)
    setPhase('idle')
  }

  /** 把最终文本填入草稿（完整替换 / 末尾追加）+ 可选剪贴板。 */
  const finalize = (text: string): void => {
    if (text === '') { setPhase('idle'); return }
    if (inputActions) {
      if (config.behavior.textMode === 'append') {
        const existing = props.input?.draft ?? ''
        const sep = existing !== '' && !/[ \n]$/.test(existing) ? ' ' : ''
        inputActions.setDraft(existing + sep + text)
      } else {
        inputActions.setDraft(text)
      }
      if (config.behavior.autoSend) inputActions.submit()
    }
    if (config.behavior.copyToClipboard) {
      try {
        void navigator.clipboard?.writeText(text).catch(() => { /* 剪贴板不可用：静默 */ })
      } catch { /* noop */ }
    }
    setPhase('idle')
  }

  const onConfirm = (): void => {
    if (preview) finalize(preview.optimized)
    setPreview(null)
  }

  // ── 呼吸光环（back.out 缓动 + 错开延迟 + 变化幅度，非机械同步） ──
  // 保存无限循环补间的 handle，stop 时 kill 掉——否则 repeat:Infinity 的 rAF 循环
  // 永不停（stopWave 只改内联样式，下一帧又被动画覆盖回去，红色波纹残留）。
  const waveHandlesRef = react.useRef<Array<{ kill(): void }>>([])
  const startWave = (): void => {
    const wrap = wrapRef.current
    if (!wrap) return
    stopWave()
    wrap.querySelectorAll<HTMLElement>('.dshav-wave-ring').forEach((ring, i) => {
      ring.style.opacity = '0.5'
      const spread = 1.9 + (i % 2) * 0.35
      const duration = 1.35 + (i % 2) * 0.2
      const handle = fromTo(ring, { scale: 0.72, opacity: 0.5 }, {
        scale: spread,
        opacity: 0,
        duration,
        delay: i * 0.24,
        ease: 'back.out',
        repeat: Infinity,
      })
      waveHandlesRef.current.push(handle)
    })
  }
  const stopWave = (): void => {
    for (const handle of waveHandlesRef.current) {
      try { handle.kill() } catch { /* noop */ }
    }
    waveHandlesRef.current = []
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.querySelectorAll<HTMLElement>('.dshav-wave-ring').forEach((ring) => {
      ring.style.opacity = '0'
      ring.style.transform = ''
    })
  }

  // 卸载清理：停止录音 + 停止波纹 + 中止在途优化（防对已卸载会话 setDraft）。
  react.useEffect(() => () => {
    stopWave()
    recorderRef.current?.abort()
    optimizeControllerRef.current?.abort()
  }, [])

  const busy = state !== 'idle'
  const title = busy
    ? state === 'recording' ? t('recordingTitle') : state === 'transcribing' ? t('transcribingTitle') : t('optimizingTitle')
    : t('micTitle')

  return (
    <react.Fragment>
      <span className="dshav-mic-wrap" ref={wrapRef}>
        <button
          type="button"
          className="dshav-mic-button"
          data-state={state}
          title={title}
          aria-label={title}
          aria-pressed={state === 'recording'}
          disabled={disabled}
          onClick={() => { if (state === 'idle') { void begin() } else if (state === 'recording') { void finish() } else { cancel() } }}
        >
          {state === 'recording' ? <RecDot /> : <MicIcon />}
          <span className="dshav-wave" aria-hidden="true">
            <span className="dshav-wave-ring" data-ring="1" />
            <span className="dshav-wave-ring" data-ring="2" />
            <span className="dshav-wave-ring" data-ring="3" />
          </span>
        </button>
        {error !== null && (
          <span className="dshav-hotkey-hint" data-kind="err" role="status">
            <span className="dshav-dot" style={{ background: 'var(--dshav-danger)' }} />
            {error}
            <button type="button" className="dshav-hint-dismiss" aria-label={t('dismiss')} onClick={dismissHint}>×</button>
          </span>
        )}
        {notice !== null && (
          <span className="dshav-hotkey-hint" data-kind="notice" role="status">
            <span className="dshav-dot" />
            {notice}
            <button type="button" className="dshav-hint-dismiss" aria-label={t('dismiss')} onClick={dismissHint}>×</button>
          </span>
        )}
        {busy && (
          <span className="dshav-hotkey-hint" data-state={state} ref={hintRef} role="status">
            {state === 'recording' ? <span className="dshav-dot" /> : <Spinner />}
            {state === 'recording' && interim !== '' ? <span className="dshav-hint-text">{interim}</span> : null}
            {state === 'optimizing' && optimizingDraft ? <span className="dshav-hint-text">{t('optimizingHint')}</span> : null}
            {state === 'transcribing' ? <span className="dshav-hint-text">{t('transcribingHint')}</span> : null}
            {state === 'recording' && (
              <span className="dshav-spectrum" ref={spectrumRef} aria-hidden="true">
                {Array.from({ length: SPECTRUM_BARS }, (_, i) => (
                  <span key={i} className="dshav-bar" style={{ '--bar': String(0.35 + (i / (SPECTRUM_BARS - 1)) * 0.65) } as react.CSSProperties} />
                ))}
              </span>
            )}
            {state !== 'recording' && (
              <button type="button" className="dshav-hint-dismiss" aria-label={t('cancelBusy')} title={t('cancelBusy')} onClick={cancel}>×</button>
            )}
          </span>
        )}
      </span>
      {preview !== null && (
        <div className="dshav-preview" role="dialog" aria-label={t('previewTitle')}>
          <div className="dshav-preview-title">
            <MicIcon />
            <span>{t('previewTitle')}</span>
          </div>
          <div className="dshav-preview-body">
            <div className="dshav-preview-block" data-role="original">
              <span className="dshav-preview-label">{t('previewOriginal')}</span>
              <p className="dshav-preview-text" data-role="original">{preview.original}</p>
            </div>
            <div className="dshav-preview-block" data-role="optimized">
              <span className="dshav-preview-label">{t('previewOptimized')}</span>
              <p className="dshav-preview-text" data-role="optimized">{preview.optimized}</p>
            </div>
          </div>
          <div className="dshav-preview-actions">
            <button type="button" className="dshav-button dshav-button-outline dshav-button-sm" onClick={() => setPreview(null)}>{t('previewCancel')}</button>
            <button type="button" className="dshav-button dshav-button-primary dshav-button-sm" onClick={onConfirm}>{t('previewConfirm')}</button>
          </div>
        </div>
      )}
    </react.Fragment>
  )
}
