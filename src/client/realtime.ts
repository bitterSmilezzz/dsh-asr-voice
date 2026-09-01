/**
 * dsh-asr-voice — 实时转写引擎（连续会话 + 本地回合判定）。
 *
 * 与 recorder.ts 的整段模式是两种活法：整段模式靠一次点击划回合，实时模式没有那次
 * 点击，边界只能自己判。浏览器 Web Speech 不给任何 VAD/回合信号，所以判定落在
 * **文字稳定性**上：连续 settleMs 没有新结果、再多等 tailMs 接住最后一个词的迟到
 * final，就把这句交出去。云端实时引擎会直接给 speech_stopped，届时这条
 * 本地兜底只在它沉默时起作用。
 *
 * 两个引擎共用同一份回合判定（`createSettleGate`）：换引擎不该换回合边界。
 *   - browser：连续 Web Speech 会话，零 key、零 host 改动。
 *   - segmented：本地能量 VAD 切段 + 已有整段转写通道，逐句出字，同样不需要新协议。
 *
 * 引擎选择不在此处：调用方拿到的就是 RealtimeSession（`createRealtime` 负责分派）。
 */
import { isWebSpeechSupported, startLevelSimulation, transcribeViaHost, type SpeechRecognitionLike } from './recorder.ts'
import { isRestartEcho } from './turn-guard.ts'
import { startPcmCapture, type PcmCapture, type PcmCaptureOptions } from './capture.ts'
import { PCM_SAMPLE_RATE, encodeWav16MonoPcm, isSilentPeak, normaliseGain, peakAbs, rmsOfFloat } from './pcm.ts'
import { createEnergyVad, type EnergyVad, type VadTuning } from './vad.ts'
import { createRmsFloorEstimator, DEFAULT_RMS_FLOOR_TUNING, createBargeInGate, DEFAULT_BARGE_IN_TUNING } from './rms-floor.ts'
import { meaningfulTurn } from './turn-guard.ts'
import { createCloudRealtime, defaultCloudCapture } from './realtime-cloud.ts'
import { createBrowserCloudTransport } from './realtime-cloud-transport.ts'

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
  /** 背压丢段：字幕从这里起不再完整（segmented 引擎独有）。 */
  onGap?(): void
  /** 语音插话（D19）：播放回复期间检测到真正的人声打断（segmented 引擎独有）。 */
  onBargeIn?(): void
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
  /**
   * 语音插话（barge-in，D19）：播放回复期间恢复采集并武装回声门控。只有带本地
   * 能量门控的引擎（segmented）实现；browser/cloud 引擎保持半双工（pause 静音）。
   */
  armBargeIn?(): void
  /** 解除回声门控（播放自然排空/被打断时调用）。 */
  disarmBargeIn?(): void
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

/**
 * 回合判定：连续 `settleMs` 没有新结果、再宽限 `tailMs` 接住最后一个词的迟到结果，
 * 才交出这一句。两个引擎共用它，所以换引擎不会换回合边界。
 *
 * `arm(hasText)` 每次调用都重新计时——静默才是「说完了」，噪声式抖动不会提前收尾；
 * `hasText === false` 时不排 timer（空句不该提交）。timer 到点先问 `live()`：
 * 会话已停/已暂停就什么也不做，交出动作由 `commit` 承担。
 */
