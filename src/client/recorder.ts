/** dsh-asr-voice — client 录音引擎。
 * 两种引擎，统一 `VoiceRecorder` 接口：
 * - browser：Web Speech API（webkitSpeechRecognition），实时转写、浏览器本地、
 * 免 key；Chrome/Edge 双平台支持。
 * - cloud：getUserMedia + MediaRecorder 采集音频，停止后把原始字节 POST 到
 * host /api/asr-voice/transcribe，由服务端转发云端 ASR（key 不进浏览器）。
 * 两者都带：最长录音上限、interim 文本回调、状态回调；cloud 引擎可选静音自动停止
 * （默认关 = 手动关麦，点停止整段去 ASR，见 behavior.silenceStop）。
 */
import {
  PCM_SAMPLE_RATE, downmixToMono, encodeWav16MonoPcm, isSilentPeak, normaliseGain,
  peakAbs, resampleLinear, rmsFromByteTimeDomain,
} from './pcm.ts'
import type { RecordBehavior } from './config.ts'

/** 云端转写请求超时（毫秒）：上游不可达/卡住时不把 UI 永远钉在「识别中」。 */
const TRANSCRIBE_TIMEOUT_MS = 60_000

/** 录音状态。 */
export type RecordState = 'recording' | 'transcribing'

/** 浏览器语音识别的最小接口面（webkitSpeechRecognition）。 */
export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  onresult: ((event: {
    resultIndex: number
    results: {
      length: number
      item(index: number): {
        isFinal: boolean
        length: number
        item(j: number): { transcript: string }
      }
    }
  }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

/** 浏览器是否可用 Web Speech API。 */
export function isWebSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'webkitSpeechRecognition' in window
}

// 麦克风采集：用浏览器默认约束（AEC/降噪/自动增益交给 Chromium 处理）。
// 注意：显式关闭 echoCancellation/noiseSuppression/autoGainControl 在部分 macOS
// 设备上会直接采到纯静音（AEC 兼做时钟/重采样适配），故不在此处改约束；
// 设备级静音由「静音守卫」（基于转换后 WAV 的真实峰值）兜底识别。

/** 麦克风是否可用（权限 + 设备）。 */
export async function hasMicrophone(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    for (const track of stream.getTracks()) track.stop()
    return true
  } catch {
    return false
  }
}

/** 统一录音控制器。 */
export interface VoiceRecorder {
  /** 开始录音（幂等）。 */
  start(): void
  /** 手动停止；resolve 原始转写文本（cloud 引擎会先上传识别）。 */
  stop(): Promise<string>
  /** 放弃本次录音（不 resolve / 丢弃）。 */
  abort(): void
  /** 实时 interim 文本回调（浏览器引擎实时；云端引擎为空）。 */
  onInterim: ((text: string) => void) | null
  /** 状态回调（recording → transcribing）。 */
  onState: ((state: RecordState) => void) | null
  /** 实时音量回调（0~1 RMS；cloud 为真实音量，browser 为模拟能量）。 */
  onLevel: ((rms: number) => void) | null
/** 转写完成回调：无论 stop 由谁触发（手动点击 / 静音自动停止 / 超时自动停止）， 结果文本统一经此送达 UI；被 abort（打断）则不触发。 */
  onDone: ((text: string) => void) | null
  /** 转写失败回调（网络/上游/静音守卫等；被 abort 不触发）。 */
  onFail: ((error: unknown) => void) | null
}

/** 语言参数：auto → 返回 undefined（交给浏览器/服务端默认）。 */
function resolveLang(language: string): string | undefined {
  if (!language || language === 'auto') return undefined
  return language
}

