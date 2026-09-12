import { test } from 'node:test'
import assert from 'node:assert/strict'
// long-press.ts 是纯逻辑：定时器可注入，所以这里不用真等 450ms，
// 也不用 mock 全局时钟。锁的是「点 vs 长按」的仲裁语义。
const { createLongPressGate, DEFAULT_LONG_PRESS_MS } = await import('../src/client/long-press.ts')

/** 假定时器：advance(ms) 表示「再过去 ms 毫秒」，触发所有到期的回调。 */
function fakeTimers() {
  let next = 1
  let now = 0
  const pending = new Map()
  return {
    timers: {
      set(fn, ms) {
        const handle = next++
        pending.set(handle, { fn, at: now + ms })
        return handle
      },
      clear(handle) {
        pending.delete(handle)
      },
    },
    advance(ms) {
      now += ms
      for (const [handle, entry] of [...pending]) {
        if (entry.at <= now) {
          pending.delete(handle)
          entry.fn()
        }
      }
    },
    get pending() {
      return pending.size
    },
  }
}

/** 建一个记账用的门：记录长按次数，短按由调用方模拟 click 时自行判断。 */
function makeGate(overrides = {}) {
  const clock = fakeTimers()
  const longs = []
  const gate = createLongPressGate({
    thresholdMs: DEFAULT_LONG_PRESS_MS,
    onLongPress: () => longs.push('long'),
    timers: clock.timers,
    ...overrides,
  })
  /** 模拟一次「按下 → 松开 → 浏览器补发 click」，返回 click 是否该执行。 */
  const tap = () => {
    gate.press()
    gate.release()
    return !gate.shouldSuppressClick()
  }
  return { gate, clock, longs, tap }
}

test('阈值内松开：不触发长按，随后 click 照常执行', () => {
  const { gate, clock, longs, tap } = makeGate()
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS - 1)
  assert.deepEqual(longs, [], '未到阈值不得触发长按')
  gate.release()
  assert.equal(gate.shouldSuppressClick(), false, '短按的 click 必须放行')
  assert.equal(clock.pending, 0, '松开后定时器要清掉，不能挂着')
  assert.equal(tap(), true, '一次普通点击应正常执行')
  assert.deepEqual(longs, [])
})

test('跨过阈值：长按只触发一次，且随后的 click 被吞掉（只吞一次）', () => {
  const { gate, clock, longs } = makeGate()
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS)
  assert.deepEqual(longs, ['long'], '到点触发长按')
  clock.advance(DEFAULT_LONG_PRESS_MS * 4)
  assert.deepEqual(longs, ['long'], '按住不放不得重复触发')
  gate.release()
  assert.equal(gate.shouldSuppressClick(), true, '长按后的 click 必须吞掉')
  assert.equal(gate.shouldSuppressClick(), false, '吞掉标记只能消费一次')
})

test('长按之后的下一次短按不受影响（状态要干净地跨手势）', () => {
  const { gate, clock, longs, tap } = makeGate()
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS)
  gate.release()
  assert.equal(gate.shouldSuppressClick(), true)
  assert.equal(tap(), true, '第二次是真正的短按，必须放行')
  assert.deepEqual(longs, ['long'], '短按不得顺带再触发长按')
})

test('按住期间重复 press 被忽略（第二个指针不该重启计时）', () => {
  const { gate, clock, longs } = makeGate()
  gate.press()
  clock.advance(200)
  gate.press()
  clock.advance(250)
  assert.deepEqual(longs, ['long'], '第二个 press 若重启计时，长按会被无限推迟')
})

test('cancel：长按未触发时无回调，click 也不吞', () => {
  const { gate, clock, longs } = makeGate()
  gate.press()
  clock.advance(100)
  gate.cancel()
  assert.deepEqual(longs, [])
  assert.equal(gate.pressed, false)
  assert.equal(clock.pending, 0, 'cancel 必须清掉定时器')
  assert.equal(gate.shouldSuppressClick(), false)
})

test('cancel：长按已触发时仍吞掉残留 click（否则长按会被当成点再跑一次）', () => {
  const { gate, clock, longs } = makeGate()
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS)
  assert.deepEqual(longs, ['long'])
  gate.cancel()
  assert.equal(gate.shouldSuppressClick(), true, '动作已发生，残留 click 必须吞')
})

test('cancel 滞留的吞掉标记，会被下一次 press 清掉', () => {
  const { gate, clock, longs, tap } = makeGate()
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS)
  gate.cancel()
  // 故意不读 shouldSuppressClick：模拟 cancel 后浏览器没补 click，
  // 标记滞留在门里。下一次 press 必须把它清掉。
  gate.press()
  gate.release()
  assert.equal(gate.shouldSuppressClick(), false, '新手势开始时滞留标记必须清掉')
  assert.equal(tap(), true, '之后的正常点击不能被历史标记吞掉')
  assert.deepEqual(longs, ['long'])
})

test('长按被禁用时：按多久都只算短按，click 不被吞', () => {
  const { gate, clock, longs, tap } = makeGate({ isLongPressAllowed: () => false })
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS * 10)
  assert.deepEqual(longs, [], '禁用时不得触发长按')
  assert.equal(clock.pending, 0, '禁用时压根不该排定时器')
  gate.release()
  assert.equal(gate.shouldSuppressClick(), false, '禁用长按时不能连点也一起吞掉')
  assert.equal(tap(), true)
})

test('长按可用性逐次判定：中途放开后短按恢复', () => {
  let allowed = false
  const { gate, clock, longs, tap } = makeGate({ isLongPressAllowed: () => allowed })
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS)
  gate.release()
  assert.equal(tap(), true, '禁用时长按应退化成短按')
  allowed = true
  gate.press()
  clock.advance(DEFAULT_LONG_PRESS_MS)
  gate.release()
  assert.deepEqual(longs, ['long'], '放开后长按应恢复')
  assert.equal(gate.shouldSuppressClick(), true)
  assert.equal(tap(), true)
})

test('缺省时序下的健壮性：孤立 release / 孤立 click 不产生副作用', () => {
  const { gate, longs } = makeGate()
  gate.release()
  assert.equal(gate.shouldSuppressClick(), false, '没有 press 的 release 不该留下吞掉标记')
  gate.cancel()
  assert.equal(gate.pressed, false)
  assert.deepEqual(longs, [])
})
