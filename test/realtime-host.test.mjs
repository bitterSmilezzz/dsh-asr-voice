import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RealtimeHost, SseChannel } from '../lib/realtime-host.js'
import { createFakeRealtimeProvider, FAKE_REALTIME_DEFAULTS } from '../lib/realtime-provider.js'

/**
 * I3 host 实时通道夹具：
 *   - 会话注册表：sid 由 host 铸造、不透明、无法伪造；生命周期 create → audio → events → close。
 *   - 4 条 exact 路由全部过 isTrusted（伪造 Host/Origin 即 403）。
 *   - SSE 下行背压：partial 可 coalesce、final/speech-stopped 必须最终送达。
 */

/** 极简 webserver register 替身：按 (kind, path) 存 handler，撞路径抛错（对齐官方契约）。 */
function makeRegistry() {
  const routes = new Map()
  const register = (def) => {
    const key = `${def.kind}:${def.path}`
    if (routes.has(key)) throw new Error(`duplicate route ${key}`)
    routes.set(key, def.handler)
    return () => { routes.delete(key) }
  }
  return { register, routes }
}

/** 可控的 ServerResponse 替身：记录写入、可手动触发 drain/close/背压。 */
class FakeRes {
  constructor() {
    this.headers = null
    this.body = ''
    this.drainCb = null
    this.closeCb = null
    this.ended = false
    this.writes = 0
    /** 内核缓冲满模拟：置 true 时 write 返回 false（drain 前一直背压）。 */
    this.backed = false
  }
  writeHead(status, headers) { this.status = status; this.headers = headers }
  flushHeaders() {}
  /**
   * 真实 `ServerResponse.write` 语义：**返回 false 不代表没写**——事件已被接受进内核
   * 缓冲、最终一定会送到对端，返回值只是「缓冲超水位，请等 drain 再写」。早先这里
   * 模拟成「背压 = 丢弃」，把实现里「返回 false 就不出队」的缺陷一起放过了（drain
   * 后同一条事件被重写一遍）。现在按真实语义建模：永远收下 chunk，背压只影响返回值。
   */
  write(chunk) {
    this.writes += 1
    this.body += chunk
    return !this.backed
  }
  once(event, cb) {
    if (event === 'drain') this.drainCb = cb
    if (event === 'close') this.closeCb = cb
  }
  on(event, cb) {
    if (event === 'close') this.closeCb = cb
  }
  removeListener() {}
  end(chunk) {
    // sendJson 走 res.end(body) 而不是 res.write：end 也要把 body 收进缓冲区，
    // 否则测试 JSON.parse(res.body) 拿到空串。
    if (chunk !== undefined) this.body += chunk
    this.ended = true
  }
}

/** 一条 SSE 响应里的所有 data 事件（按序）。 */
function sseEvents(res) {
  const out = []
  for (const line of res.body.split('\n')) {
    if (line.startsWith('data: ')) {
      out.push(JSON.parse(line.slice(6)))
    }
  }
  return out
}

/** 子串在响应体里出现几次（钉「不重复投递」用）。 */
function countOf(body, needle) {
  let n = 0
  let at = body.indexOf(needle)
  while (at !== -1) {
    n += 1
    at = body.indexOf(needle, at + needle.length)
  }
  return n
}

/** 16k int16 音频字节（一段音 / 一段静音）。 */
function toneBytes(ms, amp = 0.3) {
  const n = Math.round(16_000 * ms / 1000)
  const buf = new ArrayBuffer(n * 2)
  const view = new DataView(buf)
  for (let i = 0; i < n; i++) {
    const s = Math.sin(2 * Math.PI * 440 * i / 16_000) * amp
    view.setInt16(i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 0x7fff), true)
  }
  return new Uint8Array(buf)
}
function silenceBytes(ms) {
  return new Uint8Array(Math.round(16_000 * ms / 1000) * 2)
}

/** 构造一个 RealtimeHost（假 provider + 关心跳，测试确定性）。 */
function makeHost(overrides = {}) {
  return new RealtimeHost({
    createProvider: () => createFakeRealtimeProvider({ ...FAKE_REALTIME_DEFAULTS, silenceMs: 600 }).connect(),
    heartbeatMs: 0,
    ...overrides,
  })
}

function reqOf(method, url, { origin, host = '127.0.0.1:3080', body } = {}) {
  const headers = {}
  if (origin !== undefined) headers.origin = origin
  headers.host = host
  if (body !== undefined) headers['content-length'] = String(body.byteLength)
  const req = { method, url, headers, body: body ?? new Uint8Array(0) }
  req[Symbol.asyncIterator] = async function* () {
    const chunk = Buffer.from(req.body)
    if (chunk.length > 0) yield chunk
  }
  return req
}

