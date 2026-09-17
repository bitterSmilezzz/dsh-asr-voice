import { test } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

// 传输层顶层只 import 类型（realtime-cloud.ts 的 CloudTransport/CloudProviderEvent），
// 无 DOM 依赖，按 realtime-cloud.test.mjs 的既有做法用 node 的类型剥离直接跑源码。
const { parseSseBlocks, createBrowserCloudTransport, MAX_SSE_BUF } =
  await import('../src/client/realtime-cloud-transport.ts')

/**
 * 这一层是 client 侧唯一的真实网络解析路径（SSE 分帧 / 断流判死 / 路由超时），
 * 历史上出过「SSE 背压重复投递」的回归。所以两类证据都要有：
 * 1. 分帧本身 = 纯函数（parseSseBlocks）逐字钉住语义，含两处**刻意保留**的偏差
 *    （CRLF 不切分、多行 data 不拼接）——它们是现状，不是规范，改语义必须改这里。
 * 2. 传输层 = 真 http server + 真 socket + 真分片：相对路径 fetch 只在测试里补成
 *    本地绝对 URL，其余（method/body/signal/流式响应）全部真跑，不用 mock 类。
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 等某个异步事实发生（有界）——网络投递是异步的，固定 sleep 会变成和测试赛跑。 */
async function until(label, predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`超时：${label}`)
    await sleep(5)
  }
}

/** 起真 http server，并把相对路径 fetch 补成绝对 URL（跑完即关、顺带断开残留连接）。 */
async function withServer(handler, run) {
  const server = http.createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const realFetch = globalThis.fetch
  // 传输层按浏览器同源约定写相对路径（'/api/asr-voice/realtime/…'），Node 的 fetch
  // 解析不了相对 URL：只在测试内补 host，其余参数原样透传（真 socket、真流）。
  globalThis.fetch = (input, init) =>
    realFetch(typeof input === 'string' && input.startsWith('/') ? `http://127.0.0.1:${port}${input}` : input, init)
  try {
    await run(port)
  } finally {
    globalThis.fetch = realFetch
    server.closeAllConnections?.()
    await new Promise((resolve) => server.close(resolve))
  }
}

/** 一个 SSE 响应头 + 分块写帧的便捷封装。 */
function sseHead(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' })
}

/** 收事件 + 等条件（openEvents 的投递全是异步的，断言前必须等）。 */
function sink() {
  const events = []
  return { events, onEvent: (ev) => { events.push(ev) } }
}

// ── 分帧纯函数：parseSseBlocks ─────────────────────────────────────────────

test('parseSseBlocks: 单个完整帧切出一条事件，残帧为空', () => {
  const { events, rest } = parseSseBlocks('', 'data: {"type":"final","text":"你好"}\n\n')
  assert.deepEqual(events, [{ event: 'message', data: '{"type":"final","text":"你好"}' }])
  assert.equal(rest, '', '整帧消费干净，不得留残渣')
})

test('parseSseBlocks: 跨 chunk 半帧不投递，补齐后才出事件（不重复投递）', () => {
  const head = parseSseBlocks('', 'data: {"type":"par')
  assert.deepEqual(head.events, [], '半帧不产出')
  assert.equal(head.rest, 'data: {"type":"par', '半帧必须留在 rest 里等下一块')
  const tail = parseSseBlocks(head.rest, 'tial","text":"帮我记"}\n\n')
  assert.deepEqual(tail.events, [{ event: 'message', data: '{"type":"partial","text":"帮我记"}' }])
  assert.equal(tail.rest, '')
})

test('parseSseBlocks: 单 chunk 多事件按序全出；连续空行不产出幽灵事件', () => {
  const { events, rest } = parseSseBlocks(
    '',
    'data: {"type":"partial","text":"第一句"}\n\ndata: {"type":"final","text":"第一句"}\n\n\n\n',
  )
  assert.deepEqual(events.map((e) => JSON.parse(e.data)), [
    { type: 'partial', text: '第一句' },
    { type: 'final', text: '第一句' },
  ], '顺序必须与线上一致（partial 先于 final）')
  assert.equal(rest, '', '空帧（连续空行）既不出事件也不留残帧')
})

