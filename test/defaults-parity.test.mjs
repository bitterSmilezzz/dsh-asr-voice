import { test } from 'node:test'
import assert from 'node:assert/strict'

/**
 * 默认值一致性守卫：设置默认值在仓库里有三份副本，其中两份必须逐路径相等。
 *  - host `src/settings.ts` 的 schemastery schema（**权威源**，落 ~/.dsh/settings.yaml）；
 *  - client `src/client/config.ts` 的 `DEFAULTS`（宿主快照未覆盖时的本地兜底快照）；
 *  - README 的设置表（第三份，纯文档，本测试管不到——README 目前已有漂移，见报告）。
 *
 * 为什么要有这个测试：两份副本零守卫，任何一边改默认值（或新增字段只改一边）都是
 * 静默漂移——client 侧缺字段时 `mergeHostValue` 只覆盖「本地认识的键」，缺的那项永远
 * 停在 undefined，界面表现为「设置项显示空/不生效」而没有任何报错。
 *
 * 比对方式：host schema 解析空文档 `AsrVoiceSettingsSchema({})`（schemastery 把
 * 所有 default 落上）→ 与 `DEFAULTS` 递归逐路径比：类型一致 + 值相等。失败信息直接
 * 给出漂移路径（形如 `asr.cloud.providers[].mode: schema=auto client=undefined`，
 * 类型不一致时再附 `（类型不一致：string vs undefined）`）。
 *
 * 依赖：import host 编译产物 `lib/settings.js`（仓库已入库）与 client 源码（node 类型剥离）。
 */
const { AsrVoiceSettingsSchema, CloudProviderSchema } = await import('../lib/settings.js')
const { DEFAULTS } = await import('../src/client/config.ts')

/**
 * volatile 引用解引用（官方 `plainConfig()` 的最小等价实现，见
 * `packages/settings/settings/src/schema.ts`）：schema 顶层标 .volatile() 后，
 * 直接调用 schema 拿到的是 `{ get() }` 引用而不是字段树，必须先剥引才能比默认值。
 */
const plainOf = (value) => {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') return plainOf(value.get())
  if (Array.isArray(value)) return value.map(plainOf)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, plainOf(child)]))
  }
  return value
}

/** 权威默认值：schema 对空文档的解析结果（volatile 已剥引）。 */
const schemaDefaults = plainOf(AsrVoiceSettingsSchema({}))

/**
 * 刻意差异白名单：路径 → 理由。用**显式路径**而不是「模糊忽略密钥类字段」——
 * 白名单本身也是契约的一部分，多一条就得写一条理由，改错方向会立刻红。
 */
const INTENTIONAL = new Map([
  ['asr.cloud.apiKey',
    'client 侧刻意不含：它是 v0.1 遗留的密钥位置（role(\'secret\')），只有 host 读得到（供一次性迁移搬进 DSH 凭据），浏览器快照永不带密钥。见 src/settings.ts 文件头。'],
])

const kindOf = (value) => (value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value)
const fmt = (value) => (value === undefined ? 'undefined' : JSON.stringify(value))

/**
 * 递归收集两份默认值的差异（两个方向都查：schema 有 client 没有、client 有 schema 没有）。
 * @param path - 当前路径（用于失败信息定位漂移字段）。
 * @returns 差异描述数组，空数组 = 该子树完全一致。
 */
function diffDefaults(path, schemaValue, clientValue, out = []) {
  if (INTENTIONAL.has(path)) return out
  const ks = kindOf(schemaValue)
  const kc = kindOf(clientValue)
  if (ks !== kc) {
    out.push(`${path}: schema=${fmt(schemaValue)} client=${fmt(clientValue)}（类型不一致：${ks} vs ${kc}）`)
    return out
  }
  if (ks === 'object') {
    for (const key of new Set([...Object.keys(schemaValue), ...Object.keys(clientValue)])) {
      diffDefaults(path === '' ? key : `${path}.${key}`, schemaValue[key], clientValue[key], out)
    }
    return out
  }
  if (ks === 'array') {
    // 两边都是数组：逐元素比（当前两边都是空数组；providers 的行默认值见下一个用例）。
    if (JSON.stringify(schemaValue) !== JSON.stringify(clientValue)) {
      out.push(`${path}: schema=${fmt(schemaValue)} client=${fmt(clientValue)}`)
    }
    return out
  }
  if (schemaValue !== clientValue) out.push(`${path}: schema=${fmt(schemaValue)} client=${fmt(clientValue)}`)
  return out
}

