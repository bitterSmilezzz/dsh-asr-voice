/** dsh-asr-voice — 语音对话链路（不再是独立按钮，而是并入麦克风按钮的一段能力）。
 * 闭环：开始 → 边说边上字幕 → 停顿即把这句 setDraft+submit 发起 agent 回合
 * → 读 session.partial 的流式回复，分句交给 SpeakSink 朗读
 * → 念完自动把麦克风还回来，进入下一句。
 * 三条不可让的规矩：
 * 1. **半双工**：一切实弹/播报期间引擎都是 pause() 的。浏览器 AEC 能不能吃掉
 * 我们自己的 TTS 尚未实测，不赌；实测通过前不做语音插话。
 * 2. **一次一个在途回合**：turnRef 非空就是闩，任何路径都不允许第二个提交插进去。
 * 3. **麦克风不无人值守**：realtime.maxSessionMs 到点自动结束并交还设备。
 * 实时路径不做提示词优化：对话要的是即时，不是清洗过的转写。
 *
 * 形态说明：本模块导出的是 **hook + 状态条**，不是按钮。界面上只有一个按钮
 * （voice-button.tsx），「点击转写 / 长按对话」由那个按钮统一裁决；这里只负责
 * 对话自己的状态机与它那一条状态提示。全局快捷键仍经 voiceChatController 驱动。
 */
import * as react from 'react'
// Type-only: pulls the ui-conversation SlotMap merge (input seats + standard kit).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { cloudConfigured, config, realtimeTuning, subscribeConfig, type RealtimeTuning } from './config.ts'
import { appendDraftText } from './draft.ts'
import { createRealtime, type RealtimeSession } from './realtime.ts'
import { isPcmCaptureSupported } from './capture.ts'
import { createSentencePump, createSpeechSynthesisSink, createCloudTtsSink, isSpeechSynthesisSupported, isCloudTtsSupported, type SpeakSink } from './speech-out.ts'
import { isWebSpeechSupported } from './recorder.ts'
import { SpectrumBars, Spinner } from './icons.tsx'
import { systemDict } from './locales.ts'
import type { LocaleT } from './locales.ts'

/** 输入动作最小面（官方 standard kit 的 inputActions）。 */
interface InputActionsLike {
  setDraft(text: string): void
  submit(): void
}

/** assistant 内容块的最小面（只认 text，reasoning/tool-call 不念）。 */
export interface ReplyBlock {
  kind?: string
  text?: string
}

/** 对话链路需要的 owner share + 标准 kit 最小面 + 注入项。
 * 可选属性显式带上 `| undefined`：调用方（slot 注入）本来就可能传 undefined，
 * 而本仓开了 exactOptionalPropertyTypes，不写就只能靠条件展开绕，噪音更大。 */
export interface VoiceChatProps {
  sessionId?: string | undefined
  session?: { running?: boolean; partial?: { blocks?: readonly ReplyBlock[] } | null } | undefined
  input?: { draft?: string } | undefined
  inputActions?: InputActionsLike | undefined
  /** 取消当前回合：由 host 半区经 slot inject 注入（组件拿不到 ctx）。 */
  cancelTurn?: ((sessionId: string) => void) | undefined
  /** 开始对话前的额外许可：录音链路正占着麦克风时返回 false。 */
  canStart?: (() => boolean) | undefined
  t: LocaleT
}

/** 会话状态机：idle = 麦克风未开；listening = 收音中；thinking/speaking = 门控关麦。 */
export type ChatPhase = 'idle' | 'listening' | 'thinking' | 'speaking'

/** 字幕行只显示尾部这么多字符（提示条是单行的，整段回复会把它撑破）。 */
const CAPTION_TAIL_CHARS = 80

