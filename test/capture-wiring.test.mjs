import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * AudioWorklet 端口接线是**离线测不到**的一类缺陷：引擎单测里帧是测试直接喂给 `onFrame`
 * 的，永远绕 over 过真 MessagePort，所以「一帧都不投」在 node 里表现为全绿。真机探针
 * （Chromium + `--use-file-for-fake-audio-capture`）实测：只 `addEventListener('message')`
 * 时 0 帧，赋 `port.onmessage` 或补 `port.start()` 才 174 帧 / 7s。这里把那次的结论钉成
 * 源码形状断言——不是复述代码，是防有人把这一行「顺手改回」addEventListener。
 */
const SRC = readFileSync(new URL('../src/client/capture.ts', import.meta.url), 'utf8')

test('采集端口必须经 onmessage 或 start() 启动（addEventListener 单独用是哑的）', () => {
  assert.match(SRC, /port\.onmessage\s*=\s*onMessage/, '未用 onmessage 挂接：MessagePort 不会开始投递')
  assert.doesNotMatch(SRC, /port\.addEventListener\('message'/, 'addEventListener 不会让端口进入 actively receiving 状态')
})

test('worklet 必须有一条通往 destination 的零增益路径，且不得把原声还给扬声器', () => {
  // 不通向 destination 的 worklet 不会被拉起来；增益不为 0 就是实时模式自激啸叫。
  assert.match(SRC, /mutedSink\.gain\.value = 0/, '静音汇点必须显式置零')
  assert.match(SRC, /mutedSink\.connect\(ctx\.destination\)/, '图上必须接到 destination')
})