/** 装饰性电平：Web Speech 引擎不暴露音频流，用平滑随机波形近似语音起伏驱动频谱条。 只用于视觉反馈，绝不参与任何静音/回合判定。返回幂等的停止函数。 */
export function startLevelSimulation(emit: (level: number) => void): () => void {
  let raf = 0
  let level = 0.05
  let phase = Math.random() * Math.PI * 2
  const loop = (): void => {
    phase += 0.16 + Math.random() * 0.12
    const base = 0.24 + 0.16 * Math.sin(phase)
    const burst = Math.random() < 0.07 ? Math.random() * 0.45 : 0
    const next = Math.min(1, Math.max(0.02, base + burst + Math.random() * 0.12))
    level += (next - level) * 0.32
    emit(level)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)
  return () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  }
}

/** 浏览器引擎：Web Speech API。 */
function createBrowserRecorder(language: string, onError: (msg: string) => void, behavior: RecordBehavior): VoiceRecorder {
  const Ctor = (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognitionLike }).webkitSpeechRecognition
  if (!Ctor) {
    throw new Error('browser: webkitSpeechRecognition unavailable')
  }
  const recognition = new Ctor()
  const lang = resolveLang(language)
  if (lang) recognition.lang = lang
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  let finalText = ''
  let interim = ''
  let stopped = false
  let cancelled = false
  let delivered = false
  let endResolve: ((text: string) => void) | null = null
  let maxTimer: ReturnType<typeof setTimeout> | null = null
  let stopLevelSim: (() => void) | null = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recorder: VoiceRecorder = { onInterim: null, onState: null, onLevel: null, onDone: null, onFail: null } as any

  /** 一次性送达结果：settle 与 stop() 双入口都可能命中，用 delivered 防重复。 */
  const deliver = (text: string): void => {
    if (delivered || cancelled) return
    delivered = true
    recorder.onDone?.(text)
  }

  /** 浏览器引擎无音频流，用平滑的模拟能量驱动频谱（装饰性，视觉近似语音起伏）。 */
  const startLevelSim = (): void => {
    stopLevelSim ??= startLevelSimulation((level) => { recorder.onLevel?.(level) })
  }
  const stopLevelSimNow = (): void => {
    stopLevelSim?.()
    stopLevelSim = null
  }

  const emitInterim = (): void => {
    const text = `${finalText}${finalText && interim ? ' ' : ''}${interim}`.trim()
    recorder.onInterim?.(text)
  }

  const settle = (): void => {
    if (stopped) return
    stopped = true
    stopLevelSimNow()
    if (maxTimer) clearTimeout(maxTimer)
    // 被 abort（打断）时不送结果；正常结束时经 onDone 把文本送回 UI，
    // 让「手动停止 / 自动停止」两条路径都能收敛到同一处消费。
    if (!cancelled && endResolve) {
      const text = finalText.trim()
      endResolve(text)
      endResolve = null
      deliver(text)
    }
  }

  recognition.onstart = () => { recorder.onState?.('recording') }

  recognition.onresult = (event) => {
    let finalChunk = ''
    let interimChunk = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results.item(i)
      const transcript = result.item(0)?.transcript ?? ''
      if (result.isFinal) finalChunk += transcript
      else interimChunk += transcript
    }
    if (finalChunk) finalText = `${finalText}${finalText && finalChunk ? ' ' : ''}${finalChunk}`
    if (interimChunk) interim = interimChunk
    else if (!finalChunk) interim = ''
    emitInterim()
  }

  recognition.onerror = (event) => {
    // 无论哪种错误都 settle：避免 UI 一直停在「录音中」（网络错误等会先于 onend 到来）。
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      settle()
      onError('mic-denied')
    } else if (event.error === 'no-speech') {
      // 静音结束：当作正常结束（轻提示，非错误）。
      settle()
      onError('no-speech')
    } else if (event.error === 'aborted') {
      // 主动 abort：正常结束。
      settle()
    } else if (event.error === 'network') {
      // 中国网络下 Chrome Web Speech 走 Google 服务器常被屏蔽 → network 错误。
      settle()
      onError('network')
    } else {
      settle()
      onError(event.error || 'unknown')
    }
  }

  recognition.onend = () => settle()

  recorder.start = () => {
    if (stopped) return
    startLevelSim()
    maxTimer = setTimeout(() => { try { recognition.stop() } catch { /* noop */ } }, behavior.maxRecordMs)
    try {
      recognition.start()
    } catch {
      // already started
    }
  }

  recorder.stop = () => {
    if (stopped) {
      const text = finalText.trim()
      deliver(text)
      return Promise.resolve(text)
    }
    return new Promise<string>((resolve) => {
      endResolve = (text) => resolve(text)
      try {
        recognition.stop()
      } catch {
        settle()
      }
    })
  }

  recorder.abort = () => {
    cancelled = true
    try {
      recognition.abort()
    } catch {
      /* noop */
    }
    settle()
  }

  return recorder
}

