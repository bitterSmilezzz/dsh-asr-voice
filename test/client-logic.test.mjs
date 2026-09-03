import { test } from 'node:test'
import assert from 'node:assert/strict'
// client 半区被 tsdown 打成单一 lib/client.js，无独立可 import 的产物；
// 这两个模块顶层只有常量与函数（无 DOM 副作用），故直接用 node 的 TS 剥离跑源码。
import { heuristicOptimize } from '../src/client/optimize.ts'
import { parseHotkey, matchHotkey } from '../src/client/hotkey.ts'

test('heuristicOptimize: 空与纯空白归一为空串', () => {
  assert.equal(heuristicOptimize(''), '')
  assert.equal(heuristicOptimize('   \n\t '), '')
})

test('heuristicOptimize: 中文句末自动补句号', () => {
  assert.equal(heuristicOptimize('帮我把这个函数改成异步'), '帮我把这个函数改成异步。')
})

test('heuristicOptimize: 英文句末补句点且句首大写', () => {
  assert.equal(heuristicOptimize('please refactor this'), 'Please refactor this.')
})

test('heuristicOptimize: 已有句末标点不重复补', () => {
  assert.equal(heuristicOptimize('这样做可以。'), '这样做可以。')
  assert.equal(heuristicOptimize('好吗？'), '好吗？')
  assert.equal(heuristicOptimize('走！'), '走！')
  assert.equal(heuristicOptimize('done.'), 'Done.')
})

test('heuristicOptimize: 成词边界的语气词被删（有标点或空白时生效）', () => {
  assert.equal(heuristicOptimize('你好，嗯嗯，今天怎么样'), '你好，今天怎么样。')
  assert.equal(heuristicOptimize('先这样 然后 再说'), '先这样 再说。')
})

test('heuristicOptimize: 已知保守边界——连续无标点中文流不删语气词', () => {
  // 删词要求前后是空白/标点/边界，否则「这个方案」「然后我们」会被削坏。
  // 本条不是主张"就该如此"，而是钉住现状：任何放宽都要显式改这里并写清代价。
  assert.equal(heuristicOptimize('嗯嗯这个就是说你好啊'), '嗯嗯这个就是说你好啊。')
})

test('heuristicOptimize: 不误伤含语气词字面的实义写法', () => {
  assert.equal(heuristicOptimize('这个这个方案不行'), '这个这个方案不行。')
})

test('heuristicOptimize: 折叠多余空白并清理标点两侧', () => {
  assert.equal(heuristicOptimize('这里  有   多余空格'), '这里 有 多余空格。')
  assert.equal(heuristicOptimize('收尾带空格   '), '收尾带空格。')
})

test('heuristicOptimize: 英文语气词整词删除且句首大写', () => {
  assert.equal(heuristicOptimize('so um I think uh it works'), 'So I think it works.')
})

test('heuristicOptimize: 英文不收 like/well 等实义词（避免削坏句子）', () => {
  assert.equal(heuristicOptimize('I like this as well'), 'I like this as well.')
})

test('parseHotkey: 组合键解析', () => {
  assert.deepEqual(parseHotkey('Ctrl+Shift+Space'), { ctrl: true, alt: false, shift: true, meta: false, key: 'Space' })
  assert.deepEqual(parseHotkey('cmd+k'), { ctrl: false, alt: false, shift: false, meta: true, key: 'K' })
})

test('parseHotkey: 别名与大小写不敏感', () => {
  assert.deepEqual(parseHotkey('CONTROL+P'), parseHotkey('ctrl+p'))
  assert.deepEqual(parseHotkey('Command+Option+J'), { ctrl: false, alt: true, shift: false, meta: true, key: 'J' })
  assert.deepEqual(parseHotkey('option+j'), parseHotkey('alt+j'))
})

test('parseHotkey: 方向键与功能键归一', () => {
  assert.equal(parseHotkey('cmd+ArrowUp')?.key, 'Up')
  assert.equal(parseHotkey('ctrl+Escape')?.key, 'Escape')
  assert.equal(parseHotkey('ctrl+Spacebar')?.key, 'Space')
})

test('parseHotkey: 空串 / 纯修饰键 / 无主键 返回 null', () => {
  assert.equal(parseHotkey(''), null)
  assert.equal(parseHotkey('   '), null)
  assert.equal(parseHotkey('ctrl+shift'), null)
  assert.equal(parseHotkey('++'), null)
})

test('parseHotkey: 单键无修饰符也可解析', () => {
  assert.deepEqual(parseHotkey('F5'), { ctrl: false, alt: false, shift: false, meta: false, key: 'F5' })
})

/** 构造按下的键事件（Node 无 DOM KeyboardEvent，用最小垫片）。 */
function keyEvent(partial) {
  return {
    key: 'k',
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...partial,
  }
}

test('matchHotkey: Ctrl 规格兼容 Cmd（macOS 上 Control/Command 都算）', () => {
  const spec = parseHotkey('ctrl+k')
  assert.ok(spec)
  // 常规 Ctrl 命中
  assert.ok(matchHotkey(keyEvent({ key: 'k', ctrlKey: true }), spec))
  // macOS Cmd 命中（录制器把 Cmd 记成 Ctrl，匹配须等价的回归钉）
  assert.ok(matchHotkey(keyEvent({ key: 'k', metaKey: true }), spec))
  // 无修饰键不命中
  assert.ok(!matchHotkey(keyEvent({ key: 'k' }), spec))
  // 主键不符不命中
  assert.ok(!matchHotkey(keyEvent({ key: 'j', ctrlKey: true }), spec))
})

test('matchHotkey: Meta 规格只认 Cmd，不认 Ctrl', () => {
  const spec = parseHotkey('cmd+k')
  assert.ok(spec)
  assert.ok(matchHotkey(keyEvent({ key: 'k', metaKey: true }), spec))
  assert.ok(!matchHotkey(keyEvent({ key: 'k', ctrlKey: true }), spec))
  assert.ok(!matchHotkey(keyEvent({ key: 'k' }), spec))
})

test('matchHotkey: 纯修饰键按下本身不消费（避免 Ctrl 自身触发）', () => {
  const spec = parseHotkey('ctrl+k')
  assert.ok(spec)
  assert.ok(!matchHotkey(keyEvent({ key: 'Control', ctrlKey: true }), spec))
  assert.ok(!matchHotkey(keyEvent({ key: 'Meta', metaKey: true }), spec))
})

test('matchHotkey: 修饰键组合的精确匹配', () => {
  const spec = parseHotkey('ctrl+shift+Space')
  assert.ok(spec)
  assert.ok(matchHotkey(keyEvent({ key: ' ', ctrlKey: true, shiftKey: true }), spec))
  assert.ok(!matchHotkey(keyEvent({ key: ' ', ctrlKey: true }), spec))
  assert.ok(!matchHotkey(keyEvent({ key: ' ', ctrlKey: true, altKey: true, shiftKey: true }), spec))
  // Cmd+Shift 等价（Ctrl 兼容 Cmd）
  assert.ok(matchHotkey(keyEvent({ key: ' ', metaKey: true, shiftKey: true }), spec))
})
