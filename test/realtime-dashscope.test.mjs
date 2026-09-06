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
 * @param {{ handshakeDelayMs?: number, holdHandshake?: boolean }} [opts] -
 *   handshakeDelayMs > 0 时延迟写 101 响应，让客户端停留在 CONNECTING（模拟真实网络
 *   握手窗口，测上行缓冲）；holdHandshake = true 时 101 永不发送（测建连超时路径）。
 * @returns {Promise<{port, sendServerEvent, getClientEvents, seen, dropConnections, getOpenSocketCount, close}>}
 *   sendServerEvent(ev) 向客户端推一条服务端事件；getClientEvents() 返回客户端发来的
 *   JSON 事件数组；seen = {auth, path}；dropConnections() 断开全部 socket（不关服务，
 *   模拟对端异常断连）；getOpenSocketCount() 当前存活 socket 数；close() 断开全部并关服务。
 */
function startQwenWsServer(opts = {}) {
  const { handshakeDelayMs = 0, holdHandshake = false } = opts
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
    const sendHandshake = () => {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`,
      )
    }
    if (holdHandshake) {
      // 101 永不发送：客户端停留在 CONNECTING，直到自己的建连超时兜底。
    } else if (handshakeDelayMs > 0) setTimeout(sendHandshake, handshakeDelayMs)
    else sendHandshake()
    let acc = Buffer.alloc(0)
    socket.on('data', (chunk) => {
      acc = Buffer.concat([acc, chunk])
      // 客户端回显 close 帧（opcode 8）→ 完成 RFC6455 关闭握手：销毁 socket。
      // 不回不销毁时 undici 会挂起等待（收到 close 帧后它要等对端收尾才触发
      // close 事件），测「对端主动关闭」的用例必须走完这一拍。
      if (acc.length >= 2 && (acc[0] & 0x0f) === 0x8) {
        socket.destroy()
        return
      }
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
    dropConnections() {
      for (const s of sockets) s.destroy()
    },
    /** 向所有 socket 写一条 WebSocket close 帧（对端主动挥手，但未走协议收尾）。 */
    sendCloseFrame(code = 1000) {
      const frame = Buffer.from([0x88, 2, (code >> 8) & 0xff, code & 0xff])
      for (const s of sockets) s.write(frame)
    },
    getOpenSocketCount: () => sockets.size,
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

test('I5: CONNECTING 期 send() 入有界缓冲，open 后按序冲刷（会话开头帧不丢）', async () => {
  // 握手延迟 150ms：connect() 立即返回连接（WS 仍在 CONNECTING），这正是真实网络里
  // 会话开头 ~100-500ms 的丢帧窗口——旧实现直接静默丢弃这些帧。
  const svc = startQwenWsServer({ handshakeDelayMs: 150 })
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    // CONNECTING 期上行 40 帧（每帧字节 = 序号，可区分内容）：缓冲上限 32 → 丢最旧 8 帧。
    const frames = []
    for (let i = 0; i < 40; i++) {
      const f = new Uint8Array(16)
      f.fill(i)
      frames.push(f)
      conn.send(f)
    }
    await waitFor(() => svc.getClientEvents().filter((e) => e.type === 'input_audio_buffer.append').length === 32)
    const events = svc.getClientEvents()
    assert.equal(events[0].type, 'session.update', '协议要求 session.update 先于一切 append')
    const appends = events.filter((e) => e.type === 'input_audio_buffer.append')
    assert.equal(appends.length, 32, '缓冲上限 32：40 帧丢最旧 8 帧，其余必达')
    const first = Buffer.from(appends[0].audio, 'base64')
    assert.ok(first.every((b) => b === 8), `最旧的 8 帧（0..7）被丢弃，首帧应为第 8 帧，实得 ${[...first]}`)
    const last = Buffer.from(appends[31].audio, 'base64')
    assert.ok(last.every((b) => b === 39), '最新帧（39）必达且按序在队尾')
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

test('I5: 握手未完成超时 → provider-timeout 判死（connectTimer 是唯一兜底）', async () => {
  // 服务端接受 upgrade 但永不回 101：客户端停留在 CONNECTING，connectTimer 是唯一
  // 兜底。注入 connectTimeoutMs=120 避免等真实 15s。
  // 注：不断言服务端 socket 归零——undici 对 CONNECTING 态的 close() 不立即关闭
  // 底层 socket（要等握手完成），这是 undici 行为限制、非本实现可控；判死本身
  // （error 事件 + closed 语义）才是本测试钉的对象。
  const svc = startQwenWsServer({ holdHandshake: true })
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({
      apiKey: 'sk-test-123',
      wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime`,
      connectTimeoutMs: 120,
    })
    const conn = await provider.connect()
    const events = collectEvents(conn)
    await waitFor(() => events.some((e) => e.type === 'error'), 3000)
    assert.deepEqual(events.filter((e) => e.type === 'error'), [{ type: 'error', code: 'provider-timeout' }])
    // 判死后连接已 closed：多等一拍确认没有重复报错或迟到事件。
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(events.length, 1, '超时判死应恰报一次')
    conn.close()
  } finally {
    await svc.close()
  }
})