/** 分析用 AudioContext（电平表）：懒创建、跨录音复用——AudioContext 创建开销大
 * 且系统资源有限，反复 new/close 会抖动；录音开始接新流、结束断流即可。 */
let meterCtx: AudioContext | null = null
function getMeterCtx(): AudioContext | null {
  if (meterCtx !== null) return meterCtx
  try {
    const windowLike = window as unknown as {
      AudioContext?: typeof AudioContext
      webkitAudioContext?: typeof AudioContext
    }
    const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext
    meterCtx = AudioCtor ? new AudioCtor() : null
    return meterCtx
  } catch {
    return null
  }
}

/** 模块级：电平表当前 source 与 rAF 句柄，供录音结束断流/停帧。 */
let meterSources: MediaStreamAudioSourceNode[] = []
let meterRaf: { cancel(): void } | null = null
/** 录音结束后停止电平表（断流 + 停帧；AudioContext 保留复用）。 */
function stopLevelMeter(): void {
  meterRaf?.cancel()
  meterRaf = null
  for (const src of meterSources) {
    try { src.disconnect() } catch { /* noop */ }
  }
  meterSources = []
}

/** 云端引擎：MediaRecorder 采集 → host 代理转写。 */
function createCloudRecorder(language: string, onError: (msg: string) => void, behavior: RecordBehavior): VoiceRecorder {
  const recorder: VoiceRecorder = {
    onInterim: null, onState: null, onLevel: null, onDone: null, onFail: null,
    start: () => {}, stop: () => Promise.resolve(''), abort: () => {},
  }
  let stream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let maxTimer: ReturnType<typeof setTimeout> | null = null
  let stopPromise: Promise<string> | null = null
  let active = false
  let cancelled = false
  // 授权弹窗挂起（getUserMedia 未返回）期间收到 stop/abort：start 的 post-await
  // 检查点据此放弃本次会话，避免「UI 已停、麦克风却恢复录音」的状态错位。
  let stopRequested = false
  /** 当前转写请求的 AbortController：abort() 时可取消在途的 host 请求。 */
  let transcribeController: AbortController | null = null

  /** 停掉当前麦克风流的所有轨道（onstop/abort/错误各分支共用的收尾）。 */
  const stopStream = (): void => {
    if (stream !== null) for (const t of stream.getTracks()) t.stop()
  }

  /** 把转换前的原始录音抓一份到 host（静音/异常短结果诊断用），失败静默。 */
  const captureDiagnostic = (blob: Blob): void => {
    if (blob.size <= 0) return
    void fetch('/api/asr-voice/transcribe?capture=1', {
      method: 'POST',
      headers: { 'content-type': blob.type || 'audio/webm' },
      body: blob,
    }).catch(() => {})
  }

  const pickMime = (): string => {
    // webm/opus 优先：Chrome 对 MediaRecorder 产出的 mp4(AAC) 解码不稳定（decodeAudioData
    // 可能解出错误/静音数据 → 上游收到垃圾音频返回空或幻觉文本）。上游统一收
    // blobToWav16k 转换后的 WAV，中间格式只影响解码可靠性——webm 在 Chromium 最稳，
    // mp4 留给不产 webm 的浏览器（Safari）。
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
    for (const m of candidates) {
      if (MediaRecorder.isTypeSupported(m)) return m
    }
    return ''
  }

/** 实时音量电平（驱动频谱条）。始终启用（能直观看出麦克风是否采到声）；
 * 仅当 behavior.silenceStop 开启时附带静音自动停止逻辑。
 * 注意：静音判定不依赖此处（Web Audio 双消费/挂起会误读），改由 onstop 里
 * 基于「转换后 WAV 的真实峰值」判定，此处只做实时反馈。
 */
  const startLevelMeter = (): void => {
    try {
      const audioCtx = getMeterCtx()
      if (audioCtx === null || stream === null) return
      // 复用上下文时先断开旧的 source（避免叠流）。
      for (const src of meterSources) {
        try { src.disconnect() } catch { /* noop */ }
      }
      meterSources = []
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      meterSources.push(source)
      const data = new Uint8Array(analyser.fftSize)
      let silentSince: number | null = null
      let raf = 0
      const loop = (): void => {
        if (!active) { raf = 0; return }
        analyser.getByteTimeDomainData(data)
        const rms = rmsFromByteTimeDomain(data)
        // 实时音量（0~1，放大到可视范围）
        recorder.onLevel?.(Math.min(1, rms * 4))
        if (behavior.silenceStop) {
          if (rms < behavior.silenceRms) {
            if (silentSince === null) silentSince = performance.now()
            else if (performance.now() - silentSince > behavior.silenceMs) {
              raf = 0
              void recorder.stop().catch(() => {})
              return
            }
          } else {
            silentSince = null
          }
        }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
      // 供录音结束路径取消 rAF（避免 stop 后仍跑一帧空转）。
      meterRaf = { cancel: () => { if (raf) cancelAnimationFrame(raf); raf = 0 } }
    } catch {
      // 音频分析不可用：频谱静默，录音仍正常
    }
  }

  /** 当前输入设备的 Chrome 标签（诊断信息，如 "MacBook Pro 麦克风"）。 */
  const currentInputLabel = (): string => {
    try {
      return stream?.getAudioTracks()[0]?.label ?? ''
    } catch {
      return ''
    }
  }

  recorder.start = async () => {
    if (active) return
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      onError('no-mic')
      return
    }
    let s: MediaStream
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      onError('mic-denied')
      return
    }
    // 授权弹窗挂起期间用户可能已取消（abort）或已按停止（finish）：复检，避免
    // 「幽灵录音」——取消后恢复仍开始录音，或 UI 已置 transcribing 却照常开录，
    // 直到 120s 上限才自愈。stopRequested 分支经 onDone('') 把状态机干净收回 idle。
    if (cancelled || stopRequested) {
      stopRequested = false
      for (const t of s.getTracks()) t.stop()
      active = false
      if (cancelled) return
      recorder.onDone?.('')
      return
    }
    stream = s
    chunks = []
    active = true
    const mime = pickMime()
    try {
      mediaRecorder = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s)
    } catch {
      onError('recorder-unsupported')
      active = false
      for (const t of s.getTracks()) t.stop()
      return
    }
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }
    stopPromise = new Promise<string>((resolve, reject) => {
      mediaRecorder!.onstop = async () => {
        stopLevelMeter()
        if (cancelled) { active = false; stopStream(); return }
        const type = mediaRecorder?.mimeType?.split(';')[0]?.trim() || 'audio/webm'
        const blob = new Blob(chunks, { type })
        recorder.onState?.('transcribing')
        try {
          // MiMo/Qwen-ASR 等 chat 通道只收 wav/mp3，whisper 式也兼容 wav →
          // 统一把浏览器录音（webm/m4a/ogg）解码重编码成 16kHz 单声道 WAV 再上传。
          let audio = blob
          let wavPeak = -1 // -1 = 转换失败，无法判定
          try {
            const r = await blobToWav16k(blob)
            if (cancelled) { active = false; stopStream(); return }
            audio = r.wav
            wavPeak = r.peak
          } catch {
            // 解码失败：退回原始 blob，让上游报错（避免转换本身卡死录音）。
          }
          // 静音守卫（ground truth）：转换后的 WAV 真实峰值趋零 → MediaRecorder 确实没录到声，
          // 不发 ASR（避免对静音幻觉出 "yeah"/"no text"）；原始录音也抓一份供诊断对比。
          if (isSilentPeak(wavPeak)) {
            captureDiagnostic(blob)
            active = false
            stopStream()
            const label = currentInputLabel()
            // 附上浏览器可见的全部输入设备 + 内核标识，一眼看出是否选错/非主流内核。
            let devices = ''
            try {
              const list = await navigator.mediaDevices.enumerateDevices()
              devices = list
                .filter((d) => d.kind === 'audioinput' && d.label !== '')
                .map((d) => d.label)
                .slice(0, 5)
                .join('、')
            } catch { /* 枚举失败不影响主错误 */ }
            const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
            const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : '未知内核'
            const extra = [label, devices, `浏览器:${br}`].filter(Boolean).join(' | ')
            const err = new Error(extra === '' ? 'no-sound' : `no-sound:${extra}`)
            recorder.onFail?.(err)
            reject(err)
            return
          }
          const controller = new AbortController()
          transcribeController = controller
          const text = await transcribeViaHost(audio, language, controller.signal)
          transcribeController = null
          if (cancelled) { active = false; stopStream(); return }
          // 异常短结果（疑似静音/听错）：把转换前的原始录音也抓一份到 host，
          // 与转换后的 WAV（host 侧 ≤8 字规则已存）对比定位是采集还是转码问题。
          if (text.trim().length <= 8) captureDiagnostic(blob)
          active = false
          stopStream()
          recorder.onDone?.(text)
          resolve(text)
        } catch (error) {
          active = false
          stopStream()
          if (cancelled) return
          const err = error instanceof Error ? error : new Error(String(error))
          recorder.onFail?.(err)
          reject(err)
        }
      }
      mediaRecorder!.onerror = () => {
        stopLevelMeter()
        active = false
        if (maxTimer) { clearTimeout(maxTimer); maxTimer = null }
        // 录音错误也要释放麦克风流，否则轨道保持活跃（麦克风常亮、占用输入设备）。
        stopStream()
        const err = new Error('recorder-error')
        // 不经 stop() 直接触发的 MediaRecorder 错误也要送达 onFail，否则 voice-button
        // 永久卡在 recording（后续 stop() 因 !active 只 resolve('')，无 onDone/onFail）。
        if (!cancelled) recorder.onFail?.(err)
        reject(err)
        // onerror 可能在无 stop() 调用方时触发：标记 rejection 已消费，避免 unhandledrejection。
        stopPromise?.catch(() => {})
      }
    })
    mediaRecorder.start(250)
    recorder.onState?.('recording')
    // 电平表始终启用（频谱反馈 + 可选静音自动停止）。
    startLevelMeter()
    maxTimer = setTimeout(() => { void recorder.stop().catch(() => {}) }, behavior.maxRecordMs)
  }

  recorder.stop = () => {
    if (!active || !mediaRecorder || !stopPromise) {
      // 录音尚未真正开始（授权弹窗挂起）：置标志让 start 的 post-await 检查放弃本次会话。
      stopRequested = true
      return Promise.resolve('')
    }
    active = false
    if (maxTimer) clearTimeout(maxTimer)
    if (mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop() } catch { /* noop */ }
    }
    return stopPromise
  }

  recorder.abort = () => {
    // 打断：置取消标志 + 中止在途转写请求，onstop 流程各检查点会放弃送达结果。
    cancelled = true
    stopRequested = true
    active = false
    stopLevelMeter()
    if (maxTimer) clearTimeout(maxTimer)
    transcribeController?.abort()
    transcribeController = null
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop() } catch { /* noop */ }
    }
    stopStream()
    stopPromise = null
  }

  return recorder
}

