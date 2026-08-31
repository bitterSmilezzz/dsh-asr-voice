import { test } from 'node:test'
import assert from 'node:assert/strict'

// speech-out.ts 顶层不碰 DOM（window / speechSynthesis 只在工厂函数里取），
// 按 pcm.test.mjs 的做法直接用 node 的类型剥离跑源码。
const { createSentencePump, createSpeechSynthesisSink, isSpeechSynthesisSupported, MAX_UTTERANCE_CHARS } = await import('../src/client/speech-out.ts')

/**
 * 按「流式回复逐块到达」喂泵：deltas 是新增片段，feed 收的是**累积全文**
 * （调用方读的是 session.partial 里逐块累积的 text，不是增量）。
 */
function stream(pump, deltas) {
  let full = ''
  const out = []
  for (const delta of deltas) {
    full += delta
    out.push(...pump.feed(full))
  }
  return out
}

test('中文：句读即断，逐块到达也能拼出完整句子', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(stream(pump, ['今天天气', '不错。我们出', '门吧？']), ['今天天气不错。', '我们出门吧？'])
  assert.deepEqual(pump.finish(), [])
})

test('一次喂入多句要切成多段：早打断，且每段都在看门狗盖得住的长度内', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(pump.feed('第一句。第二句。第三句'), ['第一句。', '第二句。'])
  assert.deepEqual(pump.finish(), ['第三句'])
})

test('换行算句子边界（markdown 分段/列表不会粘成一坨）', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(stream(pump, ['第一行\n', '第二行\n']), ['第一行', '第二行'])
})

test('英文：小数点不断句，真正的句末点才切', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(stream(pump, ['v3.5 is', ' out. Next thing']), ['v3.5 is out.'])
  assert.deepEqual(pump.finish(), ['Next thing'])
})

test('缩写的点后跟空格会误断成短句——认了的代价（多切一段，不漏念）', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(pump.feed('e.g. this is fine'), ['e.g.'])
  assert.deepEqual(pump.finish(), ['this is fine'])
})

test('收尾引号/括号跟着上一句走，不会被劈成下一句开头', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(stream(pump, ['他说「好的。」', '然后走了。']), ['他说「好的。」', '然后走了。'])
  const mid = createSentencePump(1)
  assert.deepEqual(mid.feed('他说「好的。」然后走了'), ['他说「好的。」'])
})

test('首句太短就与后句并成一段再起音；只约束首句', () => {
  const pump = createSentencePump(6)
  assert.deepEqual(pump.feed('好。'), [])
  assert.deepEqual(pump.feed('好。今天天气不错。'), ['好。今天天气不错。'])
  // 首句已起音，后面的短句照常单独念。
  assert.deepEqual(pump.feed('好。今天天气不错。走。'), ['走。'])
})

test('首句短到整段都没第二句可并时，收尾仍要念出来（宁短勿漏）', () => {
  const pump = createSentencePump(50)
  assert.deepEqual(pump.feed('好。'), [])
  assert.deepEqual(pump.finish(), ['好。'])
})

test('回合从头开始（新 step / 新回复）：旧流尾巴先吐干净，不丢半句', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(pump.feed('上一句说完了。没念完的尾巴'), ['上一句说完了。'])
  assert.deepEqual(pump.feed('新回合的第一句。新回合第二句'), ['没念完的尾巴', '新回合的第一句。'])
  assert.deepEqual(pump.finish(), ['新回合第二句'])
})

test('同一份累积文本重复喂不产生新句子；快照回退按新流处理', () => {
  const pump = createSentencePump(1)
  assert.deepEqual(pump.feed('一句。二句'), ['一句。'])
  assert.deepEqual(pump.feed('一句。二句'), [])
  // 变短 = 不是前缀延伸 → 当成新流：先把憋着的「二句」吐出来，不会永远念不到。
  assert.deepEqual(pump.feed('一句'), ['二句'])
  assert.deepEqual(pump.finish(), ['一句'])
})

