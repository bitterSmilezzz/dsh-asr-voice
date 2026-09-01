import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFakeRealtimeProvider, FAKE_REALTIME_DEFAULTS } from '../lib/realtime-provider.js'

/**
 * I3 假 provider 行为夹具：能量 VAD 把 PCM 切成句，句内 partial → 句尾 final +
 * speech-stopped，形状对齐真流式通道（先 partial 后 final、服务端 VAD 断句）。
 * 测试直接喂 int16 字节，走与 host 路由完全相同的 send() 入口。
 */

/** 16k int16 LE 字节流构造：一段静音或一段正弦音。 */
function pcmChunk(samples) {
  const buf = new ArrayBuffer(samples.length * 2)
  const view = new DataView(buf)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(i * 2, Math.round(s * 0x7fff), true)
  }
  return new Uint8Array(buf)
}

/** n 毫秒静音（RMS ≈ 0）。 */
function silence(ms) {
  return pcmChunk(new Float32Array(Math.round(16_000 * ms / 1000)))
}

/** n 毫秒正弦音（RMS > 阈值）。 */
function tone(ms, freq = 440, amp = 0.3) {
  const n = Math.round(16_000 * ms / 1000)
  const samples = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    samples[i] = Math.sin(2 * Math.PI * freq * i / 16_000) * amp
  }
  return pcmChunk(samples)
}

/** 收集一次完整会话的事件序列（send → close）。 */
async function collect(...chunks) {
  const provider = createFakeRealtimeProvider({ ...FAKE_REALTIME_DEFAULTS, silenceMs: 600 })
  const conn = await provider.connect()
  const events = []
  conn.onEvent = (ev) => events.push(ev)
  for (const chunk of chunks) conn.send(chunk)
  conn.close()
  return events
}

/** 只取事件类型序列。 */
function types(events) {
  return events.map((e) => e.type)
}

test('说一句再静默：speech-started → partial* → final + speech-stopped，text 形如「模拟转写·第N段」', async () => {
  const events = await collect(silence(200), tone(300), silence(800))
  const ts = types(events)
  // 形状不变量：开句先 speech-started，期间 ≥1 个 partial，静音闭合后 speech-stopped + final。
  assert.equal(ts[0], 'speech-started')
  assert.ok(ts.filter((t) => t === 'partial').length >= 1, '句内应有 partial')
  assert.equal(ts[ts.length - 2], 'speech-stopped')
  assert.equal(ts[ts.length - 1], 'final')
  const final = events.find((e) => e.type === 'final')
  assert.match(final.text, /^模拟转写·第1段$/)
  const partials = events.filter((e) => e.type === 'partial')
  assert.match(partials[0].text, /^模拟转写·第1段/)
})

test('全程静音：什么都不交出（负对照）', async () => {
  const events = await collect(silence(2000))
  assert.deepEqual(events, [])
})

test('短于 minSpeechMs 的杂音不成为一段：咳嗽不该占一次回合', async () => {
  // minSpeechMs=200ms：只给 100ms 短音 + 长时间静音。
  const provider = createFakeRealtimeProvider({ ...FAKE_REALTIME_DEFAULTS, silenceMs: 300 })
  const conn = await provider.connect()
  const events = []
  conn.onEvent = (ev) => events.push(ev)
  conn.send(tone(100))
  conn.send(silence(1000))
  conn.close()
  // 开句即吐 partial，但段长不足 → 无 final；VAD 边界照常（speech-stopped）。
  const ts = types(events)
  assert.equal(ts[0], 'speech-started')
  assert.ok(ts.filter((t) => t === 'partial').length >= 1)
  assert.equal(ts[ts.length - 1], 'speech-stopped', '短段只交 speech-stopped，不交 final')
  assert.ok(!events.some((e) => e.type === 'final'))
})

test('说到 maxSegmentMs 强制轮换：长段也能出多句', async () => {
  const provider = createFakeRealtimeProvider({ ...FAKE_REALTIME_DEFAULTS, silenceMs: 600, maxSegmentMs: 500 })
  const conn = await provider.connect()
  const events = []
  conn.onEvent = (ev) => events.push(ev)
  conn.send(tone(2000))
  conn.send(silence(800))
  conn.close()
  const finals = events.filter((e) => e.type === 'final')
  // 2000ms / 500ms 段上限 → 至少 4 个 final；序号递增。
  assert.ok(finals.length >= 4, `expected >=4 finals, got ${finals.length}`)
  const texts = finals.map((e) => e.text)
  for (let i = 1; i <= texts.length; i++) {
    assert.match(texts[i - 1] ?? '', new RegExp(`^模拟转写·第${i}段$`))
  }
})

test('close() 时正在说的一段也交掉：最后一句不凭空消失', async () => {
  const provider = createFakeRealtimeProvider({ ...FAKE_REALTIME_DEFAULTS, silenceMs: 600 })
  const conn = await provider.connect()
  const events = []
  conn.onEvent = (ev) => events.push(ev)
  conn.send(tone(300)) // 只给音，不补静音就 close
  conn.close()
  const ts = types(events)
  assert.equal(ts[0], 'speech-started')
  assert.ok(ts.filter((t) => t === 'partial').length >= 1)
  assert.equal(ts[ts.length - 2], 'speech-stopped', 'close 应补发 speech-stopped')
  assert.equal(ts[ts.length - 1], 'final', 'close 应补发 final')
  assert.match((events.at(-1)).text, /^模拟转写·第1段$/)
})

test('RMS 低于阈值的弱音不触发：噪声底不该成句', async () => {
  const events = await collect(tone(400, 440, 0.001), silence(800))
  assert.deepEqual(events, [])
})

test('分段音频跨多次 send 也能正确攒窗切段', async () => {
  // 分 10 次 send 总共 1s 音 + 静音，段边界跨 send 边界。
  const provider = createFakeRealtimeProvider({ ...FAKE_REALTIME_DEFAULTS, silenceMs: 600 })
  const conn = await provider.connect()
  const events = []
  conn.onEvent = (ev) => events.push(ev)
  for (let i = 0; i < 10; i++) {
    conn.send(tone(100))
  }
  conn.send(silence(800))
  conn.close()
  const finals = events.filter((e) => e.type === 'final')
  assert.equal(finals.length, 1)
})
