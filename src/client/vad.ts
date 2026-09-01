/**
 * dsh-asr-voice — 本地能量 VAD（纯函数，模块顶层不碰 DOM，可被 node --test 直接跑源码）。
 *
 * 近实时引擎用它把连续麦克风切成一句一句，每句走已有的整段转写通道：不需要新协议，
 * 也不需要任何云商 key。判据只有 RMS，因此阈值是**设备噪声底**的函数——调高会切掉
 * 轻声句尾，调低会把呼吸和键盘当成话；两者都是可预期的失效，不是 bug。
 *
 * 段边界规则：有声窗开启一段并带上 `prerollMs` 的段前缓冲（否则第一个音节必被切掉），
 * 连续静音 `silenceMs` 关闭一段，实际语音时长不足 `minSpeechMs` 的段直接丢弃（杂音不
 * 该花一次上游配额），说到 `maxSegmentMs` 还没停则强制轮换——它同时是单次上传体大小
 * 的上限。段内保留收尾静音：那段静音正是「这句说完了」的证据，省它省不出正确性。
 */
import { rmsOfFloat } from './pcm.ts'

/** VAD 参数（来自 settings 的 realtime.vad.*，见 `config.ts`）。 */
export interface VadTuning {
  /** RMS 判有声的阈值（0~1），也是 rmsAuto 关闭时的唯一判据。 */
  rms: number
  /** 开启后阈值 = max(rms, 自适应噪声底 × 裕量)，换设备免重校。 */
  rmsAuto?: boolean
  /** 连续静音多久切一段（毫秒）。 */
  silenceMs: number
  /** 段前保留多久的音频（毫秒）。 */
  prerollMs: number
  /** 实际语音短于此不成为一段（毫秒）。 */
  minSpeechMs: number
  /** 单段语音长度上限（毫秒）。 */
  maxSegmentMs: number
}

/** 自适应噪声底来源（`rms-floor.ts`）：VAD 用它把阈值变成设备噪声底的函数。 */
export interface RmsFloorSource {
  /** 投喂一窗 RMS 与 VAD 当前是否判着有声；语音期帧不更新底噪。 */
  observe(rms: number, speechActive: boolean): void
  /** 当前建议阈值（未学到时 0 = 回退 tuning.rms）。 */
  readonly threshold: number
}

/** VAD 事件。 */
export interface VadEvents {
  /** 一段完整语音（16k Float32，含段前缓冲）。 */
  onSegment(pcm: Float32Array): void
  /** 有声/无声边界，供 UI 表示「正在听你说」。 */
  onSpeech(active: boolean): void
}

/** 帧驱动的状态机。 */
export interface EnergyVad {
  /** 投喂采集帧（任意长度，内部按分析窗切分）。 */
  feed(chunk: Float32Array): void
  /** 立即结束当前段并交出（pause/stop/上限时调用）。 */
  flush(): void
  /** 清空一切声学状态（不交出内容）。 */
  reset(): void
  readonly inSpeech: boolean
}

/**
 * 分析窗长（毫秒）。固定不开放：窗长是判定的时间分辨率而不是偏好，放到设置里
 * 就允许出现 `silenceMs < frameMs` 这类自相矛盾的组合。
 */
const WINDOW_MS = 20

/** 把若干窗拼成一段连续采样。 */
function concatWindows(windows: Float32Array[]): Float32Array {
  let n = 0
  for (const w of windows) n += w.length
  const out = new Float32Array(n)
  let off = 0
  for (const w of windows) {
    out.set(w, off)
    off += w.length
  }
  return out
}

/**
 * 构造一个能量 VAD。`sampleRate` 必须是投喂帧的采样率（本项目为 PCM_SAMPLE_RATE）。
 * `floor` 可选：`tuning.rmsAuto` 时 VAD 每窗把 RMS 与语音期判定反馈给它，并用
 * `floor.threshold`（未学到时为 0）抬高/放低实际判据。
 */
