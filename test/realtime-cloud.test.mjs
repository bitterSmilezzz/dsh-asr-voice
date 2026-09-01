import { test } from 'node:test'
import assert from 'node:assert/strict'

// realtime-cloud.ts 顶层不碰 DOM（采集与传输都是注入的），按 pcm.test.mjs 的
// 做法用 node 的类型剥离跑源码。
const { createCloudRealtime } = await import('../src/client/realtime-cloud.ts')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 等某个异步事实发生（有界）。网络上行/会话建连都是异步的，固定 sleep 会变成
 * 和测试自己赛跑。
 */
async function until(label, predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`超时：${label}`)
    await sleep(5)
  }
}

const SR = 16_000
/** 一帧 `ms` 毫秒、定幅 `amp` 的 16k 采样。 */
const frame = (ms, amp) => new Float32Array(Math.round(SR * ms / 1000)).fill(amp)

/**
 * 云端引擎夹具：注入假采集（记录 onFrame 回调）+ 假传输（可控会话/上行/事件/关闭）。
 * 事件由测试手动投喂——服务端什么时候给 final 不可控，这里必须可控。
 */
async function withCloud(run, opts = {}) {
  const events = { partial: [], turns: [], fails: [] }
  const sinks = []
  const mutes = []
  let stops = 0
  let closeCount = 0
  const sessions = []
  const uploads = []
  let eventSink = null
  let disposeEvents = null

  const capture = async (options) => {
    sinks.push(options)
    return {
      stop: () => { stops += 1 },
      setMuted: (muted) => { mutes.push(muted) },
    }
  }
  const transport = {
    createSession: async () => {
      const sid = `sid-${sessions.length + 1}`
      sessions.push(sid)
      return sid
    },
    upload: async (sid, pcm) => { uploads.push({ sid, bytes: pcm.byteLength }) },
    openEvents: (sid, onEvent) => {
      eventSink = { sid, onEvent }
      disposeEvents = () => { eventSink = null }
      return () => { disposeEvents?.() }
    },
    closeSession: async (sid) => { closeCount += 1; void sid },
  }
  const session = createCloudRealtime(
    { frameMs: opts.frameMs ?? 40 },
    {
      onPartial: (text) => { events.partial.push(text) },
      onTurn: (text) => { events.turns.push(text) },
      onLevel: () => {},
      onFail: (code) => { events.fails.push(code) },
    },
    { capture, transport },
  )
  /** 把声音直接灌进采集回调。 */
  const feed = (ms, amp) => { sinks.at(-1)?.onFrame(frame(ms, amp)) }
  /** 投喂一个上游事件。 */
  const emit = (ev) => eventSink?.onEvent(ev)
  try {
    await run({
      session, events, sessions, uploads, feed, emit, mutes,
      stopCount: () => stops, closeCount: () => closeCount,
    })
  } finally {
    session.stop()
  }
}

test('start → 建会话 → 上行 int16 帧 → final 即回合', async () => {
  await withCloud(async ({ session, events, sessions, uploads, feed, emit }) => {
    session.start()
    await until('建会话', () => sessions.length === 1)
    feed(40, 0.2) // 一段有声帧
    await until('帧上行', () => uploads.length === 1)
    assert.equal(uploads[0].sid, 'sid-1')
    assert.equal(uploads[0].bytes, SR * 40 / 1000 * 2, '40ms 帧 = 1280 字节 int16 LE')
    emit({ type: 'partial', text: '帮我记' })
    assert.deepEqual(events.partial, ['帮我记'])
    emit({ type: 'final', text: '帮我记一下' })
    await until('回合交出', () => events.turns.length === 1)
    assert.deepEqual(events.turns, ['帮我记一下'])
  })
})

test('静音守卫：趋零帧不上行', async () => {
  await withCloud(async ({ session, sessions, uploads, feed }) => {
    session.start()
    await until('建会话', () => sessions.length === 1)
    feed(80, 0) // 纯静音
    feed(120, 0.0001) // 接近零
    await sleep(80)
    assert.equal(uploads.length, 0, '无信号帧不该白烧上游带宽')
  })
})

test('partial 驱动字幕、final 驱动回合：连续两句各自成回合', async () => {
  await withCloud(async ({ session, events, sessions, feed, emit }) => {
    session.start()
    await until('建会话', () => sessions.length === 1)
    feed(40, 0.2)
    emit({ type: 'partial', text: '第一句' })
    emit({ type: 'final', text: '第一句' })
    await until('第一回合', () => events.turns.length === 1)
    feed(40, 0.2)
    emit({ type: 'partial', text: '第二句' })
    emit({ type: 'final', text: '第二句' })
    await until('第二回合', () => events.turns.length === 2)
    assert.deepEqual(events.turns, ['第一句', '第二句'])
  })
})

