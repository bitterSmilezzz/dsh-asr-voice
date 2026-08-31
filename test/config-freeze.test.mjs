import { test } from 'node:test'
import assert from 'node:assert/strict'
// config.ts 顶层只有常量与函数（DOM 只在 announce 里碰一下），故按 client-logic.test.mjs
// 的既有做法用 node 的 TS 剥离直接跑源码，并给 window 打一个最小桩。
globalThis.window = { dispatchEvent() {} }

const {
  DEFAULTS, config, mergeHostValue, newDraft, patchProvider, pickPreset, addProvider, removeProvider,
  withProviders, withLegacyMaterialized, draftActiveProvider, bindConfigScope, bindCredentialsApi,
  writeDraft, readKeyState, saveKey, keyRefOf,
} = await import('../src/client/config.ts')
const { keyRefFor } = await import('../src/key-ref.ts')

/** 深度冻结（immer 产出宿主快照的方式：连数组元素一起冻）。 */
function deepFreeze(value) {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

/** 一份宿主 settings 快照：providers 两行（immer 那样深度冻结）。 */
function hostSnapshot(patch = {}, { withKeys = false } = {}) {
  const rows = (patch.asr?.cloud?.providers ?? [
    { id: 'a', preset: 'openai', name: 'OpenAI Whisper', baseUrl: 'https://api.openai.com/v1', model: 'whisper-1', mode: 'transcriptions' },
    { id: 'b', preset: 'groq', name: 'Groq Whisper', baseUrl: 'https://api.groq.com/openai/v1', model: 'whisper-large-v3', mode: 'transcriptions' },
  ]).map((row) => (withKeys ? { ...row, apiKey: `secret-of-${row.id}` } : { ...row }))
  return deepFreeze({
    ...structuredClone(DEFAULTS),
    ...patch,
    asr: {
      ...structuredClone(DEFAULTS.asr),
      ...(patch.asr ?? {}),
      cloud: {
        ...structuredClone(DEFAULTS.asr.cloud),
        ...(patch.asr?.cloud ?? {}),
        providers: rows,
      },
    },
  })
}

/** 可编排的假 scope：writable / 是否真的接受写入都能拨。 */
function fakeScope(initial, { accept = true } = {}) {
  let value = structuredClone(initial)
  const written = []
  const scope = {
    getSnapshot: () => ({ value, writable: true }),
    subscribe: () => () => {},
    set: async (field, next) => {
      written.push(field)
      // 真实 SettingsScope 会吞掉失败并重载宿主状态——accept=false 就是这种情况。
      if (accept) value = { ...value, [field]: structuredClone(next) }
    },
  }
  return { scope, written, binder: { bind: () => scope } }
}

test('mergeHostValue: 宿主冻结引用不会漏进运行时快照', () => {
  mergeHostValue(hostSnapshot())
  const providers = config.asr.cloud.providers
  assert.equal(Object.isFrozen(providers), false, 'providers 数组本身必须可写：漏一个冻结引用就是一处静默失效')
  assert.equal(Object.isFrozen(providers[0]), false, '行对象同样要脱冻')
  assert.notEqual(providers[0], undefined)
})

test('mergeHostValue: 客户端形状里没有 apiKey', () => {
  mergeHostValue(hostSnapshot({}, { withKeys: true }))
  assert.equal('apiKey' in config.asr.cloud, false, '宿主旧文档里的明文 key 不能被并进快照')
  for (const row of config.asr.cloud.providers) assert.equal('apiKey' in row, false)
  assert.equal(JSON.stringify(config).includes('secret-of-a'), false, '密钥不得在浏览器侧任何角落出现')
})

test('草稿编辑：patchProvider / addProvider / removeProvider 都不抛且行永不原地改', () => {
  mergeHostValue(hostSnapshot())
  const draft = withLegacyMaterialized(newDraft())
  const before = draft.asr.cloud.providers[0]

  const edited = patchProvider(draft, 'a', { preset: 'mimo', baseUrl: 'https://api.xiaomimimo.com/v1', model: 'mimo-v2.5-asr', mode: 'chat' })
  const row = edited.asr.cloud.providers.find((p) => p.id === 'a')
  assert.equal(row.preset, 'mimo')
  assert.equal(row.mode, 'chat')
  assert.equal(before.preset, 'openai', '原行对象必须没被碰过')
  assert.notEqual(row, before)

  const added = addProvider(edited, 'dashscope')
  assert.equal(added.draft.asr.cloud.providers.length, 3)
  assert.equal(added.draft.asr.cloud.active, added.id, '新行即刻是当前使用')
  assert.equal(added.draft.asr.cloud.providers.find((p) => p.id === added.id).model, 'qwen3-asr-flash')

  const blank = addProvider(edited, 'custom', '我的端点')
  assert.equal(blank.draft.asr.cloud.providers.find((p) => p.id === blank.id).baseUrl, '', '未识别的预置要落成空白自定义行，而不是偷偷用 OpenAI 填上')
  assert.equal(removeProvider(added.draft, added.id).asr.cloud.providers.length, 2)
})

test('patchProvider: 改的是 v0.1 合成行时也要落地（列表为空曾静默吞掉编辑）', () => {
  mergeHostValue(hostSnapshot({ asr: { cloud: { providers: [], active: '', baseUrl: 'https://api.openai.com/v1', model: 'whisper-1' } } }))
  const draft = withLegacyMaterialized(newDraft())
  assert.equal(draft.asr.cloud.providers.length, 1, '有内容的旧单配置会先落成一行')

  const empty = withLegacyMaterialized({
    ...structuredClone(DEFAULTS),
    asr: { ...structuredClone(DEFAULTS.asr), provider: 'cloud' },
  })
  assert.equal(draftActiveProvider(empty).id, 'legacy')
  const typed = patchProvider(empty, 'legacy', { baseUrl: 'https://relay.example/v1', model: 'sensevoice' })
  assert.equal(typed.asr.cloud.providers.length, 1, '全新安装下直接填 Base URL 不能消失')
  assert.equal(typed.asr.cloud.providers[0].baseUrl, 'https://relay.example/v1')
  assert.equal(typed.asr.cloud.active, 'legacy', '合成行落位后即为当前使用')
})

test('pickPreset：切预置连带刷 baseUrl / model / mode', () => {
  mergeHostValue(hostSnapshot())
  const draft = patchProvider(newDraft(), 'a', { baseUrl: '', model: '', mode: 'auto' })
  const picked = pickPreset(draft, 'a', 'siliconflow')
  const row = picked.asr.cloud.providers.find((p) => p.id === 'a')
  assert.equal(row.baseUrl, 'https://api.siliconflow.cn/v1')
  assert.equal(row.model, 'FunAudioLLM/SenseVoiceSmall')
  assert.equal(row.mode, 'transcriptions')
})

test('writeDraft：只写真正改过的段，并按宿主读回判定成败', async () => {
  const initial = hostSnapshot()
  const ok = fakeScope(initial)
  bindConfigScope(ok.binder)
  mergeHostValue(structuredClone(initial))

  let draft = withProviders(newDraft(), [], '')
  draft = { ...draft, language: 'zh-CN' }
  assert.equal(await writeDraft(draft), undefined)
  assert.deepEqual(ok.written, ['asr', 'language'], '未改动的 optimize / behavior 不该过线')
  assert.equal(config.language, 'zh-CN')

  // 宿主把写回吞掉（真实 SettingsScope 的失败语义）：必须报出是哪一段没落盘。
  const refusing = fakeScope(initial, { accept: false })
  bindConfigScope(refusing.binder)
  const failedDraft = { ...newDraft(), language: 'en-US' }
  assert.equal(await writeDraft(failedDraft), 'language')
  // 回归：第一次失败已经把草稿并进本地快照，重试仍要报失败而不是算出「零变更」。
  assert.equal(await writeDraft(failedDraft), 'language')
})

test('keyRefFor：预置与官方 LLM 凭据同名，自定义按显示名派生', () => {
  assert.equal(keyRefFor({ preset: 'openai', name: 'x', id: 'a' }), 'OPENAI_API_KEY')
  assert.equal(keyRefFor({ preset: 'mimo', name: '', id: 'a' }), 'MIMO_API_KEY')
  assert.equal(keyRefFor({ preset: 'dashscope', name: '', id: 'a' }), 'DASHSCOPE_API_KEY')
  assert.equal(keyRefFor({ preset: 'custom', name: 'My Relay', id: 'a' }), 'ASR_VOICE_MY_RELAY_API_KEY')
  assert.equal(keyRefOf({ preset: 'custom', name: 'Local AI', id: 'a' }), 'ASR_VOICE_LOCAL_AI_API_KEY')
  // 中文显示名没有可用字符，退回按行 id 派生：引用名必须仍合法且行间不撞车。
  const refPattern = /^[A-Za-z_][A-Z0-9_]*$/
  const cjk1 = keyRefFor({ preset: 'custom', name: '我的端点', id: '3f2a9b1c-0000-0000-0000-000000000001' })
  const cjk2 = keyRefFor({ preset: 'custom', name: '另一个端点', id: '3f2a9b1c-0000-0000-0000-000000000002' })
  assert.match(cjk1, refPattern)
  assert.notEqual(cjk1, cjk2)
  assert.equal(keyRefFor({ preset: 'custom', name: '', id: '' }), 'ASR_VOICE_CUSTOM_API_KEY')
})

test('readKeyState / saveKey：只经 credentials 通道，值不回流 config', async () => {
  const store = new Map([['OPENAI_API_KEY', 'sk-real']])
  const calls = []
  bindCredentialsApi({
    describe: async ({ refs }) => {
      calls.push(['describe', ...refs])
      return { result: { ok: true, value: { credentials: Object.fromEntries(refs.map((ref) => [ref, {
        configured: store.has(ref), source: store.has(ref) ? 'settings-file' : '', writable: true,
      }])) } } }
    },
    set: async ({ ref, value }) => { calls.push(['set', ref]); store.set(ref, value); return { result: { ok: true, value: {} } } },
    unset: async ({ ref }) => { calls.push(['unset', ref]); store.delete(ref); return { result: { ok: true, value: {} } } },
  })
  mergeHostValue(hostSnapshot())
  const draft = newDraft()

  const reused = await readKeyState(draft.asr.cloud.providers[0])
  assert.equal(reused.ref, 'OPENAI_API_KEY')
  assert.equal(reused.configured, true, '配过 OpenAI LLM 的用户在这里就该看到已配置，全程零输入')

  const missing = await readKeyState(draft.asr.cloud.providers[1])
  assert.equal(missing.configured, false)
  assert.equal(missing.failure, null)

  assert.equal(await saveKey(draft.asr.cloud.providers[1], '  gsk-new  '), undefined, '写入成功要经过读回校验')
  assert.equal(store.get('GROQ_API_KEY'), 'gsk-new', '首尾空白要洗掉')
  // 只读来源能拒绝落盘而不报错：set 成功但读回仍未配置时必须报失败。
  const readOnly = {
    describe: async ({ refs }) => ({ result: { ok: true, value: { credentials: Object.fromEntries(refs.map((ref) => [ref, { configured: false, source: '', writable: false }])) } } }),
    set: async () => ({ result: { ok: true, value: {} } }),
    unset: async () => ({ result: { ok: true, value: {} } }),
  }
  bindCredentialsApi(readOnly)
  const refusal = await saveKey({ preset: 'groq', name: '', id: 'b' }, 'gsk-x')
  assert.match(refusal, /GROQ_API_KEY/, '失败原因里要点名是哪个引用')
  assert.equal(await saveKey({ preset: 'groq', name: '', id: 'b' }, ''), undefined, '留空即清除，且读回未配置就算成功')

  bindCredentialsApi(undefined)
  const absent = await readKeyState({ preset: 'openai', name: '', id: 'a' })
  assert.match(absent.failure, /credentials service unavailable/)
  assert.equal(JSON.stringify(config).includes('sk-real'), false)
  assert.equal(JSON.stringify(config).includes('gsk-new'), false)
  assert.deepEqual(
    calls.filter(([op]) => op === 'set').map(([, ref]) => ref),
    ['GROQ_API_KEY'],
  )
})
