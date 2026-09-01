import { test } from 'node:test'
import assert from 'node:assert/strict'
// 纯逻辑模块：顶层只有常量与函数，node 的 TS 剥离可直接跑源码。
import { createRmsFloorEstimator, DEFAULT_RMS_FLOOR_TUNING, createBargeInGate, DEFAULT_BARGE_IN_TUNING } from '../src/client/rms-floor.ts'
import { createEnergyVad } from '../src/client/vad.ts'
import { rmsOfFloat } from '../src/client/pcm.ts'

const FRAME = 40 // ms

/** 造一帧 RMS 恰为给定值的 Float32Array（方波：峰值 = RMS = 给定值）。 */
function frameOf(rms, sampleRate = 16_000) {
  const n = Math.round((sampleRate * FRAME) / 1000)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = i < n / 2 ? rms : -rms
  return out
}

test('frameOf 的 RMS 约定自洽（方波 RMS = 峰值）', () => {
  assert.ok(Math.abs(rmsOfFloat(frameOf(0.05)) - 0.05) < 0.001)
})

test('rms-floor: 缓冲未满时 threshold 为 0（调用方回退用户基线）', () => {
  const f = createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: FRAME })
  assert.equal(f.threshold, 0)
  assert.equal(f.floor, 0)
  for (let i = 0; i < 10; i++) f.observe(0.01, false)
  assert.equal(f.threshold, 0, '未满窗不得给出阈值')
  assert.ok(f.floor > 0, 'floor 本身可以有观测')
})

test('rms-floor: 满窗后 threshold = floor × margin，尖峰拉不动中位数', () => {
  const f = createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: FRAME })
  const windows = Math.round(DEFAULT_RMS_FLOOR_TUNING.windowMs / FRAME)
  for (let i = 0; i < windows + 4; i++) {
    // 全程静音期：多数帧 0.008 底噪，每 8 帧一个 0.4 的尖峰（呼吸/键盘）
    f.observe(i % 8 === 0 ? 0.4 : 0.008, false)
  }
  // p30 落在 0.008 附近 → floor ≈ 0.008，threshold ≈ 0.024
  assert.ok(f.floor > 0.005 && f.floor < 0.02, `floor 应约为 0.008，实际 ${f.floor}`)
  assert.ok(f.threshold > 0.02 && f.threshold < 0.04, `threshold 应≈0.024，实际 ${f.threshold}`)
})

test('rms-floor: 语音期帧不进入底噪学习', () => {
  const f = createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: FRAME })
  const windows = Math.round(DEFAULT_RMS_FLOOR_TUNING.windowMs / FRAME)
  // 每 5 帧一个 0.3 的「语音」（标记 speechActive=true）——它们不进缓冲，
  // 剩余帧 0.01 → floor 必须≈0.01 而不是被 0.3 抬高。
  for (let i = 0; i < windows + 4; i++) f.observe(i % 5 === 0 ? 0.3 : 0.01, i % 5 === 0)
  assert.ok(f.floor < 0.02, `语音帧不得污染底噪，实际 floor=${f.floor}`)
})

test('rms-floor: reset 清空一切观测', () => {
  const f = createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: FRAME })
  for (let i = 0; i < 60; i++) f.observe(0.01, false)
  assert.ok(f.threshold > 0)
  f.reset()
  assert.equal(f.threshold, 0)
  assert.equal(f.floor, 0)
})

test('rms-floor: 非正/非有限帧被忽略', () => {
  const f = createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: FRAME })
  f.observe(0, false)
  f.observe(-1, false)
  f.observe(Number.NaN, false)
  f.observe(Number.POSITIVE_INFINITY, false)
  assert.equal(f.floor, 0)
  f.observe(0.02, false)
  assert.equal(f.floor, 0.02)
})

test('barge-in: 未 arm 时永不触发', () => {
  const g = createBargeInGate({ ...DEFAULT_BARGE_IN_TUNING, frameMs: FRAME })
  for (let i = 0; i < 200; i++) assert.equal(g.feed(0.9, false), false)
  assert.equal(g.armed, false)
})

test('barge-in: 宽限期学习回声水平，TTS 回声本身不触发', () => {
  const g = createBargeInGate({ ...DEFAULT_BARGE_IN_TUNING, frameMs: FRAME })
  g.arm()
  const grace = Math.round(DEFAULT_BARGE_IN_TUNING.graceMs / FRAME)
  // 宽限期 + 其后 1.2s：稳定的回声水平 0.05（无 AEC 时 TTS 外放泄漏到麦克风）
  for (let i = 0; i < grace + 30; i++) assert.equal(g.feed(0.05, false), false)
  assert.equal(g.armed, true, '稳定回声不应触发也不应 disarm')
})