test('会话注册表：sid 由 host 铸造（UUID），create/close 生命周期', async () => {
  const host = makeHost()
  const { sid } = await host.createSession()
  assert.ok(/^[0-9a-f-]{36}$/.test(sid), 'sid 应为 UUID 形状')
  assert.ok(host.hasSession(sid))
  host.closeSession(sid)
  assert.ok(!host.hasSession(sid))
  // 幂等关闭
  host.closeSession(sid)
})

test('会话注册表：未知 sid 的 audio 返回 false、close 无副作用', async () => {
  const host = makeHost()
  assert.equal(host.feedAudio('no-such-sid', toneBytes(100)), false)
  host.closeSession('no-such-sid') // 不抛
})

test('路由注册：4 条路径全部唯一（无撞路径），disposer 可回收', async () => {
  const { register, routes } = makeRegistry()
  const host = makeHost()
  const dispose = host.registerRoutes(register)
  const paths = [...routes.keys()]
  assert.equal(paths.length, 4)
  for (const p of ['exact:/api/asr-voice/realtime/session', 'exact:/api/asr-voice/realtime/audio', 'exact:/api/asr-voice/realtime/events', 'exact:/api/asr-voice/realtime/close']) {
    assert.ok(paths.includes(p), `missing route ${p}`)
  }
  dispose()
  assert.equal(routes.size, 0)
})

test('路由信任围栏：4 条路由全部拒绝伪造 Origin', async () => {
  const reg = makeRegistry()
  const host = makeHost()
  host.registerRoutes(reg.register)
  const dispatch = (method, url, origin) => new Promise((resolve) => {
    const res = new FakeRes()
    const origEnd = res.end.bind(res)
    res.end = () => { resolve({ status: res.status, body: res.body }); origEnd() }
    const handler = reg.routes.get(`exact:${url.split('?')[0]}`)
    handler(reqOf(method, url, { origin }), res)
  })
  for (const [method, url] of [
    ['POST', '/api/asr-voice/realtime/session'],
    ['POST', '/api/asr-voice/realtime/audio?sid=x'],
    ['GET', '/api/asr-voice/realtime/events?sid=x'],
    ['POST', '/api/asr-voice/realtime/close?sid=x'],
  ]) {
    const res = await dispatch(method, url, 'http://evil.test')
    assert.equal(res.status, 403, `${method} ${url} 应被信任围栏拒绝`)
  }
})

test('POST session → POST audio → SSE events 全链路（假 provider 驱动）', async () => {
  const host = makeHost()
  const { register, routes } = makeRegistry()
  host.registerRoutes(register)

  // 1. 建会话
  let res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/session')(reqOf('POST', '/api/asr-voice/realtime/session'), res)
  const created = JSON.parse(res.body)
  assert.equal(created.ok, true)
  const sid = created.sid

  // 2. 上行 PCM（一段音 + 静音 → 假 provider 切出一句）
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/audio')(reqOf('POST', `/api/asr-voice/realtime/audio?sid=${sid}`, { body: toneBytes(400) }), res)
  assert.equal(JSON.parse(res.body).ok, true)
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/audio')(reqOf('POST', `/api/asr-voice/realtime/audio?sid=${sid}`, { body: silenceBytes(800) }), res)
  assert.equal(JSON.parse(res.body).ok, true)

  // 3. 挂 SSE 下行
  const sseRes = new FakeRes()
  const ssePromise = (async () => {
    await routes.get('exact:/api/asr-voice/realtime/events')(reqOf('GET', `/api/asr-voice/realtime/events?sid=${sid}`), sseRes)
    // 事件在 handler 返回前已由 attachSse 的 pending 冲刷入 body（假 provider 同步产出）
  })()
  await ssePromise
  assert.equal(sseRes.status, 200)
  assert.match(sseRes.headers['content-type'], /text\/event-stream/)

  // 4. 再上行音（SSE 挂起后的事件实时入 body）：音 + 静音 → 实时切出第二句
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/audio')(reqOf('POST', `/api/asr-voice/realtime/audio?sid=${sid}`, { body: toneBytes(400) }), res)
  assert.equal(JSON.parse(res.body).ok, true)
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/audio')(reqOf('POST', `/api/asr-voice/realtime/audio?sid=${sid}`, { body: silenceBytes(800) }), res)
  assert.equal(JSON.parse(res.body).ok, true)
  // 音 + 静音分两次 send（FakeRes 无法等待真实字节，这里直接验证已发生的事）
  const events = sseEvents(sseRes)
  const types = events.map((e) => e.type)
  assert.ok(types.includes('speech-started'))
  assert.ok(types.includes('speech-stopped'))
  const finals = events.filter((e) => e.type === 'final')
  assert.ok(finals.length >= 1, `expected >=1 final, got ${finals.length}`)
  assert.match(finals[0].text, /^模拟转写·第\d+段$/)

  // 5. close
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/close')(reqOf('POST', `/api/asr-voice/realtime/close?sid=${sid}`), res)
  assert.equal(JSON.parse(res.body).ok, true)
  assert.ok(!host.hasSession(sid))
})

