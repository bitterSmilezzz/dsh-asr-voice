import { test } from 'node:test'
import assert from 'node:assert/strict'

// vad.ts 顶层不碰 DOM，按 pcm.test.mjs 的做法用 node 的类型剥离直接跑源码。
const { createEnergyVad } = await import('../src/client/vad.ts')

const SR = 16_000
/** 一窗 = 20ms（vad.ts 内部固定）。 */
const WINDOW_MS = 20
const samples = (ms) => Math.round(SR * ms / 1000)

/** 定幅帧：RMS 恰等于幅值，静音检测的判定因此完全可算。 */
function frame(ms, amp) {
  return new Float32Array(samples(ms)).fill(amp)
}

const TUNING = { rms: 0.05, silenceMs: 300, prerollMs: 200, minSpeechMs: 100, maxSegmentMs: 5_000 }

/** 跑一个 VAD，投喂 [ms, amp] 序列，返回全部事件。 */
function run(tuning = TUNING, feed = [], sampleRate = SR) {
  const segments = []
  const speech = []
  const vad = createEnergyVad(sampleRate, tuning, {
    onSegment: (pcm) => { segments.push(pcm) },
    onSpeech: (active) => { speech.push(active) },
  })
  for (const [ms, amp] of feed) vad.feed(frame(ms, amp))
  return { vad, segments, speech, durations: segments.map((p) => Math.round(p.length / SR * 1000)) }
}

/** 段内每一窗的首样本幅值（用于确认真的把静音/有声按边界切开了）。 */
function windowAmps(pcm) {
  const per = samples(WINDOW_MS)
  const out = []
  for (let i = 0; i + per <= pcm.length; i += per) out.push(pcm[i] ?? 0)
  return out
}

/** Float32 存不下精确的 0.2，比较幅值必须带容差。 */
const ampAt = (a, target) => Math.abs(a - target) < 1e-6

test('说一段再静默够久：交出恰好一段，段前缓冲与收尾静音都在里面', () => {
  const { segments, durations, speech } = run(TUNING, [[300, 0], [400, 0.2], [500, 0]])
  assert.equal(segments.length, 1)
  // 200 段前 + 400 语音 + 15 窗（300ms）静音即切，切点之后不再计入本段。
  assert.deepEqual(durations, [200 + 400 + 300])
  assert.deepEqual(speech, [true, false])
  const amps = windowAmps(segments[0])
  assert.equal(amps.slice(0, 10).every((a) => a === 0), true, '前 200ms 是段前静音')
  assert.equal(amps.slice(10, 30).every((a) => ampAt(a, 0.2)), true, '中间 400ms 是语音')
  assert.equal(amps.slice(30).every((a) => a === 0), true, '段尾静音被保留')
})

test('开口前的音频被段前缓冲接住：首音节不丢', () => {
  const noPreroll = run({ ...TUNING, prerollMs: 0 }, [[100, 0], [400, 0.2], [400, 0]])
  const withPreroll = run(TUNING, [[100, 0], [400, 0.2], [400, 0]])
  assert.deepEqual(withPreroll.durations, [noPreroll.durations[0] + 100], 'preroll 只加在段头')
  assert.equal(withPreroll.segments[0][0], 0)
})

test('静音不够久不切段：一句话中间的换气不该被切成两句', () => {
  const { segments, durations } = run(TUNING, [[300, 0], [200, 0.2], [200, 0], [200, 0.2], [500, 0]])
  assert.equal(segments.length, 1)
  // 200 前垫 + 200 语音 + 200 换气 + 200 语音 + 300 累计静音到切点。
  assert.deepEqual(durations, [1_100])
})

test('短于此的杂音不成为一段：咳嗽不该花一次上游配额', () => {
  const { segments, speech } = run(TUNING, [[60, 0.2], [600, 0]])
  assert.equal(segments.length, 0, '60ms 有声 < minSpeechMs 100ms')
  assert.deepEqual(speech, [true, false], '声学边界仍然如实上报，只是内容被丢')
})

test('全程静音什么都不交出（负对照）', () => {
  const { segments, speech } = run(TUNING, [[3_000, 0]])
  assert.deepEqual(segments, [])
  assert.deepEqual(speech, [], '没跨过阈值就不该有边界事件')
})

test('说个不停也按 maxSegmentMs 轮换：单句不会无限变长', () => {
  const tuning = { ...TUNING, maxSegmentMs: 400 }
  const { segments, durations } = run(tuning, [[200, 0], [900, 0.2], [400, 0]])
  assert.equal(segments.length, 3)
  // 首段带 200ms 段前 → 600；其后每段 20 窗 → 400；尾段是剩下的语音 + 切点静音。
  assert.deepEqual(durations, [600, 400, 400])
})

test('flush() 立刻收尾：到上限或要关门时不该再等静音', () => {
  const { vad, segments } = run(TUNING, [[400, 0.2]])
  assert.equal(segments.length, 0, '静音不够，尚未自然切段')
  vad.flush()
  assert.equal(segments.length, 1)
})

test('flush() 把不足一窗的尾巴也算进去：那通常是刚说完的最后几十毫秒', () => {
  const tuning = { ...TUNING, prerollMs: 0, minSpeechMs: 20 }
  const { vad, segments } = run(tuning, [[65, 0.2]])
  vad.flush()
  assert.equal(segments.length, 1)
  assert.equal(segments[0].length, samples(65), '65ms 全部落在段里，没有向量化取整丢尾')
})

test('reset() 丢掉在手的一段，什么都不交', () => {
  const { vad, segments, speech } = run(TUNING, [[400, 0.2]])
  segments.length = 0
  speech.length = 0
  vad.reset()
  vad.flush()
  assert.deepEqual(segments, [])
  assert.deepEqual(speech, [false], 'reset 要把「还在说话」的状态如实落下')
})

test('帧长不影响切段结果：VAD 自己按 20ms 窗重切', () => {
  // 同一条 1200ms 采样流：一次按 40ms 帧投喂，一次按 7ms（与窗长不整除）投喂。
  const stream = new Float32Array(samples(1_200))
  for (let i = 0; i < stream.length; i++) {
    const ms = i / SR * 1000
    stream[i] = ms >= 300 && ms < 700 ? 0.2 : 0
  }
  const collect = (chunkMs) => {
    const segments = []
    const vad = createEnergyVad(SR, TUNING, { onSegment: (pcm) => { segments.push(pcm) }, onSpeech: () => {} })
    const step = samples(chunkMs)
    for (let off = 0; off < stream.length; off += step) vad.feed(stream.subarray(off, Math.min(off + step, stream.length)))
    return segments
  }
  const aligned = collect(40)
  assert.deepEqual(collect(7).map((p) => Array.from(p)), aligned.map((p) => Array.from(p)))
  assert.equal(aligned.length, 1)
})

test('非 16k 采样率下窗长换算照样成立', () => {
  const rate = 48_000
  const segments = []
  const vad = createEnergyVad(rate, TUNING, { onSegment: (pcm) => { segments.push(pcm) }, onSpeech: () => {} })
  vad.feed(new Float32Array(rate * 0.4).fill(0.2))
  vad.feed(new Float32Array(rate * 0.5).fill(0))
  // 无段前静音 → 20 窗语音 + 累计到 300ms 的 15 窗静音 = 700ms。
  assert.equal(segments.length, 1)
  assert.equal(segments[0].length, Math.round(rate * 0.7))
})
