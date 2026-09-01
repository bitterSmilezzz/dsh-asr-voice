import { test } from 'node:test'
import assert from 'node:assert/strict'
import { meaningfulTurn } from '../src/client/turn-guard.ts'

test('turn-guard: 空/纯标点 → 无意义', () => {
  assert.equal(meaningfulTurn(''), false)
  assert.equal(meaningfulTurn('   '), false)
  assert.equal(meaningfulTurn('。。。'), false)
  assert.equal(meaningfulTurn('，！？'), false)
})

test('turn-guard: 纯语气词（任意重复）→ 无意义（一直嗯的回归）', () => {
  assert.equal(meaningfulTurn('嗯'), false)
  assert.equal(meaningfulTurn('嗯嗯'), false)
  assert.equal(meaningfulTurn('嗯嗯嗯嗯嗯'), false)
  assert.equal(meaningfulTurn('啊'), false)
  assert.equal(meaningfulTurn('哦哦'), false)
  assert.equal(meaningfulTurn('呃，额，唉'), false)
  assert.equal(meaningfulTurn('um'), false)
  assert.equal(meaningfulTurn('uh uh'), false)
  assert.equal(meaningfulTurn('OK'), false)
  assert.equal(meaningfulTurn('okay okay'), false)
})

test('turn-guard: 单字不论语气与否 → 无意义（防幻觉单字回合）', () => {
  assert.equal(meaningfulTurn('好'), false)
  assert.equal(meaningfulTurn('是'), false)
  assert.equal(meaningfulTurn('行'), false)
  assert.equal(meaningfulTurn('A'), false) // 英文单字母
})

test('turn-guard: 正常句子放行', () => {
  assert.equal(meaningfulTurn('帮我写一个冒泡排序'), true)
  assert.equal(meaningfulTurn('好的，谢谢'), true)
  assert.equal(meaningfulTurn('嗯，帮我查一下天气'), true) // 语气词开头但含实词
  assert.equal(meaningfulTurn('please refactor'), true)
  assert.equal(meaningfulTurn('谢谢'), true)
})

test('isRestartEcho：重启回声只在时间窗内吞，窗外同句放行', async () => {
  const { isRestartEcho, RESTART_ECHO_WINDOW_MS } = await import('../src/client/turn-guard.ts')
  const T0 = 1_000_000
  // 窗口内同句 = 重启回声，吞
  assert.equal(isRestartEcho('帮我记一下', T0, '帮我记一下', T0 + 300), true)
  assert.equal(isRestartEcho('帮我记一下', T0, '帮我记一下', T0 + RESTART_ECHO_WINDOW_MS), true)
  // 窗口外同句 = 用户真的又说了一遍，放行
  assert.equal(isRestartEcho('帮我记一下', T0, '帮我记一下', T0 + RESTART_ECHO_WINDOW_MS + 1), false)
  assert.equal(isRestartEcho('帮我记一下', T0, '帮我记一下', T0 + 60_000), false)
  // 空历史/不同句：无论如何放行
  assert.equal(isRestartEcho('', T0, '帮我记一下', T0 + 100), false)
  assert.equal(isRestartEcho('另一句', T0, '帮我记一下', T0 + 100), false)
  // 时钟回拨（now < lastTurnAt）：不放行，宁可多念一句也不吞用户的
  assert.equal(isRestartEcho('帮我记一下', T0, '帮我记一下', T0 - 5), false)
})
