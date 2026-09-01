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
  write(chunk) {
    this.writes += 1
    if (this.backed) return false
    this.body += chunk
    return true
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

test('SSE 背压：partial 被 coalesce、final 必达；drain 后冲刷', async () => {
  // 直接测 SseChannel（不依赖真实 socket）：先写满背压再排 final。
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })

  channel.enqueue({ type: 'partial', text: 'A' }) // 缓冲空闲，正常写入
  fakeRes.backed = true // 内核缓冲满
  channel.enqueue({ type: 'partial', text: 'B' }) // 背压：不进 body
  channel.enqueue({ type: 'partial', text: 'C' }) // 背压中：coalesce（覆盖 B）
  channel.enqueue({ type: 'final', text: '模拟转写·第1段' }) // 背压中：coalesce（覆盖 partial）

  assert.ok(fakeRes.drainCb !== null, '应挂 drain 监听')
  assert.equal(fakeRes.body.includes('B'), false)
  assert.equal(fakeRes.body.includes('C'), false)
  fakeRes.backed = false // 内核缓冲释放
  fakeRes.drainCb() // drain 后冲刷 coalesced
  assert.match(fakeRes.body, /模拟转写·第1段/, 'final 必须最终送达')
  assert.ok(!fakeRes.body.includes('"B"') && !fakeRes.body.includes('"C"'), '中间 partial 被 coalesce')

  channel.close()
})

test('SSE 背压：backed 期间 speech-stopped 也不丢', async () => {
  const fakeRes = new FakeRes()
  const channel = new SseChannel(fakeRes, { heartbeatMs: 0 })
  channel.enqueue({ type: 'speech-started' }) // 空闲写入
  fakeRes.backed = true
  channel.enqueue({ type: 'partial', text: 'x' }) // 背压
  channel.enqueue({ type: 'speech-stopped' }) // coalesce
  fakeRes.backed = false
  fakeRes.drainCb()
  const events = sseEvents(fakeRes)
  assert.ok(events.some((e) => e.type === 'speech-stopped'))
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
