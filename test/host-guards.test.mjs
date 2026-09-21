import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerTranscribeRoute } from '../lib/transcribe.js'
import { registerOptimizeRoute } from '../lib/optimize.js'
import { registerTtsRoute } from '../lib/realtime-tts.js'
import { MAX_UPSTREAM_JSON_BYTES } from '../lib/http.js'

/**
 * host 路由的「护栏」夹具：这些路径都在**真实请求**里才暴露，且都不依赖 Cordis——
 *   1. 诊断落盘默认关闭（隐私面：原始录音 + `?capture=1` 是本机任意页面可用的写盘原语）；
 *   2. 上游文本透出浏览器前必须脱敏（上游会把 `Bearer <key>` 回显进错误体）；
 *   3. 上游响应体无上限 = 宿主 OOM 入口；
 *   4. 在途并发上限（无上限时并发几发就能把内存打爆）；
 *   5. 非法请求体形状（JSON `null`）归 400 而不是「上游故障 502」；
 *   6. 优化输入/输出长度上限。
 * 全部按路由 handler 直接调用（不起真 server）：断言的是契约本身，不是 HTTP 栈。
 */

/** webserver register 替身：按 (kind, path) 存 handler。 */
function makeRegister() {
  const routes = new Map()
  return {
    routes,
    register: (def) => {
      routes.set(`${def.kind}:${def.path}`, def.handler)
      return () => routes.delete(`${def.kind}:${def.path}`)
    },
  }
}

/** ServerResponse 替身：只收 sendJson 的 writeHead + end。 */
function makeRes() {
  return {
    status: 0,
    headers: null,
    body: '',
    ended: false,
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end(chunk) { if (chunk !== undefined) this.body += chunk; this.ended = true },
    write(chunk) { this.body += chunk; return true },
    once() {},
    on() {},
    removeListener() {},
    flushHeaders() {},
  }
}

/** IncomingMessage 替身：body 走异步迭代器（readRawBody 的真实接口）。 */
function makeReq(url, body = Buffer.alloc(0), headers = {}) {
  const req = {
    method: 'POST',
    url,
    headers: { host: '127.0.0.1:3080', 'content-type': 'audio/webm', 'user-agent': 'Chrome/150', ...headers },
  }
  req[Symbol.asyncIterator] = async function* () {
    if (body.length > 0) yield body
  }
  return req
}

/** 可信的回环请求（信任围栏放行）。 */
const TRUSTED = { host: '127.0.0.1:3080' }

/** ctx 替身：凭据服务给一把假 key（转写/TTS 路由都要）。 */
function ctxWithKey(key = 'test-key') {
  return { get: (name) => (name === 'credentials' ? { resolve: async () => ({ value: key }) } : undefined) }
}

const CFG = { id: 'p1', preset: 'openai', name: '', baseUrl: 'https://upstream.test/v1', apiKey: '', model: 'whisper-1', mode: 'transcriptions' }

