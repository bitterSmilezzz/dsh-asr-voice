import { test } from 'node:test'
import assert from 'node:assert/strict'

// client 半区被 tsdown 打成单一 lib/client.js，无独立可 import 的产物（同
// client-logic.test.mjs 的说明）；recorder.ts 顶层无 DOM 副作用，直接跑源码。
// 被钉的缺陷（第一轮已修实现）：cloud 引擎 abort() 后，挂起的 stop() promise 必须
// settle——abort 置 cancelled 后 onstop 的 cancelled 分支不再 resolve/reject，若不
// 在 abort() 里收掉 stopResolve，stop() 会永久挂起（UI 卡死在「录音中」）。
const { createVoiceRecorder } = await import('../src/client/recorder.ts')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 等某个异步事实发生（有界），超时 throw。 */
async function until(label, predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error(`超时：${label}`)
    await sleep(5)
  }
}

/**
 * 装好 cloud 引擎需要的浏览器全局（window 无 AudioContext → 转码走「解码失败退回
 * 原始 blob」分支，测试不需要真音频解码）。
 * @returns {{ instances: any[], fetchCalls: Array<{ url: string, init: RequestInit }> }}
 */
function installBrowserGlobals() {
  const instances = []
  const fetchCalls = []
  const track = () => ({ stop() {}, label: 'Test Mic' })
  const stream = { getTracks: () => [track()], getAudioTracks: () => [track()] }
  // 可控 MediaRecorder：stop() 延后一拍（setImmediate）触发 onstop，制造
  // 「stop() 已返回、onstop 未到」的真实竞态窗口，让测试把 abort() 插进去。
  class FakeMediaRecorder {
    static isTypeSupported() { return true }
    constructor(mediaStream, opts) {
      this.stream = mediaStream
      this.mimeType = opts?.mimeType ?? 'audio/webm'
      this.state = 'inactive'
      this.onstop = null
      this.ondataavailable = null
      this.onerror = null
      this.startCalls = 0
      this.stopCalls = 0
      instances.push(this)
    }
    start() { this.state = 'recording'; this.startCalls += 1 }
    stop() {
      this.stopCalls += 1
      if (this.state !== 'inactive') this.state = 'inactive'
      // 真实浏览器里 onstop 是异步的：这里也异步触发，模拟竞态窗口。
      setImmediate(() => this.onstop?.({}))
    }
  }
  globalThis.window = {}
  // node 的 globalThis.navigator 是只读 getter，直接赋值会 TypeError：defineProperty 覆盖。
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: async () => stream,
        enumerateDevices: async () => [],
      },
      userAgent: 'Mozilla/5.0 Test Chrome',
    },
  })
  globalThis.MediaRecorder = FakeMediaRecorder
  // 转写请求由测试手动挂起/中止：记录 fetch 的 abort signal，不真发网络。
  globalThis.fetch = (url, init) => new Promise((resolve, reject) => {
    fetchCalls.push({ url, init })
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })
  return { instances, fetchCalls }
}

function cleanupBrowserGlobals() {
  delete globalThis.window
  delete globalThis.navigator
  delete globalThis.MediaRecorder
  delete globalThis.fetch
}

const BEHAVIOR = { maxRecordMs: 120_000, silenceStop: false, silenceRms: 0.1, silenceMs: 800 }

test('cloud 引擎：stop() 挂起时 abort() → stop() 一定 settle("")，不触发正常完成路径', async () => {
  const { instances } = installBrowserGlobals()
  try {
    const done = []
    const fails = []
    const recorder = createVoiceRecorder('cloud', 'zh-CN', () => {}, BEHAVIOR)
    recorder.onDone = (text) => { done.push(text) }
    recorder.onFail = (err) => { fails.push(err) }
    await recorder.start()
    assert.equal(instances.length, 1, 'start 应造出一个 MediaRecorder')

    // stop() 返回挂起的 promise；onstop 尚未触发（setImmediate 窗口内）→ abort 插进竞态。
    const P = recorder.stop()
    recorder.abort()

    const result = await Promise.race([
      P.then((value) => ({ settled: true, value })),
      sleep(500).then(() => ({ settled: false })),
    ])
    assert.equal(result.settled, true, 'abort 后挂起的 stop() 必须 settle（否则 UI 永久卡录音中）')
    assert.equal(result.value, '', 'abort 语义是 cancelled：resolve 空结果')

    // 等 onstop 的 cancelled 早退路径跑完，确认没有任何正常完成/失败回调。
    await sleep(100)
    assert.deepEqual(done, [], 'abort 不得触发 onDone 正常完成路径')
    assert.deepEqual(fails, [], 'abort 不得触发 onFail')
  } finally {
    cleanupBrowserGlobals()
  }
})

test('cloud 引擎：转写在途时 abort() → stop() 一定 settle，在途请求被取消', async () => {
  const { fetchCalls } = installBrowserGlobals()
  try {
    const done = []
    const fails = []
    const recorder = createVoiceRecorder('cloud', 'zh-CN', () => {}, BEHAVIOR)
    recorder.onDone = (text) => { done.push(text) }
    recorder.onFail = (err) => { fails.push(err) }
    await recorder.start()

    const P = recorder.stop()
    // stop() 后 onstop 触发（非 cancelled）→ 转写请求发出、fetch 挂起。
    await until('转写请求已发出', () => fetchCalls.length >= 1)
    const signal = fetchCalls[0].init.signal
    assert.equal(signal.aborted, false, '前置条件：请求在途')

    // 转写在途时 abort：cancelled + 取消在途请求 + 强制 settle 挂起的 stop()。
    recorder.abort()
    const result = await Promise.race([
      P.then((value) => ({ settled: true, value })),
      sleep(500).then(() => ({ settled: false })),
    ])
    assert.equal(result.settled, true, 'abort 后挂起的 stop() 必须 settle')
    assert.equal(result.value, '', 'cancelled 语义：resolve 空结果')
    assert.equal(signal.aborted, true, 'abort 必须真的取消在途转写请求（不白烧上游配额）')

    await sleep(100)
    assert.deepEqual(done, [], 'abort 不得触发 onDone 正常完成路径')
    assert.deepEqual(fails, [], 'abort 不得触发 onFail')
  } finally {
    cleanupBrowserGlobals()
  }
})
