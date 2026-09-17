import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readRawBody, readJsonBody, sendJson, guardRoute, HttpBodyError, statusOfBodyError, redactSecret, readUpstreamJson, MAX_UPSTREAM_JSON_BYTES } from '../lib/http.js'

/** 起一个真实 http server，跑完即关（readRawBody 的 socket 行为只能在真实连接上验证）。 */
async function withServer(handler, run) {
  const server = http.createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try {
    await run(port)
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

test('readRawBody: 正常读取完整 body（分片到达）', async () => {
  await withServer(async (req, res) => {
    const buf = await readRawBody(req, 1024)
    res.end(`${buf.length}:${buf.toString('utf8')}`)
  }, async (port) => {
    const body = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST' }, (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => resolve(data))
      })
      req.on('error', reject)
      req.write('part1')
      req.write('part2')
      req.end()
    })
    assert.equal(body, '10:part1part2')
  })
})

test('readRawBody: 超过 maxBytes 抛错（不等读完）', async () => {
  let caught = ''
  await withServer(async (req, res) => {
    try {
      await readRawBody(req, 10)
      res.end('no-error')
    } catch (error) {
      caught = error.message
      res.statusCode = 413
      res.end('too-large')
    }
  }, async (port) => {
    const status = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-length': '20' } }, (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode))
      })
      req.on('error', reject)
      req.write('0123456789ABCDEF')
      req.end()
    })
    assert.equal(status, 413)
    assert.match(caught, /exceeds 10 bytes/)
  })
})

test('readRawBody: 读取停滞超过 timeoutMs 销毁连接（客户端感知连接被断）', async () => {
  await withServer(async (req, res) => {
    try {
      await readRawBody(req, 1024 * 1024, 150)
      res.end('no-error')
    } catch {
      // 超时 destroy：此时 socket 已死，响应写不出去也正常（不抛、不崩即可）。
      res.end('timed-out')
    }
  }, async (port) => {
    const errCode = await new Promise((resolve) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-length': '100000' } })
      req.on('error', (e) => resolve(e.code ?? String(e)))
      req.on('close', () => resolve('close'))
      req.write('partial') // 声明 100000 字节只发 7 字节 → 服务端读到停滞 → 超时销毁
      // 不 end：让上传挂起
    })
    // 服务端 destroy 后，客户端应感知连接异常（ECONNRESET）或至少 close。
    assert.ok(typeof errCode === 'string' && errCode !== '', `应感知断连，实际 ${errCode}`)
  })
})

test('readJsonBody: 空 body 返回 {}，非法 JSON 抛错', async () => {
  await withServer(async (req, res) => {
    try {
      const parsed = await readJsonBody(req)
      res.end(JSON.stringify({ ok: true, parsed }))
    } catch (error) {
      res.end(JSON.stringify({ ok: false, reason: error.message }))
    }
  }, async (port) => {
    const post = (body) => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST' }, (res) => {
        let data = ''
        res.on('data', (c) => { data += c })
        res.on('end', () => resolve(JSON.parse(data)))
      })
      req.on('error', reject)
      req.end(body)
    })
    const empty = await post('')
    assert.deepEqual(empty, { ok: true, parsed: {} })
    const bad = await post('{not json')
    assert.equal(bad.ok, false)
    assert.equal(bad.reason, 'invalid JSON body')
    const good = await post('{"a":1}')
    assert.deepEqual(good.parsed, { a: 1 })
  })
})

// ── body 错误的状态码语义（413/408/400）───────────────────────────────────────
// 这些状态码此前被路由一律映射成 502，把「客户端发了 30MB」记成「上游故障」。
// 钉住三件事：错误类型自带 status、instanceof 能穿过 req.destroy/for-await、映射函数不误伤普通错误。

