/** dsh-asr-voice — PCM 数学（纯函数，模块顶层不碰 DOM，可被 node --test 直接跑源码）。
 * 整段转写路径（`recorder.ts` 的 blobToWav16k）与实时上行路径共用这一套下混 /
 * 重采样 / 峰值 / 归一 / 量化实现：静音守卫的判据必须只有一份真相，否则两条路径
 * 会在「设备到底有没有采到声」上给出不一致的结论。
 */

/** 上行统一采样率：ASR 上游通用要求 16 kHz 单声道。 */
export const PCM_SAMPLE_RATE = 16_000

/** 归一化目标幅度（0.9 ≈ 接近满幅但不触顶）。 */
const NORMALISE_TARGET = 0.9

/** 归一化增益上限：防噪声底被过度放大。 */
const NORMALISE_MAX_GAIN = 4

/** 峰值低于此值视为无信号，不做归一（避免把纯噪声放大 4 倍）。 */
const NORMALISE_MIN_PEAK = 0.0001

/** 静音守卫阈值：归一化前的真实峰值低于此值 → 认定确实没录到声。 */
export const SILENCE_PEAK_FLOOR = 0.005

/** 静音守卫（ground truth）：转换后 PCM 的真实峰值趋零，说明采集链路没拿到声音， 不该发上游（上游会对静音幻觉出 "yeah" / "no text"）。 */
export function isSilentPeak(peak: number): boolean {
  return peak >= 0 && peak < SILENCE_PEAK_FLOOR
}

/** 多声道等权下混为单声道。 */
export function downmixToMono(channels: readonly Float32Array[], length: number): Float32Array {
  const mono = new Float32Array(length)
  if (channels.length === 0) return mono
  for (const data of channels) {
    for (let i = 0; i < length; i++) mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / channels.length
  }
  return mono
}

/** 线性插值重采样到 targetRate（调用方永不假定源采样率，浏览器可能忽略请求的 sampleRate）。 */
export function resampleLinear(src: Float32Array, sourceRate: number, targetRate: number): Float32Array {
  const srcLen = src.length
  const outLen = Math.max(1, Math.round(srcLen * targetRate / sourceRate))
  const out = new Float32Array(outLen)
  const ratio = sourceRate / targetRate
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, srcLen - 1)
    const frac = pos - i0
    out[i] = (src[i0] ?? 0) * (1 - frac) + (src[i1] ?? 0) * frac
  }
  return out
}

/** 绝对值峰值（归一化与静音守卫的共同输入）。 */
export function peakAbs(src: Float32Array): number {
  let peak = 0
  for (let i = 0; i < src.length; i++) {
    const a = Math.abs(src[i] ?? 0)
    if (a > peak) peak = a
  }
  return peak
}

/** 峰值归一化增益：把偏轻的麦克风录音放大到接近满幅，受 NORMALISE_MAX_GAIN 约束。 */
export function normaliseGain(peak: number): number {
  return peak > NORMALISE_MIN_PEAK ? Math.min(NORMALISE_MAX_GAIN, NORMALISE_TARGET / peak) : 1
}

/** 一个 Float32 采样 → 限幅后的 16-bit 有符号整数（gain 在此一并应用）。
 * 两条路径共用同一量化，正负半轴不对称是 int16 本身的取值范围决定
 * （负端多一个 -32768）。
 * 必须四舍五入：向零截断会让所有非零采样一律靠近零，对本插件专门放大的安静录音
 * 是系统性衰减。
 */
export function quantiseInt16(sample: number, gain: number): number {
  const s = Math.max(-1, Math.min(1, sample * gain))
  return s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff)
}

/** Float32 采样 → 完整 16-bit 单声道 WAV 字节（44 字节头 + data）。 增益在写采样时一并应用：长录音 outLen 可达数十万采样，多一遍独立增益遍历 是解码之后真实可感的 CPU 开销。 */
export function encodeWav16MonoPcm(samples: Float32Array, sampleRate: number, gain: number): Uint8Array<ArrayBuffer> {
  const dataLen = samples.length * 2
  const buf = new ArrayBuffer(44 + dataLen)
  const view = new DataView(buf)
  const writeStr = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF'); view.setUint32(4, 36 + dataLen, true); writeStr(8, 'WAVE')
  writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data'); view.setUint32(40, dataLen, true)
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, quantiseInt16(samples[i] ?? 0, gain), true)
  }
  return new Uint8Array(buf)
}

/** `AnalyserNode.getByteTimeDomainData` 缓冲的 RMS（0~1，无符号 8-bit 以 128 为零位）。 实时电平表与静音自动停止共用。 */
export function rmsFromByteTimeDomain(bytes: Uint8Array): number {
  if (bytes.length === 0) return 0
  let sum = 0
  for (let i = 0; i < bytes.length; i++) {
    const v = ((bytes[i] ?? 128) - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / bytes.length)
}

/** Float32 采样的 RMS（0~1）。本地 VAD 判的是 AudioWorklet 直出的采样，不是 AnalyserNode 的 8-bit 缓冲——两者的判据不能互抄，否则同一个阈值在电平表和 切段器上会给出不同的「有没有在说话」。 */
export function rmsOfFloat(src: Float32Array): number {
  if (src.length === 0) return 0
  let sum = 0
  for (let i = 0; i < src.length; i++) {
    const v = src[i] ?? 0
    sum += v * v
  }
  return Math.sqrt(sum / src.length)
}
