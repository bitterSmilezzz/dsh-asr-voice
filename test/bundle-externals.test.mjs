import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'

/**
 * 构建 external 策略守卫（tsdown.config.ts）。
 *
 * 背景：原实现是 7 个字面量白名单 + `neverBundle: (s) => EXTERNALS.includes(s)`，
 * 也就是「默认内联、例外 external」。任何**新增的值导入**——尤其官方
 * `@deepseek-ai/*`——只要没被手工加进数组就会被静默打进 bundle：官方单例被复制
 * 一份（跨插件状态各看各的），而构建一声不响。现在改成前缀正则（官方半区 + react
 * 家族一律走模块表），本文件从两个方向把它钉住：
 *  1. 产物侧：`lib/client.js` 里的每个 `require("…")`（= 运行时模块表请求 = external）
 *     都必须在白名单内，且当前恰好是 react / react/jsx-runtime / primitives 三个；
 *  2. 源码侧：`src/client/**` 里的每个裸值导入都必须能在产物里找到对应的 require
 *     ——这才是「新增导入被静默内联」的直接守卫（内联的导入不会留下 require）。
 *
 * 只扫已入库的 `lib/client.js`（不跑构建：构建由维护者统一重建后复核）。
 */
const CLIENT_BUNDLE = new URL('../lib/client.js', import.meta.url)
const TSDOWN_CONFIG = new URL('../tsdown.config.ts', import.meta.url)
const CLIENT_SRC_DIR = new URL('../src/client/', import.meta.url)

/** 允许出现在 bundle 里的 specifier（模块表请求）：官方半区 + react 家族。 */
const ALLOWED_EXTERNALS = [
  '@deepseek-ai/dsh-client-ui-primitives',
  'react',
  'react/jsx-runtime',
]

/** 当前产物**应当**请求的全部 specifier（依赖集有意变化时才改这里）。 */
const EXPECTED_EXTERNALS = ALLOWED_EXTERNALS

/** 抽出产物里所有 `require("…")` 的 specifier（模块表请求；banner 里的形参不算）。 */
function requireSpecifiers(bundle) {
  return [...bundle.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
}

/**
 * 抽出源码里的裸导入/再导出 specifier（值导入；`import type` 会被类型剥离擦掉，
 * 不产生 require，故跳过）。先去掉块注释：注释里的散文（如「不 import 任何第三方
 * 插件」）后面紧跟的 import 语句会被误当成一次导入。
 */
function bareValueImports(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '')
  const out = []
  for (const match of code.matchAll(/^[ \t]*(?:import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/gm)) {
    const [, typeOnly, specifier] = match
    if (typeOnly !== undefined) continue
    if (specifier.startsWith('.') || specifier.startsWith('/')) continue
    out.push(specifier)
  }
  return out
}

test('lib/client.js 的每个 require 都在 external 白名单内（不得夹带别的模块表请求）', async () => {
  const bundle = await readFile(CLIENT_BUNDLE, 'utf8')
  const found = [...new Set(requireSpecifiers(bundle))].sort()
  const offenders = found.filter((specifier) => !ALLOWED_EXTERNALS.includes(specifier))
  assert.deepEqual(offenders, [], `产物请求了白名单外的模块表 specifier：\n${offenders.join('\n')}\n（要么加进 tsdown.config.ts 的 EXTERNALS_RE，要么从源码里去掉这个导入）`)
})

test('当前产物恰好请求 react / react/jsx-runtime / primitives 三个模块', async () => {
  const bundle = await readFile(CLIENT_BUNDLE, 'utf8')
  const found = [...new Set(requireSpecifiers(bundle))].sort()
  assert.deepEqual(found, [...EXPECTED_EXTERNALS].sort(),
    '依赖集变了（有意变更时同步更新本文件的 EXPECTED_EXTERNALS，并重跑构建复核产物）')
})

test('src/client 的裸值导入全部在产物里以 require 出现（新增导入不得被静默内联）', async () => {
  const bundle = await readFile(CLIENT_BUNDLE, 'utf8')
  const externals = new Set(requireSpecifiers(bundle))
  const files = (await readdir(CLIENT_SRC_DIR)).filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
  assert.ok(files.length > 0, 'src/client 下没扫到源码文件，路径写错了？')
  const offenders = []
  for (const file of files) {
    const source = await readFile(new URL(file, CLIENT_SRC_DIR), 'utf8')
    for (const specifier of bareValueImports(source)) {
      if (!externals.has(specifier)) offenders.push(`src/client/${file}: ${specifier}`)
    }
  }
  assert.deepEqual(offenders, [],
    `这些裸导入没有对应的 require = 被静默打进 bundle（官方单例会被复制一份，构建还不报错）：\n${offenders.join('\n')}`)
})

test('tsdown.config.ts 保持「正则前缀匹配」策略，且模式覆盖官方半区与 react 家族', async () => {
  const cfg = await readFile(TSDOWN_CONFIG, 'utf8')
  assert.match(cfg, /neverBundle:\s*\(specifier\)\s*=>\s*EXTERNALS_RE\.test\(specifier\)/)
  assert.match(cfg, /alwaysBundle:\s*\(specifier\)\s*=>\s*!EXTERNALS_RE\.test\(specifier\)/)
  // 不再有字面量白名单数组（旧机制：默认内联、漏一个官方导入就静默复制单例）。
  assert.doesNotMatch(cfg, /const EXTERNALS = \[/, '退回字面量白名单 = 默认内联，新增官方导入会被静默内联')

  // 直接取出配置里的正则字面量来验证覆盖范围（不 import tsdown：测试不该依赖构建器）。
  const literal = cfg.match(/const EXTERNALS_RE = \/(.+)\/\n/)?.[1]
  assert.ok(literal, '在 tsdown.config.ts 里没找到单行书写的 EXTERNALS_RE 字面量（改格式后请同步本测试）')
  const pattern = new RegExp(literal.replaceAll('\\/', '/'))
  for (const specifier of [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-client-ui-slots',
    '@deepseek-ai/dsh-client-ui-slots/client',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-settings/client',
    'react',
    'react/jsx-runtime',
    'react-dom',
    'react-dom/client',
  ]) {
    assert.ok(pattern.test(specifier), `${specifier} 必须被判为 external`)
  }
  for (const specifier of ['reactivity', 'my-react', 'lodash-es', '@scope/pkg', '@deepseek-ai']) {
    assert.ok(!pattern.test(specifier), `${specifier} 不该被判为 external（前缀匹配不得误伤）`)
  }
})