function createSettleGate(
  tuning: TurnTuning,
  live: () => boolean,
  commit: () => void,
): { arm(hasText: boolean): void; cancel(): void } {
  const clear = (timer: ReturnType<typeof setTimeout> | null): null => {
    if (timer !== null) clearTimeout(timer)
    return null
  }
  let settleTimer: ReturnType<typeof setTimeout> | null = null
  let tailTimer: ReturnType<typeof setTimeout> | null = null
  return {
    arm(hasText: boolean): void {
      settleTimer = clear(settleTimer)
      tailTimer = clear(tailTimer)
      if (!hasText) return
      settleTimer = setTimeout(() => {
        settleTimer = null
        if (!live()) return
        if (tuning.tailMs <= 0) { commit(); return }
        tailTimer = setTimeout(() => { tailTimer = null; commit() }, tuning.tailMs)
      }, tuning.settleMs)
    },
    cancel(): void {
      settleTimer = clear(settleTimer)
      tailTimer = clear(tailTimer)
    },
  }
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
  let restartTimer: ReturnType<typeof setTimeout> | null = null
  let stopLevel: (() => void) | null = null
  /** 上一次交出去的文本与其交出时刻：识别器重启后可能在很短窗口内把同一句再报一遍。 */
  let lastTurn = ''
  let lastTurnAt = 0

  const clear = (timer: ReturnType<typeof setTimeout> | null): null => {
    if (timer !== null) clearTimeout(timer)
    return null
  }

  const latest = (): string => joinText(segment, interim)

  /** 交出当前这句，并为下一句清空累加器。 */
  const commit = (): void => {
    const text = latest()
    segment = ''
    interim = ''
    if (text === '' || !active || paused) return
    if (!meaningfulTurn(text)) return  // 噪音幻觉（嗯…）不上屏不提交
    lastTurn = text
    lastTurnAt = Date.now()
    events.onTurn(text)
  }

  const gate = createSettleGate(tuning, () => active && !paused, commit)

  /** 收到新结果就重新计时：静默才是「说完了」，噪声式抖动不会提前收尾。 */
  const armSettle = (): void => { gate.arm(latest() !== '') }

  const clearTimers = (): void => {
    gate.cancel()
    restartTimer = clear(restartTimer)
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
      // 重启后重复上报同一句：窗口内丢弃（isRestartEcho 带时间盒——窗口外同句
      // 是用户真的又说了一遍，不能吞）。
      if (chunk !== '' && segment === '' && isRestartEcho(lastTurn, lastTurnAt, chunk, Date.now())) {
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

/** 按句转写引擎参数：回合判定 + 声学切段 + 采集与背压。 */
export interface SegmentedTuning extends TurnTuning {
  /** 采集帧长（毫秒）。 */
  frameMs: number
  /** 待转写队列上限（不含在途那一段）：超出丢最旧。 */
  maxPending: number
  /** 声学切段参数。 */
  vad: VadTuning
}

/**
 * 可注入依赖。`capture` 永不 reject（失败以 onFail 送达），`transcribe` 以抛错表示
 * 这段没转出来。单测借此跑真状态机，不碰 DOM。
 */
export interface SegmentedDeps {
  capture(options: PcmCaptureOptions): Promise<PcmCapture>
  transcribe(pcm: Float32Array, language: string, signal: AbortSignal): Promise<string>
}

/** 连败判死阈值：上游持续失败时不该把用户的会话挂在半空（整段模式是同一取向）。 */
const CONSECUTIVE_FAIL_LIMIT = 3

/** 段 → WAV → host 整段转写代理（复用已验证的免费通道，不新增协议）。 */
async function transcribeWavSegment(pcm: Float32Array, language: string, signal: AbortSignal): Promise<string> {
  const bytes = encodeWav16MonoPcm(pcm, PCM_SAMPLE_RATE, normaliseGain(peakAbs(pcm)))
  return transcribeViaHost(new Blob([bytes], { type: 'audio/wav' }), language, signal)
}

const DEFAULT_SEGMENTED_DEPS: SegmentedDeps = {
  capture: startPcmCapture,
  transcribe: transcribeWavSegment,
}

/**
 * 按句转写引擎：本地能量 VAD 切段 + 已有整段转写通道。
 *
 * 出字节奏由「声学段边界 + 上游往返」决定，不是逐字流式：每句在说完 `silenceMs`
 * 后约一个往返才上屏。它换来的是零新协议、零新 key，并且用真实麦克风电平驱动电平表
 * （浏览器引擎只能模拟）。
 */
export function createSegmentedRealtime(
  language: string,
  tuning: SegmentedTuning,
  events: RealtimeEvents,
  deps: SegmentedDeps = DEFAULT_SEGMENTED_DEPS,
): RealtimeSession {
  let active = false
  let paused = true
  /** 本期已确认文字（各段转写结果按序拼接）。 */
  let text = ''
  let vad: EnergyVad | null = null
  let capture: PcmCapture | null = null
  /** rmsAuto 的噪声底估计器：与 VAD 同生命周期，静音期持续学习。 */
  const floor = tuning.vad.rmsAuto === true
    ? createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: tuning.frameMs })
    : null
  /** barge-in 回声门控：播放回复期间武装，只有它触发才打断（D19，默认关）。 */
  const bargeGate = createBargeInGate({ ...DEFAULT_BARGE_IN_TUNING, frameMs: tuning.frameMs })
  let inFlight = false
  let failures = 0
  const queue: Float32Array[] = []
  /** 在途请求按代际登记：pause/resume/stop 递增代际并 abort，旧代结果一律作废。 */
  const inflight = new Map<number, AbortController>()
  /**
   * 代际。用它而不是逐个标志位：一段语音的转写请求可能在说话人已经开始下一句之后
   * 才回来，不作废就会把上一句的字幕倒灌进新一句。
   */
  let generation = 0

  const commit = (): void => {
    const out = text
    text = ''
    if (out === '' || !active || paused) return
    if (!meaningfulTurn(out)) return  // 底噪段幻觉（嗯…）不上屏不提交
    events.onTurn(out)
  }

  /**
   * 还在出声时不交出回合：转写有往返，先落地的半句字幕不该把一句话说成两半。
   * 静音边沿（onSpeech(false)）会重新计时，所以这里挡下来的一定还有下一次机会。
   */
  const gate = createSettleGate(tuning, () => active && !paused && !(vad?.inSpeech ?? false), commit)

  const abortAll = (): void => {
    for (const controller of inflight.values()) controller.abort()
    inflight.clear()
  }

  const tearDown = (): void => {
    gate.cancel()
    bargeGate.disarm()
    abortAll()
    queue.length = 0
    inFlight = false
    text = ''
    vad?.reset()
  }

  const failNow = (code: string): void => {
    active = false
    paused = true
    tearDown()
    capture?.stop()
    capture = null
    events.onFail(code)
  }

  const pump = (): void => {
    if (!active || paused || inFlight) return
    const pcm = queue.shift()
    if (pcm === undefined) return
    const gen = generation
    const controller = new AbortController()
    inflight.set(gen, controller)
    inFlight = true
    deps.transcribe(pcm, language, controller.signal).then(
      (result) => {
        if (!inflight.delete(gen)) return
        inFlight = false
        failures = 0
        if (!active || paused) { pump(); return }
        const chunk = result.trim()
        if (chunk !== '') {
          text = joinText(text, chunk)
          events.onPartial(text)
        }
        gate.arm(text !== '')
        pump()
      },
      () => {
        if (!inflight.delete(gen)) return
        inFlight = false
        if (!active || paused) { pump(); return }
        failures += 1
        if (failures >= CONSECUTIVE_FAIL_LIMIT) { failNow('provider-unreachable'); return }
        pump()
      },
    )
  }

  const enqueue = (pcm: Float32Array): void => {
    queue.push(pcm)
    // 转写慢过说话：丢最旧。宁可少一句，也不能让字幕越拖越长。
    while (queue.length > tuning.maxPending) {
      queue.shift()
      events.onGap?.()
    }
    pump()
  }

  const ensureVad = (): EnergyVad => {
    vad ??= createEnergyVad(PCM_SAMPLE_RATE, tuning.vad, {
      onSegment: (pcm) => {
        if (!active || paused) return
        // barge-in 期（播报回复中）：回声可能被 VAD 切成段，直接丢弃不上行——
        // 打断检测走能量门控，这里留白只会浪费一次上游配额。
        if (bargeGate.armed) return
        // 静音守卫：VAD 也可能被噪声底顶开一段，趋零的段发上去只会换来幻觉字。
        if (isSilentPeak(peakAbs(pcm))) return
        enqueue(pcm)
      },
      onSpeech: (inSpeech) => { if (!inSpeech) gate.arm(text !== '') },
    }, floor)
    return vad
  }

  const onFrame = (pcm: Float32Array): void => {
    if (!active || paused) return
    const rms = rmsOfFloat(pcm)
    events.onLevel(rms)
    if (bargeGate.armed && bargeGate.feed(rms, vad?.inSpeech ?? false)) {
      events.onBargeIn?.()
    }
    ensureVad().feed(pcm)
  }

  const openCapture = (): void => {
    deps.capture({
      frameMs: tuning.frameMs,
      onFrame,
      onFail: (code) => { if (active) failNow(code) },
    }).then((next) => {
      // 授权弹窗挂起期间可能已经 stop()：立刻关掉，别让麦克风自己开着。
      if (!active || paused) { next.stop(); return }
      capture = next
    }, () => {
      if (active) failNow('capture-failed')
    })
  }

  return {
    start(): void {
      if (active) return
      active = true
      paused = false
      generation += 1
      ensureVad()
      openCapture()
    },
    pause(): void {
      if (!active || paused) return
      paused = true
      generation += 1
      // 播报期间轨道直接静音：比「收帧但丢弃」少一份回声，也少一份电量。
      capture?.setMuted(true)
      tearDown()
    },
    resume(): void {
      if (!active || !paused) return
      paused = false
      generation += 1
      ensureVad().reset()
      if (capture === null) { openCapture(); return }
      capture.setMuted(false)
    },
    stop(): void {
      active = false
      paused = true
      generation += 1
      bargeGate.disarm()
      tearDown()
      capture?.stop()
      capture = null
    },
    get listening(): boolean { return active && !paused },
    armBargeIn(): void {
      if (!active) return
      bargeGate.arm()
      // 从 thinking 的静音态回到收音（与 resume 同款逻辑：重启采集 + 重置 VAD，
      // 播报回声不留痕迹；在途请求随代际作废——此时本就没有在途请求）。
      if (paused) {
        paused = false
        generation += 1
        ensureVad().reset()
        if (capture === null) openCapture()
        else capture.setMuted(false)
      }
    },
    disarmBargeIn(): void {
      bargeGate.disarm()
    },
  }
}

/** 实时引擎标识（对应 settings 的 realtime.engine）。 */
export type RealtimeEngine = 'browser' | 'segmented' | 'cloud'

/** 按配置装配实时引擎（browser/segmented 回合判定同源；cloud 由服务端 VAD 给回合）。 */
export function createRealtime(
  engine: RealtimeEngine,
  language: string,
  tuning: SegmentedTuning,
  events: RealtimeEvents,
): RealtimeSession {
  if (engine === 'segmented') return createSegmentedRealtime(language, tuning, events)
  if (engine === 'cloud') {
    return createCloudRealtime({ frameMs: tuning.frameMs }, events, {
      capture: defaultCloudCapture,
      transport: createBrowserCloudTransport(),
    })
  }
  return createBrowserRealtime(language, tuning, events)
}