/** 临时改环境变量并保证还原。 */
async function withEnv(patch, run) {
  const saved = new Map()
  for (const [k, v] of Object.entries(patch)) {
    saved.set(k, Object.prototype.hasOwnProperty.call(process.env, k) ? process.env[k] : undefined)
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    return await run()
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

/** 临时替换全局 fetch（上游替身）并保证还原。 */
async function withFetch(fake, run) {
  const prev = globalThis.fetch
  globalThis.fetch = fake
  try {
    return await run()
  } finally {
    globalThis.fetch = prev
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 1. 诊断落盘默认关闭 ─────────────────────────────────────────────────────

test('/transcribe?capture=1：默认关闭 → 合法 JSON 说明 disabled，且一条都不写盘', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'asr-voice-guards-'))
  try {
    await withEnv({ DSH_ASR_DEBUG_DIR: dir, DSH_ASR_DEBUG_KEEP_WAVS: undefined }, async () => {
      const { routes, register } = makeRegister()
      registerTranscribeRoute(register, () => CFG, ctxWithKey(), undefined)
      const res = makeRes()
      await routes.get('exact:/api/asr-voice/transcribe')(
        makeReq('/api/asr-voice/transcribe?capture=1', Buffer.from('raw-audio-bytes'), TRUSTED),
        res,
      )
      assert.equal(res.status, 200, '关闭时仍是合法响应（不写盘 ≠ 报错）')
      const body = JSON.parse(res.body)
      assert.equal(body.ok, false)
      assert.equal(body.saved, false)
      assert.match(body.reason, /capture disabled/)
      await sleep(50) // 落盘是 fire-and-forget：给潜在的误写留出暴露窗口
      assert.deepEqual(await readdir(dir), [], '默认关闭时目录必须一条都没有')
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('/transcribe?capture=1：显式开启后写盘（诊断路径仍可用）', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'asr-voice-guards-'))
  try {
    await withEnv({ DSH_ASR_DEBUG_DIR: dir, DSH_ASR_DEBUG_KEEP_WAVS: '1' }, async () => {
      const { routes, register } = makeRegister()
      registerTranscribeRoute(register, () => CFG, ctxWithKey(), undefined)
      const res = makeRes()
      await routes.get('exact:/api/asr-voice/transcribe')(
        makeReq('/api/asr-voice/transcribe?capture=1', Buffer.from('raw-audio-bytes'), TRUSTED),
        res,
      )
      assert.equal(JSON.parse(res.body).saved, true)
      let files = []
      for (let i = 0; i < 40 && files.length === 0; i++) {
        await sleep(25)
        files = await readdir(dir)
      }
      assert.equal(files.length, 1, `开关打开时应落盘一条，实际 ${files.length}`)
      assert.match(files[0], /raw-Chrome150\.webm$/, '文件名带 UA 标签与 MIME 扩展名')
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('/transcribe?capture=1：目录裁剪（文件数上限）在写盘后生效', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'asr-voice-guards-'))
  try {
    await withEnv({ DSH_ASR_DEBUG_DIR: dir, DSH_ASR_DEBUG_KEEP_WAVS: '1' }, async () => {
      // 预置 100 个「旧样本」（文件名按 ISO 时间戳排序，故裁剪一定从最旧的开始）。
      const stale = []
      for (let i = 0; i < 100; i++) {
        const name = `2020-01-01T00-00-${String(i).padStart(2, '0')}-000Z-1B-UA.webm`
        stale.push(name)
        await writeFile(join(dir, name), Buffer.from([0]))
      }
      const { routes, register } = makeRegister()
      registerTranscribeRoute(register, () => CFG, ctxWithKey(), undefined)
      const res = makeRes()
      await routes.get('exact:/api/asr-voice/transcribe')(
        makeReq('/api/asr-voice/transcribe?capture=1', Buffer.from('raw-audio-bytes'), TRUSTED),
        res,
      )
      assert.equal(JSON.parse(res.body).saved, true)

      let files = []
      for (let i = 0; i < 40; i++) {
        await sleep(25)
        files = await readdir(dir)
        if (files.length <= 100 && files.some((f) => f.includes('raw-Chrome150'))) break
      }
      assert.equal(files.length, 100, `裁剪后应恰好保留 100 个，实际 ${files.length}`)
      assert.equal(files.includes(stale[0]), false, '最旧的一条应被裁掉')
      assert.equal(files.some((f) => f.includes('raw-Chrome150')), true, '刚写的这条永不被裁')
    })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

// ── 2. 上游文本脱敏 ─────────────────────────────────────────────────────────

test('/transcribe：上游错误回显 Bearer key → reason 已脱敏', async () => {
  await withFetch(
    async () => new Response(JSON.stringify({ error: 'invalid api key: Bearer sk-live-abcdef123456' }), { status: 401 }),
    async () => {
      const { routes, register } = makeRegister()
      registerTranscribeRoute(register, () => CFG, ctxWithKey(), undefined)
      const res = makeRes()
      await routes.get('exact:/api/asr-voice/transcribe')(makeReq('/api/asr-voice/transcribe', Buffer.from('audio'), TRUSTED), res)
      const body = JSON.parse(res.body)
      assert.equal(res.status, 502)
      assert.match(body.reason, /<redacted>/, '密钥形状必须被剥掉')
      assert.equal(body.reason.includes('sk-live'), false, 'reason 不得含密钥原文')
    },
  )
})

// ── 3. 上游响应体上限 ───────────────────────────────────────────────────────

test('/transcribe：上游声明超限响应体 → 502「too large」（不读进内存）', async () => {
  await withFetch(
    async () => new Response('{}', { headers: { 'content-length': String(MAX_UPSTREAM_JSON_BYTES + 1) } }),
    async () => {
      const { routes, register } = makeRegister()
      registerTranscribeRoute(register, () => CFG, ctxWithKey(), undefined)
      const res = makeRes()
      await routes.get('exact:/api/asr-voice/transcribe')(makeReq('/api/asr-voice/transcribe', Buffer.from('audio'), TRUSTED), res)
      assert.equal(res.status, 502, '超限按上游故障报（502），不是请求侧问题')
      assert.match(JSON.parse(res.body).reason, /too large/)
    },
  )
})

// ── 4. 在途并发上限 ─────────────────────────────────────────────────────────

test('/transcribe：在途上限 4 → 第 5 个请求 503，前 4 个照常完成', async () => {
  let fetchCalls = 0
  let release = () => {}
  const gate = new Promise((resolve) => { release = resolve })
  await withFetch(async () => {
    fetchCalls += 1
    await gate
    return new Response(JSON.stringify({ text: '转写结果' }))
  }, async () => {
    const { routes, register } = makeRegister()
    registerTranscribeRoute(register, () => CFG, ctxWithKey(), undefined)
    const handler = routes.get('exact:/api/asr-voice/transcribe')

    const running = []
    for (let i = 0; i < 4; i++) {
      const res = makeRes()
      running.push(handler(makeReq('/api/asr-voice/transcribe', Buffer.from('audio'), TRUSTED), res).then(() => res))
    }
    // 等 4 条都进到上游（此后它们在途计数就是 4）
    for (let i = 0; i < 200 && fetchCalls < 4; i++) await sleep(5)
    assert.equal(fetchCalls, 4)

    const fifth = makeRes()
    await handler(makeReq('/api/asr-voice/transcribe', Buffer.from('audio'), TRUSTED), fifth)
    assert.equal(fifth.status, 503, '超限必须立刻拒绝')
    assert.equal(JSON.parse(fifth.body).reason, 'too many concurrent requests')
    assert.equal(fetchCalls, 4, '被拒的请求不得打到上游')

    release()
    const done = await Promise.all(running)
    for (const res of done) {
      assert.equal(res.status, 200)
      assert.equal(JSON.parse(res.body).text, '转写结果')
    }

    // 在途计数已回落（finally 递减）：再来一发不该再吃 503。
    const after = makeRes()
    await handler(makeReq('/api/asr-voice/transcribe', Buffer.from('audio'), TRUSTED), after)
    assert.equal(after.status, 200, '计数必须在 finally 里递减，否则一次峰值就把路由永久锁死')
  })
})

// ── 5. 非法请求体形状 → 400（不是 502「上游故障」）────────────────────────────

test('/tts：在途上限 4 → 第 5 个请求 503（与 transcribe/optimize 同构）', async () => {
  // TTS 每条请求都会开一条云端付费 WebSocket 并堆一份 PCM，无上限时异常页面循环
  // POST 会让宿主同时持有 N 条 WS + N 份音频缓冲。这里 stub WebSocket 让前 4 条
  // 挂在「等上游响应」上，验证第 5 条被立刻拒绝且不打到上游。
  const created = []
  const RealWs = globalThis.WebSocket
  class FakeWs {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
    readyState = FakeWs.CONNECTING
    onopen = null
    onmessage = null
    onerror = null
    onclose = null
    constructor(url) { this.url = url; created.push(this) }
    send() {}
    close() { this.readyState = FakeWs.CLOSED }
    /** 测试钩子：模拟上游回一段音频并关闭。 */
    emitDone(bytes) {
      this.onmessage?.({ data: Buffer.from(JSON.stringify({
        type: 'response.audio.delta', delta: bytes.toString('base64'),
      })) })
      this.onmessage?.({ data: Buffer.from(JSON.stringify({ type: 'response.audio.done' })) })
      this.onclose?.()
    }
  }
  globalThis.WebSocket = FakeWs
  try {
    const { routes, register } = makeRegister()
    registerTtsRoute(register, () => undefined, ctxWithKey())
    const handler = routes.get('exact:/api/asr-voice/tts')
    const body = JSON.stringify({ text: '你好' })
    const running = []
    for (let i = 0; i < 4; i++) {
      running.push(handler(makeReq('/api/asr-voice/tts', Buffer.from(body), { ...TRUSTED, 'content-type': 'application/json' }), makeRes()))
    }
    for (let i = 0; i < 200 && created.length < 4; i++) await sleep(5)
    assert.equal(created.length, 4, '前 4 条应各建一条 WS')

    const fifth = makeRes()
    await handler(makeReq('/api/asr-voice/tts', Buffer.from(body), { ...TRUSTED, 'content-type': 'application/json' }), fifth)
    assert.equal(fifth.status, 503, '超限必须立刻拒绝')
    assert.equal(JSON.parse(fifth.body).reason, 'too many concurrent requests')
    assert.equal(created.length, 4, '被拒的请求不得新建 WebSocket')

    // 放行前 4 条：在途计数回落（finally 递减），路由不锁死。
    for (const ws of created) ws.emitDone(Buffer.alloc(1024))
    await Promise.all(running)
    const after = makeRes()
    handler(makeReq('/api/asr-voice/tts', Buffer.from(body), { ...TRUSTED, 'content-type': 'application/json' }), after)
    for (let i = 0; i < 200 && created.length < 5; i++) await sleep(5)
    assert.equal(created.length, 5, '计数必须在 finally 里递减')
  } finally {
    globalThis.WebSocket = RealWs
  }
})

/** 优化路由的 ctx 替身：当前所选模型 + 可编排的 LLM 流。 */
function ctxWithLlm(chunks) {
  return {
    get: (name) => (name === 'agentDefaultModel' ? { currentSelection: () => ({ provider: 'p', model: 'm' }) } : undefined),
    llm: {
      stream: async function* () { for (const c of chunks) yield c },
    },
  }
}

test('/optimize：JSON null → 400（此前抛 TypeError 被兜成 502）', async () => {
  const { routes, register } = makeRegister()
  registerOptimizeRoute(register, ctxWithLlm([]))
  const res = makeRes()
  await routes.get('exact:/api/asr-voice/optimize')(makeReq('/api/asr-voice/optimize', Buffer.from('null'), TRUSTED), res)
  assert.equal(res.status, 400)
  assert.match(JSON.parse(res.body).reason, /expected an object/)
})

test('/tts：JSON null → 400（此前 TypeError 逃出 handler，客户端拿不到原因）', async () => {
  const { routes, register } = makeRegister()
  registerTtsRoute(register, () => undefined, ctxWithKey())
  const res = makeRes()
  await routes.get('exact:/api/asr-voice/tts')(makeReq('/api/asr-voice/tts', Buffer.from('null'), { ...TRUSTED, 'content-type': 'application/json' }), res)
  assert.equal(res.status, 400)
  assert.match(JSON.parse(res.body).reason, /expected an object/)
})

// ── 6. 优化输入/输出上限 ────────────────────────────────────────────────────

test('/optimize：输入超 10000 字符 → 400（不白烧一次模型调用）', async () => {
  let called = false
  const ctx = ctxWithLlm([{ type: 'text-delta', text: 'x' }])
  ctx.llm.stream = async function* () { called = true; yield { type: 'text-delta', text: 'x' } }
  const { routes, register } = makeRegister()
  registerOptimizeRoute(register, ctx)
  const res = makeRes()
  await routes.get('exact:/api/asr-voice/optimize')(
    makeReq('/api/asr-voice/optimize', Buffer.from(JSON.stringify({ text: 'x'.repeat(10_001) })), { ...TRUSTED, 'content-type': 'application/json' }),
    res,
  )
  assert.equal(res.status, 400)
  assert.match(JSON.parse(res.body).reason, /text too long \(10001 > 10000\)/)
  assert.equal(called, false, '超长输入不该打到模型')
})

test('/optimize：输出超 20000 字符 → 截断并标注 truncated: true', async () => {
  const { routes, register } = makeRegister()
  registerOptimizeRoute(register, ctxWithLlm([{ type: 'text-delta', text: 'x'.repeat(25_000) }]))
  const res = makeRes()
  await routes.get('exact:/api/asr-voice/optimize')(
    makeReq('/api/asr-voice/optimize', Buffer.from(JSON.stringify({ text: '一段话' })), { ...TRUSTED, 'content-type': 'application/json' }),
    res,
  )
  assert.equal(res.status, 200)
  const body = JSON.parse(res.body)
  assert.equal(body.truncated, true)
  assert.equal(body.text.length, 20_000)
})

test('/optimize：正常输出不标注 truncated', async () => {
  const { routes, register } = makeRegister()
  registerOptimizeRoute(register, ctxWithLlm([{ type: 'text-delta', text: '整理后的文本' }]))
  const res = makeRes()
  await routes.get('exact:/api/asr-voice/optimize')(
    makeReq('/api/asr-voice/optimize', Buffer.from(JSON.stringify({ text: '嗯那个' })), { ...TRUSTED, 'content-type': 'application/json' }),
    res,
  )
  assert.equal(res.status, 200)
  assert.deepEqual(JSON.parse(res.body), { ok: true, text: '整理后的文本', truncated: false })
})

test('/optimize：上游失败原因里的 Bearer key 已脱敏', async () => {
  const { routes, register } = makeRegister()
  registerOptimizeRoute(register, ctxWithLlm([
    { type: 'finish', reason: { kind: 'error', failure: { message: 'gateway rejected Bearer sk-live-abcdef123456' } } },
  ]))
  const res = makeRes()
  await routes.get('exact:/api/asr-voice/optimize')(
    makeReq('/api/asr-voice/optimize', Buffer.from(JSON.stringify({ text: '一段话' })), { ...TRUSTED, 'content-type': 'application/json' }),
    res,
  )
  assert.equal(res.status, 502)
  const body = JSON.parse(res.body)
  assert.match(body.reason, /<redacted>/)
  assert.equal(body.reason.includes('sk-live'), false)
})
