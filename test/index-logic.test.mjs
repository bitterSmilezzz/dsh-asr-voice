import { test } from 'node:test'
import assert from 'node:assert/strict'

/**
 * host 组合逻辑单测：providerView / resolveCloudProvider / listProviders /
 * migrateLegacyKeys（src/index.ts 内部导出——纯函数或依赖可注入，无需 Cordis mock 基座）。
 * 注意：不能 import '../src/index.ts'（import 链里 realtime-dashscope.ts 用了 TS
 * parameter property，node strip-only 不支持），与 realtime-dashscope.test.mjs 一致
 * 走构建产物 lib/index.js；改动 src/index.ts 后需先重建 lib 再跑本文件。
 */
import { providerView, resolveCloudProvider, listProviders, migrateLegacyKeys } from '../lib/index.js'

/** 组装一份 AsrVoiceSettings 的最小形状（asr.cloud 为唯一读取面）。 */
function settingsWith(cloud) {
  return { asr: { provider: 'auto', cloud } }
}

test('providerView: 缺省兜底（preset=openai、mode=auto、其余空串、id 用 fallback）', () => {
  assert.deepEqual(providerView({}, 'provider'), {
    id: 'provider', preset: 'openai', name: '', baseUrl: '', apiKey: '', model: '', mode: 'auto',
  })
})

test('providerView: 行内值保留；modeOverride 优先于行内 mode', () => {
  const row = { id: 'p1', preset: 'dashscope', name: '百炼', baseUrl: 'https://x', apiKey: 'k', model: 'm', mode: 'chat' }
  assert.deepEqual(providerView(row, 'fallback'), row)
  assert.equal(providerView(row, 'fallback', 'auto').mode, 'auto', '显式 override 优先')
  assert.equal(providerView({ mode: 'chat' }, 'x').mode, 'chat')
  assert.equal(providerView({}, 'x', 'transcriptions').mode, 'transcriptions')
})

test('resolveCloudProvider: 多供应商按 active 取行，active 不命中回退首个', () => {
  const v = settingsWith({
    active: 'p2',
    providers: [
      { id: 'p1', preset: 'openai', model: 'whisper-1' },
      { id: 'p2', preset: 'dashscope', model: 'qwen', name: '百炼' },
    ],
  })
  assert.deepEqual(resolveCloudProvider(v), {
    id: 'p2', preset: 'dashscope', name: '百炼', baseUrl: '', apiKey: '', model: 'qwen', mode: 'auto',
  })
  assert.equal(resolveCloudProvider(settingsWith({ active: 'nope', providers: [{ id: 'p1' }] })).id, 'p1')
})

test('resolveCloudProvider: 旧单配置（无 providers 数组）合成 legacy 行', () => {
  const v = settingsWith({ preset: 'openai', baseUrl: 'https://legacy', apiKey: 'old-key', model: 'whisper-1' })
  assert.deepEqual(resolveCloudProvider(v), {
    id: 'legacy', preset: 'openai', name: '', baseUrl: 'https://legacy', apiKey: 'old-key', model: 'whisper-1', mode: 'auto',
  })
  assert.equal(resolveCloudProvider(undefined), undefined, '无 settings 应返回 undefined')
})

test('listProviders: 多供应商全列；旧单配置合成一个 legacy；无配置为空', () => {
  assert.equal(listProviders(undefined).length, 0)
  assert.deepEqual(listProviders(settingsWith({ providers: [] })), [], '无 providers 且无 baseUrl → 空列表')
  assert.deepEqual(
    listProviders(settingsWith({ providers: [{ id: 'p1', preset: 'openai' }], baseUrl: 'x' })),
    [{ id: 'p1', preset: 'openai', name: '', baseUrl: '', apiKey: '', model: '', mode: 'auto' }],
  )
  const legacy = listProviders(settingsWith({ preset: 'openai', baseUrl: 'https://legacy' }))
  assert.equal(legacy.length, 1)
  assert.equal(legacy[0].id, 'legacy')
  assert.equal(legacy[0].baseUrl, 'https://legacy')
})

