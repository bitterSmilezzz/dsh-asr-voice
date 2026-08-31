import { test } from 'node:test'
import assert from 'node:assert/strict'

// pcm.ts 是纯函数模块（顶层不碰 DOM），按 config-freeze.test.mjs 的既有做法用
// node 的类型剥离直接跑源码。
const {
  PCM_SAMPLE_RATE, SILENCE_PEAK_FLOOR, isSilentPeak, downmixToMono, resampleLinear,
  peakAbs, normaliseGain, quantiseInt16, encodeWav16MonoPcm, rmsFromByteTimeDomain,
} = await import('../src/client/pcm.ts')

test('downmixToMono 等权平均各声道', () => {
  const mono = downmixToMono([new Float32Array([1, 1]), new Float32Array([-1, -1])], 2)
  assert.deepEqual([...mono], [0, 0])
  const single = downmixToMono([new Float32Array([0.5, -0.25])], 2)
  assert.deepEqual([...single], [0.5, -0.25])
  assert.deepEqual([...downmixToMono([], 3)], [0, 0, 0])
})

test('resampleLinear 按 rate 比值取长度并线性插值', () => {
  // 48k → 16k：长度恰为三分之一，直流信号幅度不变。
  const src = new Float32Array(480).fill(0.5)
  const out = resampleLinear(src, 48_000, PCM_SAMPLE_RATE)
  assert.equal(out.length, 160)
  for (const v of out) assert.ok(Math.abs(v - 0.5) < 1e-6, `expected DC held, got ${v}`)
  // 半程插值：0 → 1 之间的中点取到 0.5。
  const ramp = resampleLinear(new Float32Array([0, 1, 0]), 1, 2)
  assert.equal(ramp[0], 0)
  assert.ok(Math.abs((ramp[1] ?? 0) - 0.5) < 1e-6)
})

test('resampleLinear 不把空输入缩成零长（上游拒绝空 WAV）', () => {
  assert.equal(resampleLinear(new Float32Array(0), 48_000, PCM_SAMPLE_RATE).length, 1)
})

test('peakAbs 取绝对值峰值', () => {
  assert.equal(peakAbs(new Float32Array([0.5, -0.75, 0.25])), 0.75)
  assert.equal(peakAbs(new Float32Array(0)), 0)
})

test('normaliseGain 放大安静录音，但封顶 4x 且无信号时不放大', () => {
  assert.equal(normaliseGain(0.05), 4) // 0.9/0.05 = 18 → 封顶
  assert.equal(normaliseGain(0.9), 1)
  assert.ok(Math.abs(normaliseGain(0.45) - 2) < 1e-9)
  assert.equal(normaliseGain(0), 1)
  assert.equal(normaliseGain(0.00005), 1) // 视为无信号：不放大噪声底
})

test('quantiseInt16 限幅且保留 int16 正负不对称', () => {
  assert.equal(quantiseInt16(1, 1), 32767)
  assert.equal(quantiseInt16(-1, 1), -32768)
  assert.equal(quantiseInt16(2, 1), 32767)
  assert.equal(quantiseInt16(-2, 1), -32768)
  assert.equal(quantiseInt16(0, 1), 0)
  assert.equal(quantiseInt16(0.5, 1), 16384)
  assert.equal(quantiseInt16(0.5, 2), 32767)
})

test('encodeWav16MonoPcm 写出规范的 16-bit 单声道头与小端采样', () => {
  const samples = new Float32Array([1, -1, 0.5])
  const bytes = encodeWav16MonoPcm(samples, PCM_SAMPLE_RATE, 1)
  assert.equal(bytes.length, 44 + samples.length * 2)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const str = (off, len) => String.fromCharCode(...bytes.subarray(off, off + len))
  assert.equal(str(0, 4), 'RIFF')
  assert.equal(view.getUint32(4, true), 36 + samples.length * 2)
  assert.equal(str(8, 4), 'WAVE')
  assert.equal(str(12, 4), 'fmt ')
  assert.equal(view.getUint32(16, true), 16)
  assert.equal(view.getUint16(20, true), 1) // PCM
  assert.equal(view.getUint16(22, true), 1) // mono
  assert.equal(view.getUint32(24, true), PCM_SAMPLE_RATE)
  assert.equal(view.getUint32(28, true), PCM_SAMPLE_RATE * 2)
  assert.equal(view.getUint16(32, true), 2) // block align
  assert.equal(view.getUint16(34, true), 16) // bits
  assert.equal(str(36, 4), 'data')
  assert.equal(view.getUint32(40, true), samples.length * 2)
  assert.equal(view.getInt16(44, true), 32767)
  assert.equal(view.getInt16(46, true), -32768)
  assert.equal(view.getInt16(48, true), 16384)
})

test('rmsFromByteTimeDomain 以 128 为零位', () => {
  assert.equal(rmsFromByteTimeDomain(new Uint8Array(1024).fill(128)), 0)
  assert.ok(Math.abs(rmsFromByteTimeDomain(new Uint8Array(4).fill(0)) - 1) < 1e-9)
  assert.ok(Math.abs(rmsFromByteTimeDomain(new Uint8Array(4).fill(255)) - 127 / 128) < 1e-9)
  assert.equal(rmsFromByteTimeDomain(new Uint8Array(0)), 0)
})

test('静音守卫用归一化前的峰值，且 NaN 不误判为静音', () => {
  assert.equal(isSilentPeak(0), true)
  assert.equal(isSilentPeak(SILENCE_PEAK_FLOOR - 1e-9), true)
  assert.equal(isSilentPeak(SILENCE_PEAK_FLOOR), false)
  assert.equal(isSilentPeak(0.4), false)
  assert.equal(isSilentPeak(Number.NaN), false)
  assert.equal(isSilentPeak(-1), false)
})

test('整条重采样链在 4x 增益下不越界', () => {
  const src = new Float32Array(4800)
  for (let i = 0; i < src.length; i++) src[i] = 0.1 * Math.sin((2 * Math.PI * 440 * i) / 48_000)
  const mono = downmixToMono([src, src], src.length)
  const out = resampleLinear(mono, 48_000, PCM_SAMPLE_RATE)
  assert.equal(out.length, 1600)
  const gain = normaliseGain(peakAbs(out))
  assert.equal(gain, 4)
  const bytes = encodeWav16MonoPcm(out, PCM_SAMPLE_RATE, gain)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  for (let i = 44; i < bytes.length; i += 2) {
    const v = view.getInt16(i, true)
    assert.ok(v >= -32768 && v <= 32767, `sample out of int16 range: ${v}`)
  }
})
