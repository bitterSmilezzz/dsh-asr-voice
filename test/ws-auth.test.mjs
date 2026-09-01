import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'

/**
 * I3 关键证据：undici `WebSocket`（Node 内置，宿主进程与 I5 真 provider 共用）
 * 能带 `Authorization` 头完成**真实 socket 上线**——本地起真 WS 服务，握手时
 * 校验服务端收到的头。这 gate 住 I5 的 qwen3-asr-flash-realtime（WebSocket
 * 上行）能不能带上 DSH 凭据：不能带就一切免谈，必须先证伪。
 *
 * Node 的全局 WebSocket 是 undici 实现，`new WebSocket(url, { headers })`
 * 在握手阶段注入自定义头——浏览器 WebSocket 不能自定义头，但 host 半区可以。
 */

/** WebSocket 服务端握手应答（最小实现，够一次 101 + 收帧）。 */
function wsAccept(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  return crypto.createHash('sha1').update(key + GUID).digest('base64')
}

/** 起一个记录握手头的最小 WS 服务；返回 { port, getSeen, close }。 */
function startWsServer() {
  const seen = { auth: 'sentinel', path: null }
  const sockets = new Set()
  const server = http.createServer((req, res) => { res.writeHead(426); res.end() })
  server.on('upgrade', (req, socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    seen.auth = req.headers['authorization'] ?? null
    seen.path = req.url ?? null
    const key = String(req.headers['sec-websocket-key'])
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
    )
    // 读到任何字节都算「socket 真实上线」。
    socket.on('data', () => { seen.gotData = true })
  })
  return {
    async listen() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
      return server.address().port
    },
    getSeen: () => seen,
    async close() {
      // 升级后的 socket 必须主动销毁：server.close() 只停接新连接，
      // 已升级 socket 不销毁会永远等不到回调（进程挂起）。
      for (const s of sockets) s.destroy()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}

test('undici WebSocket 真实 socket 上线且能携带 Authorization 头', async () => {
  const svc = startWsServer()
  const port = await svc.listen()
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/api/asr-voice/realtime/ws`, {
      headers: { Authorization: 'Bearer dsh-asr-voice-test-token' },
    })
    await new Promise((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = (err) => reject(new Error(`open failed: ${err?.message ?? 'unknown'}`))
    })
    // 发一帧数据，验证 socket 已真实上线（服务端能收到字节）。
    ws.send('hello')
    await new Promise((resolve) => setTimeout(resolve, 100))

    const seen = svc.getSeen()
    assert.equal(seen.auth, 'Bearer dsh-asr-voice-test-token', '服务端应在握手时收到 Authorization 头')
    assert.equal(seen.path, '/api/asr-voice/realtime/ws', '路径原样到达服务端')
    assert.equal(seen.gotData, true, '客户端帧应真实到达服务端（socket 已上线）')
    ws.close()
  } finally {
    await svc.close()
  }
})

test('undici WebSocket 不带 Authorization 时服务端收到 null（对照）', async () => {
  const svc = startWsServer()
  const port = await svc.listen()
  try {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/plain`)
    await new Promise((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = (err) => reject(new Error(`open failed: ${err?.message ?? 'unknown'}`))
    })
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(svc.getSeen().auth, null, '未指定 headers 时不应有 Authorization')
    ws.close()
  } finally {
    await svc.close()
  }
})
