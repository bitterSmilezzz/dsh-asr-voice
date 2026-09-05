import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { readRawBody, readJsonBody, sendJson, guardRoute } from '../lib/http.js'

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
