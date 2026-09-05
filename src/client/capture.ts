/** dsh-asr-voice — 麦克风 → 16 kHz 单声道 PCM 帧（AudioWorklet，port 回调驱动）。
 * 实时链路的采集底座，本地 VAD 引擎与后续 host 上行通道（I3/I4）共用它。分帧必须由
 * worklet port 回调驱动，**不能用 `setInterval` 排片**：后台标签页定时器被节流到 1/s
 * 会直接饿死上行。
 * 与整段模式相反，这里必须显式请求回声消除：播报期间我们自己的 TTS 会被同一支麦克风
 * 收回来，`{ echoCancellation: true }` 是唯一能白拿的抵消手段（`recorder.ts:59-62` 那组
 * 「故意不设」是另一条路径的教训——显式 `false` 在部分 macOS 设备上会得到纯静音）。
 */
import { PCM_SAMPLE_RATE, peakAbs, resampleLinear } from './pcm.ts'

/** 采集失败码（由 UI 映射成文案）。 */
export type CaptureFailure = 'no-mic' | 'no-audio-context' | 'no-worklet' | 'silent-device'

/** 设备链路失效判据：探测期内峰值连噪声底都没到，说明轨道根本没在产出数据 （协商失败时浏览器给的是数字零，而不是环境噪声）。阈值刻意远低于 `SILENCE_PEAK_FLOOR`：那是「用户没说话」的量级，这里是「没有声音」。 */
const DEAD_DEVICE_PEAK = 0.0005

/** 判死前的观察窗口（毫秒）：安静房间里前几秒没有峰值是常态，别急着报错。 */
const DEAD_DEVICE_PROBE_MS = 4_000

/** worklet 处理器名。 */
const WORKLET_NAME = 'dshav-pcm-slicer'

/** worklet 源码按行拼接：直接写一大段 JS 字面量会撞上本仓已知的输出静默截断坑。 改动这里必须回读 `lib/client.js` 确认落盘。 */
const WORKLET_LINES = [
  'class DshavPcmSlicer extends AudioWorkletProcessor {',
  '  constructor(options) {',
  '    super()',
  '    const frameMs = (options && options.processorOptions && options.processorOptions.frameMs) || 40',
  '    this.n = Math.max(1, Math.round(sampleRate * frameMs / 1000))',
  '    this.buf = new Float32Array(this.n)',
  '    this.len = 0',
  '  }',
  '  process(inputs) {',
  '    const ch = inputs[0] ? inputs[0][0] : null',
  '    if (ch) {',
  '      for (let i = 0; i < ch.length; i++) {',
  '        this.buf[this.len++] = ch[i]',
  '        if (this.len >= this.n) {',
  '          const out = this.buf.slice(0)',
  '          this.port.postMessage(out, [out.buffer])',
  '          this.len = 0',
  '        }',
  '      }',
  '    }',
  '    return true',
  '  }',
  '}',
  `registerProcessor('${WORKLET_NAME}', DshavPcmSlicer)`,
]

/** 一次采集会话。 */
export interface PcmCapture {
  /** 停轨 + 断图 + 撤销模块 URL（幂等）。 */
  stop(): void
/** 半双工门控：关轨道而不是丢帧——轨道 enabled=false 让设备真正停止产出， 播报期间既省电平表也少一份回声输入。 */
  setMuted(muted: boolean): void
}

/** 采集参数。 */
export interface PcmCaptureOptions {
  /** 每帧时长（毫秒）。 */
  frameMs: number
  /** 一帧 16k 单声道采样（已按需重采样）。 */
  onFrame(pcm: Float32Array): void
  /** 链路失败：调用后本会话已结束，不会再有 onFrame。 */
  onFail(code: CaptureFailure): void
}

/** 采集用 AudioContext：懒创建并跨会话复用（新建上下文的开销和数量上限都不划算）。 */
let captureCtx: AudioContext | null = null

function getCaptureCtx(): AudioContext | null {
  if (captureCtx !== null) return captureCtx
  const windowLike = window as unknown as {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }
  const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext
  if (!AudioCtor) return null
  captureCtx = new AudioCtor({ latencyHint: 'interactive' })
  return captureCtx
}

/** 是否具备 PCM 采集的基本条件（精确的 worklet 缺失只能在运行时报 `no-worklet`）。 */
export function isPcmCaptureSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false
  const windowLike = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown }
  return Boolean(windowLike.AudioContext ?? windowLike.webkitAudioContext)
}

/** 实时采集需要的约束：显式请求 AEC，其余交给浏览器默认。 */
function micConstraints(): MediaStreamConstraints {
  return {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: false,
  }
}

