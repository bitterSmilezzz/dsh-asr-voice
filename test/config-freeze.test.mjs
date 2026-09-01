import { test } from 'node:test'
import assert from 'node:assert/strict'
// config.ts 顶层只有常量与函数（DOM 只在 announce 里碰一下），故按 client-logic.test.mjs
// 的既有做法用 node 的 TS 剥离直接跑源码，并给 window 打一个最小桩。
globalThis.window = { dispatchEvent() {} }

const {
  DEFAULTS, config, mergeHostValue, newDraft, patchProvider, pickPreset, addProvider, removeProvider,
  withProviders, withLegacyMaterialized, draftActiveProvider, bindConfigScope, bindCredentialsApi,
  adaptLegacyCredentials,
  writeDraft, readKeyState, saveKey, keyRefOf, recordBehavior, realtimeTuning,
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

test('数值设置：宿主快照里的非法值不得污染计时（NaN 会让 setTimeout 立即触发）', () => {
  mergeHostValue(hostSnapshot())
  const before = recordBehavior()
  assert.ok(Number.isFinite(before.silenceMs) && before.silenceMs > 0, '默认计时必须是可用数字')

  mergeHostValue(hostSnapshot({
    behavior: { maxRecordMs: '120000', silenceStop: true, silenceRms: [0.5], silenceMs: Number.NaN },
    realtime: { enabled: true, tts: 'browser', hotkey: '', turn: { settleMs: { nested: true }, tailMs: -1 }, speech: { firstSentenceMinChars: '12', utteranceWatchdogMs: null } },
  }))

  assert.deepEqual(
    recordBehavior(),
    { ...before, silenceStop: true },
    '字符串/数组/NaN 都不算数字，三项计时应原样保留（silenceStop 是合法布尔，照写）',
  )
  assert.ok(Number.isFinite(config.realtime.turn.settleMs), '断句计时不能变成 NaN')
  assert.equal(config.realtime.turn.tailMs, -1, '负数是合法数字，范围由宿主 schema 把关')
  assert.equal(config.realtime.speech.utteranceWatchdogMs, DEFAULTS.realtime.speech.utteranceWatchdogMs, 'null 不是数字，保留本地值')

  // 快照脱离：录音进行中改设置，不能把这一段的计时换掉
  const taken = recordBehavior()
  mergeHostValue(hostSnapshot({ behavior: { ...structuredClone(DEFAULTS.behavior), silenceMs: 9_000 } }))
  assert.equal(taken.silenceMs, before.silenceMs, 'recordBehavior 返回的是当时的拷贝')
  assert.equal(recordBehavior().silenceMs, 9_000)
})

test('null / 形状漂移不得顶掉本地默认（realtimeTuning 必须是全函数）', () => {
  mergeHostValue(hostSnapshot())
  // 宿主旧文档 / 手工改过的 settings 会把 null 留在原位：曾直接崩在解构 turn 之后。
  mergeHostValue(deepFreeze({ realtime: { turn: null, speech: null, hotkey: null, enabled: null, tts: null, engine: null, vad: null, maxSessionMs: null } }))
  const tuning = realtimeTuning()
  assert.equal(tuning.settleMs, DEFAULTS.realtime.turn.settleMs)
  assert.equal(tuning.firstSentenceMinChars, DEFAULTS.realtime.speech.firstSentenceMinChars)
  assert.equal(tuning.hotkey, '', '快捷键位上的 null 会被 parseHotkey 当成字符串炸掉')
  assert.equal(tuning.enabled, false, '开关位上的 null 不能变成任意真值')
  assert.equal(tuning.engine, 'browser', '引擎位上的 null 会把会话装配成 undefined 引擎')
  assert.equal(tuning.segmented.vad.silenceMs, DEFAULTS.realtime.vad.silenceMs, '整段 vad 顶成 null 时解构 vad.frameMs 直接炸')

  mergeHostValue(deepFreeze({
    realtime: { turn: [1, 2], speech: 'x', maxSessionMs: { nested: 1 }, enabled: 'true', hotkey: 5, tts: ['off'], engine: 5, vad: [1, 2] },
    behavior: null, optimize: 'nope',
  }))
  assert.deepEqual(realtimeTuning(), tuning, '类型漂移一律视为宿主没写这一项')
  assert.equal(typeof config.behavior, 'object', '整段被顶成字符串会让 recordBehavior 直接崩')
  assert.equal(typeof config.optimize, 'object')

  // 一个坏字段不能拖垮整段：同段里的合法值照写（宿主文档只会写出部分缺省的形状）。
  mergeHostValue(deepFreeze({ realtime: { turn: null, maxSessionMs: 30_000, hotkey: 'Ctrl+Alt+V' } }))
  assert.equal(config.realtime.maxSessionMs, 30_000)
  assert.equal(config.realtime.hotkey, 'Ctrl+Alt+V')
  assert.equal(realtimeTuning().settleMs, DEFAULTS.realtime.turn.settleMs)

  mergeHostValue(deepFreeze({ realtime: { engine: 'segmented', vad: { frameMs: 60, rms: 'loud', silenceMs: null } } }))
  assert.equal(realtimeTuning().segmented.frameMs, 60, 'vad 里的合法字段照写')
  assert.equal(realtimeTuning().segmented.vad.rms, DEFAULTS.realtime.vad.rms, '同段的坏字段只作废自己')
  assert.equal(realtimeTuning().segmented.vad.silenceMs, DEFAULTS.realtime.vad.silenceMs)
  assert.equal(realtimeTuning().engine, 'segmented')

  // 数组段同理：对象顶进 providers 位之后每次 .map 都是运行时炸点。
  mergeHostValue(deepFreeze({ asr: { cloud: { providers: { id: 'a' } } } }))
  assert.ok(Array.isArray(config.asr.cloud.providers), 'providers 必须仍是数组')
})

test('宿主文档早于 realtime 段：整段缺省仍要给出可用快照', () => {
  // config 是模块级单例，本文件所有用例共用：先复位再验，否则断言变成测试顺序的函数。
  mergeHostValue(structuredClone(DEFAULTS))
  const legacy = structuredClone(DEFAULTS)
  delete legacy.realtime
  mergeHostValue(deepFreeze({ ...legacy, behavior: { ...legacy.behavior, autoSend: true } }))
  const tuning = realtimeTuning()
  assert.equal(tuning.enabled, false)
  assert.equal(tuning.settleMs, 900)
  assert.equal(tuning.maxSessionMs, 600_000)
  assert.equal(config.behavior.autoSend, true, '合法标量照写，缺的那一段不能连带吞掉')

  // 上一版插件写过的文档：有 realtime 段，但没有 engine / vad。
  const prev = structuredClone(DEFAULTS)
  delete prev.realtime.engine
  delete prev.realtime.vad
  mergeHostValue(deepFreeze(prev))
  const upgraded = realtimeTuning()
  assert.equal(upgraded.engine, 'browser', '旧文档没写的引擎位不能变成 undefined')
  const { vad: vadDefaults } = DEFAULTS.realtime
  assert.deepEqual(upgraded.segmented.vad, {
    rms: vadDefaults.rms,
    rmsAuto: true, // 老文档没有 rmsAuto：realtimeTuning 按开启回退，绝不能让 undefined 泄漏
    silenceMs: vadDefaults.silenceMs,
    prerollMs: vadDefaults.prerollMs,
    minSpeechMs: vadDefaults.minSpeechMs,
    maxSegmentMs: vadDefaults.maxSegmentMs,
  })
  assert.equal(upgraded.segmented.frameMs, vadDefaults.frameMs)
  assert.equal(upgraded.segmented.maxPending, vadDefaults.maxPending)
})

test('readKeyState / saveKey：只经 credentials 通道，值不回流 config', async () => {
  const store = new Map([['OPENAI_API_KEY', 'sk-real']])
  const calls = []
  bindCredentialsApi({
    describe: async (refs) => {
      calls.push(['describe', ...refs])
      return { ok: true, value: Object.fromEntries(refs.map((ref) => [ref, {
        configured: store.has(ref), source: store.has(ref) ? 'settings-file' : '', writable: true,
      }])) }
    },
    set: async (ref, value) => { calls.push(['set', ref]); store.set(ref, value); return { ok: true } },
    unset: async (ref) => { calls.push(['unset', ref]); store.delete(ref); return { ok: true } },
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
    describe: async (refs) => ({ ok: true, value: Object.fromEntries(refs.map((ref) => [ref, { configured: false, source: '', writable: false }])) }),
    set: async () => ({ ok: true }),
    unset: async () => ({ ok: true }),
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

test('adaptLegacyCredentials：旧 connection.api 形状适配成新形状', async () => {
  const store = new Map([['OPENAI_API_KEY', 'sk-legacy']])
  const legacy = {
    describe: async ({ refs }) => ({ result: { ok: true, value: { credentials: Object.fromEntries(refs.map((ref) => [ref, {
      configured: store.has(ref), source: store.has(ref) ? 'file' : '', writable: true,
    }])) } } }),
    set: async ({ ref, value }) => { store.set(ref, value); return { result: { ok: true, value: {} } } },
    unset: async ({ ref }) => { store.delete(ref); return { result: { ok: true, value: {} } } },
  }
  bindCredentialsApi(adaptLegacyCredentials(legacy))
  const state = await readKeyState({ preset: 'openai', name: '', id: 'a' })
  assert.equal(state.configured, true)
  assert.equal(state.source, 'file')
  assert.equal(await saveKey({ preset: 'groq', name: '', id: 'b' }, 'gsk-y'), undefined)
  assert.equal(store.get('GROQ_API_KEY'), 'gsk-y')
  // 旧形状拒绝也要正确映射成 failure。
  bindCredentialsApi(adaptLegacyCredentials({
    describe: async () => ({ result: { ok: false, error: { message: 'legacy rejected' } } }),
    set: async () => ({ result: { ok: true, value: {} } }),
    unset: async () => ({ result: { ok: true, value: {} } }),
  }))
  const refused = await readKeyState({ preset: 'openai', name: '', id: 'a' })
  assert.equal(refused.failure, 'legacy rejected')
  bindCredentialsApi(undefined)
})
