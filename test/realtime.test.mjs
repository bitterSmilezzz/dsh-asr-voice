import { test } from 'node:test'
import assert from 'node:assert/strict'

// realtime.ts 顶层不碰 DOM（识别器构造在工厂里），按 pcm.test.mjs 的做法
// 直接用 node 的类型剥离跑源码。
const { createBrowserRealtime } = await import('../src/client/realtime.ts')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 造一个可控的 webkitSpeechRecognition：start/abort 只计数，结果与 onend 由测试手动投喂，
 * 把「Chrome 什么时候自己结束会话、什么时候重复上报上一句」这些不可控行为变成确定性路径。
 * 计时留了大余量（settle/tail 各 80/40ms，断言点至少差 40ms），避免事件循环抖动造成偶发红。
 */
async function withFakeSpeech(run, opts = {}) {
  const instances = []
  class FakeRecognition {
    constructor() {
      this.lang = ''
      this.continuous = false
      this.interimResults = false
      this.maxAlternatives = 0
      this.started = 0
      this.aborted = 0
      this.onstart = null
      this.onresult = null
      this.onerror = null
      this.onend = null
      instances.push(this)
    }
    start() { this.started += 1 }
    stop() { this.stopped = (this.stopped ?? 0) + 1 }
    abort() { this.aborted += 1 }
    /** 投喂一段结果：entries = [{ text, final }]。 */
    emit(entries, resultIndex = 0) {
      const results = entries.map((e) => ({
        isFinal: e.final === true,
        item: () => ({ transcript: e.text }),
      }))
      results.item = (i) => results[i]
      this.onresult?.({ resultIndex, results })
    }
    fail(code) { this.onerror?.({ error: code }) }
    endSession() { this.onend?.({}) }
  }
  globalThis.window = { webkitSpeechRecognition: FakeRecognition }
  globalThis.requestAnimationFrame = () => 1
  globalThis.cancelAnimationFrame = () => {}
  try {
    const events = { partial: [], turns: [], fails: [] }
    const session = createBrowserRealtime(
      opts.language ?? 'zh-CN',
      { settleMs: opts.settleMs ?? 80, tailMs: opts.tailMs ?? 40 },
      {
        onPartial: (text) => { events.partial.push(text) },
        onTurn: (text) => { events.turns.push(text) },
        onLevel: () => {},
        onFail: (code) => { events.fails.push(code) },
      },
    )
    await run({ session, events, instances })
  } finally {
    delete globalThis.window
    delete globalThis.requestAnimationFrame
    delete globalThis.cancelAnimationFrame
  }
}

test('无 Web Speech：以 no-speech-support 失败，控制面全为无操作', async () => {
  const events = []
  const session = createBrowserRealtime('auto', { settleMs: 80, tailMs: 40 }, {
    onPartial: () => {}, onTurn: () => {}, onLevel: () => {}, onFail: (code) => { events.push(code) },
  })
  session.start()
  await sleep(0)
  assert.deepEqual(events, ['no-speech-support'])
  assert.equal(session.listening, false)
  session.pause()
  session.resume()
  session.stop()
})

test('静默 settleMs + 宽限 tailMs 才交出回合；期间字幕跟手', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    assert.equal(session.listening, true)
    assert.equal(instances.length, 1)
    assert.equal(instances[0].started, 1)
    assert.equal(instances[0].lang, 'zh-CN')
    assert.equal(instances[0].continuous, true, '必须 continuous，否则每句都要重启')

    instances[0].emit([{ text: '今天天气', final: false }])
    assert.deepEqual(events.partial, ['今天天气'])
    assert.deepEqual(events.turns, [])

    instances[0].emit([{ text: '今天天气不错。', final: true }])
    await sleep(40)
    assert.deepEqual(events.turns, [], 'settleMs 未到不得收尾')
    await sleep(120)
    assert.deepEqual(events.turns, ['今天天气不错。'])
    session.stop()
  })
})

test('还在出字就重新计时：连续说话不会被半路切成两句', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const rec = instances[0]
    // 真实的 interim 结果覆盖整句（不是增量），这里照此投喂。
    rec.emit([{ text: '第一段', final: false }])
    await sleep(40)
    rec.emit([{ text: '第一段 第二段', final: false }])
    await sleep(40)
    rec.emit([{ text: '第一段 第二段 第三段', final: false }])
    assert.deepEqual(events.turns, [], '每次新结果都应把 settle 推后')
    assert.deepEqual(events.partial, ['第一段', '第一段 第二段', '第一段 第二段 第三段'])
    await sleep(200)
    assert.deepEqual(events.turns, ['第一段 第二段 第三段'])
    session.stop()
  })
})