const NOOP_CAPTURE: PcmCapture = { stop: () => {}, setMuted: () => {} }

/** 打开麦克风并按 `frameMs` 产出 16k 帧。
 * 不 reject：所有失败都以 `onFail(code)` 送达并返回一个空操作会话，调用方只有一条
 * 错误出口。前若干语句是同步的——Safari 只在用户激活上下文里允许建立音频会话，
 * 所以调用方必须在点击回调里同步调它。
 */
export async function startPcmCapture(options: PcmCaptureOptions): Promise<PcmCapture> {
  const ctx = getCaptureCtx()
  if (ctx === null) {
    options.onFail('no-audio-context')
    return NOOP_CAPTURE
  }
  void ctx.resume().catch(() => {})

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia(micConstraints())
  } catch {
    options.onFail('no-mic')
    return NOOP_CAPTURE
  }

  if (typeof ctx.audioWorklet?.addModule !== 'function') {
    stream.getTracks().forEach((t) => t.stop())
    options.onFail('no-worklet')
    return NOOP_CAPTURE
  }

  const blobUrl = URL.createObjectURL(new Blob([WORKLET_LINES.join('\n')], { type: 'application/javascript' }))
  let node: AudioWorkletNode | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let mutedSink: GainNode | null = null
  let stopped = false
  let probeTimer: ReturnType<typeof setTimeout> | null = null
  /** 重采样只在浏览器没按 16k 交付时才做（Safari 会忽略请求的采样率）。 */
  const sourceRate = ctx.sampleRate
  let probePeak = 0
  let probeDone = false
  /** 半双工静音态：探针窗口内 setMuted(true) 会让轨道产出全零帧，探针会
   *  误判成「设备静音」把好端端的会话杀掉（4s 探针期内用户说完一句即 pause
   *  的短句对话必然命中）。静音期既不累积峰值，也把探针视为完成——静音守卫
   *  （isSilentPeak）在段级继续兜底真实无声，这里只负责「链路是否产出过数据」。 */
  let muted = false

  const teardown = (): void => {
    if (stopped) return
    stopped = true
    if (probeTimer !== null) clearTimeout(probeTimer)
    probeTimer = null
    if (node) node.port.onmessage = null
    try { node?.disconnect() } catch { /* noop */ }
    try { mutedSink?.disconnect() } catch { /* noop */ }
    try { source?.disconnect() } catch { /* noop */ }
    node = null
    source = null
    mutedSink = null
    stream.getTracks().forEach((t) => t.stop())
    URL.revokeObjectURL(blobUrl)
  }

  function onMessage(event: MessageEvent<Float32Array>): void {
    if (stopped) return
    const raw = event.data
    const pcm = sourceRate === PCM_SAMPLE_RATE ? raw : resampleLinear(raw, sourceRate, PCM_SAMPLE_RATE)
    if (!probeDone && !muted) {
      probePeak = Math.max(probePeak, peakAbs(pcm))
    }
    options.onFrame(pcm)
  }

  try {
    await ctx.audioWorklet.addModule(blobUrl)
    node = new AudioWorkletNode(ctx, WORKLET_NAME, {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      channelCountMode: 'explicit',
      channelInterpretation: 'discrete',
      processorOptions: { frameMs: options.frameMs },
    })
    source = ctx.createMediaStreamSource(stream)
    // worklet 必须有一条通向 destination 的路才会被拉起来；这条路上的增益为 0，
    // 绝不能再把麦克风原声还给扬声器，否则实时模式自激啸叫。
    mutedSink = ctx.createGain()
    mutedSink.gain.value = 0
    source.connect(node)
    node.connect(mutedSink)
    mutedSink.connect(ctx.destination)
    // 必须是 onmessage（或显式 port.start()）：MessagePort 只 addEventListener 不会进入
    // actively receiving 状态，真机实测一帧都不投，整条链路表现为「设备静音」。
    node.port.onmessage = onMessage
  } catch {
    stream.getTracks().forEach((t) => t.stop())
    URL.revokeObjectURL(blobUrl)
    options.onFail('no-worklet')
    return NOOP_CAPTURE
  }

  probeTimer = setTimeout(() => {
    probeDone = true
    // 探针窗口内处于半双工静音：该会话已证明在收音（pause 前有产出），
    // 静音守卫在段级兜底，这里不再判死。
    if (stopped || muted || probePeak >= DEAD_DEVICE_PEAK) return
    teardown()
    options.onFail('silent-device')
  }, DEAD_DEVICE_PROBE_MS)

  return {
    stop(): void {
      teardown()
    },
    setMuted(next: boolean): void {
      muted = next
      stream.getAudioTracks().forEach((t) => { t.enabled = !next })
    },
  }
}
