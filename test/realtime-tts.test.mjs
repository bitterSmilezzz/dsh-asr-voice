import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'
import { synthesize } from '../lib/realtime-tts.js'

/**
 * I6 云端 TTS 协议夹具：本地起真 WebSocket 服务，模拟 qwen3-tts-flash-realtime
 * 的交互（OpenAI Realtime 兼容面）——
 *   握手带 Authorization → 客户端发 session.update → 客户端发
 *   input_text_buffer.append + commit → 服务端回 response.created →
 *   response.audio.delta（base64 PCM 分片）→ response.audio.done → response.done
 *   → 客户端发 session.finish → 服务端回 session.finished。
 * 验证：会话配置参数、文本提交、PCM 收口、错误路径。
 */

/** RFC 6455 服务端→客户端帧（文本，无掩码）。 */
function encodeFrame(payload) {
  const data = Buffer.from(payload, 'utf8')
  const len = data.length
  const header = []
  header.push(0x81)
  if (len < 126) header.push(len)
  else if (len < 65536) header.push(126, (len >> 8) & 0xff, len & 0xff)
  else header.push(127, 0, 0, 0, 0, (len / 0x100000000) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff)
  return Buffer.concat([Buffer.from(header), data])
}

/** 解码客户端→服务端帧（处理掩码），返回 JSON 事件数组。 */
function decodeFrames(buf) {
  const out = []
  let off = 0
  while (off + 1 < buf.length) {
    const b0 = buf[off]; const b1 = buf[off + 1]
    const opcode = b0 & 0x0f
    let len = b1 & 0x7f
    let hdr = 2
    if (len === 126) { len = buf.readUInt16BE(off + 2); hdr = 4 }
    else if (len === 127) { len = Number(buf.readBigUInt64BE(off + 2)); hdr = 10 }
    const masked = (b1 & 0x80) !== 0
    let mask = null
    let dataStart = off + hdr
    if (masked) { mask = buf.subarray(dataStart, dataStart + 4); dataStart += 4 }
    let payload = buf.subarray(dataStart, dataStart + len)
    if (masked && mask !== null) {
      payload = Buffer.from(payload)
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]
    }
    if (opcode === 1) out.push(payload.toString('utf8'))
    off = dataStart + len
  }
  return out
}

function wsAccept(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  return crypto.createHash('sha1').update(key + GUID).digest('base64')
}

/**
 * 起一个 qwen-tts 协议的 WS 服务。
 * @param {object} opts - { onClientEvent(ev), autoUpdated, pcmChunks }
 *   autoUpdated=true 时收到 session.update 自动回 session.updated；
 *   pcmChunks 为服务端要发的 base64 PCM 分片数组（默认发送一段可辨识波形）。
 */
function startTtsWsServer(opts = {}) {
  const seen = { auth: null, path: null }
  const sockets = new Set()
  const received = []
  const { onClientEvent, autoUpdated = true } = opts
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
    let acc = Buffer.alloc(0)
    const send = (ev) => socket.write(encodeFrame(JSON.stringify(ev)))
    socket.on('data', (chunk) => {
      acc = Buffer.concat([acc, chunk])
      const frames = decodeFrames(acc)
      if (frames.length > 0) acc = Buffer.alloc(0)
      for (const text of frames) {
        let ev
        try { ev = JSON.parse(text) } catch { continue }
        received.push(ev)
        onClientEvent?.(ev, { send, socket })
        if (ev.type === 'session.update' && autoUpdated) {
          send({ type: 'session.updated', session: { mode: 'commit', model: 'qwen3-tts-flash-realtime', voice: ev.session?.voice, response_format: 'pcm', sample_rate: 16000 } })
        }
        if (ev.type === 'input_text_buffer.commit') {
          // 客户端提交文本：回完整合成流。
          send({ type: 'response.created', response: { id: 'resp_1', status: 'in_progress' } })
          const chunks = opts.pcmChunks ?? ['AAAA', 'AgI='] // 两个可辨识 int16 块（0x0000 0x0000 / 0x0202）
          for (const c of chunks) send({ type: 'response.audio.delta', delta: c })
          send({ type: 'response.audio.done' })
          send({ type: 'response.done', response: { id: 'resp_1', status: 'completed' } })
        }
        if (ev.type === 'session.finish') send({ type: 'session.finished' })
      }
    })
  })
  return {
    async listen() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
      return server.address().port
    },
    getSeen: () => seen,
    getClientEvents: () => received,
    async close() {
      for (const s of sockets) s.destroy()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}

