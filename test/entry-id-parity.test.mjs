import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * entry id / namespace 三方一致性守卫。
 *
 * DSH 0.1.7 起 host 与 client 都用**同一个字符串**定位插件 entry：
 *   - host  `ctx.settings.update(ns, patch)` / `describe()`（`src/index.ts` 经
 *     `src/settings.ts` 的 `ASR_VOICE_SETTINGS_NAMESPACE`）；
 *   - client `ctx.configForms.get(entryId)`（`src/client/config.ts` 的 `ASR_VOICE_NS`）。
 * 官方的查找式是 `entries().find(row => row.options.id === ns)`，所以这个字符串必须
 * 逐字等于 `cordis.patch.yml` 里的 entry `id`。
 *
 * 为什么值得一条测试：拿错字符串**不抛错、不报编译错、不报运行错**——host 侧 update 抛
 * `No configurable plugin entry "..."`（migrateLegacyKeys 只落一句 warn），client 侧
 * `configForms.get` 直接给 unavailable 快照 → 设置卡照样渲染，只是所有读写静默失效。
 * 这正是 AGENTS.md 里反复记的「静默失效家族」，只能靠钉子防。
 *
 * 另外顺带钉住 schema 字段集与 client 接口键集不漂移（`AsrVoiceSettingsSchema`
 * 被标成 `any`，`AsrVoiceHostConfig` / `AsrVoiceConfig` 两份手写类型没有编译期保护）。
 */

const root = fileURLToPath(new URL('..', import.meta.url))
const read = (relative) => readFileSync(new URL(relative, `file://${root}`), 'utf8')

/** cordis.patch.yml 里第一条 insert 的 entry id。 */
function entryIdOfPatch() {
  const patch = read('cordis.patch.yml')
  const match = patch.match(/^\s*-?\s*id:\s*['"]?([A-Za-z0-9._-]+)['"]?\s*$/m)
  assert.ok(match, 'cordis.patch.yml 里找不到 entry id')
  return match[1]
}

const ENTRY_ID = entryIdOfPatch()

test('entry id 三方一致：cordis.patch.yml / host namespace / client namespace', () => {
  const host = read('src/settings.ts')
  const client = read('src/client/config.ts')
  const hostMatch = host.match(/export const ASR_VOICE_SETTINGS_NAMESPACE\s*=\s*['"]([^'"]+)['"]/)
  const clientMatch = client.match(/export const ASR_VOICE_NS\s*=\s*['"]([^'"]+)['"]/)
  assert.ok(hostMatch, 'src/settings.ts 里找不到 ASR_VOICE_SETTINGS_NAMESPACE')
  assert.ok(clientMatch, 'src/client/config.ts 里找不到 ASR_VOICE_NS')
  assert.equal(hostMatch[1], ENTRY_ID,
    `host namespace "${hostMatch[1]}" != cordis.patch.yml 的 entry id "${ENTRY_ID}"`)
  assert.equal(clientMatch[1], ENTRY_ID,
    `client namespace "${clientMatch[1]}" != cordis.patch.yml 的 entry id "${ENTRY_ID}"`)
})

test('entry id 不是 npm 包名（防止有人把包名抄进 namespace）', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.notEqual(ENTRY_ID, pkg.name,
    `entry id 不能等于 npm 包名 "${pkg.name}"；本插件 entry id 是短名`)
})

test('包名四处契约一致：package.json / cordis.patch.yml name / loader id / 样式 data-plugin', () => {
  // 改包名必须同步四处，漏任何一处都**静默失效**（AGENTS.md「插件加载契约」）：
  // ① package.json 的 name；② cordis.patch.yml 的 **name**（模块说明符，不是同行 id）；
  // ③ client bundle 的 `window.__ModuleLoader__.load({ id })`；④ 样式注入的
  //    `data-plugin` / `data-plugin-css`。注意 entry `id` 是短名、**不**参与本契约。
  const pkg = JSON.parse(read('package.json'))
  const patch = read('cordis.patch.yml')
  const source = read('src/client/index.ts')
  const bundle = read('lib/client.js')

  const patchName = patch.match(/^\s*name:\s*['"]?((?:@[^/]+\/)?[A-Za-z0-9._-]+)['"]?\s*$/m)
  assert.ok(patchName, 'cordis.patch.yml 里找不到 insert 的 name（模块说明符）')

  const loaderId = bundle.match(/__ModuleLoader__\.load\(\{\s*\n\s*id:\s*['"]([^'"]+)['"]/)
  assert.ok(loaderId, 'lib/client.js 里找不到 __ModuleLoader__.load({ id })')

  const dataPlugin = source.match(/tag\.dataset\.plugin\s*=\s*['"]([^'"]+)['"]/)
  const dataPluginCss = source.match(/tag\.dataset\.pluginCss\s*=\s*['"]([^'"]+)['"]/)
  assert.ok(dataPlugin, 'src/client/index.ts 里找不到 data-plugin 赋值')
  assert.ok(dataPluginCss, 'src/client/index.ts 里找不到 data-plugin-css 赋值')

  const expected = pkg.name
  for (const [label, value] of [
    ['cordis.patch.yml name', patchName[1]],
    ['loader id', loaderId[1]],
    ['data-plugin', dataPlugin[1]],
  ]) {
    assert.equal(value, expected, `${label} "${value}" != package.json name "${expected}"`)
  }
  assert.equal(dataPluginCss[1], `${expected}/client`,
    `data-plugin-css "${dataPluginCss[1]}" != "${expected}/client"`)
})

test('schema 字段集 == client AsrVoiceConfig 顶层键集', async () => {
  // host schema 的顶层键：AsrVoiceSettingsSchema 解析空文档后剥 volatile。
  const { AsrVoiceSettingsSchema } = await import('../lib/settings.js')
  const plainOf = (value) => {
    if (value !== null && typeof value === 'object' && typeof value.get === 'function') return plainOf(value.get())
    if (Array.isArray(value)) return value.map(plainOf)
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, plainOf(v)]))
    }
    return value
  }
  const schemaKeys = Object.keys(plainOf(AsrVoiceSettingsSchema({}))).sort()

  // client 接口的顶层键：从源码里数（编译产物不带类型，只能读 TS 源）。
  const clientSource = read('src/client/config.ts')
  const start = clientSource.indexOf('export interface AsrVoiceConfig {')
  assert.ok(start >= 0, 'src/client/config.ts 里找不到 AsrVoiceConfig')
  const body = clientSource.slice(start, clientSource.indexOf('\n}', start))
  const topLevelKeys = [...body.matchAll(/^  ([A-Za-z_][A-Za-z0-9_]*):/gm)].map(m => m[1]).sort()

  assert.deepEqual(topLevelKeys, schemaKeys,
    `client AsrVoiceConfig 顶层键与 schema 漂移：\n  client-only: ${topLevelKeys.filter(k => !schemaKeys.includes(k)).join(', ') || '(无)'}`
    + `\n  schema-only: ${schemaKeys.filter(k => !topLevelKeys.includes(k)).join(', ') || '(无)'}`)
})
