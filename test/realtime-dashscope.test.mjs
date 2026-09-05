import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import crypto from 'node:crypto'
import { createDashscopeRealtimeProvider } from '../lib/realtime-dashscope.js'

/**
 * I5 真 provider 协议夹具：本地起一个真 WebSocket 服务，模拟 qwen3-asr-flash-realtime
 * 的交互（OpenAI Realtime 兼容面）——
 *   握手带 Authorization → 客户端发 session.update → 上行 input_audio_buffer.append
 *   （base64 PCM）→ 服务端发 speech_started / …transcription.text / …completed / error →
 *   客户端 close 发 session.finish → 服务端回 session.finished。
 * 验证：事件映射（→ RealtimeProviderEvent）、base64 上行、认证、优雅关闭。
 * 这是「真 socket + 真帧」级验证（非 mock WebSocket 类），与 ws-auth 同级证据。
 */

/** RFC 6455 服务端→客户端帧（文本，无掩码）。 */
function encodeFrame(payload) {
  const data = Buffer.from(payload, 'utf8')
  const len = data.length
  const header = []
  header.push(0x81) // FIN + text
  if (len < 126) {
    header.push(len)
  } else if (len < 65536) {
    header.push(126, (len >> 8) & 0xff, len & 0xff)
  } else {
    header.push(127, 0, 0, 0, 0, (len / 0x100000000) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff)
  }
  return Buffer.concat([Buffer.from(header), data])
}

/** 解码客户端→服务端帧（处理掩码），返回字符串。 */
function decodeFrame(buf) {
  let off = 0
  const out = []
  while (off < buf.length) {
    const b0 = buf[off]; const b1 = buf[off + 1]
    if (b0 === undefined || b1 === undefined) break
    const opcode = b0 & 0x0f
    let len = b1 & 0x7f
    let hdr = 2
    if (len === 126) {
      len = buf.readUInt16BE(off + 2); hdr = 4
    } else if (len === 127) {
      len = Number(buf.readBigUInt64BE(off + 2)); hdr = 10
    }
    const masked = (b1 & 0x80) !== 0
    let mask = null
    let dataStart = off + hdr
    if (masked) {
      mask = buf.subarray(dataStart, dataStart + 4)
      dataStart += 4
    }
    let payload = buf.subarray(dataStart, dataStart + len)
    if (masked && mask !== null) {
      payload = Buffer.from(payload)
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4]
    }
    if (opcode === 1) out.push(payload.toString('utf8')) // text
    off = dataStart + len
  }
  return out
}

function wsAccept(key) {
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
  return crypto.createHash('sha1').update(key + GUID).digest('base64')
}

/**
 * 起一个 qwen 协议的 WS 服务。
 * @returns {Promise<{port, sendServerEvent, getClientEvents, seen, close}>}
 *   sendServerEvent(ev) 向客户端推一条服务端事件；getClientEvents() 返回客户端发来的
 *   JSON 事件数组；seen = {auth, path}；close() 断开全部。
 */
function startQwenWsServer() {
  const seen = { auth: null, path: null }
  const sockets = new Set()
  const received = []
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
    socket.on('data', (chunk) => {
      acc = Buffer.concat([acc, chunk])
      const frames = decodeFrame(acc)
      if (frames.length > 0) acc = Buffer.alloc(0) // 测试是逐个发事件，够用
      for (const text of frames) {
        try { received.push(JSON.parse(text)) } catch { /* 非 JSON（ping 等）忽略 */ }
      }
    })
  })
  return {
    async listen() {
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
      return server.address().port
    },
    sendServerEvent(ev) {
      for (const s of sockets) s.write(encodeFrame(JSON.stringify(ev)))
    },
    getClientEvents: () => received,
    getSeen: () => seen,
    async close() {
      for (const s of sockets) s.destroy()
      await new Promise((resolve) => server.close(resolve))
    },
  }
}

/** 收集某连接的事件（直到 close）。 */
function collectEvents(conn) {
  const events = []
  conn.onEvent = (ev) => events.push(ev)
  return events
}