test('pause 停上行不关会话，resume 恢复上行', async () => {
  await withCloud(async ({ session, events, sessions, uploads, feed, emit, mutes }) => {
    session.start()
    await until('建会话', () => sessions.length === 1)
    feed(40, 0.2)
    await until('帧上行', () => uploads.length === 1)
    session.pause()
    assert.deepEqual(mutes, [true], '播报期间轨道静音')
    feed(80, 0.2)
    emit({ type: 'final', text: '播报里的回声' })
    await sleep(60)
    assert.equal(uploads.length, 1, 'pause 后帧不再上行')
    assert.deepEqual(events.turns, [], 'pause 期 final 不该成回合')
    session.resume()
    assert.deepEqual(mutes, [true, false])
    feed(40, 0.2)
    await until('恢复上行', () => uploads.length === 2)
    emit({ type: 'final', text: '恢复后的新句' })
    await until('恢复后成回合', () => events.turns.length === 1)
    assert.deepEqual(events.turns, ['恢复后的新句'])
  })
})

test('stop 关会话且不再有回调；连续失败判死', async () => {
  await withCloud(async ({ session, events, sessions, emit, closeCount }) => {
    session.start()
    await until('建会话', () => sessions.length === 1)
    emit({ type: 'error', code: 'boom' })
    emit({ type: 'error', code: 'boom' })
    emit({ type: 'error', code: 'boom' })
    await until('三次错误判死', () => events.fails.length === 1)
    assert.deepEqual(events.fails, ['boom'])
    session.stop()
    assert.equal(closeCount(), 1, '判死关一次；stop 幂等不再重复关')
    emit({ type: 'final', text: 'stop 后的结果' })
    await sleep(40)
    assert.deepEqual(events.turns, [], 'stop 后不得再来任何回调')
  })
})

test('建会话失败直接判死（provider 不可达）', async () => {
  const capture = async () => ({ stop() {}, setMuted() {} })
  const transport = {
    createSession: async () => { throw new Error('connection refused') },
    upload: async () => {},
    openEvents: () => () => {},
    closeSession: async () => {},
  }
  const fails = []
  const session = createCloudRealtime({ frameMs: 40 }, {
    onPartial: () => {}, onTurn: () => {}, onLevel: () => {},
    onFail: (code) => { fails.push(code) },
  }, { capture, transport })
  session.start()
  await until('建会话失败判死', () => fails.length === 1)
  assert.deepEqual(fails, ['provider-unreachable'])
  session.stop()
})

test('建会话返回时已 stop：立刻关掉空会话，不留孤儿', async () => {
  let resolveCreate
  const createPromise = new Promise((res) => { resolveCreate = res })
  const closes = []
  const capture = async () => ({ stop() {}, setMuted() {} })
  const transport = {
    createSession: () => createPromise,
    upload: async () => {},
    openEvents: () => () => {},
    closeSession: async (sid) => { closes.push(sid) },
  }
  const session = createCloudRealtime({ frameMs: 40 }, {
    onPartial: () => {}, onTurn: () => {}, onLevel: () => {}, onFail: () => {},
  }, { capture, transport })
  session.start()
  session.stop() // 授权弹窗挂起期间停掉
  resolveCreate('orphan-sid')
  await sleep(40)
  assert.deepEqual(closes, ['orphan-sid'], '迟到的 sid 必须被关掉')
})

test('SSE 断流（events-unavailable）即刻判死：pause 期也不吞', async () => {
  await withCloud(async ({ session, events, sessions, emit, closeCount }) => {
    session.start()
    await until('建会话', () => sessions.length === 1)
    // 播报期（半双工 pause 中）事件流断了：错误必须穿透 pause 门控即刻判死，
    // 否则引擎聋死到 resume 也没有提示。
    session.pause()
    emit({ type: 'error', code: 'events-unavailable' })
    await until('断流判死', () => events.fails.length === 1)
    assert.deepEqual(events.fails, ['events-unavailable'])
    assert.equal(closeCount(), 1, '判死关会话')
  })
})

test('provider 单次 error 不判死，连续三次才判死', async () => {
  await withCloud(async ({ session, events, emit }) => {
    session.start()
    await until('建会话', () => true)
    emit({ type: 'error', code: 'boom' })
    emit({ type: 'error', code: 'boom' })
    await sleep(60)
    assert.deepEqual(events.fails, [], '单次/两次错误只计数')
    emit({ type: 'error', code: 'boom' })
    await until('三次判死', () => events.fails.length === 1)
    assert.deepEqual(events.fails, ['boom'])
  })
})
