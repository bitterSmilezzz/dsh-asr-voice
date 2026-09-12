import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveApiKey } from '../lib/transcribe.js'

/**
 * API key 解析的三级来源：settings 遗留明文 → DSH credentials → 同名环境变量。
 *
 * 这里钉的是一个**语义陷阱**：DSH credentials 的 `resolve()` 契约是「未配置 → undefined」，
 * 抛错只代表服务真故障（后端不可用 / 权限拒绝）。早先空 catch 把故障也当成「没配 key」，
 * 用户看到 "no API key" 提示、去设置页反复确认凭据明明存在，真正的故障被彻底掩盖。
 */

/** 最小 Context 替身：只回答 credentials。 */
function ctxWith(credentials) {
  return { get: (name) => (name === 'credentials' ? credentials : undefined) }
}

const CFG = { id: 'p1', preset: 'openai', name: '', baseUrl: '', apiKey: '', model: '', mode: 'auto' }

/** 临时改环境变量并保证还原（同文件内的用例串行，改完即恢复）。 */
async function withEnv(ref, value, run) {
  const had = Object.prototype.hasOwnProperty.call(process.env, ref)
  const prev = process.env[ref]
  if (value === undefined) delete process.env[ref]
  else process.env[ref] = value
  try {
    return await run()
  } finally {
    if (had) process.env[ref] = prev
    else delete process.env[ref]
  }
}

test('resolveApiKey: settings 遗留明文优先，不查凭据服务', async () => {
  let consulted = false
  const key = await resolveApiKey(
    ctxWith({ resolve: async () => { consulted = true; return { value: 'from-credentials' } } }),
    { ...CFG, apiKey: '  legacy-plain  ' },
  )
  assert.equal(key, 'legacy-plain', '应返回去空白后的遗留值')
  assert.equal(consulted, false, '有遗留值时不该再查凭据服务')
})

test('resolveApiKey: 凭据服务命中即返回', async () => {
  const key = await resolveApiKey(ctxWith({ resolve: async () => ({ value: 'from-credentials' }) }), CFG)
  assert.equal(key, 'from-credentials')
})

test('resolveApiKey: 凭据未配置（resolve → undefined）返回空串，保持「去设置页配置」口径', async () => {
  await withEnv('OPENAI_API_KEY', undefined, async () => {
    const key = await resolveApiKey(ctxWith({ resolve: async () => undefined }), CFG)
    assert.equal(key, '', '未配置 ≠ 故障：应回空串让路由提示去配置')
  })
})

test('resolveApiKey: 无 credentials 服务时退回环境变量', async () => {
  await withEnv('OPENAI_API_KEY', 'from-env', async () => {
    assert.equal(await resolveApiKey(ctxWith(undefined), CFG), 'from-env')
  })
})

test('resolveApiKey: 凭据服务抛错且环境变量也没有 → 抛出真实原因（不再谎报「没配 key」）', async () => {
  await withEnv('OPENAI_API_KEY', undefined, async () => {
    const err = await resolveApiKey(
      ctxWith({ resolve: async () => { throw new Error('credentials backend unavailable') } }),
      CFG,
    ).then(() => null, (e) => e)
    assert.ok(err instanceof Error, '应抛错而不是静默返回空串')
    assert.match(err.message, /credential OPENAI_API_KEY lookup failed/)
    assert.match(err.message, /credentials backend unavailable/, '必须带上真实原因，否则排查仍无线索')
  })
})

test('resolveApiKey: 凭据服务抛错但环境变量兜到 key → 仍用环境变量（兜底优先于报错）', async () => {
  await withEnv('OPENAI_API_KEY', 'from-env', async () => {
    const key = await resolveApiKey(
      ctxWith({ resolve: async () => { throw new Error('credentials backend unavailable') } }),
      CFG,
    )
    assert.equal(key, 'from-env', '能兜到 key 就不该把故障升级成失败')
  })
})