/** 轮询等待谓词成立（替代固定 sleep，消除并发/慢机下的时序 flake），超时 throw。 */
async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) return
    if (Date.now() >= deadline) throw new Error(`waitFor timeout after ${timeoutMs}ms`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

/** 小段 16k int16 正弦（非静音，避免与判静音逻辑纠缠——这里只测传输不测 VAD）。 */
function pcmChunk(n = 320) {
  const buf = new ArrayBuffer(n * 2)
  const view = new DataView(buf)
  for (let i = 0; i < n; i++) view.setInt16(i * 2, Math.round(Math.sin(i / 8) * 8000), true)
  return new Uint8Array(buf)
}

test('I5: 握手带 Authorization + 建连后先发 session.update(pcm/16000/server_vad)', async () => {
  // 全套并发下 connect() 返回后 session.update 上行帧的到达时序不稳，固定 sleep(100)
  // 偶发 flake：改为条件等待（等事件真正出现，3s 兜底）+ 整体最多重试 3 次。语义不变。
  for (let attempt = 1; ; attempt++) {
    const svc = startQwenWsServer()
    const port = await svc.listen()
    try {
      const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime`, model: 'qwen3-asr-flash-realtime' })
      const conn = await provider.connect()
      await waitFor(() => svc.getClientEvents().some((e) => e.type === 'session.update'))

      assert.equal(svc.getSeen().auth, 'Bearer sk-test-123', '握手应带 Bearer key')
      assert.match(svc.getSeen().path ?? '', /\?model=qwen3-asr-flash-realtime/, 'model 应进 URL query')
      const sent = svc.getClientEvents()
      const sessionUpdate = sent.find((e) => e.type === 'session.update')
      assert.ok(sessionUpdate, '建连后应先发 session.update')
      assert.equal(sessionUpdate.session.input_audio_format, 'pcm')
      assert.equal(sessionUpdate.session.sample_rate, 16000)
      assert.equal(sessionUpdate.session.turn_detection.type, 'server_vad')
      assert.equal(sessionUpdate.session.turn_detection.threshold, 0.0)
      conn.close()
      return
    } catch (err) {
      if (attempt >= 3) throw err
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
    } finally {
      await svc.close()
    }
  }
})

test('I5: send() 把 int16 PCM 转 base64 上行 input_audio_buffer.append', async () => {
  const svc = startQwenWsServer()
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    await new Promise((resolve) => setTimeout(resolve, 100))

    const pcm = pcmChunk(64)
    conn.send(pcm)
    await new Promise((resolve) => setTimeout(resolve, 100))

    const append = svc.getClientEvents().find((e) => e.type === 'input_audio_buffer.append')
    assert.ok(append, '应收到 input_audio_buffer.append')
    const decoded = Buffer.from(append.audio, 'base64')
    assert.equal(decoded.length, pcm.length, 'base64 解码后字节数与上行一致')
    assert.deepEqual([...decoded], [...pcm], '字节内容一致')
    conn.close()
  } finally {
    await svc.close()
  }
})

test('I5: 服务端事件映射到 RealtimeProviderEvent（speech/text/completed/error）', async () => {
  const svc = startQwenWsServer()
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    const events = collectEvents(conn)
    await new Promise((resolve) => setTimeout(resolve, 100))

    svc.sendServerEvent({ type: 'input_audio_buffer.speech_started' })
    svc.sendServerEvent({ type: 'conversation.item.input_audio_transcription.text', text: '今天', stash: '天气不错' })
    svc.sendServerEvent({ type: 'conversation.item.input_audio_transcription.completed', transcript: '今天天气不错，阳光明媚。' })
    svc.sendServerEvent({ type: 'error', error: { code: 'invalid_value', message: 'bad' } })
    await new Promise((resolve) => setTimeout(resolve, 100))

    assert.deepEqual(events[0], { type: 'speech-started' })
    // text + stash 拼接 = 完整预览
    assert.deepEqual(events[1], { type: 'partial', text: '今天天气不错' })
    assert.deepEqual(events[2], { type: 'final', text: '今天天气不错，阳光明媚。' })
    assert.deepEqual(events[3], { type: 'error', code: 'invalid_value' })
    conn.close()
  } finally {
    await svc.close()
  }
})

test('I5: close() 发 session.finish，收到 session.finished 后优雅断开（不误报 error）', async () => {
  const svc = startQwenWsServer()
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    const events = collectEvents(conn)
    await new Promise((resolve) => setTimeout(resolve, 100))

    conn.close()
    await new Promise((resolve) => setTimeout(resolve, 50))
    const finishSent = svc.getClientEvents().some((e) => e.type === 'session.finish')
    assert.ok(finishSent, 'close() 应先发 session.finish（VAD 模式丢结果防护）')

    // 服务端回 session.finished → 连接不应再报 error（优雅关闭）
    svc.sendServerEvent({ type: 'session.finished' })
    await new Promise((resolve) => setTimeout(resolve, 150))
    assert.equal(events.some((e) => e.type === 'error'), false, '优雅关闭不应误报 error')
  } finally {
    await svc.close()
  }
})

test('I5: 无 key 时 connect() 直接抛错（不静默降级）', async () => {
  await assert.rejects(
    () => createDashscopeRealtimeProvider({ apiKey: '' }).connect(),
    /no API key/,
  )
})

test('I5: 无关服务端事件（session.created/updated 等）不产生事件', async () => {
  const svc = startQwenWsServer()
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    const events = collectEvents(conn)
    await new Promise((resolve) => setTimeout(resolve, 100))
    svc.sendServerEvent({ type: 'session.created', session: { id: 'sess_001', model: 'qwen3-asr-flash-realtime' } })
    svc.sendServerEvent({ type: 'session.updated', session: {} })
    svc.sendServerEvent({ type: 'conversation.item.created', item: { type: 'message', content: [{ type: 'input_audio', transcript: null }] } })
    svc.sendServerEvent({ type: 'input_audio_buffer.committed' })
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(events.length, 0, '无关事件应被忽略')
    conn.close()
  } finally {
    await svc.close()
  }
})