test('SSE 挂起前的上行事件缓冲：先 audio 后 events 不丢事件', async () => {
  const host = makeHost()
  const { register, routes } = makeRegistry()
  host.registerRoutes(register)

  let res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/session')(reqOf('POST', '/api/asr-voice/realtime/session'), res)
  const sid = JSON.parse(res.body).sid

  // 先上行（此时 SSE 未挂，事件进 pending 缓冲）：音 + 静音 → 完整切出一句
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/audio')(reqOf('POST', `/api/asr-voice/realtime/audio?sid=${sid}`, { body: toneBytes(400) }), res)
  assert.equal(JSON.parse(res.body).ok, true)
  res = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/audio')(reqOf('POST', `/api/asr-voice/realtime/audio?sid=${sid}`, { body: silenceBytes(800) }), res)
  assert.equal(JSON.parse(res.body).ok, true)

  // 后挂 SSE：缓冲被冲刷进 body
  const sseRes = new FakeRes()
  await routes.get('exact:/api/asr-voice/realtime/events')(reqOf('GET', `/api/asr-voice/realtime/events?sid=${sid}`), sseRes)
  const events = sseEvents(sseRes)
  assert.ok(events.some((e) => e.type === 'final'), '缓冲的上游事件应在挂 SSE 时送达')
  // 收尾：不 close 会让 10 分钟空闲定时器挂着，进程无法退出。
  host.closeSession(sid)
})

test('SSE 背压：命中背压的那条已送达（不得于 drain 后重写），partial 原位合并', async () => {
  // 真实 write 语义下 A 空闲直写；B 是「首条命中背压」的——它已经被写出，只是让通道
  // 进入背压态；C 在背压期间到达，最终被随后的 final 挤掉。
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })

  channel.enqueue({ type: 'partial', text: 'A' }) // 缓冲空闲，正常写入
  fakeRes.backed = true // 内核缓冲满
  channel.enqueue({ type: 'partial', text: 'B' }) // 首条命中背压：已写出，通道转背压
  channel.enqueue({ type: 'partial', text: 'C' }) // 背压中：可丢的中间结果
  channel.enqueue({ type: 'final', text: '模拟转写·第1段' }) // 背压中：挤掉队尾 partial

  assert.ok(fakeRes.drainCb !== null, '应挂 drain 监听')
  assert.equal(countOf(fakeRes.body, '"A"'), 1, '空闲期的事件必须写出')
  assert.equal(countOf(fakeRes.body, '"B"'), 1, '命中背压的事件已写出且只写一次（旧实现在 drain 后重写）')
  assert.equal(fakeRes.body.includes('"C"'), false, '背压期的 partial 不进 body')

  fakeRes.backed = false // 内核缓冲释放
  fakeRes.drainCb() // drain 后冲刷
  assert.equal(countOf(fakeRes.body, '模拟转写·第1段'), 1, 'final 必须最终送达，且不重复')
  assert.deepEqual(
    sseEvents(fakeRes).map((e) => e.text ?? e.type),
    ['A', 'B', '模拟转写·第1段'],
    '保序、不重复、不丢 final',
  )
  assert.ok(!fakeRes.body.includes('"C"'), '中间 partial 被 coalesce')

  channel.close()
})

test('SSE 背压：backed 期间 speech-stopped 不被队尾 partial 挤掉', async () => {
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })
  fakeRes.backed = true
  channel.enqueue({ type: 'speech-started' }) // 首条命中背压：已写出，通道转背压
  channel.enqueue({ type: 'partial', text: 'x' }) // 背压中：可丢
  channel.enqueue({ type: 'speech-stopped' }) // 不可丢：挤掉队尾 partial
  fakeRes.backed = false
  fakeRes.drainCb()
  const events = sseEvents(fakeRes)
  assert.deepEqual(events.map((e) => e.type), ['speech-started', 'speech-stopped'])
  channel.close()
})