/** 全局对话控制器：快捷键只驱动「最后挂载」的实例（当前可见会话）。 */
export const voiceChatController = {
  toggle: (): void => { currentChat?.toggle() },
  isActive: (): boolean => currentChat?.isActive() ?? false,
  mount(instance: { toggle(): void; isActive(): boolean }): () => void {
    currentChat = instance
    return () => { if (currentChat === instance) currentChat = undefined }
  },
}
let currentChat: { toggle(): void; isActive(): boolean } | undefined

/** realtime.enabled 的响应式读取：设置里一拨开关，按钮的长按能力立刻跟着变。 */
const subscribeEnabled = (fn: () => void): (() => void) => subscribeConfig(fn)
const readEnabled = (): boolean => config.realtime.enabled

export function useRealtimeEnabled(): boolean {
  return react.useSyncExternalStore(subscribeEnabled, readEnabled)
}

/** 只保留尾部字符，供单行字幕显示长回复。 */
function tailText(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > CAPTION_TAIL_CHARS ? `…${flat.slice(-CAPTION_TAIL_CHARS)}` : flat
}

/** 从流式 blocks 里取可见正文（与官方 assistantText 同义，不依赖其未导出路径）。 */
function replyTextOf(blocks: readonly ReplyBlock[] | undefined): string {
  if (blocks === undefined) return ''
  return blocks.reduce((acc, b) => (b.kind === 'text' ? acc + (b.text ?? '') : acc), '')
}

/** 对话按钮需要的那几样东西。status 由本模块渲染——状态条的定位依赖按钮的
 *  `.dshav-mic-wrap`，但内容是对话自己的语义，拆两处会立刻走味。 */
export interface VoiceChatHandle {
  /** 当前阶段。 */
  phase: ChatPhase
  /** 是否在对话中（phase !== 'idle'）。 */
  active: boolean
  /** 对话能力是否可用（realtime.enabled）。关闭时长按退化成点击。 */
  enabled: boolean
  /** 按钮的悬停/无障碍标题。 */
  title: string
  /** 点按钮该做的事：进/出对话或打断。 */
  toggle: () => void
  /** 对话的状态提示条（错误 / 提示 / 字幕）。放进按钮的同一个 wrap 里。 */
  status: react.ReactNode
}

