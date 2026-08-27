/**
 * dsh-asr-voice — client 录音引擎。
 *
 * 两种引擎，统一 `VoiceRecorder` 接口：
 *   - browser：Web Speech API（webkitSpeechRecognition），实时转写、浏览器本地、
 *     免 key；Chrome/Edge 双平台支持。
 *   - cloud：getUserMedia + MediaRecorder 采集音频，停止后把原始字节 POST 到
 *     host /api/asr-voice/transcribe，由服务端转发云端 ASR（key 不进浏览器）。
 *
 * 两者都带：最长录音上限、interim 文本回调、状态回调；cloud 引擎可选静音自动停止
 * （默认关 = 手动关麦，点停止整段去 ASR，见 behavior.silenceStop）。
 */

/** 录音最长时长（毫秒）。 */
export const MAX_RECORD_MS = 120_000

/** 云端转写请求超时（毫秒）：上游不可达/卡住时不把 UI 永远钉在「识别中」。 */
const TRANSCRIBE_TIMEOUT_MS = 60_000

/** 云端 ASR 是否已配置（baseUrl + apiKey 均非空）。 */
export function isCloudConfigured(cfg: { baseUrl: string; apiKey: string }): boolean {
  return cfg.baseUrl.trim() !== '' && cfg.apiKey.trim() !== ''
}

/** 静音判定阈值（RMS，0~1）。 */
const SILENCE_RMS = 0.02

/** 静音持续多久自动停止（毫秒）。 */
const SILENCE_MS = 2500

/** 录音状态。 */
export type RecordState = 'recording' | 'transcribing'

/** 浏览器语音识别的最小接口面（webkitSpeechRecognition）。 */
interface SpeechRecognitionLike {
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
}

/** 语言参数：auto → 返回 undefined（交给浏览器/服务端默认）。 */
function resolveLang(language: string): string | undefined {
  if (!language || language === 'auto') return undefined
  return language
}