test('SSE 背压：连续两句 final 都不丢、不重复（旧的单 coalesce 槽会顶掉第一句）', async () => {
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })
  fakeRes.backed = true
  channel.enqueue({ type: 'final', text: '第一句的最终结果' }) // 首条命中背压：已写出，通道转背压
  channel.enqueue({ type: 'partial', text: '第二句的草稿' }) // 会被随后的 final₂ 合并（冗余预览）
  channel.enqueue({ type: 'final', text: '第二句的最终结果' })
  fakeRes.backed = false
  fakeRes.drainCb()
  const events = sseEvents(fakeRes)
  assert.deepEqual(events.map((e) => e.text), ['第一句的最终结果', '第二句的最终结果'], '两句的 final 都必须送达且各一次')
  channel.close()
})

test('SSE 背压：final 之后的 partial 不得覆盖 final（同句 partial 才原位合并）', async () => {
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })
  fakeRes.backed = true
  channel.enqueue({ type: 'final', text: '这句说完了' }) // 首条命中背压：已写出，通道转背压
  channel.enqueue({ type: 'partial', text: '下一句的预览' })
  fakeRes.backed = false
  fakeRes.drainCb()
  const events = sseEvents(fakeRes)
  assert.deepEqual(events.map((e) => e.type), ['final', 'partial'], 'final 不可被后续 partial 顶掉')
  assert.equal(events[0].text, '这句说完了')
  channel.close()
})

test('SSE close 幂等：重复 close 不抛、end 只调用一次', async () => {
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })
  channel.close()
  channel.close()
  assert.equal(fakeRes.ended, true)
})

test('空闲超时：会话自动拆除（防泄漏）', async () => {
  let clock = 0
  const host = makeHost({ idleMs: 500, now: () => clock })
  const { sid } = await host.createSession()
  assert.ok(host.hasSession(sid))
  // 定时器触发前把时钟推到超过 idle：下一次 tick 判定空闲并拆除。
  clock = 10_000
  await new Promise((r) => setTimeout(r, 700))
  assert.ok(!host.hasSession(sid), '空闲会话应被自动拆除')
})

test('dispose()：插件卸载时逐个关闭活动会话（幂等，挂着的 SSE 一起释放）', async () => {
  const host = makeHost()
  const { sid: sid1 } = await host.createSession()
  const { sid: sid2 } = await host.createSession()
  // 给 sid1 挂一条 SSE：dispose 必须把下行通道一起关掉（心跳/close 监听随之释放）。
  const sseRes = new FakeRes()
  assert.equal(host.attachSse(sid1, sseRes), true)
  assert.ok(host.hasSession(sid1) && host.hasSession(sid2))

  host.dispose()
  assert.ok(!host.hasSession(sid1) && !host.hasSession(sid2), 'dispose 后所有会话应被拆除')
  assert.equal(sseRes.ended, true, '挂着的 SSE 下行应随 dispose 关闭')
  assert.equal(host.feedAudio(sid1, toneBytes(100)), false, '已拆除会话不再接受上行')
  // 幂等：重复 dispose 不抛、无副作用。
  host.dispose()
})

test('SSE 背压：pending 满 cap 时溢出只丢 partial/最旧 final，新 final 必达', async () => {
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })
  fakeRes.backed = true
  // 首条命中背压的事件**已写出**（只是让通道转背压态），因此它不占队列额度。
  channel.enqueue({ type: 'final', text: 'final-0' })
  // 再填满 64 条 final（全队都是不可丢的回合边界）。
  for (let i = 1; i <= 64; i++) channel.enqueue({ type: 'final', text: `final-${i}` })
  // 再来一条 partial：溢出必须优先丢新来的 partial，64 条 final 一条不能少
  //（旧实现 shift() 会丢掉最旧的 final，违反「final 必达」契约）。
  channel.enqueue({ type: 'partial', text: '可丢的中间结果' })
  // 再来一条 final：此时全队都是 final，才允许丢最旧（丢 final-1，保 final-65）。
  channel.enqueue({ type: 'final', text: 'final-65' })

  fakeRes.backed = false
  fakeRes.drainCb()
  const events = sseEvents(fakeRes)
  // 1 条已直写 + 队列 64 条：队列本身有界，直写的那条不重复。
  assert.equal(events.length, 65, '队列有界：溢出只降级，不无界增长')
  assert.equal(events[0].text, 'final-0', '首条命中背压的事件已送出且不重复')
  assert.equal(events[1].text, 'final-2', '全 final 溢出丢最旧（final-1），新 final 保序')
  assert.equal(events[64].text, 'final-65', '最新 final 必达')
  assert.ok(!events.some((e) => e.type === 'partial'), '溢出优先丢新来的 partial')
  assert.ok(!events.some((e) => e.text === 'final-1'), '仅当全队都是 final 才允许丢最旧')
  channel.close()
})
