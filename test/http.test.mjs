import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readRawBody, readJsonBody, sendJson, guardRoute, HttpBodyError, statusOfBodyError } from '../lib/http.js'

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
