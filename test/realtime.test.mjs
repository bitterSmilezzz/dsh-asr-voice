import { test } from 'node:test'
import assert from 'node:assert/strict'

// realtime.ts 顶层不碰 DOM（识别器构造在工厂里），按 pcm.test.mjs 的做法
// 直接用 node 的类型剥离跑源码。
const { createBrowserRealtime, createSegmentedRealtime } = await import('../src/client/realtime.ts')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 等某个异步事实发生（有界）。回合交出是 settle→tail 两拍链式计时，满载下两拍都会
 * 被拖后，固定 sleep 会变成和测试自己赛跑。反向断言（「还不到时候」）继续用固定
 * sleep：定时器只会晚到、不会早到，那半边不会因抖动而红。
 */
async function until(label, predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`超时：${label}`)
    await sleep(5)
  }
}


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
    await until('交出整句', () => events.turns.length >= 1)
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
    await until('只交出一句', () => events.turns.length >= 1)
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
    await until('迟到结果并入本句', () => events.turns.length >= 1)
    assert.deepEqual(events.turns, ['帮我记一下 开会'], '迟到结果必须并进同一句，只交一次')
    session.stop()
  }, { settleMs: 80, tailMs: 120 })
})

test('半双工门控：pause 后不收音、不交出回合，resume 从干净的一句开始', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const first = instances[0]
    first.emit([{ text: '说一句', final: true }])
    await until('第一句交出', () => events.turns.length >= 1)
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
    await until('第二句交出', () => events.turns.length >= 2)
    assert.deepEqual(events.turns, ['说一句', '下一句'])
    session.stop()
  })
})

test('识别器自己结束（Chrome 静音收摊）后悄悄续上，用户不该察觉', async () => {
  await withFakeSpeech(async ({ session, instances }) => {
    session.start()
    instances[0].endSession()
    assert.equal(instances.length, 1, '重启要隔一小会儿，紧接着 start() 会撞 InvalidStateError')
    await until('识别器悄悄续上', () => instances.length >= 2)
    assert.equal(instances[1].started, 1)
    session.stop()
  })
})

test('重启后重复上报同一整句：不二次提交、字幕不跳字', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    instances[0].emit([{ text: '你好世界', final: true }])
    await until('整句交出', () => events.turns.length >= 1)
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

test('纯空白结果永不交出回合；随后的真实文本照交', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const rec = instances[0]
    rec.emit([{ text: '   ', final: true }])
    rec.emit([{ text: ' \n ', final: true }])
    await sleep(240)
    assert.deepEqual(events.turns, [], '空白不是「说完了」，是一次都没开口')
    assert.deepEqual(events.partial, [], '没有文本就没有字幕')
    rec.emit([{ text: '在手', final: false }])
    rec.emit([{ text: ' ', final: true }])
    assert.deepEqual(events.partial.at(-1), '在手', '一条空白事件不该把在手的候选从字幕上抹掉')
    rec.emit([{ text: '真话', final: true }])
    await until('空白之后的整句交出', () => events.turns.length >= 1)
    assert.deepEqual(events.turns, ['真话'], '空格归一不能把后面这句一起吞掉')
    session.stop()
  })
})

test('tail 窗口内 pause() 取消交出；暂停期结果全丢', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    const first = instances[0]
    first.emit([{ text: '你好', final: true }])
    await sleep(100) // settle 已触发、tail 还在跑（交出点在 ~120ms）
    assert.deepEqual(events.turns, [], '前置条件：交出前一刻才动手，否则测不到窗口')
    session.pause()
    first.emit([{ text: '你好', final: true }])
    await sleep(240)
    assert.deepEqual(events.turns, [], '播报期间不得再攒出第二个回合')
    assert.deepEqual(events.partial, ['你好'], '暂停期间连字幕都不该动')
    assert.equal(session.listening, false)
    session.stop()
  })
})

test('整句交出后 pause/resume，再说同一句必须再算一次（去重只记当期）', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    instances[0].emit([{ text: '再来一次', final: true }])
    await until('第一次交出', () => events.turns.length >= 1)
    assert.deepEqual(events.turns, ['再来一次'])
    // 真实链路里 commitTurn 在 onTurn 内立刻 pause（半双工门控），念完才 resume。
    session.pause()
    session.resume()
    assert.equal(instances.length, 2, 'resume 必须换新识别器（旧实例的错误态会残留）')
    instances[1].emit([{ text: '再来一次', final: true }])
    await until('第二次交出', () => events.turns.length >= 2)
    assert.deepEqual(events.turns, ['再来一次', '再来一次'], '去重不得跨期生效，否则这句话永远说不出口')
    session.stop()
  })
})

test('tail 窗口内 stop() 同样取消交出', async () => {
  await withFakeSpeech(async ({ session, events, instances }) => {
    session.start()
    instances[0].emit([{ text: '半句', final: true }])
    await sleep(100)
    session.stop()
    await sleep(240)
    assert.deepEqual(events.turns, [])
  })
})