/** 对话链路。 @param props - slot 注入的 owner share + 标准 kit + 翻译函数。 */
export function useVoiceChat(props: VoiceChatProps): VoiceChatHandle {
  const { inputActions, t } = props
  const [phase, setPhaseState] = react.useState<ChatPhase>('idle')
  const [live, setLive] = react.useState('')
  const [error, setError] = react.useState<string | null>(null)
  const [notice, setNotice] = react.useState<string | null>(null)
  /** 对话能力总开关（realtime.enabled）。设置里一拨，按钮的长按能力立刻跟着变。 */
  const enabled = useRealtimeEnabled()

  const phaseRef = react.useRef<ChatPhase>('idle')
  const setPhase = (next: ChatPhase): void => { phaseRef.current = next; setPhaseState(next) }
  const engineRef = react.useRef<RealtimeSession | null>(null)
  const sinkRef = react.useRef<SpeakSink | null>(null)
  const tuningRef = react.useRef<RealtimeTuning | null>(null)
  /** 浏览器识别（Web Speech）在本机会话内已被网络/服务判定不可用 → 整个会话降级到
   * segmented（按句云端转写）再说话。整段录音的 auto 模式早有同款降级，这里补齐
   * 实时语音对话的路：Chrome 走 Google 服务器被网络屏蔽时 network 错误一上来就报，
   * 不许用户每次手动切引擎。 */
  const fallbackEngineRef = react.useRef<'segmented' | null>(null)
  /** 跨 begin() 传递的提示（降级提示要先于 begin 决定、又不能被 begin 的 notice 覆盖）。 */
  const fallbackNoticeRef = react.useRef<string | null>(null)
  /** 在途回合闩：非空表示这句话已提交、回复还没念完。 */
  const turnRef = react.useRef<{
    armed: boolean
    lastText: string
    pump: ReturnType<typeof createSentencePump>
  } | null>(null)
  const noReplyRef = react.useRef<ReturnType<typeof setTimeout> | null>(null)
  const capRef = react.useRef<ReturnType<typeof setTimeout> | null>(null)
  const spectrumRef = react.useRef<HTMLSpanElement | null>(null)
  const levelRef = react.useRef(-1)
  const mountedRef = react.useRef(true)
  // 回调活在被创建的那一帧里：props/最新闭包一律经 ref 转发，免得拿到旧 inputActions。
  const actionsRef = react.useRef<InputActionsLike | undefined>(inputActions)
  const cancelRef = react.useRef<VoiceChatProps['cancelTurn']>(props.cancelTurn)
  const canStartRef = react.useRef<VoiceChatProps['canStart']>(props.canStart)
  const runningRef = react.useRef(props.session?.running ?? false)
  const draftRef = react.useRef(props.input?.draft ?? '')
  actionsRef.current = inputActions
  cancelRef.current = props.cancelTurn
  canStartRef.current = props.canStart
  runningRef.current = props.session?.running ?? false
  const replyText = react.useMemo(() => replyTextOf(props.session?.partial?.blocks), [props.session?.partial?.blocks])
  const running = props.session?.running ?? false

  const clearNoReply = (): void => {
    if (noReplyRef.current !== null) clearTimeout(noReplyRef.current)
    noReplyRef.current = null
  }

  /** 结束本次对话：拆引擎、拆播报、清闩，并把提示留下。 */
  const endSession = (note?: string, err?: string): void => {
    clearNoReply()
    if (capRef.current !== null) { clearTimeout(capRef.current); capRef.current = null }
    turnRef.current = null
    engineRef.current?.stop()
    engineRef.current = null
    sinkRef.current?.dispose()
    sinkRef.current = null
    tuningRef.current = null
    setLive('')
    setPhase('idle')
    setError(err ?? null)
    setNotice(note ?? null)
  }

  // 开关被拨到关：正在进行的对话立刻收摊。以前靠「注销第二个按钮」顺带卸载组件
  // 完成这件事（卸载 effect 里 stop 引擎），入口合并成常驻按钮后那个副作用没有了，
  // 必须显式补上——否则对话会带着开着的麦克风一直跑下去。
  const teardownRef = react.useRef<() => void>(() => {})
  teardownRef.current = (): void => { if (phaseRef.current !== 'idle') endSession() }
  react.useEffect(() => { if (!enabled) teardownRef.current() }, [enabled])

  /** 交还麦克风，开始听下一句（幂等：只有 thinking/speaking 才需要还）。 */
  const resumeListening = (): void => {
    if (!mountedRef.current || phaseRef.current === 'idle' || phaseRef.current === 'listening') return
    if (turnRef.current !== null) return
    setLive('')
    // barge-in 播报结束：解除回声门控，回到普通聆听。
    engineRef.current?.disarmBargeIn?.()
    engineRef.current?.resume()
    setPhase('listening')
  }

  /** 播一句（tts=off 时没有 sink，字幕照常走，回合结束直接还麦）。 */
  const speakSentence = (sentence: string): void => {
    const sink = sinkRef.current
    if (sink === null) return
    sink.enqueue(sentence)
    if (phaseRef.current === 'thinking') {
      setPhase('speaking')
      // 全双工（barge-in，默认关）：开始播报时武装回声门控并恢复收音——
      // 门控把 TTS 回声当背景，只有真正的人声持续超出才打断（D19）。
      if (tuningRef.current?.bargeIn === true) engineRef.current?.armBargeIn?.()
    }
  }

  /** 提交一句 → 发起回合。 */
  const commitTurn = (text: string): void => {
    const tuning = tuningRef.current
    const actions = actionsRef.current
    if (turnRef.current !== null || phaseRef.current !== 'listening') return
    if (text === '' || tuning === null || actions === undefined) return
    let merged = text
    if (config.behavior.textMode === 'append') {
      // 分隔决策在共享纯函数 appendDraftText（src/client/draft.ts，与录音按钮同源）。
      merged = appendDraftText(draftRef.current, text)
    }
    actions.setDraft(merged)
    actions.submit()
    engineRef.current?.pause()
    turnRef.current = { armed: false, lastText: '', pump: createSentencePump(tuning.firstSentenceMinChars) }
    // submit 没起作用（草稿被吞、会话不可写）时不能把人卡在「思考中」：
    // 一个断句窗口内没看到回合启动，就当作没发出去，把麦克风还回去。
    clearNoReply()
    noReplyRef.current = setTimeout(() => {
      noReplyRef.current = null
      const turn = turnRef.current
      if (turn === null || turn.armed) return
      turnRef.current = null
      setNotice(t('chatNoReply'))
      resumeListening()
    }, tuning.settleMs)
    setPhase('thinking')
  }

  /** 打断：止住播报、取消在途回合，立刻回到聆听。 */
  const interrupt = (): void => {
    engineRef.current?.disarmBargeIn?.()
    sinkRef.current?.cancel()
    clearNoReply()
    turnRef.current = null
    if (runningRef.current && props.sessionId !== undefined) cancelRef.current?.(props.sessionId)
    setLive('')
    engineRef.current?.resume()
    setPhase('listening')
  }

  /** 当前实际生效的引擎（含 Web Speech 被网络屏蔽后的降级结果）。 */
  const activeEngine = (): string => fallbackEngineRef.current ?? tuningRef.current?.engine ?? 'browser'

  /** 失败码 → 用户可读文案。**按引擎分派**：云端引擎下把「云端通道断开」说成
   *  「浏览器不支持 Web Speech，请改用云端 ASR」，是指引完全反向的误导——用户本来
   *  就在用云端。连接级失败（握手超时 / 对端关闭 / 上游转写失败 / 事件流断）一律
   *  归到云端通道文案，不再落进 Web Speech 兜底。 */
  const failMessage = (code: string): string => {
    if (code === 'no-mic' || code === 'mic-denied' || code === 'silent-device' || code === 'no-audio-context') {
      return t('errNoMic')
    }
    if (code === 'network') return t('errWebSpeechNetwork')
    if (code === 'no-worklet' || code === 'capture-failed') return t('errSegmentedUnsupported')
    if (code === 'provider-closed' || code === 'provider-timeout' || code === 'transcription-failed' || code === 'socket-closed') {
      return t('errRealtimeProvider')
    }
    if (code === 'provider-unreachable' || code === 'events-unavailable') {
      return activeEngine() === 'cloud' ? t('errRealtimeProvider') : t('errSegmentedUnreachable')
    }
    return t('errNoSpeechSupport')
  }

  const failByCode = (code: string): void => {
    // 自动降级：browser 引擎 network 失败且云端 ASR 已配置 → 切 segmented 立即重开
    // （浏览器识别已被网络屏蔽是持久事实，整个会话都不要再碰 Web Speech）。
    if (code === 'network' && (fallbackEngineRef.current === null && tuningRef.current?.engine === 'browser') && cloudConfigured()) {
      fallbackEngineRef.current = 'segmented'
      endSession(undefined, undefined)
      // 提示经 ref 交给 begin()：begin 自己也要写 notice（TTS 不可用），在这里直接
      // setNotice 会被它随后覆盖，用户永远看不到「已切到按句转写」。
      fallbackNoticeRef.current = t('chatWebSpeechFallback')
      begin()
      return
    }
    endSession(undefined, failMessage(code))
  }

  /** 开始一次对话。必须在点击回调里调用（Safari 的发声权限只认用户激活上下文）。 */
  const begin = (): void => {
    const tuning = realtimeTuning()
    // 降级后的引擎
    const engine = fallbackEngineRef.current ?? tuning.engine
    // 前置检查按引擎分：segmented 不用 Web Speech，但每句都要过一次已配置的云端转写；
    // cloud 走 host 实时通道（I3 假 provider / I5 真云端），也不需要 Web Speech。
    if (engine === 'segmented') {
      if (!isPcmCaptureSupported()) { setError(t('errSegmentedUnsupported')); setNotice(null); return }
      if (!cloudConfigured()) { setError(t('errSegmentedNeedsCloud')); setNotice(null); return }
    } else if (engine === 'cloud') {
      if (!isPcmCaptureSupported()) { setError(t('errSegmentedUnsupported')); setNotice(null); return }
    } else if (!isWebSpeechSupported()) {
      setError(t('errNoSpeechSupport')); setNotice(null); return
    }
    const ttsReady = tuning.tts === 'cloud' ? isCloudTtsSupported() : isSpeechSynthesisSupported()
    tuningRef.current = tuning
    setError(null)
    // 降级提示优先于 TTS 提示：它解释了「引擎为什么换了」，更该被看到（见 failByCode）。
    const pendingNotice = fallbackNoticeRef.current
    fallbackNoticeRef.current = null
    setNotice(pendingNotice ?? (tuning.tts !== 'off' && !ttsReady ? t('chatNoTts') : null))
    setLive('')
    levelRef.current = -1
    if (tuning.tts !== 'off' && ttsReady) {
      const sink = tuning.tts === 'cloud'
        ? createCloudTtsSink({ language: tuning.language, voice: tuning.ttsVoice })
        : createSpeechSynthesisSink({
            utteranceWatchdogMs: tuning.utteranceWatchdogMs,
            language: tuning.language,
          })
      sink.onDrain = () => { if (turnRef.current === null) resumeListening() }
      sinkRef.current = sink
      sink.prime()
    }
    engineRef.current = createRealtime(engine, tuning.language, tuning.segmented, {
      onPartial: (text) => { if (phaseRef.current === 'listening') setLive(text) },
      onTurn: (text) => { commitTurn(text) },
      onLevel: (level) => {
        const el = spectrumRef.current
        if (el && Math.abs(level - levelRef.current) >= 0.01) {
          levelRef.current = level
          el.style.setProperty('--level', level.toFixed(2))
        }
      },
      onFail: (code) => { failByCode(code) },
      onGap: () => { setNotice(t('chatGap')) },
      onBargeIn: () => {
        // 听到真正的人声打断（回声音量不足触发不了门控）：立刻止读、取消回合、
        // 回到聆听。键盘/关门等瞬态被持续时长门槛滤掉，不会误断。
        setNotice(null)
        interrupt()
      },
    })
    // 到点自己收：麦克风不能因为人去倒杯水就一直开着。
    capRef.current = setTimeout(() => { endSession(t('chatEndedLimit')) }, tuning.maxSessionMs)
    setPhase('listening')
    engineRef.current.start()
  }

  const toggle = (): void => {
    if (phaseRef.current === 'idle') {
      // 麦克风被录音链路占用时不开对话：两边都抓同一个输入设备，必然互相打架。
      if (canStartRef.current !== undefined && !canStartRef.current()) return
      // 新会话重新按用户配置起：上次会话的 network 降级只该在**那次会话内**粘住
      // （同一次对话里别再碰 Web Speech），不该跨会话——用户可能换了网络，也可能
      // 手动把引擎改回了 browser，那就要按新配置走。
      fallbackEngineRef.current = null
      begin()
    } else if (phaseRef.current === 'listening') endSession()
    else interrupt()
  }

  // 快捷键实例：冻结一次，经 ref 转发最新闭包（同麦克风按钮的处理）。
  const handlersRef = react.useRef<{ toggle(): void; isActive(): boolean }>({ toggle: () => {}, isActive: () => false })
  handlersRef.current = { toggle, isActive: () => phaseRef.current !== 'idle' }
  const instance = react.useMemo(() => ({
    toggle: () => { handlersRef.current.toggle() },
    isActive: () => handlersRef.current.isActive(),
  }), [])
  react.useEffect(() => voiceChatController.mount(instance), [instance])

  // 草稿镜像：append 模式要拿用户当时已敲的文字，不能用本帧快照。
  react.useEffect(() => { draftRef.current = props.input?.draft ?? '' }, [props.input?.draft])
  // 提示自动消散（与麦克风按钮同节奏）。
  react.useEffect(() => {
    if (error === null && notice === null) return
    const timer = setTimeout(() => { setError(null); setNotice(null) }, 6000)
    return () => clearTimeout(timer)
  }, [error, notice])

  // 回复跟读：owner share 每次 flush 都会带新快照进来，这里只做「喂泵 + 判收摊」。
  react.useEffect(() => {
    const turn = turnRef.current
    if (turn === null) return
    if (replyText !== turn.lastText) {
      turn.lastText = replyText
      for (const sentence of turn.pump.feed(replyText)) speakSentence(sentence)
    }
    if (running && !turn.armed) { clearNoReply(); turn.armed = true }
    if (turn.armed && !running) {
      for (const sentence of turn.pump.finish()) speakSentence(sentence)
      turnRef.current = null
      const sink = sinkRef.current
      if (sink === null || !sink.active) resumeListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replyText, running])

  // 卸载：拆会话、拆播报，不留活着的麦克风或排队里的句子。
  react.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearNoReply()
      if (capRef.current !== null) clearTimeout(capRef.current)
      engineRef.current?.stop()
      sinkRef.current?.dispose()
    }
  }, [])

  const busy = phase !== 'idle'
  // 悬停提示按系统语言（与 DSH 界面语言解耦），其余文案仍随界面语言。
  const sys = systemDict()
  const title = phase === 'idle' ? sys.chatTitle
    : phase === 'listening' ? sys.chatListeningTitle
      : phase === 'thinking' ? sys.chatThinkingTitle
        : sys.chatSpeakingTitle
  const shown = phase === 'listening' ? tailText(live) : tailText(replyText)
  const hintText = shown !== ''
    ? shown
    : phase === 'listening' ? t('chatListeningTitle')
      : phase === 'thinking' ? t('chatThinkingHint')
        : t('chatSpeakingHint')
  // 状态条按「错误 > 提示 > 字幕」的优先级只显示一条（与录音链路同款取舍）。
  // 不 memo：里面挂着 spectrumRef 与 interrupt 的最新闭包，缓存反而要小心陈旧。
  const status = ((): react.ReactNode => {
    if (error !== null) {
      return (
        <span className="dshav-hotkey-hint" data-kind="err" role="status">
          <span className="dshav-dot" style={{ background: 'var(--dshav-danger)' }} />
          <span className="dshav-hint-text">{error}</span>
          <button type="button" className="dshav-hint-dismiss" aria-label={t('dismiss')} onClick={() => { setError(null) }}>×</button>
        </span>
      )
    }
    if (notice !== null) {
      return (
        <span className="dshav-hotkey-hint" data-kind="notice" role="status">
          <span className="dshav-dot" />
          <span className="dshav-hint-text">{notice}</span>
          <button type="button" className="dshav-hint-dismiss" aria-label={t('dismiss')} onClick={() => { setNotice(null) }}>×</button>
        </span>
      )
    }
    if (!busy) return null
    return (
      <span className="dshav-hotkey-hint" data-kind="caption" data-state={phase} role="status" aria-live="polite">
        {phase === 'listening' ? <span className="dshav-dot" /> : <Spinner />}
        <span className="dshav-hint-text">{hintText}</span>
        {phase === 'listening' && (
          <span className="dshav-spectrum" ref={spectrumRef} aria-hidden="true">
            <SpectrumBars />
          </span>
        )}
        {phase !== 'listening' && (
          <button type="button" className="dshav-hint-dismiss" aria-label={t('chatInterrupt')} title={t('chatInterrupt')} onClick={interrupt}>×</button>
        )}
      </span>
    )
  })()

  return {
    phase,
    active: busy,
    enabled,
    title,
    toggle,
    status,
  }
}