/** 假 scope：get 返回深度冻结快照（镜像真实 settings 服务的冻结解析），update 记 patch。 */
function makeScope(initial) {
  const updates = []
  const snapshot = () => JSON.parse(JSON.stringify(initial))
  let current = snapshot()
  return {
    get: () => Object.freeze(current),
    update: async (patch) => { updates.push(JSON.parse(JSON.stringify(patch))); current = snapshot() },
    updates,
  }
}

const NOOP_LOG = { warn: () => {}, info: () => {} }

test('migrateLegacyKeys: credentials 缺席 → 整批跳过（不读 scope、不写、不记日志）', async () => {
  let got = 0
  const scope = { get: () => { got += 1; throw new Error('不应被读取') }, update: async () => { throw new Error('不应被写') } }
  await migrateLegacyKeys(scope, undefined, NOOP_LOG)
  assert.equal(got, 0)
})

test('migrateLegacyKeys: 无遗留 key → 空转早退（不 set、不 update、不记日志）', async () => {
  const scope = makeScope(settingsWith({ providers: [{ id: 'p1', preset: 'openai', apiKey: '   ' }], apiKey: '' }))
  const sets = []
  const log = { warn: () => { throw new Error('不应 warn') }, info: () => { throw new Error('不应 info') } }
  await migrateLegacyKeys(scope, { set: async (ref, key) => { sets.push([ref, key]) } }, log)
  assert.deepEqual(sets, [])
  assert.deepEqual(scope.updates, [])
})

test('migrateLegacyKeys: 全量搬成功 → 抹掉明文（providers 各行 + 遗留 apiKey）并记 info', async () => {
  const scope = makeScope(settingsWith({
    preset: 'openai',
    apiKey: 'legacy-secret',
    providers: [
      { id: 'p1', preset: 'openai', apiKey: 'key-a' },
      { id: 'p2', preset: 'custom-x', name: 'My Provider', apiKey: 'key-b' },
    ],
  }))
  const sets = []
  const infos = []
  await migrateLegacyKeys(scope, { set: async (ref, key) => { sets.push([ref, key]) } }, { warn: () => {}, info: (m) => { infos.push(m) } })
  // 预置 id → <PRESET>_API_KEY（复用官方 LLM 同名凭据）；自定义 → ASR_VOICE_<NAME>_API_KEY；
  // 旧单配置 legacy → 按行内 preset 派生。
  assert.deepEqual(sets, [
    ['OPENAI_API_KEY', 'key-a'],
    ['ASR_VOICE_MY_PROVIDER_API_KEY', 'key-b'],
    ['OPENAI_API_KEY', 'legacy-secret'],
  ])
  assert.deepEqual(scope.updates, [{ asr: { cloud: { providers: [
    { id: 'p1', preset: 'openai', apiKey: '' },
    { id: 'p2', preset: 'custom-x', name: 'My Provider', apiKey: '' },
  ], apiKey: '' } } }])
  assert.equal(infos.length, 1)
  assert.match(infos[0], /moved 3 API key/)
})

test('migrateLegacyKeys: 任一条 set 被拒 → 停止迁移、明文保留（不 update）、warn 带原因', async () => {
  const scope = makeScope(settingsWith({
    preset: 'openai',
    providers: [{ id: 'p1', preset: 'openai', apiKey: 'key-a' }, { id: 'p2', preset: 'openai', apiKey: 'key-b' }],
  }))
  const sets = []
  const warns = []
  await migrateLegacyKeys(scope, {
    set: async (ref, key) => {
      sets.push(ref)
      if (ref === 'OPENAI_API_KEY' && sets.length === 2) throw new Error('readonly source')
    },
  }, { warn: (m) => { warns.push(m) }, info: () => {} })
  assert.deepEqual(sets, ['OPENAI_API_KEY', 'OPENAI_API_KEY'], '第二条被拒后不再尝试后续')
  assert.deepEqual(scope.updates, [], '迁移未完成 → 明文 key 必须原样保留（抹掉就无处可寻）')
  assert.equal(warns.length, 1)
  assert.match(warns[0], /credentials\.set\(OPENAI_API_KEY\) refused: readonly source/)
})