/** 把浏览器录音 blob（webm/m4a/ogg…）解码重编码成 16kHz 单声道 16-bit PCM WAV。
 * MiMo-V2.5-ASR 只接受 wav/mp3（实测 webm/m4a 报 Param Incorrect）；whisper 式
 * 通道也兼容 wav，故统一走 WAV。纯浏览器 Web Audio API，无外部依赖。
 * 返回转换结果 + 归一化前的原始峰值（供静音守卫做 ground-truth 判定）。
 */
/** 懒加载复用的 AudioContext（避免每次录音新建/关闭，提升转码流畅性）。 */
let sharedAudioCtx: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (sharedAudioCtx !== null) return sharedAudioCtx
  const windowLike = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext
  if (!AudioCtor) throw new Error('audio decode unavailable')
  sharedAudioCtx = new AudioCtor()
  return sharedAudioCtx
}

async function blobToWav16k(blob: Blob): Promise<{ wav: Blob; peak: number }> {
  const ctx = getAudioContext()
  const arrayBuffer = await blob.arrayBuffer()
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer)
    const channels: Float32Array[] = []
    for (let ch = 0; ch < audio.numberOfChannels; ch++) channels.push(audio.getChannelData(ch))
    const mono = downmixToMono(channels, audio.length)
    const pcm = resampleLinear(mono, audio.sampleRate, PCM_SAMPLE_RATE)
    const peak = peakAbs(pcm)
    const bytes = encodeWav16MonoPcm(pcm, PCM_SAMPLE_RATE, normaliseGain(peak))
    return { wav: new Blob([bytes], { type: 'audio/wav' }), peak }
  } catch (error) {
    // 共享 context 解码失败（可能被用户手动关闭）：重建一个再试一次。
    if (sharedAudioCtx !== null) {
      sharedAudioCtx = null
      try {
        return await blobToWav16k(blob)
      } catch {
        sharedAudioCtx = null
      }
    }
    throw error
  }
}