/** 浏览器引擎：Web Speech API。 */
function createBrowserRecorder(language: string, onError: (msg: string) => void): VoiceRecorder {
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
  let endResolve: ((text: string) => void) | null = null
  let maxTimer: ReturnType<typeof setTimeout> | null = null
  let levelRaf = 0
  let simLevel = 0.05
  let levelPhase = Math.random() * Math.PI * 2

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recorder: VoiceRecorder = { onInterim: null, onState: null, onLevel: null } as any

  /** 浏览器引擎无音频流，用平滑的模拟能量驱动频谱（装饰性，视觉近似语音起伏）。 */
  const startLevelSim = (): void => {
    const loop = (): void => {
      if (stopped) { levelRaf = 0; return }
      levelPhase += 0.16 + Math.random() * 0.12
      const base = 0.24 + 0.16 * Math.sin(levelPhase)
      const burst = Math.random() < 0.07 ? Math.random() * 0.45 : 0
      const next = Math.min(1, Math.max(0.02, base + burst + Math.random() * 0.12))
      simLevel += (next - simLevel) * 0.32
      recorder.onLevel?.(simLevel)
      levelRaf = requestAnimationFrame(loop)
    }
    levelRaf = requestAnimationFrame(loop)
  }
  const stopLevelSim = (): void => {
    if (levelRaf) cancelAnimationFrame(levelRaf)
    levelRaf = 0
  }

  const emitInterim = (): void => {
    const text = `${finalText}${finalText && interim ? ' ' : ''}${interim}`.trim()
    recorder.onInterim?.(text)
  }

  const settle = (): void => {
    if (stopped) return
    stopped = true
    stopLevelSim()
    if (maxTimer) clearTimeout(maxTimer)
    if (endResolve) {
      endResolve(finalText.trim())
      endResolve = null
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
    maxTimer = setTimeout(() => { try { recognition.stop() } catch { /* noop */ } }, MAX_RECORD_MS)
    try {
      recognition.start()
    } catch {
      // already started
    }
  }

  recorder.stop = () => {
    if (stopped) {
      return Promise.resolve(finalText.trim())
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
    try {
      recognition.abort()
    } catch {
      /* noop */
    }
    settle()
  }

  return recorder
}

/** 云端引擎：MediaRecorder 采集 → host 代理转写。 */
function createCloudRecorder(language: string, onError: (msg: string) => void, silenceStop: boolean): VoiceRecorder {
  const recorder: VoiceRecorder = { onInterim: null, onState: null, onLevel: null, start: () => {}, stop: () => Promise.resolve(''), abort: () => {} }
  let stream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let maxTimer: ReturnType<typeof setTimeout> | null = null
  let stopPromise: Promise<string> | null = null
  let active = false

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

  /**
   * 实时音量电平（驱动频谱条）。始终启用（能直观看出麦克风是否采到声）；
   * 仅当 silenceStop 开启时附带静音自动停止逻辑。同时记录峰值电平，
   * 供 onstop 的「静音守卫」判断整段录音是否静音（采到静音就别发 ASR）。
   */
  let peakLevel = 0
  let levelMeterActive = false
  const startLevelMeter = (withSilenceStop: boolean): void => {
    try {
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream!)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      let silentSince: number | null = null
      levelMeterActive = true
      const loop = (): void => {
        if (!active) { void audioCtx.close().catch(() => {}) ; return }
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i]! - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        if (rms > peakLevel) peakLevel = rms
        // 实时音量（0~1，放大到可视范围）
        recorder.onLevel?.(Math.min(1, rms * 4))
        if (withSilenceStop) {
          if (rms < SILENCE_RMS) {
            if (silentSince === null) silentSince = performance.now()
            else if (performance.now() - silentSince > SILENCE_MS) {
              void recorder.stop().catch(() => {})
              return
            }
          } else {
            silentSince = null
          }
        }
        requestAnimationFrame(loop)
      }
      requestAnimationFrame(loop)
    } catch {
      // 音频分析不可用：频谱静默（静音守卫随之失效，录音仍正常）
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
        const type = mediaRecorder?.mimeType?.split(';')[0]?.trim() || 'audio/webm'
        const blob = new Blob(chunks, { type })
        recorder.onState?.('transcribing')
        try {
          // 静音守卫：电平表可用且整段峰值趋近零 → 麦克风没采到声，
          // 不浪费一次上游 ASR（避免对静音幻觉出 "yeah"/"no text"），直接报错带设备名。
          if (levelMeterActive && peakLevel < 0.01) {
            active = false
            for (const t of stream!.getTracks()) t.stop()
            const label = currentInputLabel()
            reject(new Error(label === '' ? 'no-sound' : `no-sound:${label}`))
            return
          }
          // MiMo/Qwen-ASR 等 chat 通道只收 wav/mp3，whisper 式也兼容 wav →
          // 统一把浏览器录音（webm/m4a/ogg）解码重编码成 16kHz 单声道 WAV 再上传。
          let audio = blob
          try {
            audio = await blobToWav16k(blob)
          } catch {
            // 解码失败：退回原始 blob，让上游报错（避免转换本身卡死录音）。
          }
          const text = await transcribeViaHost(audio, language)
          // 异常短结果（疑似静音/听错）：把转换前的原始录音也抓一份到 host，
          // 与转换后的 WAV（host 侧 ≤8 字规则已存）对比定位是采集还是转码问题。
          if (text.trim().length <= 8 && blob.size > 0) {
            void fetch('/api/asr-voice/transcribe?capture=1', {
              method: 'POST',
              headers: { 'content-type': blob.type || 'audio/webm' },
              body: blob,
            }).catch(() => {})
          }
          active = false
          for (const t of stream!.getTracks()) t.stop()
          resolve(text)
        } catch (error) {
          active = false
          for (const t of stream!.getTracks()) t.stop()
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
      mediaRecorder!.onerror = () => {
        active = false
        reject(new Error('recorder-error'))
      }
    })
    mediaRecorder.start(250)
    recorder.onState?.('recording')
    // 电平表始终启用（频谱反馈 + 可选静音自动停止）。
    startLevelMeter(silenceStop)
    maxTimer = setTimeout(() => { void recorder.stop().catch(() => {}) }, MAX_RECORD_MS)
  }

  recorder.stop = () => {
    if (!active || !mediaRecorder || !stopPromise) return Promise.resolve('')
    active = false
    if (maxTimer) clearTimeout(maxTimer)
    if (mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop() } catch { /* noop */ }
    }
    return stopPromise
  }

  recorder.abort = () => {
    active = false
    if (maxTimer) clearTimeout(maxTimer)
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop() } catch { /* noop */ }
    }
    if (stream) for (const t of stream.getTracks()) t.stop()
    stopPromise = null
  }

  return recorder
}