export function createEnergyVad(sampleRate: number, tuning: VadTuning, events: VadEvents, floor?: RmsFloorSource | null): EnergyVad {
  const windowSamples = Math.max(1, Math.round((sampleRate * WINDOW_MS) / 1000))
  const prerollWindows = Math.max(0, Math.round(tuning.prerollMs / WINDOW_MS))
  const silenceWindows = Math.max(1, Math.round(tuning.silenceMs / WINDOW_MS))
  const minSpeechWindows = Math.max(1, Math.round(tuning.minSpeechMs / WINDOW_MS))
  const maxSegmentWindows = Math.max(minSpeechWindows + 1, Math.round(tuning.maxSegmentMs / WINDOW_MS))

  const win = new Float32Array(windowSamples)
  let winLen = 0
  let preroll: Float32Array[] = []
  let segment: Float32Array[] = []
  /** 当前段内**有声**窗数：静音不计，所以它衡量的是「真说了多久」。 */
  let speechWindows = 0
  let silenceRun = 0
  let speaking = false

  const emitSegment = (): void => {
    const windows = segment
    const spoken = speechWindows
    segment = []
    speechWindows = 0
    if (windows.length === 0 || spoken < minSpeechWindows) return
    events.onSegment(concatWindows(windows))
  }

  const handleWindow = (w: Float32Array): void => {
    const rms = rmsOfFloat(w)
    const auto = tuning.rmsAuto === true && floor !== undefined && floor !== null
    floor?.observe(rms, speaking)
    // 学习期纪律：floor 未就绪（threshold === 0）时阈值回退用户基线，而噪声底高于
    // 基线时学习窗本身会被判成语音 → 估计器永远学不到、段被整体吃掉。所以在
    // threshold 就绪之前 VAD 只积累段前缓冲、不开段不说话（约一个观测窗长，默
    // 认 2s），学满后自动恢复正式判定。
    const learning = auto && floor?.threshold === 0
    if (learning) {
      preroll.push(w)
      if (preroll.length > prerollWindows) preroll.shift()
      return
    }
    const effectiveRms = auto ? Math.max(tuning.rms, floor!.threshold) : tuning.rms
    const voiced = rms > effectiveRms
    if (!speaking) {
      if (!voiced) {
        preroll.push(w)
        if (preroll.length > prerollWindows) preroll.shift()
        return
      }
      speaking = true
      silenceRun = 0
      speechWindows = 1
      segment = [...preroll, w]
      preroll = []
      events.onSpeech(true)
      return
    }
    segment.push(w)
    if (voiced) {
      speechWindows += 1
      silenceRun = 0
    } else {
      silenceRun += 1
    }
    if (silenceRun >= silenceWindows) {
      speaking = false
      emitSegment()
      events.onSpeech(false)
      return
    }
    if (speechWindows >= maxSegmentWindows) emitSegment()
  }

  /** 把攒着的半窗当一窗处理掉：那通常是用户刚说完的最后几十毫秒。 */
  const drainPartial = (): void => {
    if (winLen === 0) return
    const tail = win.slice(0, winLen)
    winLen = 0
    handleWindow(tail)
  }

  return {
    feed(chunk: Float32Array): void {
      for (let i = 0; i < chunk.length; i++) {
        win[winLen++] = chunk[i] ?? 0
        if (winLen < windowSamples) continue
        winLen = 0
        handleWindow(win.slice(0))
      }
    },
    flush(): void {
      drainPartial()
      if (!speaking) return
      speaking = false
      silenceRun = 0
      emitSegment()
      events.onSpeech(false)
    },
    reset(): void {
      const wasSpeaking = speaking
      winLen = 0
      preroll = []
      segment = []
      speechWindows = 0
      silenceRun = 0
      speaking = false
      if (wasSpeaking) events.onSpeech(false)
    },
    get inSpeech(): boolean {
      return speaking
    },
  }
}