/** 按路径取值（白名单守卫用）。 */
function at(root, path) {
  return path.split('.').reduce((node, key) => (node === undefined ? undefined : node[key]), root)
}

test('host schema 默认值与 client DEFAULTS 逐路径一致（白名单外零漂移）', () => {
  const diffs = diffDefaults('', schemaDefaults, DEFAULTS)
  assert.deepEqual(diffs, [], `默认值漂移：\n${diffs.join('\n')}\n（若确属刻意差异，请加进 INTENTIONAL 白名单并写明理由）`)
})

test('白名单里的路径确实存在且确实只有 host 有（防止白名单变成过期免死牌）', () => {
  for (const [path, reason] of INTENTIONAL) {
    assert.equal(typeof reason, 'string')
    assert.ok(reason.length > 0, `${path}: 白名单必须写明理由`)
    assert.notEqual(at(schemaDefaults, path), undefined, `${path}: schema 里没有这个路径，白名单该删了`)
    assert.equal(at(DEFAULTS, path), undefined, `${path}: client 已经有这个键了，白名单该删了`)
  }
  // 反向：白名单只放行这一条，且它确实是本次比对里唯一的差异来源。
  assert.deepEqual([...INTENTIONAL.keys()], ['asr.cloud.apiKey'])
  assert.deepEqual(diffDefaults('', schemaDefaults, DEFAULTS), [], '除白名单外不得再有差异')
})

test('供应商行默认值与 v0.1 旧单配置字段一致（合成 legacy 行与新行同形）', () => {
  const row = CloudProviderSchema({})
  const legacy = DEFAULTS.asr.cloud
  const diffs = []
  // 只比两边同名的字段：id/name 是行独有的，apiKey 是 host 独有的遗留位置（见白名单）。
  for (const key of ['preset', 'baseUrl', 'model', 'mode']) {
    if (row[key] !== legacy[key]) {
      diffs.push(`asr.cloud.providers[].${key}: schema=${fmt(row[key])} client=${fmt(legacy[key])}`)
    }
  }
  assert.deepEqual(diffs, [], `行默认值与旧单配置漂移（无 providers 行时合成的 legacy 行会与新行不同形）：\n${diffs.join('\n')}`)
  assert.equal(row.apiKey, '', '行上的 apiKey 是 host 独有遗留位置，默认空串')
})

test('client DEFAULTS 覆盖 schema 的每个叶子路径（缺字段 = mergeHostValue 静默不生效）', () => {
  const missing = []
  const walk = (path, schemaValue) => {
    if (INTENTIONAL.has(path)) return
    if (kindOf(schemaValue) === 'object') {
      for (const key of Object.keys(schemaValue)) walk(path === '' ? key : `${path}.${key}`, schemaValue[key])
      return
    }
    if (at(DEFAULTS, path) === undefined) missing.push(path)
  }
  walk('', schemaDefaults)
  assert.deepEqual(missing, [], `client DEFAULTS 缺少这些路径：\n${missing.join('\n')}`)
})

test('守卫自身有效：人造漂移必须被指到具体路径', () => {
  // 值漂移（改了一个默认数）：报路径 + 两边取值。
  const drifted = structuredClone(DEFAULTS)
  drifted.realtime.turn.settleMs = 500
  assert.deepEqual(diffDefaults('', schemaDefaults, drifted),
    ['realtime.turn.settleMs: schema=900 client=500'])

  // 键漂移（client 少了字段）：与真实白名单那条同形（client=undefined，附类型差）。
  const missingKey = structuredClone(DEFAULTS)
  delete missingKey.behavior.silenceMs
  assert.deepEqual(diffDefaults('', schemaDefaults, missingKey),
    ['behavior.silenceMs: schema=2500 client=undefined（类型不一致：number vs undefined）'])

  // 类型漂移：布尔写成字符串也必须红。
  const wrongType = structuredClone(DEFAULTS)
  wrongType.realtime.enabled = 'true'
  assert.deepEqual(diffDefaults('', schemaDefaults, wrongType),
    ['realtime.enabled: schema=true client="true"（类型不一致：boolean vs string）'])
})