test('parseSseBlocks: 多行 data 逐行各成一条（不做 SSE 规范的多行拼接）', () => {
  const split = parseSseBlocks('', 'data: {"type":"partial","text":"一"}\ndata: {"type":"final","text":"二"}\n\n')
  assert.equal(split.events.length, 2, '现实现逐行取 data: 各自成事件（host 每帧只写一行，线上等价）')
  // 只有拼接后才合法的 JSON 分两行 → 两行各自 parse 失败 → 零事件（调用方按「非 JSON 忽略」处理）。
  const joined = parseSseBlocks('', 'data: {"type":"partial",\ndata: "text":"半句"}\n\n')
  assert.deepEqual(joined.events.map((e) => e.data), ['{"type":"partial",', '"text":"半句"}'])
})

test('parseSseBlocks: 注释行/心跳/event 字段/非 data 行都不产出数据', () => {
  const { events } = parseSseBlocks('', ': keep-alive\n\ndata: not-json\n\nevent: final\ndata: {"type":"final","text":"甲"}\n\n')
  assert.deepEqual(events, [
    { event: 'message', data: 'not-json' }, // 非 JSON 由调用方丢弃，分帧层只管切
    { event: 'final', data: '{"type":"final","text":"甲"}' }, // event: 作用于整帧
  ], '注释行与空行不产出；event: 名字带出')
  // 'data:' 无空格不是数据行（现实现要求精确前缀 'data: '）。
  assert.deepEqual(parseSseBlocks('', 'data:{"type":"final"}\n\n').events, [])
  assert.deepEqual(parseSseBlocks('', 'id: 7\nretry: 100\n\n').events, [])
})

test('parseSseBlocks: CRLF 帧不被切分（现实现只认 \\n\\n）——偏差已钉住', () => {
  const crlf = 'data: {"type":"final","text":"甲"}\r\n\r\n'
  const { events, rest } = parseSseBlocks('', crlf)
  assert.deepEqual(events, [], 'CRLF 帧在现实现下永远切不出来（上游改写成 CRLF 就会一直不出字，直到撞上 MAX_SSE_BUF 判死）')
  assert.equal(rest, crlf, '原样积压在残帧里')
})

test('parseSseBlocks: CRLF 帧后面来一个 LF 帧时被搭车切出（行尾 \\r 由 JSON.parse 容忍）', () => {
  const { events } = parseSseBlocks(
    '',
    'data: {"type":"partial","text":"甲"}\r\n\r\ndata: {"type":"final","text":"乙"}\n\n',
  )
  assert.deepEqual(events.map((e) => JSON.parse(e.data)), [
    { type: 'partial', text: '甲' },
    { type: 'final', text: '乙' },
  ], '两条都出得来，但第一条被延迟到第二个 \\n\\n 才投递')
})

// ── openEvents：真 SSE 流 ────────────────────────────────────────────────

test('openEvents: 路由非 ok → 立刻报 events-unavailable', async () => {
  await withServer((_req, res) => {
    res.writeHead(503, { 'content-type': 'text/plain' })
    res.end('nope')
  }, async () => {
    const { events, onEvent } = sink()
    createBrowserCloudTransport().openEvents('sid-1', onEvent)
    await until('判死', () => events.length === 1)
    assert.deepEqual(events, [{ type: 'error', code: 'events-unavailable' }])
  })
})

test('openEvents: 响应无 body（204）→ 同样报 events-unavailable', async () => {
  await withServer((_req, res) => {
    res.writeHead(204)
    res.end()
  }, async () => {
    const { events, onEvent } = sink()
    createBrowserCloudTransport().openEvents('sid-1', onEvent)
    await until('判死', () => events.length === 1)
    assert.deepEqual(events, [{ type: 'error', code: 'events-unavailable' }], 'res.body === null 也是「事件流拿不到」')
  })
})

test('openEvents: 干净关流先投递已收事件、再报 events-unavailable（不聋死）', async () => {
  await withServer((_req, res) => {
    sseHead(res)
    res.write('data: {"type":"partial","text":"说了一半"}\n\n')
    res.end()
  }, async () => {
    const { events, onEvent } = sink()
    createBrowserCloudTransport().openEvents('sid-1', onEvent)
    await until('关流判死', () => events.length === 2)
    assert.deepEqual(events, [
      { type: 'partial', text: '说了一半' },
      { type: 'error', code: 'events-unavailable' },
    ], '服务端干净关流（host 重启/代理超时）必须报错，否则字幕冻结、麦克风常开')
  })
})