test('barge-in: 人声显著超背景并持续 holdMs 触发；瞬态（键盘）不触发', () => {
  const g = createBargeInGate({ ...DEFAULT_BARGE_IN_TUNING, frameMs: FRAME })
  const grace = Math.round(DEFAULT_BARGE_IN_TUNING.graceMs / FRAME)
  const hold = Math.round(DEFAULT_BARGE_IN_TUNING.holdMs / FRAME)
  g.arm()
  for (let i = 0; i < grace; i++) g.feed(0.05, false)
  // 键盘：0.2（≈6dB 超底）只持续 3 帧（120ms）< holdMs(350ms) → 不触发
  for (let i = 0; i < 3; i++) assert.equal(g.feed(0.2, false), false)
  for (let i = 0; i < 30; i++) g.feed(0.05, false)
  // 人声 0.3（≈7.8dB 超底）持续 > holdMs → 恰好一次触发 + 一次性 disarm
  let fired = false
  for (let i = 0; i < hold + 4; i++) {
    if (g.feed(0.3, false)) { fired = true; break }
  }
  assert.equal(fired, true, '持续超出应触发一次')
  assert.equal(g.armed, false, '触发后一次性 disarm')
  // 打断后继续收帧不再触发
  for (let i = 0; i < 100; i++) assert.equal(g.feed(0.9, false), false)
})

test('barge-in 回归: 有声-静音交替不触发——TTS 停顿空隙不得把背景拉低', () => {
  // 真机探针抓出的缺陷：TTS 700ms 有声 + 600ms 静音交替，1.6s 窗口里 p25 被
  // 静音帧（≈0.001）拉低 → 门≈0.003 → TTS 自身音量（0.09）反而「超底」误断。
  // 修复：低于基线（默认 0.02）的静音空隙帧不参与背景学习。
  const g = createBargeInGate({ ...DEFAULT_BARGE_IN_TUNING, frameMs: FRAME, graceMs: 0 })
  g.arm()
  for (let i = 0; i < 200; i++) {
    const voiced = i % 32 < 17 // 40ms 帧：17 帧≈680ms 有声、15 帧≈600ms 静音
    assert.equal(g.feed(voiced ? 0.09 : 0.001, false), false,
      `有声-静音交替不得触发（帧 ${i}）`)
  }
  assert.equal(g.armed, true, '未触发就不该 disarm')
})

test('barge-in 回归: 背景未学到（全静音窗）时不触发', () => {
  const g = createBargeInGate({ ...DEFAULT_BARGE_IN_TUNING, frameMs: FRAME, graceMs: 0 })
  g.arm()
  // 全静音帧（低于基线）→ 窗口永远学不到背景 → 任何音量都不该触发。
  for (let i = 0; i < 30; i++) assert.equal(g.feed(0.0005, false), false)
  for (let i = 0; i < 30; i++) assert.equal(g.feed(0.5, false), false, '背景未学到不得误断')
})

test('rmsAuto VAD: 嘈杂环境自动抬高阈值——低噪声不当话、真大声才成段', () => {
  const segments = []
  const vad = createEnergyVad(16_000, {
    rms: 0.02, rmsAuto: true, silenceMs: 500, prerollMs: 0, minSpeechMs: 100, maxSegmentMs: 8_000,
  }, {
    onSegment: (pcm) => segments.push(Number(rmsOfFloat(pcm).toFixed(3))),
    onSpeech: () => {},
  }, createRmsFloorEstimator({ ...DEFAULT_RMS_FLOOR_TUNING, frameMs: FRAME }))
  const floor = frameOf(0.03)   // 嘈杂底噪
  const weak = frameOf(0.05)    // 弱语音：高于底噪但远低于 floor×3(0.09)，auto 下不算话
  const strong = frameOf(0.2)   // 真大声
  for (let i = 0; i < 50; i++) vad.feed(floor)   // 2s 底噪 → 满窗学习
  for (let i = 0; i < 15; i++) vad.feed(weak)    // 0.6s 弱语音
  for (let i = 0; i < 40; i++) vad.feed(floor)   // 回到底噪
  for (let i = 0; i < 15; i++) vad.feed(strong)  // 0.6s 真大声
  for (let i = 0; i < 20; i++) vad.feed(floor)   // 0.8s 静音
  vad.flush()                                    // 兜底收段
  // 段内保留收尾静音（那段静音正是「这句说完了」的证据），混合后 RMS 约 0.15；
  // 判定核心是「只有这一段，且其主要成分是真大声（>0.1），弱语音与底噪都不成段」。
  assert.equal(segments.length, 1, `只有一段，实际 ${JSON.stringify(segments)}`)
  assert.ok(segments[0] > 0.1, `段的主要成分应是 0.2 的大声，实际 ${segments[0]}`)
})

test('rmsAuto 关闭时与固定阈值行为一致', () => {
  const segmentsA = []
  const segmentsB = []
  const make = (seg) => createEnergyVad(16_000, {
    rms: 0.02, silenceMs: 300, prerollMs: 0, minSpeechMs: 100, maxSegmentMs: 8_000,
  }, {
    onSegment: (pcm) => seg.push(Number(rmsOfFloat(pcm).toFixed(3))),
    onSpeech: () => {},
  }, null)
  const a = make(segmentsA)
  const b = make(segmentsB)
  const quiet = frameOf(0.01)
  const loud = frameOf(0.2)
  const seq = [quiet, loud, quiet, loud, quiet]
  for (let i = 0; i < 400; i++) {
    a.feed(seq[i % seq.length])
    b.feed(seq[i % seq.length])
  }
  a.flush(); b.flush()
  assert.deepEqual(segmentsA, segmentsB)
  assert.ok(segmentsA.length > 0)
})