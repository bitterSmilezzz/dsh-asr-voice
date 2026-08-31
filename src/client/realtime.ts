/**
 * dsh-asr-voice — 实时转写引擎（连续会话 + 本地回合判定）。
 *
 * 与 recorder.ts 的整段模式是两种活法：整段模式靠一次点击划回合，实时模式没有那次
 * 点击，边界只能自己判。浏览器 Web Speech 不给任何 VAD/回合信号，所以判定落在
 * **文字稳定性**上：连续 realtime.turn.settleMs 没有新结果、再多等 tailMs 接住最后
 * 一个词的迟到 final，就把这句交出去。云端实时引擎会直接给 speech_stopped，届时这条
 * 本地兜底只在它沉默时起作用。
 *
 * 一期只有 browser 引擎（零 key、零 host 改动，闭环可听）。引擎选择不在此处：
 * 调用方拿到的就是 RealtimeSession，多引擎分派随 host 通道一起进来。
 */
import { isWebSpeechSupported, startLevelSimulation, type SpeechRecognitionLike } from './recorder.ts'

/** 引擎回调（与 VoiceRecorder 的回调契约同构，语义换成连续会话）。 */
export interface RealtimeEvents {
  /** 当前这句的实时全文（已确认部分 + 候选部分），驱动字幕行。 */
  onPartial(text: string): void
  /** 一个回合说完：文本交出，调用方据此提交给 agent。 */
  onTurn(text: string): void
  /** 电平 0~1（浏览器引擎为装饰性模拟，不参与判定）。 */
  onLevel(level: number): void
  /** 会话级失败（mic 被拒 / 无 Web Speech / 识别服务不可达），带错误码。 */
  onFail(code: string): void
}

/** 回合判定参数。 */
export interface TurnTuning {
  /** 文字静默多久算说完（毫秒）。 */
  settleMs: number
  /** 之后再宽限这么久才交出（毫秒）。 */
  tailMs: number
}

/** 一次连续转写会话。 */
export interface RealtimeSession {
  /** 开始监听（幂等）。 */
  start(): void
  /**
   * 半双工门控：不收音。播报期间必须走这条——浏览器 AEC 吃不吃得掉我们自己的
   * TTS 尚未实测，先不赌；同时它也是「提交后不再进新词」的闩。
   */
  pause(): void
  /** 交还麦克风，从干净的一句开始。 */
  resume(): void
  /** 结束会话（不再有任何回调）。 */
  stop(): void
  /** 是否正在收音。 */
  readonly listening: boolean
}

/** Web Speech 在 onend 后重新拉起前的最小间隔：紧接着 start() 会撞 InvalidStateError。 */
const RESTART_DELAY_MS = 120

/** 取一个 webkitSpeechRecognition 构造器；不支持返回 null。 */
function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (!isWebSpeechSupported()) return null
  return (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognitionLike }).webkitSpeechRecognition
}

/** 空白归一：多段拼接与重启动带来的重复空格不应让字幕跳动。 */
function joinText(...parts: string[]): string {
  return parts.filter((p) => p !== '').join(' ').replace(/\s+/g, ' ').trim()
}