/** 宿主 API POST 骨架（transcribe/optimize 共用）：外部信号桥接 + 超时 + {ok,text,reason} 解析 + AbortError→timeout 转换。 */
export async function postHostApi(
  path: string,
  init: { headers: Record<string, string>; body: BodyInit },
  timeoutMs: number,
  label: string,
  externalSignal?: AbortSignal,
): Promise<string> {
  const controller = new AbortController()
  const onExternalAbort = (): void => controller.abort()
  if (externalSignal !== undefined) {
    if (externalSignal.aborted) controller.abort()
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(path, { method: 'POST', ...init, signal: controller.signal })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; text?: string; reason?: string }
    if (!res.ok || data.ok !== true || typeof data.text !== 'string') {
      throw new Error(data.reason || `${label} failed`)
    }
    return data.text
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`${label} timeout`)
    }
    throw error
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

/** 上传音频到 host 转写代理（带超时，防上游卡死钉住 UI）。实时按句引擎共用这一条通道。 */
export async function transcribeViaHost(blob: Blob, language: string, externalSignal?: AbortSignal): Promise<string> {
  const lang = resolveLang(language)
  const query = lang ? `?language=${encodeURIComponent(lang)}` : ''
  return postHostApi(
    `/api/asr-voice/transcribe${query}`,
    { headers: { 'content-type': blob.type || 'audio/webm' }, body: blob },
    TRANSCRIBE_TIMEOUT_MS, 'transcribe', externalSignal,
  )
}

/** 创建统一录音控制器。
 * @param engine - browser | cloud。
 * @param language - auto / zh-CN / en-US 等。
 * @param onError - 错误回调（错误码字符串）。
 * @param behavior - 时长与静音参数（来自 settings，见 config.recordBehavior）。
 */
export function createVoiceRecorder(
  engine: 'browser' | 'cloud',
  language: string,
  onError: (code: string) => void,
  behavior: RecordBehavior,
): VoiceRecorder {
  if (engine === 'cloud') return createCloudRecorder(language, onError, behavior)
  return createBrowserRecorder(language, onError, behavior)
}