const SR = 16_000
/** 一帧 `ms` 毫秒、定幅 `amp` 的 16k 采样。 */
const frame = (ms, amp) => new Float32Array(Math.round(SR * ms / 1000)).fill(amp)

/**
 * 按句转写引擎：注入采集与转写，于是真 VAD、真队列、真回合判定都能在 node 里跑。
 * 转写请求由测试手动放行——上游往返什么时候回来不可控，这里必须可控。
 */
async function withSegmented(run, opts = {}) {
  const events = { partial: [], turns: [], fails: [], gaps: 0, levels: [] }
  const sinks = []
  const mutes = []
  const requests = []
  let stops = 0
  const capture = async (options) => {
    sinks.push(options)
    return {
      stop: () => { stops += 1 },
      setMuted: (muted) => { mutes.push(muted) },
    }
  }
  const transcribe = async (pcm, language, signal) => {
    let resolve
    let reject
    const promise = new Promise((res, rej) => { resolve = res; reject = rej })
    requests.push({ pcm, language, signal, resolve, reject })
    return promise
  }
  const session = createSegmentedRealtime(
    opts.language ?? 'zh-CN',
    {
      settleMs: opts.settleMs ?? 60,
      tailMs: opts.tailMs ?? 20,
      frameMs: 40,
      maxPending: opts.maxPending ?? 8,
      vad: {
        rms: opts.rms ?? 0.05,
        silenceMs: opts.vadSilenceMs ?? 100,
        prerollMs: 0,
        minSpeechMs: 20,
        maxSegmentMs: 5_000,
      },
    },
    {
      onPartial: (text) => { events.partial.push(text) },
      onTurn: (text) => { events.turns.push(text) },
      onLevel: (level) => { events.levels.push(level) },
      onFail: (code) => { events.fails.push(code) },
      onGap: () => { events.gaps += 1 },
    },
    { capture, transcribe },
  )
  /** 把声音直接灌进采集回调。 */
  const feed = (ms, amp) => { sinks.at(-1)?.onFrame(frame(ms, amp)) }
  /** 说一句（4 窗有声）+ 足够切段的静音。 */
  const speak = (ms = 80) => { feed(ms, 0.2); feed(120, 0) }
  try {
    await run({ session, events, requests, feed, speak, mutes, stopCount: () => stops })
  } finally {
    session.stop()
  }
}

test('一句语音 → 一次上游 → 一个回合，电平是真的', async () => {
  await withSegmented(async ({ session, events, requests, speak }) => {
    session.start()
    speak()
    await until('段被送去转写', () => requests.length === 1)
    assert.equal(new Set(requests.map((r) => r.language)).size, 1)
    requests[0].resolve('帮我记一下')
    await until('回合交出', () => events.turns.length === 1)
    assert.deepEqual(events.turns, ['帮我记一下'])
    assert.deepEqual(events.partial, ['帮我记一下'])
    assert.ok(events.levels.some((l) => l > 0.1), '电平表由真实麦克风电平驱动，不是模拟')
  })
})

test('两句在 settle 内先后落地：合成一个回合，只交一次', async () => {
  await withSegmented(async ({ session, events, requests, speak }) => {
    session.start()
    speak()
    await until('第一段在途', () => requests.length === 1)
    requests[0].resolve('第一段')
    await until('字幕落地', () => events.partial.length === 1)
    speak()
    await until('第二段在途', () => requests.length === 2)
    requests[1].resolve('第二段')
    await until('回合交出', () => events.turns.length === 1)
    await sleep(160)
    assert.deepEqual(events.turns, ['第一段 第二段'], 'settle 内到的文字属于同一回合')
  }, { settleMs: 200, tailMs: 0 })
})

test('还在出声时不交出回合：先落地的半句字幕不把一句话说成两半', async () => {
  await withSegmented(async ({ session, events, requests, speak, feed }) => {
    session.start()
    speak()
    await until('第一段在途', () => requests.length === 1)
    feed(80, 0.2)
    requests[0].resolve('前半句')
    await sleep(120)
    assert.deepEqual(events.turns, [], 'vad 仍在有声窗内，交出必须被按住')
    assert.deepEqual(events.partial, ['前半句'], '但字幕照常更新')
    feed(40, 0.2)
    assert.deepEqual(events.turns, [], '继续出声：不是一次性错过，而是每次都按住')
    feed(120, 0)
    // 收尾静音让第二段当场入队（transcribe 同步被调用），立刻放行才不会让它晚于计时。
    requests[1].resolve('后半句')
    await until('回合交出', () => events.turns.length === 1)
    assert.deepEqual(events.turns, ['前半句 后半句'])
  }, { settleMs: 40, tailMs: 0 })
})