test('tailMs 宽限期内来的迟到结果并入本句，而不是另起一句', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const rec = instances[0]
    rec.emit([{ text: '帮我记一下', final: true }])
    // t≈100ms：settle(80) 已过、tail(120) 未过 → 正是最后一个词的迟到窗口。
    await sleep(100)
    assert.deepEqual(events.turns, [], 'tail 未到时不得提交')
    rec.emit([{ text: '开会', final: true }])
    await sleep(300)
    assert.deepEqual(events.turns, ['帮我记一下 开会'], '迟到结果必须并进同一句，只交一次')
    session.stop()
  }, { settleMs: 80, tailMs: 120 })
})

test('半双工门控：pause 后不收音、不交出回合，resume 从干净的一句开始', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const first = instances[0]
    first.emit([{ text: '说一句', final: true }])
    await sleep(160)
    assert.deepEqual(events.turns, ['说一句'])

    session.pause()
    assert.equal(session.listening, false)
    assert.equal(first.aborted, 1, 'pause 必须真的 abort 掉识别器')
    first.emit([{ text: '播报里的回声', final: true }])
    await sleep(160)
    assert.deepEqual(events.turns, ['说一句'], '播报期间不得再交出回合')
    assert.deepEqual(events.partial, ['说一句'], '播报期间不得更新字幕')

    session.resume()
    assert.equal(session.listening, true)
    assert.equal(instances.length, 2, 'resume 装一个新识别器，避免旧实例残留错误态')
    instances[1].emit([{ text: '下一句', final: true }])
    await sleep(160)
    assert.deepEqual(events.turns, ['说一句', '下一句'])
    session.stop()
  })
})

test('识别器自己结束（Chrome 静音收摊）后悄悄续上，用户不该察觉', async () => {
  await withFakeSpeech(async ({ session, instances }) => {
    session.start()
    instances[0].endSession()
    assert.equal(instances.length, 1, '重启要隔一小会儿，紧接着 start() 会撞 InvalidStateError')
    await sleep(300)
    assert.equal(instances.length, 2)
    assert.equal(instances[1].started, 1)
    session.stop()
  })
})

test('重启后重复上报同一整句：不二次提交、字幕不跳字', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    instances[0].emit([{ text: '你好世界', final: true }])
    await sleep(160)
    assert.deepEqual(events.turns, ['你好世界'])
    instances[0].emit([{ text: '你好世界', final: true }])
    await sleep(160)
    assert.deepEqual(events.turns, ['你好世界'], 'lastTurn 去重必须生效')
    assert.deepEqual(events.partial, ['你好世界'])
    session.stop()
  })
})

test('权限错误 → 会话级失败，且失败后不再重启', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const rec = instances[0]
    rec.fail('no-speech')
    assert.deepEqual(events.fails, [], 'no-speech 是常态沉默，不能报失败')
    rec.fail('not-allowed')
    assert.deepEqual(events.fails, ['mic-denied'])
    assert.equal(session.listening, false)
    rec.endSession()
    await sleep(300)
    assert.equal(instances.length, 1, '已判死的会话不得继续拉起识别器')
    session.stop()
  })
})

test('audio-capture → no-mic，network → network', async () => {
  for (const [code, expected] of [['audio-capture', 'no-mic'], ['network', 'network']]) {
    await withFakeSpeech(({ session, events, instances }) => {
      session.start()
      instances[0].fail(code)
      assert.deepEqual(events.fails, [expected])
      session.stop()
    })
  }
})

test('start 幂等；stop 之后不再有任何回调', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    session.start()
    assert.equal(instances.length, 1)
    instances[0].emit([{ text: '一句', final: true }])
    assert.deepEqual(events.partial, ['一句'])
    session.stop()
    instances[0].emit([{ text: '晚到的', final: true }])
    await sleep(160)
    assert.deepEqual(events.turns, [])
    assert.deepEqual(events.partial, ['一句'], 'stop 后不得再来任何回调')
    assert.equal(session.listening, false)
  })
})