/**
 * 把浏览器录音 blob（webm/m4a/ogg…）解码重编码成 16kHz 单声道 16-bit PCM WAV。
 * MiMo-V2.5-ASR 只接受 wav/mp3（实测 webm/m4a 报 Param Incorrect）；whisper 式
 * 通道也兼容 wav，故统一走 WAV。纯浏览器 Web Audio API，无外部依赖。
 */
async function blobToWav16k(blob: Blob): Promise<Blob> {
  const windowLike = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext
  if (!AudioCtor) throw new Error('audio decode unavailable')
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new AudioCtor()
  try {
    const audio = await ctx.decodeAudioData(arrayBuffer)
    const channels = audio.numberOfChannels
    const srcLen = audio.length
    // 多声道混成单声道
    const mono = new Float32Array(srcLen)
    for (let ch = 0; ch < channels; ch++) {
      const data = audio.getChannelData(ch)
      for (let i = 0; i < srcLen; i++) mono[i] = (mono[i] ?? 0) + data[i]! / channels
    }
    // 线性插值重采样到 16kHz
    const targetRate = 16000
    const sourceRate = audio.sampleRate
    const outLen = Math.max(1, Math.round(srcLen * targetRate / sourceRate))
    const out = new Float32Array(outLen)
    const ratio = sourceRate / targetRate
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio
      const i0 = Math.floor(pos)
      const i1 = Math.min(i0 + 1, srcLen - 1)
      const frac = pos - i0
      out[i] = mono[i0]! * (1 - frac) + mono[i1]! * frac
    }
    // 峰值归一化：麦克风录音幅度普遍偏低，先放大到接近满幅再写 WAV，
    // 避免上游把轻声/远距离录音当作噪音忽略（增益上限 4x，防噪声底被过度放大）。
    let peak = 0
    for (let i = 0; i < outLen; i++) {
      const a = Math.abs(out[i]!)
      if (a > peak) peak = a
    }
    const gain = peak > 0.0001 ? Math.min(4, 0.9 / peak) : 1
    if (gain !== 1) {
      for (let i = 0; i < outLen; i++) out[i] = out[i]! * gain
    }
    // 16-bit PCM WAV
    const dataLen = outLen * 2
    const wav = new ArrayBuffer(44 + dataLen)
    const view = new DataView(wav)
    const writeStr = (off: number, s: string): void => {
      for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
    }
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); writeStr(8, 'WAVE')
    writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, targetRate, true)
    view.setUint32(28, targetRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeStr(36, 'data'); view.setUint32(40, dataLen, true)
    for (let i = 0; i < outLen; i++) {
      const s = Math.max(-1, Math.min(1, out[i]!))
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
    return new Blob([wav], { type: 'audio/wav' })
  } finally {
    void ctx.close().catch(() => {})
  }
}

/** 上传音频到 host 转写代理（带超时，防上游卡死钉住 UI）。 */
async function transcribeViaHost(blob: Blob, language: string): Promise<string> {
  const lang = resolveLang(language)
  const query = lang ? `?language=${encodeURIComponent(lang)}` : ''
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS)
  try {
    const res = await fetch(`/api/asr-voice/transcribe${query}`, {
      method: 'POST',
      headers: { 'content-type': blob.type || 'audio/webm' },
      body: blob,
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; text?: string; reason?: string }
    if (!res.ok || data.ok !== true || typeof data.text !== 'string') {
      throw new Error(data.reason || 'transcribe failed')
    }
    return data.text
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('transcribe timeout')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 创建统一录音控制器。
 * @param engine - browser | cloud。
 * @param language - auto / zh-CN / en-US 等。
 * @param onError - 错误回调（错误码字符串）。
 * @param silenceStop - 云端引擎是否启用静音自动停止（默认关 = 手动关麦）。
 */
export function createVoiceRecorder(
  engine: 'browser' | 'cloud',
  language: string,
  onError: (code: string) => void,
  silenceStop = false,
): VoiceRecorder {
  if (engine === 'cloud') return createCloudRecorder(language, onError, silenceStop)
  return createBrowserRecorder(language, onError)
}