/** 浏览器引擎：连续的 Web Speech 会话 + 本地回合判定。 */
export function createBrowserRealtime(
  language: string,
  tuning: TurnTuning,
  events: RealtimeEvents,
): RealtimeSession {
  const Ctor = recognitionCtor()
  if (Ctor === null) {
    queueMicrotask(() => { events.onFail('no-speech-support') })
    return { start: () => {}, pause: () => {}, resume: () => {}, stop: () => {}, listening: false }
  }
  const lang = language === 'auto' ? '' : language

  let active = false
  let paused = true
  let failed = false
  let segment = ''
  let interim = ''
  let recognition: SpeechRecognitionLike | null = null
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let tailTimer: ReturnType<typeof setTimeout> | null = null
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  let stopLevel: (() => void) | null = null
  /** 上一次交出去的文本：识别器重启后可能把同一句再报一遍。 */
  let lastTurn = ''

  const clear = (timer: ReturnType<typeof setTimeout> | null): null => {
    if (timer !== null) clearTimeout(timer)
    return null
  }
  const clearTimers = (): void => {
    settleTimer = clear(settleTimer)
    tailTimer = clear(tailTimer)
    restartTimer = clear(restartTimer)
  }

  const latest = (): string => joinText(segment, interim)

  /** 交出当前这句，并为下一句清空累加器。 */
  const commit = (): void => {
    const text = latest()
    segment = ''
    interim = ''
    if (text === '' || !active || paused) return
    lastTurn = text
    events.onTurn(text)
  }

  /** 收到新结果就重新计时：静默才是「说完了」，噪声式抖动不会提前收尾。 */
  const armSettle = (): void => {
    settleTimer = clear(settleTimer)
    tailTimer = clear(tailTimer)
    if (latest() === '') return
    settleTimer = setTimeout(() => {
      settleTimer = null
      if (!active || paused) return
      if (tuning.tailMs <= 0) { commit(); return }
      tailTimer = setTimeout(() => { tailTimer = null; commit() }, tuning.tailMs)
    }, tuning.settleMs)
  }

  const emitPartial = (): void => { events.onPartial(latest()) }

  /** 装一个新的识别器并启动（每段一个实例：重启后旧实例的内部错误态会残留）。 */
  const openRecognition = (): void => {
    if (recognition !== null) {
      try { recognition.abort() } catch { /* noop */ }
    }
    const rec = new Ctor()
    if (lang !== '') rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results.item(i)
        const transcript = result.item(0)?.transcript ?? ''
        if (result.isFinal) finalChunk += transcript
        else interimChunk += transcript
      }
      if (!active || paused) return
      const chunk = finalChunk.trim()
      const fresh = interimChunk.trim()
      // 这条事件什么也没说（只有空白）：不动字幕、不冲掉在手候选、不重排静默计时。
      if (chunk === '' && fresh === '') return
      // 重启后重复上报同一句：丢掉，否则字幕会念两遍、回合会提交两遍。
      if (chunk !== '' && segment === '' && chunk === lastTurn) {
        interim = ''
        armSettle()
        return
      }
      if (chunk !== '') segment = joinText(segment, chunk)
      interim = fresh
      emitPartial()
      armSettle()
    }

    rec.onerror = (event) => {
      const code = event.error || 'unknown'
      if (code === 'no-speech' || code === 'aborted') return
      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
        failed = true
        active = false
        clearTimers()
        events.onFail(code === 'audio-capture' ? 'no-mic' : 'mic-denied')
        return
      }
      if (code === 'network') {
        failed = true
        active = false
        clearTimers()
        events.onFail('network')
      }
      // 其余错误码（rms 之类）不判死：会话可能还在，交给 onend 的重启逻辑续上。
    }

    rec.onend = () => {
      if (recognition === rec) recognition = null
      if (!active || paused || failed) return
      // Chrome 会在一段静音后自行结束 continuous 会话：悄悄续上，用户不该察觉。
      restartTimer = clear(restartTimer)
      restartTimer = setTimeout(() => {
        restartTimer = null
        if (active && !paused && !failed) openRecognition()
      }, RESTART_DELAY_MS)
    }

    recognition = rec
    try {
      rec.start()
    } catch {
      // already started：交给 onend 续。
    }
  }

  const beginListening = (): void => {
    paused = false
    stopLevel ??= startLevelSimulation((level) => { events.onLevel(level) })
    openRecognition()
  }

  return {
    start(): void {
      if (active) return
      active = true
      failed = false
      beginListening()
    },
    pause(): void {
      if (!active || paused) return
      paused = true
      clearTimers()
      segment = ''
      interim = ''
      const rec = recognition
      recognition = null
      try { rec?.abort() } catch { /* noop */ }
      stopLevel?.()
      stopLevel = null
    },
    resume(): void {
      if (!active || !paused) return
      lastTurn = ''
      beginListening()
    },
    stop(): void {
      active = false
      paused = true
      clearTimers()
      segment = ''
      interim = ''
      const rec = recognition
      recognition = null
      try { rec?.abort() } catch { /* noop */ }
      stopLevel?.()
      stopLevel = null
    },
    get listening(): boolean { return active && !paused },
  }
}