test('I5: 对端 socket 被销毁（异常断连）→ provider-unreachable，且只报一次', async () => {
  // undici 对 RST/销毁式断连先触发 onerror 再触发 onclose：onerror 判死（fail 置
  // closed），onclose 早退不重复报——这里钉住「异常断连恰报一次、code 正确」。
  const svc = startQwenWsServer()
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    const events = collectEvents(conn)
    // 服务端 socket 出现 ≠ 客户端握手完成：undici 在 CONNECTING 收到 close 帧会
    // 吞掉。以收到 session.update 为准（客户端 onopen 后第一帧）。
    await waitFor(() => svc.getClientEvents().some((e) => e.type === 'session.update'), 3000)

    svc.dropConnections()
    await waitFor(() => events.some((e) => e.type === 'error'), 3000)
    assert.deepEqual(events.filter((e) => e.type === 'error'), [{ type: 'error', code: 'provider-unreachable' }])
    // 报错后连接已 closed：后续事件不再被接受。
    svc.sendServerEvent({ type: 'conversation.item.input_audio_transcription.completed', transcript: '迟到' })
    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.equal(events.length, 1, 'closed 后不得再产生任何事件')
    conn.close()
  } finally {
    await svc.close()
  }
})

test('I5: 对端发 close 帧（非优雅、无 session.finished）→ provider-closed', async () => {
  // undici 下三条对端关闭路径的行为（实测）：
  //   RST/销毁         → 先 onerror → provider-unreachable（onclose 早退，见上例）
  //   CONNECTING 收帧  → 握手失败 → provider-unreachable（超时用例同族）
  //   open 收 close 帧 → 回帧等对端收尾，服务端完成关闭握手后触发 onclose：
  //                      closed=false → provider-closed（本用例）
  // 即 onclose 的非优雅报错分支真实可达——与被删的 byGracefulClose（纯逻辑死标志，
  // close() 必先置 closed）不同，不可再删。
  const svc = startQwenWsServer()
  const port = await svc.listen()
  try {
    const provider = createDashscopeRealtimeProvider({ apiKey: 'sk-test-123', wssUrl: `ws://127.0.0.1:${port}/api-ws/v1/realtime` })
    const conn = await provider.connect()
    const events = collectEvents(conn)
    // 服务端 socket 出现 ≠ 客户端握手完成（undici 异步建连）：以收到 session.update
    // 为准（客户端 onopen 后第一帧），否则 close 帧会落在 CONNECTING 上被吞/走错路。
    await waitFor(() => svc.getClientEvents().some((e) => e.type === 'session.update'), 3000)

    svc.sendCloseFrame(1001)
    await waitFor(() => events.some((e) => e.type === 'error'), 3000)
    assert.deepEqual(events.filter((e) => e.type === 'error'), [{ type: 'error', code: 'provider-closed' }])
    assert.equal(events.length, 1, '断连判死应恰报一次（不重复报）')
    conn.close()
  } finally {
    await svc.close()
  }
})