test('openEvents: 真网络分片（半帧跨 TCP chunk）不丢不重', async () => {
  await withServer(async (_req, res) => {
    sseHead(res)
    res.write('data: {"type":"par')
    await sleep(30)
    res.write('tial","text":"跨分片"}\n\n')
    await sleep(30)
    res.write('data: {"type":"final","text":"跨分片"}\n\n')
  }, async () => {
    const { events, onEvent } = sink()
    const dispose = createBrowserCloudTransport().openEvents('sid-1', onEvent)
    try {
      await until('两帧到齐', () => events.length === 2)
      await sleep(40)
      assert.deepEqual(events, [
        { type: 'partial', text: '跨分片' },
        { type: 'final', text: '跨分片' },
      ], '分片边界不得产出重复/半截事件（背压重复投递回归的守卫）')
    } finally {
      dispose()
    }
  })
})

test('openEvents: 注释/心跳与非 JSON 数据行被忽略，后续合法事件照常投递', async () => {
  await withServer(async (_req, res) => {
    sseHead(res)
    res.write(': ping\n\n')
    res.write('data: not-json\n\n')
    await sleep(20)
    res.write('data: {"type":"final","text":"真事件"}\n\n')
  }, async () => {
    const { events, onEvent } = sink()
    const dispose = createBrowserCloudTransport().openEvents('sid-1', onEvent)
    try {
      await until('真事件到达', () => events.length === 1)
      await sleep(40)
      assert.deepEqual(events, [{ type: 'final', text: '真事件' }])
    } finally {
      dispose()
    }
  })
})

test(`openEvents: 无换行巨型帧超 ${MAX_SSE_BUF} 字符 → 断流判死并主动断开连接`, async () => {
  let clientGone = false
  await withServer((_req, res) => {
    res.on('close', () => { clientGone = true })
    sseHead(res)
    // 一个永不结束、也永不带空行的帧：buf 无上限累积就会拖垮浏览器标签页。
    res.write(`data: ${'x'.repeat(MAX_SSE_BUF + 512)}`)
  }, async () => {
    const { events, onEvent } = sink()
    const dispose = createBrowserCloudTransport().openEvents('sid-1', onEvent)
    try {
      await until('背压断流', () => events.length === 1, 5000)
      assert.deepEqual(events, [{ type: 'error', code: 'events-unavailable' }], '超限按断流处理（与 done 分支同等报错）')
      await until('reader.cancel 关掉连接', () => clientGone, 3000)
    } finally {
      dispose()
    }
  })
})

test('openEvents: dispose 中止底层 fetch（AbortController 生效）、幂等、之后不再投递', async () => {
  const realFetch = globalThis.fetch
  let seenSignal = null
  let aborted = false
  globalThis.fetch = (_input, init) => {
    seenSignal = init?.signal
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')) })
    })
  }
  try {
    const { events, onEvent } = sink()
    const dispose = createBrowserCloudTransport().openEvents('sid-1', onEvent)
    await until('请求已发出', () => seenSignal !== null)
    assert.ok(seenSignal instanceof AbortSignal, '必须带可中止的 signal（EventSource 做不到精确关闭）')
    assert.equal(seenSignal.aborted, false)
    dispose()
    dispose() // 幂等：再点一次不得抛
    await until('abort 已触发', () => aborted)
    await sleep(20)
    assert.deepEqual(events, [], 'dispose 之后连 error 都不许再投（否则引擎已停还被判死）')
  } finally {
    globalThis.fetch = realFetch
  }
})

// ── 四条 exact 路由：postJson / uploadAudio ─────────────────────────────

/** 读完请求体（测试内自用，不复用被测对象）。 */
async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