test('I6: 握手带 Authorization + session.update 配置 voice/格式/采样率', async () => {
  const svc = startTtsWsServer()
  const port = await svc.listen()
  try {
    const result = await synthesize('sk-test-123', '你好，世界', 'Cherry', `ws://127.0.0.1:${port}/api-ws/v1/realtime`)
    // 客户端 resolve 后 ~50ms 才关 socket（让 session.finish flush）：断言前等一下。
    await new Promise((resolve) => setTimeout(resolve, 80))
    assert.equal(svc.getSeen().auth, 'Bearer sk-test-123', '握手应带 Bearer key')
    assert.match(svc.getSeen().path ?? '', /\?model=qwen3-tts-flash-realtime/, 'model 应进 URL query')
    const events = svc.getClientEvents()
    const upd = events.find((e) => e.type === 'session.update')
    assert.ok(upd, '应发 session.update')
    assert.equal(upd.session.voice, 'Cherry')
    assert.equal(upd.session.response_format, 'pcm')
    assert.equal(upd.session.sample_rate, 16000)
    const append = events.find((e) => e.type === 'input_text_buffer.append')
    assert.equal(append?.text, '你好，世界', '文本应经 append 上行')
    assert.ok(events.some((e) => e.type === 'input_text_buffer.commit'), '应发 commit 触发合成')
    assert.ok(events.some((e) => e.type === 'session.finish'), '收尾应发 session.finish')
  } finally {
    await svc.close()
  }
})

test('I6: 合成的 base64 PCM 被解码收口', async () => {
  const svc = startTtsWsServer({ pcmChunks: [Buffer.from([1, 2, 3, 4, 5, 6]).toString('base64'), Buffer.from([7, 8]).toString('base64')] })
  const port = await svc.listen()
  try {
    const result = await synthesize('sk-test-123', '你好', 'Cherry', `ws://127.0.0.1:${port}/api-ws/v1/realtime`)
    assert.deepEqual([...result.pcm], [1, 2, 3, 4, 5, 6, 7, 8], '多个 delta 应顺序拼成完整 PCM')
    assert.equal(result.sampleRate, 16000)
  } finally {
    await svc.close()
  }
})

test('I6: 空文本/无 key 直接拒绝', async () => {
  await assert.rejects(() => synthesize('', '你好'), /no API key/)
  await assert.rejects(() => synthesize('sk', '   '), /empty text/)
})

test('I6: 服务端 error 事件 → 拒绝并带错误码', async () => {
  const svc = startTtsWsServer({
    onClientEvent(ev, { send }) {
      if (ev.type === 'input_text_buffer.commit') {
        send({ type: 'error', error: { code: 'invalid_value', message: 'bad voice' } })
      }
    },
  })
  const port = await svc.listen()
  try {
    await assert.rejects(() => synthesize('sk-test-123', '你好', 'NoSuchVoice', `ws://127.0.0.1:${port}/api-ws/v1/realtime`), /invalid_value/)
  } finally {
    await svc.close()
  }
})

test('I6: 建连失败（服务端 401 拒绝）→ 拒绝', async () => {
  // 起一个拒绝升级的 HTTP 服务（返回 401），模拟无效 key 的握手失败。
  const server = http.createServer((req, res) => { res.writeHead(401); res.end() })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  try {
    await assert.rejects(
      () => synthesize('sk-bad', '你好', 'Cherry', `ws://127.0.0.1:${port}/api-ws/v1/realtime`),
      undefined,
      '握手失败应抛错',
    )
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})

test('I6: 建连成功但无任何合成响应（服务端静默后断连）→ 拒绝', async () => {
  const svc = startTtsWsServer({ autoUpdated: false }) // 不回 session.updated，客户端永远等不到合成起点
  const port = await svc.listen()
  try {
    const p = synthesize('sk-test-123', '你好', 'Cherry', `ws://127.0.0.1:${port}/api-ws/v1/realtime`)
    // 服务端在合成前把连接关掉：客户端应拒绝（provider-unreachable / provider-closed）。
    await new Promise((resolve) => setTimeout(resolve, 100))
    await svc.close()
    await assert.rejects(() => p, /cloud tts:/, '连接被关闭且无音频应拒绝')
  } finally {
    await svc.close().catch(() => {})
  }
})
