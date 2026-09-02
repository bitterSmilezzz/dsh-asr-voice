import { test } from 'node:test'
import assert from 'node:assert/strict'
// animate.ts 只依赖 requestAnimationFrame 与目标元素的 style 对象：fromTo 显式给出
// 全部起始值时不读 computed style，baseTranslateOf 拿不到 DOM 会静默兜底成 undefined。
// 这里用最小 rAF 泵直接跑源码，锁住补间循环的三个关键行为。
// 注意：repeat 的新周期从下一帧的 now 重新起算，所以第二遍在 150→250 帧序里走完。
let queue = []
globalThis.requestAnimationFrame = (cb) => { queue.push(cb); return queue.length }
// scale/x/y 补间会在创建时读一次基础位移：node 没有 DOM，给个 transform:none 的桩
//（DOMMatrixReadOnly 解析失败由 baseTranslateOf 的 try/catch 兜底成 undefined）。
globalThis.getComputedStyle = () => ({ transform: 'none' })
/** 推进一帧：把当前排队的回调全部以给定时间戳执行（tick 自己会再排下一帧）。 */
function pump(now) {
  const snapshot = queue
  queue = []
  for (const cb of snapshot) cb(now)
}

const { fromTo } = await import('../src/client/animate.ts')

test('repeat 补间：第一遍到终点，第二遍从头再走到终点后收帧', () => {
  const el = { style: {} }
  const handle = fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.1, repeat: 1, ease: 'power1' })
  pump(0)
  pump(50)
  assert.equal(el.style.opacity, '0.5')
  pump(100)
  assert.equal(el.style.opacity, '1', '第一遍应到终点')
  pump(150)
  assert.equal(el.style.opacity, '0', '第二遍应回到起点重来')
  pump(250)
  assert.equal(el.style.opacity, '1')
  assert.equal(queue.length, 0, '播完不得再排帧')
  assert.equal(handle.isActive(), false)
})

test('yoyo 往返：反向周期必须真的走回起点（起止互换曾只换一边，反向恒值空转）', () => {
  const el = { style: {} }
  fromTo(el, { scale: 1 }, { scale: 2, duration: 0.1, repeat: 1, yoyo: true, ease: 'power1' })
  pump(0)
  pump(100)
  assert.equal(el.style.transform, 'scale(2)', '正向到终点')
  pump(150)
  assert.equal(el.style.transform, 'scale(2)', '反向从终点出发')
  pump(250)
  assert.equal(el.style.transform, 'scale(1)', '反向周期必须回到起点，而不是钉在终点')
  assert.equal(queue.length, 0, '往返结束不得再排帧')
})

test('repeat:Infinity + kill：kill 后循环收帧，样式停在被写入的最后一帧', () => {
  const el = { style: {} }
  const handle = fromTo(el, { opacity: 0.5 }, { opacity: 0, duration: 0.1, repeat: Infinity, ease: 'power1' })
  pump(0)
  pump(50)
  assert.equal(el.style.opacity, '0.25')
  handle.kill()
  pump(100)
  pump(150)
  assert.equal(queue.length, 0, 'kill 之后不得再排帧（否则 rAF 空转到卸载）')
  assert.equal(el.style.opacity, '0.25', 'kill 后样式冻结在最后一帧')
})