test('HttpBodyError: readRawBody 超限抛 413（且 socket 未被毁，响应真能送达）', async () => {
  let caught = null
  await withServer(async (req, res) => {
    try {
      await readRawBody(req, 10)
      res.end('no-error')
    } catch (error) {
      caught = error
      res.statusCode = statusOfBodyError(error, 502)
      res.end('too-large')
    }
  }, async (port) => {
    const status = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-length': '20' } }, (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode))
      })
      req.on('error', reject)
      req.write('0123456789ABCDEF')
      req.end()
    })
    // 关键：413 必须真的到达客户端（超限路径不 destroy socket，只是停止读取）。
    assert.equal(status, 413)
    assert.ok(caught instanceof HttpBodyError, `应为 HttpBodyError，实际 ${caught?.constructor?.name}`)
    assert.equal(caught.status, 413)
  })
})

test('HttpBodyError: 读取停滞超时抛 408（instanceof 穿过 req.destroy）', async () => {
  let caught = null
  await withServer(async (req, res) => {
    try {
      await readRawBody(req, 1024 * 1024, 100)
    } catch (error) {
      caught = error
      res.end('timed-out')
    }
  }, async (port) => {
    await new Promise((resolve) => {
      const req = http.request({ host: '127.0.0.1', port, method: 'POST', headers: { 'content-length': '100000' } })
      req.on('error', resolve)
      req.on('close', resolve)
      req.write('partial') // 声明 100000 只发 7 → 停滞
    })
    // destroy 会连 socket 一起收掉（408 到不了客户端），但错误对象本身必须带对状态码。
    assert.ok(caught instanceof HttpBodyError, `应为 HttpBodyError，实际 ${caught?.constructor?.name}`)
    assert.equal(caught.status, 408)
  })
})

test('HttpBodyError: readJsonBody 非法 JSON 抛 400，超限抛 413', async () => {
  const bad = await readJsonBody({ [Symbol.asyncIterator]: async function* () { yield Buffer.from('{not json') } })
    .then(() => null, (e) => e)
  assert.ok(bad instanceof HttpBodyError)
  assert.equal(bad.status, 400)

  const big = await readJsonBody(
    { [Symbol.asyncIterator]: async function* () { yield Buffer.alloc(2048) } },
    16,
  ).then(() => null, (e) => e)
  assert.ok(big instanceof HttpBodyError)
  assert.equal(big.status, 413)
})

test('statusOfBodyError: 普通错误回退 fallback（不被误判成请求侧问题）', () => {
  assert.equal(statusOfBodyError(new Error('upstream 500'), 502), 502)
  assert.equal(statusOfBodyError('not an error', 400), 400)
  assert.equal(statusOfBodyError(new HttpBodyError(413, 'x'), 502), 413)
})

test('guardRoute: 信任围栏 + method 白名单', () => {
  // 无 Origin 的回环 Host = 可信
  const trusted = { method: 'POST', headers: { host: '127.0.0.1:3080' } }
  assert.equal(guardRoute(trusted, ['POST']), null)
  assert.equal(guardRoute(trusted, ['GET']).status, 405)
  // 伪造 Origin = 403
  const evil = { method: 'POST', headers: { host: '127.0.0.1:3080', origin: 'http://evil.test' } }
  assert.equal(guardRoute(evil, ['POST']).status, 403)
  // 非回环 Host（DNS rebinding 手法）= 403
  const rebinding = { method: 'POST', headers: { host: '127.0.0.1.evil.com' } }
  assert.equal(guardRoute(rebinding, ['POST']).status, 403)
})

test('sendJson: 状态码 / JSON 头 / content-length 齐全', () => {
  const chunks = []
  const res = {
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end(body) { chunks.push(body) },
  }
  sendJson(res, 200, { ok: true, text: '你好' })
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  assert.equal(res.headers['content-length'], Buffer.byteLength(JSON.stringify({ ok: true, text: '你好' })))
  assert.equal(chunks.join(''), JSON.stringify({ ok: true, text: '你好' }))
})

// ── 上游文本脱敏（reason 直通浏览器前的最后一道）─────────────────────────────
// 上游（或用户自填的恶意 baseUrl）会把请求材料回显进错误体，而这些文本会经路由的
// reason 显示给用户——等于把 key 印在页面上。