test('全程无标点的退化回复：按固定长度硬切，长段不会憋着不念', () => {
  const pump = createSentencePump(1)
  const runon = '字'.repeat(500)
  const chunks = stream(pump, [runon.slice(0, 120), runon.slice(120, 260), runon.slice(260)])
  assert.deepEqual(chunks.map((s) => s.length), [200, 200])
  const tail = pump.finish()
  assert.deepEqual(tail.map((s) => s.length), [100])
  assert.equal(chunks.join('') + tail[0], runon)
})

// ── 播报排队（fake speechSynthesis：只验排队/门控/看门狗，音质由真 Chrome 验收）──

/**
 * 装一个可控的 speechSynthesis：`speak()` 只记录，播完由测试手动 `end()` 触发，
 * 把 `utterance.onend` 这条不可信路径变成可断言的确定性路径。
 */
async function withFakeSynth(run) {
  const spoken = []
  const inFlight = []
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) { this.text = text; this.volume = 1 }
  }
  globalThis.window = {
    speechSynthesis: {
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      speak: (utter) => { spoken.push(utter); inFlight.push(utter) },
      cancel: () => { inFlight.length = 0 },
    },
    SpeechSynthesisUtterance: globalThis.SpeechSynthesisUtterance,
  }
  try {
    await run({
      spoken,
      /** 模拟最早在播的那一句回调 onend。 */
      end: () => { inFlight.shift()?.onend?.() },
    })
  } finally {
    delete globalThis.window
    delete globalThis.SpeechSynthesisUtterance
  }
}

const sinkOf = (tuning = {}) => createSpeechSynthesisSink({
  utteranceWatchdogMs: 30,
  language: 'zh-CN',
  ...tuning,
})

test('播报一次一句，前一句 onend 后自动接下一句', async () => {
  await withFakeSynth((fake) => {
    const sink = sinkOf()
    sink.enqueue('第一句。')
    assert.deepEqual(fake.spoken.map((u) => u.text), ['第一句。'])
    sink.enqueue('第二句。')
    assert.equal(fake.spoken.length, 1, '上一句没结束前不得并发播报')
    assert.equal(sink.active, true)
    fake.end()
    assert.deepEqual(fake.spoken.map((u) => u.text), ['第一句。', '第二句。'])
    fake.end()
    assert.equal(sink.active, false)
    sink.dispose()
  })
})

test('onDrain 每一轮都触发——第二轮回复也要把麦克风还回来', async () => {
  await withFakeSynth((fake) => {
    const sink = sinkOf()
    let drains = 0
    sink.onDrain = () => { drains += 1 }
    sink.enqueue('第一句。')
    sink.enqueue('第二句。')
    fake.end()
    assert.equal(drains, 0, '队列还有内容时不算排空')
    fake.end()
    assert.equal(drains, 1)
    // 关键回归点：处理器不得在首次触发后被摘掉，否则第二个回合起永远卡在「朗读中」。
    sink.enqueue('第三句。')
    fake.end()
    assert.equal(drains, 2)
    sink.enqueue('第四句。')
    fake.end()
    assert.equal(drains, 3)
    sink.dispose()
  })
})

test('cancel() 吞掉本轮 drain：打断后何时还麦由调用方决定', async () => {
  await withFakeSynth((fake) => {
    const sink = sinkOf()
    let drains = 0
    sink.onDrain = () => { drains += 1 }
    sink.enqueue('第一句。')
    sink.enqueue('第二句。')
    sink.cancel()
    assert.equal(sink.active, false)
    // 已 cancel 的 utterance 迟到回调不得改动新状态。
    fake.end()
    assert.equal(drains, 0)
    assert.equal(fake.spoken.length, 1, 'cancel 后排队中的第二句不再开播')
    sink.dispose()
  })
})

/** 等条件成立（有界）：看门狗是 10ms 一拍的链式计时，满载下固定 sleep 会先于第二拍醒来。 */
async function waitFor(label, predicate) {
  const deadline = Date.now() + 3000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`超时：${label}`)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

