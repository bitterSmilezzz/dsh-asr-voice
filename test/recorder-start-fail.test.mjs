import { test } from 'node:test'
import assert from 'node:assert/strict'

// client 半区无独立可 import 的产物（同 recorder-race.test.mjs 的说明）；recorder.ts
// 顶层无 DOM 副作用，直接跑源码。
// 被钉的缺陷：`mediaRecorder.start()` 未包 try —— 抛错时 active 仍为 true、麦克风轨道
// 不释放、没有任何 onError，界面卡在「录音中」且麦克风常亮（用户只能刷新页面）。
const { createVoiceRecorder } = await import('../src/client/recorder.ts')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** 装浏览器全局：MediaRecorder.start() 抛错（设备被抢占/内核拒绝的形态）。 */
function installGlobals() {
  const tracks = []
  const instances = []
  const stream = {
    getTracks: () => tracks,
    getAudioTracks: () => tracks,
  }
  class ThrowingMediaRecorder {
    static isTypeSupported() { return true }
    constructor() {
      this.state = 'inactive'
      this.onstop = null
      this.ondataavailable = null
      this.onerror = null
      instances.push(this)
    }
    start() {
      this.state = 'recording' // 先置位再抛：模拟真实设备「已认领又立刻失败」
      throw new Error('device busy')
    }
    stop() { this.state = 'inactive' }
  }
  globalThis.window = {}
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: { getUserMedia: async () => stream, enumerateDevices: async () => [] },
      userAgent: 'Mozilla/5.0 Test Chrome',
    },
  })
  globalThis.MediaRecorder = ThrowingMediaRecorder
  globalThis.fetch = async () => { throw new Error('should not be called') }
  return { tracks, instances, addTrack: () => tracks.push({ stop() { this.stopped = true }, label: 'Test Mic' }) }
}

function cleanup() {
  delete globalThis.window
  delete globalThis.navigator
  delete globalThis.MediaRecorder
  delete globalThis.fetch
}

const BEHAVIOR = { maxRecordMs: 120_000, silenceStop: false, silenceRms: 0.1, silenceMs: 800 }

test('cloud 引擎：mediaRecorder.start() 抛错 → 报错 + 释放麦克风 + 复位状态（不再常亮/卡死）', async () => {
  const env = installGlobals()
  env.addTrack()
  const errors = []
  const done = []
  const fails = []
  try {
    const recorder = createVoiceRecorder('cloud', 'zh-CN', (code) => errors.push(code), BEHAVIOR)
    recorder.onDone = (text) => { done.push(text) }
    recorder.onFail = (err) => { fails.push(err) }

    // start() 内部收口，不应把异常抛给调用方。
    await recorder.start()
    assert.equal(env.instances.length, 1, 'start 应已造出 MediaRecorder')
    assert.deepEqual(errors, ['recorder-start-failed'], '必须送达专用错误码（界面据此给出可读提示）')

    // 关键：麦克风轨道必须被停掉，否则麦克风常亮、输入设备被占用。
    assert.equal(env.tracks.length, 1)
    assert.equal(env.tracks[0].stopped, true, 'start 失败后必须释放麦克风轨道')

    // stop() 不能挂起：active 已复位 → 入口早退返回空结果。
    const settled = await Promise.race([
      recorder.stop().then((value) => ({ ok: true, value })),
      sleep(300).then(() => ({ ok: false })),
    ])
    assert.equal(settled.ok, true, 'start 失败后 stop() 必须立即 settle（否则 UI 永久卡录音中）')
    assert.equal(settled.value, '', '无录音可交付：空结果')

    await sleep(50)
    assert.deepEqual(done, [], 'start 失败不得走正常完成路径')
    assert.deepEqual(fails, [], '错误已由 onError 通道送达，不应再触发 onFail')
  } finally {
    cleanup()
  }
})

test('cloud 引擎：start() 抛错后再次 start() 仍可正常尝试（状态未残留）', async () => {
  const env = installGlobals()
  env.addTrack()
  const errors = []
  const states = []
  try {
    const recorder = createVoiceRecorder('cloud', 'zh-CN', (code) => errors.push(code), BEHAVIOR)
    recorder.onState = (s) => states.push(s)
    await recorder.start()
    assert.deepEqual(states, [], 'start 失败不得进入 recording 态（否则界面卡在「录音中」等一个永不到来的 onstop）')
    // 第二次尝试（例如用户关掉了占用麦克风的程序）：能再次走到 MediaRecorder 构造。
    await recorder.start()
    assert.equal(env.instances.length, 2, '失败不应留下阻止重试的状态残留')
    assert.deepEqual(errors, ['recorder-start-failed', 'recorder-start-failed'])
  } finally {
    cleanup()
  }
})