test('redactSecret: 剥离 Bearer / sk- / ASR_VOICE_ 形状的密钥材料', () => {
  assert.equal(
    redactSecret('unauthorized: Bearer sk-live-abcdefgh12345678 rejected'),
    'unauthorized: <redacted> rejected',
  )
  assert.equal(redactSecret('bad key sk-proj-ABCDEFGH1234_xyz'), 'bad key <redacted>')
  assert.equal(
    redactSecret('credential ASR_VOICE_MY_PROVIDER_API_KEY not found'),
    'credential <redacted> not found',
  )
  // 短到不可能是密钥的 sk- 前缀不误伤（如 sk-1 这种模型名片段）
  assert.equal(redactSecret('model sk-1 unavailable'), 'model sk-1 unavailable')
})

test('redactSecret: 折叠空白 + 截断到 maxLen（超出加省略号）', () => {
  assert.equal(redactSecret('a\n\n  b\t c  '), 'a b c')
  const long = redactSecret('x'.repeat(500))
  assert.equal(long.length, 201, 'maxLen 200 + 省略号')
  assert.equal(long.endsWith('…'), true)
  assert.equal(redactSecret('x'.repeat(500), 10), `${'x'.repeat(10)}…`)
  assert.equal(redactSecret(''), '')
})

// ── 上游响应体大小上限（宿主 OOM 入口）──────────────────────────────────────
// `res.json()` 无上限：用户自填的 baseUrl 指向「把请求体回显回来」或单纯跑飞的端点时，
// 宿主会吃下几百 MB。实现走流式计数（超限即 cancel），不是「先 res.text() 再判长度」。

test('readUpstreamJson: 正常 JSON 解析；空体 → {}；非 JSON → {}（沿用既有口径）', async () => {
  assert.deepEqual(await readUpstreamJson(new Response('{"a":1}')), { a: 1 })
  assert.deepEqual(await readUpstreamJson(new Response('')), {})
  assert.deepEqual(await readUpstreamJson(new Response('not json')), {})
})

test('readUpstreamJson: 实际字节超限即抛错（不等读完，且断掉下载）', async () => {
  let cancelled = false
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('x'.repeat(64)))
      controller.enqueue(new TextEncoder().encode('x'.repeat(64)))
    },
    cancel() { cancelled = true },
  })
  const err = await readUpstreamJson(new Response(stream), 100).then(() => null, (e) => e)
  assert.ok(err instanceof Error, '超限必须抛错（路由据此回 502 上游故障）')
  assert.match(err.message, /too large/)
  assert.equal(cancelled, true, '超限应立刻取消下游下载，而不是把整个响应读完')
})

test('readUpstreamJson: content-length 声明超限时连读都不读', async () => {
  let pulled = false
  const stream = new ReadableStream({
    pull(controller) { pulled = true; controller.enqueue(new TextEncoder().encode('{}')) },
  })
  const res = new Response(stream, { headers: { 'content-length': String(MAX_UPSTREAM_JSON_BYTES + 1) } })
  const err = await readUpstreamJson(res).then(() => null, (e) => e)
  assert.ok(err instanceof Error)
  assert.match(err.message, /too large/)
  assert.equal(pulled, false, '声明就超限 → 直接拒绝，不读 body')
})

test('readUpstreamJson: 恰好等于上限不误伤', async () => {
  const body = `{"t":"${'y'.repeat(80)}"}`
  const res = new Response(body)
  const parsed = await readUpstreamJson(res, Buffer.byteLength(body))
  assert.equal(parsed.t.length, 80)
})

test('readUpstreamJson: 真实 fetch 的网络流同样读得通（undici 的 Response.body 是可读流）', async () => {
  // 上面的用例用构造的 Response；这里过一遍真 socket，确认 getReader() 在真实响应上
  // 也成立（含服务端自己算的 content-length）。
  await withServer(async (req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end('{"text":"真实上游"}')
  }, async (port) => {
    const upstream = await fetch(`http://127.0.0.1:${port}/models`)
    assert.deepEqual(await readUpstreamJson(upstream), { text: '真实上游' })
  })
})