test('createSession: POST /session 取 sid；返回 ok 但无 sid 视为失败', async () => {
  const seen = []
  await withServer((req, res) => {
    seen.push({ method: req.method, url: req.url })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true, sid: 'sid-42' }))
  }, async () => {
    const sid = await createBrowserCloudTransport().createSession()
    assert.equal(sid, 'sid-42')
    assert.deepEqual(seen, [{ method: 'POST', url: '/api/asr-voice/realtime/session' }])
  })
  await withServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  }, async () => {
    await assert.rejects(createBrowserCloudTransport().createSession(), /realtime session returned no sid/)
  })
})

test('createSession: 非 ok 带 reason 时抛 reason；响应非 JSON 时抛通用消息', async () => {
  await withServer((_req, res) => {
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: false, reason: 'no provider configured' }))
  }, async () => {
    await assert.rejects(createBrowserCloudTransport().createSession(), /no provider configured/)
  })
  await withServer((_req, res) => {
    res.writeHead(502, { 'content-type': 'text/html' })
    res.end('<html>bad gateway</html>') // res.json() 抛 → 兜底 {} → 通用消息
  }, async () => {
    await assert.rejects(createBrowserCloudTransport().createSession(), /realtime route \/session failed/)
  })
})

test('upload: POST /audio?sid=… 送 int16 LE 原始字节（octet-stream、sid 转义）', async () => {
  const seen = []
  await withServer(async (req, res) => {
    seen.push({ method: req.method, url: req.url, type: req.headers['content-type'], body: await readBody(req) })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  }, async () => {
    await createBrowserCloudTransport().upload('s/1 +x', new Uint8Array([1, 2, 3, 250]))
    assert.equal(seen.length, 1)
    assert.equal(seen[0].method, 'POST')
    assert.equal(seen[0].url, '/api/asr-voice/realtime/audio?sid=s%2F1%20%2Bx')
    assert.equal(seen[0].type, 'application/octet-stream')
    assert.deepEqual([...seen[0].body], [1, 2, 3, 250], '上行字节必须原样（含 ≥0x80 的高字节）')
  })
})

test('upload: 非 ok 带 reason 时抛 reason；无 reason 时消息里带 HTTP 状态', async () => {
  await withServer((_req, res) => {
    res.writeHead(413, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ reason: 'audio too large' }))
  }, async () => {
    await assert.rejects(createBrowserCloudTransport().upload('sid-1', new Uint8Array(2)), /audio too large/)
  })
  await withServer((_req, res) => {
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end('boom') // json() 抛 → 兜底 {}
  }, async () => {
    await assert.rejects(createBrowserCloudTransport().upload('sid-1', new Uint8Array(2)), /audio upload failed \(HTTP 500\)/)
  })
})

test('closeSession: POST /close?sid=… ；失败时抛 reason（幂等由调用方保证）', async () => {
  const seen = []
  await withServer((req, res) => {
    seen.push({ method: req.method, url: req.url })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  }, async () => {
    await createBrowserCloudTransport().closeSession('sid-7')
    assert.deepEqual(seen, [{ method: 'POST', url: '/api/asr-voice/realtime/close?sid=sid-7' }])
  })
  await withServer((_req, res) => {
    res.writeHead(410, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ ok: false, reason: 'session gone' }))
  }, async () => {
    await assert.rejects(createBrowserCloudTransport().closeSession('sid-7'), /session gone/)
  })
})

test('网络/超时错误原样上抛（不吞不重试），三条路由都带超时 signal', async () => {
  const realFetch = globalThis.fetch
  const signals = []
  globalThis.fetch = (_input, init) => {
    signals.push(init?.signal)
    return Promise.reject(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }))
  }
  try {
    const transport = createBrowserCloudTransport()
    await assert.rejects(transport.createSession(), /timeout/)
    await assert.rejects(transport.upload('sid-1', new Uint8Array(2)), /timeout/)
    await assert.rejects(transport.closeSession('sid-1'), /timeout/)
    assert.equal(signals.length, 3)
    for (const signal of signals) {
      // 15s 超时预算本身不在测试里等（会拖慢整轮）；这里钉住「每个路由都挂了可中止的
      // signal」，超时触发后 fetch 以 AbortError 拒绝的行为由上面三条 rejects 覆盖。
      assert.ok(signal instanceof AbortSignal, '每条路由都必须带 AbortSignal.timeout 的 signal')
      assert.equal(signal.aborted, false)
    }
  } finally {
    globalThis.fetch = realFetch
  }
})