test('pause 静音轨道并作废在途结果，resume 从干净的一句开始', async () => {
  await withSegmented(async ({ session, events, requests, speak, mutes }) => {
    session.start()
    speak()
    await until('第一段在途', () => requests.length === 1)
    session.pause()
    assert.deepEqual(mutes, [true], '播报期间轨道直接静音')
    assert.equal(requests[0].signal.aborted, true, '在途请求要 abort，否则白烧一次配额')
    requests[0].resolve('播报里的回声')
    await sleep(200)
    assert.deepEqual(events.turns, [])
    assert.deepEqual(events.partial, [])
    session.resume()
    assert.deepEqual(mutes, [true, false])
    speak()
    await until('第二段在途', () => requests.length === 2)
    requests[1].resolve('下一句')
    await until('回合交出', () => events.turns.length === 1)
    assert.deepEqual(events.turns, ['下一句'])
  }, { settleMs: 40, tailMs: 0 })
})

/**
 * 作废在途结果不能只靠 `paused` 标志：resume 可能发生在旧请求回来**之前**，那时会话
 * 已经在听下一句，`active && !paused` 全线放行——只有代际能把上一期的字挡在门外。
 */
test('在途结果晚过 resume 才回来：一个字都不能漏进新回合', async () => {
  await withSegmented(async ({ session, events, requests, speak }) => {
    session.start()
    speak()
    await until('第一段在途', () => requests.length === 1)
    session.pause()
    session.resume()
    requests[0].resolve('上一期的回声')
    await sleep(200)
    assert.deepEqual(events.partial, [], '过期结果不该动字幕')
    assert.deepEqual(events.turns, [], '过期结果不该交出回合')
    speak()
    await until('第二段在途', () => requests.length === 2)
    requests[1].resolve('这一句')
    await until('回合交出', () => events.turns.length === 1)
    assert.deepEqual(events.turns, ['这一句'], '新回合只含本期的文字')
  }, { settleMs: 40, tailMs: 0 })
})

test('VAD 被噪声底顶开的段，过不了静音守卫就不发上游', async () => {
  await withSegmented(async ({ session, requests, feed }) => {
    session.start()
    // rms 阈值压到 0.001：0.002 幅度的段算「有声」，但峰值低于 SILENCE_PEAK_FLOOR。
    feed(80, 0.002)
    feed(160, 0)
    await sleep(120)
    assert.deepEqual(requests, [], '趋零的段发上去只会换来幻觉字')
  }, { rms: 0.001 })
})

test('连续三次转写失败 → 判死，之后不再发上游', async () => {
  await withSegmented(async ({ session, events, requests, speak }) => {
    session.start()
    for (let i = 0; i < 3; i++) {
      speak()
      await until(`第 ${i + 1} 段在途`, () => requests.length === i + 1)
      requests[i].reject(new Error('boom'))
    }
    await until('判死', () => events.fails.length === 1)
    assert.deepEqual(events.fails, ['provider-unreachable'])
    assert.equal(session.listening, false)
    speak()
    await sleep(160)
    assert.equal(requests.length, 3, '判死后新的语音段不该再打上游')
  })
})

test('转写慢过说话：队列超上限丢最旧并报告断裂', async () => {
  await withSegmented(async ({ session, events, requests, speak }) => {
    session.start()
    // 首段占住在途，其后每多一段就挤掉最旧的一段（丢段在入队当场发生）。
    for (let i = 0; i < 4; i++) speak()
    assert.equal(requests.length, 1, '只有一段真正在途')
    assert.equal(events.gaps, 2, '4 段里最旧的两段被丢掉')
    await sleep(50)
    assert.equal(events.gaps, 2, '丢段是一次性的，不该反复报')
  }, { maxPending: 1 })
})

test('stop() 之后回来的结果既不交回合也不动字幕', async () => {
  await withSegmented(async ({ session, events, requests, speak, stopCount }) => {
    session.start()
    speak()
    await until('第一段在途', () => requests.length === 1)
    session.stop()
    assert.equal(stopCount(), 1, 'stop 必须真的关掉采集')
    requests[0].resolve('迟到的句子')
    await sleep(200)
    assert.deepEqual(events.turns, [])
    assert.deepEqual(events.partial, [])
  })
})

test('采集报 no-worklet → 会话级失败并关麦', async () => {
  const events = { fails: [], turns: [], partial: [] }
  let stopped = 0
  const session = createSegmentedRealtime(
    'zh-CN',
    { settleMs: 60, tailMs: 0, frameMs: 40, maxPending: 3, vad: { rms: 0.05, silenceMs: 100, prerollMs: 0, minSpeechMs: 20, maxSegmentMs: 5_000 } },
    { onPartial: () => {}, onTurn: () => {}, onLevel: () => {}, onFail: (code) => { events.fails.push(code) } },
    {
      capture: async (options) => { options.onFail('no-worklet'); return { stop: () => { stopped += 1 }, setMuted: () => {} } },
      transcribe: async () => '',
    },
  )
  session.start()
  await until('失败上报', () => events.fails.length === 1)
  assert.deepEqual(events.fails, ['no-worklet'])
  assert.equal(session.listening, false)
  assert.equal(stopped, 1)
})
