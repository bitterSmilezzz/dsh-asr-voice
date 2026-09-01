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
