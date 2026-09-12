import { test } from 'node:test'
import assert from 'node:assert/strict'
// button-route.ts 是纯逻辑：把「一个按钮两个动作」的仲裁从 JSX 里抽出来，
// 用真值表锁住。最要紧的一条是长按后的 click 必须被吞——否则一次长按会
// 既开对话又开转写。
const { routeButtonPress } = await import('../src/client/button-route.ts')

/** 造一份输入，只写要覆盖的字段。 */
function input(overrides = {}) {
  return { longPress: false, chatActive: false, micPhase: 'idle', ...overrides }
}

test('长按后的 click 一律吞掉（不许顺手再开一次转写）', () => {
  // 长按刚触发：无论对话是否已开、录音在哪一档，这个 click 都不该有动作。
  assert.equal(routeButtonPress(input({ longPress: true })), 'none')
  assert.equal(routeButtonPress(input({ longPress: true, chatActive: true })), 'none')
  assert.equal(routeButtonPress(input({ longPress: true, micPhase: 'recording' })), 'none')
  assert.equal(routeButtonPress(input({ longPress: true, micPhase: 'transcribing' })), 'none')
})

test('对话在跑：按钮整体归对话，不会落到录音链路', () => {
  assert.equal(routeButtonPress(input({ chatActive: true })), 'chat')
  // 对话的 listening/thinking/speaking 三档在录音链路看来都是 idle——
  // 若忘了 chatActive 优先，这里会退化成 'begin'，一点就把录音叠上去。
  assert.equal(routeButtonPress(input({ chatActive: true, micPhase: 'idle' })), 'chat')
})

test('对话空闲：按录音链路的三档分派', () => {
  assert.equal(routeButtonPress(input({ micPhase: 'idle' })), 'begin')
  assert.equal(routeButtonPress(input({ micPhase: 'recording' })), 'finish')
  assert.equal(routeButtonPress(input({ micPhase: 'transcribing' })), 'cancel')
  assert.equal(routeButtonPress(input({ micPhase: 'optimizing' })), 'cancel')
})

test('真值表穷举：长按与对话两个开关不会互相盖掉', () => {
  const phases = ['idle', 'recording', 'transcribing', 'optimizing']
  const table = []
  for (const longPress of [false, true]) {
    for (const chatActive of [false, true]) {
      for (const micPhase of phases) {
        table.push([longPress, chatActive, micPhase, routeButtonPress({ longPress, chatActive, micPhase })])
      }
    }
  }
  assert.equal(table.length, 16, '2×2×4 组合都要有结果')
  for (const [longPress, chatActive, micPhase, action] of table) {
    if (longPress) {
      assert.equal(action, 'none', `长按后必须吞：${micPhase}`)
      continue
    }
    assert.notEqual(action, 'none', `非长按必须给出动作：${micPhase}`)
    if (chatActive) assert.equal(action, 'chat', '对话优先于录音链路')
  }
})
