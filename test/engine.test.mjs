import { test } from 'node:test'
import assert from 'node:assert/strict'

// engine.ts 只有两个纯函数（无 DOM/React），按 config-freeze.test.mjs 的既有做法
// 用 node 的类型剥离直接跑源码。
const { resolveEngine, shouldFallbackToCloud } = await import('../src/client/engine.ts')

/**
 * 引擎决策真值表。这个文件是「auto 模式为什么回退云端」的唯一真相，调用点在
 * voice-button.tsx:289（resolveEngine(provider, isWebSpeechSupported(), cloudConfigured())）
 * 与 :236/:244（shouldFallbackToCloud(engine, provider, cloudConfigured(), recoverable?)）——
 * 本测试按调用点的实参顺序逐维覆盖，签名一旦错位这里先红。
 *
 * 三个维度：配置态 provider（auto/browser/cloud）× Web Speech 可用性 × 云端已配置；
 * 兜底判定再加 recoverable（错误码是否可兜底，缺省 true = 同步启动抛错路径）。
 */

test('resolveEngine: 显式 cloud 恒走云端（不因浏览器可用而改主意）', () => {
  assert.equal(resolveEngine('cloud', true, true), 'cloud')
  assert.equal(resolveEngine('cloud', true, false), 'cloud', '云端没配也是调用方给错误提示，决策层不改判')
  assert.equal(resolveEngine('cloud', false, false), 'cloud')
})

test('resolveEngine: 显式 browser 恒走浏览器（云端配好了也不偷偷切）', () => {
  assert.equal(resolveEngine('browser', true, true), 'browser')
  assert.equal(resolveEngine('browser', true, false), 'browser')
  assert.equal(resolveEngine('browser', false, true), 'browser', '不支持也照选：失败路径由调用方提示')
})

test('resolveEngine: auto + Web Speech 可用 → 浏览器优先（云端配了也不用）', () => {
  assert.equal(resolveEngine('auto', true, true), 'browser')
  assert.equal(resolveEngine('auto', true, false), 'browser')
})

test('resolveEngine: auto + Web Speech 不可用 → 回退云端（云端已配置）', () => {
  assert.equal(resolveEngine('auto', false, true), 'cloud')
})

test('resolveEngine: auto + 两边都不可用 → 仍回浏览器（不死锁）', () => {
  assert.equal(resolveEngine('auto', false, false), 'browser', '决策层不抛错：由调用方按 cloud-not-configured 给提示')
})

test('shouldFallbackToCloud: auto + 浏览器引擎 + 云端已配置 + 可兜底 → 兜底', () => {
  assert.equal(shouldFallbackToCloud('browser', 'auto', true, true), true)
  assert.equal(shouldFallbackToCloud('browser', 'auto', true), true, 'recoverable 缺省 true（同步启动抛错路径没有错误码）')
})

test('shouldFallbackToCloud: 云端未配置 → 不兜底', () => {
  assert.equal(shouldFallbackToCloud('browser', 'auto', false, true), false)
  assert.equal(shouldFallbackToCloud('browser', 'auto', false), false)
})

test('shouldFallbackToCloud: 显式选 browser → 不兜底（用户的选择不被顶掉）', () => {
  assert.equal(shouldFallbackToCloud('browser', 'browser', true, true), false)
})

test('shouldFallbackToCloud: 已在云端 → 不重复兜底', () => {
  assert.equal(shouldFallbackToCloud('cloud', 'auto', true, true), false)
  assert.equal(shouldFallbackToCloud('cloud', 'cloud', true, true), false)
})

test('shouldFallbackToCloud: 不可兜底的错误码 → 不兜底（no-speech 等按正常结束处理）', () => {
  assert.equal(shouldFallbackToCloud('browser', 'auto', true, false), false)
})

test('shouldFallbackToCloud: 不可兜底 优先于 云端可用（两维同时命中）', () => {
  assert.equal(shouldFallbackToCloud('browser', 'browser', false, false), false)
  assert.equal(shouldFallbackToCloud('cloud', 'auto', false, false), false)
})