test('onend 不回时看门狗按播完处理，麦克风不会被永久扣住', async () => {
  await withFakeSynth(async (fake) => {
    const sink = sinkOf({ utteranceWatchdogMs: 10 })
    let drains = 0
    sink.onDrain = () => { drains += 1 }
    sink.enqueue('卡住的一句。')
    sink.enqueue('下一句。')
    await waitFor('看门狗推进到第二句并排空', () => fake.spoken.length === 2 && drains === 1)
    assert.deepEqual(fake.spoken.map((u) => u.text), ['卡住的一句。', '下一句。'])
    assert.equal(drains, 1)
    sink.dispose()
  })
})

test('prime() 只建立发声权限：不进队列、不改 active、自身静音', async () => {
  await withFakeSynth((fake) => {
    const sink = sinkOf()
    sink.prime()
    assert.equal(sink.active, false)
    assert.equal(fake.spoken.length, 1)
    assert.equal(fake.spoken[0].volume, 0)
    sink.dispose()
  })
})

test('能力探测：node 里没有 speechSynthesis，装了假实现即为真', async () => {
  assert.equal(isSpeechSynthesisSupported(), false)
  await withFakeSynth(() => {
    assert.equal(isSpeechSynthesisSupported(), true)
  })
  assert.equal(isSpeechSynthesisSupported(), false)
})

/** 确定性伪随机（种子固定，红的时候能原样复现）。 */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 覆盖断句规则的全部料：中日韩句读、拉丁句末符、小数点、缩写点、引号闭合、换行、超长无标点段、纯空白串。 */
const FUZZ_FRAGMENTS = [
  '今天天气不错。', '我们继续说吧！', '然后呢？', '再后面……', '顺便说一句；',
  'The reply is ready. ', 'It costs 3.14 tokens. ', 'e.g. use a plugin. ', 'Done!\n',
  'no punctuation at all', 'x'.repeat(260), '，未尽的一节', '"quoted ending."', '”尾巴）',
  ' ', '\n\n', '   ', '短。', '第二段话真的很长一点好让首句并入规则生效。',
  ' '.repeat(210), '\n'.repeat(215),
]

test('句子泵随机化性质：不丢字、不重字、顺序不变、每段可念', () => {
  const strip = (s) => s.replace(/\s+/g, '')
  for (let seed = 1; seed <= 300; seed++) {
    const rnd = mulberry32(seed)
    const pieces = []
    const count = 3 + Math.floor(rnd() * 14)
    for (let i = 0; i < count; i++) pieces.push(FUZZ_FRAGMENTS[Math.floor(rnd() * FUZZ_FRAGMENTS.length)] ?? '兜底。')
    const text = pieces.join(rnd() < 0.3 ? ' ' : '')
    const pump = createSentencePump(12)
    const spoken = []
    let at = 0
    while (at < text.length) {
      at = Math.min(text.length, at + 1 + Math.floor(rnd() * (1 + rnd() * 40)))
      spoken.push(...pump.feed(text.slice(0, at)))
    }
    spoken.push(...pump.finish())
    const where = `seed=${seed} text=${JSON.stringify(text.slice(0, 60))}…`
    assert.equal(spoken.join('').replace(/\s+/g, ''), strip(text), `丢字/重字/乱序 ${where}`)
    for (const s of spoken) {
      assert.notEqual(s, '', `吐出空段 ${where}`)
      assert.equal(s, s.trim(), `段首尾留白 ${where}`)
      assert.ok(s.length <= MAX_UTTERANCE_CHARS, `超出一块上限，看门狗配不上 ${where}`)
    }
  }
})

test('整刀落在空白里的硬切不产出空块（空 utterance 会白占一个看门狗位）', () => {
  for (const pad of [' '.repeat(210), '\n'.repeat(215), ' \n'.repeat(120)]) {
    const pump = createSentencePump(12)
    const spoken = [...pump.feed(`${pad}好。`), ...pump.finish()]
    assert.deepEqual(spoken, ['好。'], JSON.stringify(pad.slice(0, 3)))
  }
})
