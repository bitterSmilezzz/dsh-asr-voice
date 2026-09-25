import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 判断一段源码是否**真的**引用了某个包（排除注释、字符串与说明文字）。
 *
 * 只用子串 includes(name) 是不合格的尺子：注释里点名该包（「由下面的零引用测试钩住」
 * 之类）会被当成已引用，于是一条为了「防止再漏标 optional」而存在的键子，恶恶量不
 * 出下一次漏标。这里先削掉块注释，再逐行削掉引号外的行注释，最后只认 import 子句的
 * 真实形态：from '<pkg>' / from '<pkg>/sub'，以及动态 import('<pkg>')。包名按整体
 * 匹配，pkg 与 pkg-extra 之间不会互相冒认。
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => {
      let quote = null
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (quote) {
          if (ch === '\\') { i++; continue }
          if (ch === quote) quote = null
          continue
        }
        if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
        if (ch === '/' && line[i + 1] === '/') return line.slice(0, i)
      }
      return line
    })
    .join('\n')
}

/**
 * 口径的可复用形式：给定「源码集合 + peerDependenciesMeta + peer 名单」，
 * 返回零引用却未标 optional 的包名列表。变异验证与真实口径共用
 * 同一份判断，避免「测试里拼一份、口径里另拼一份」导致的恒真。
 */
function findUnmarkedOptionalPeers(sources, meta, peerNames) {
  return peerNames.filter((name) => meta[name]?.optional !== true
    && !sources.some((source) => referencesPackage(source, name)))
}

function referencesPackage(source, name) {
  const stripped = stripComments(source)
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\bfrom\\s*['"]${escaped}(?:/[^'"]*)?['"]|\\bimport\\s*\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]`).test(stripped)
}

/**
 * `@deepseek-ai/*` 依赖双列守卫（AGENTS.md 书面约定）。
 *
 * 约定：插件声明的每一个 `@deepseek-ai/*` 依赖都必须同时出现在
 * `peerDependencies` 与 `devDependencies`，且两侧版本范围一致。
 *
 * 为什么值得一条测试：只列 peer 会漏装本地解析（typecheck / 构建时拿不到类型），
 * 只列 dev 会让宿主侧 peer 校验在运行时缺声明；错列不抛错、不报编译错，只会静默地
 * 在某一侧失效。asr-voice 曾是三兄弟里唯一不对称的（`dsh-agent` / `dsh-api-remotes` /
 * `dsh-llm` 只列了 peer，靠 pnpm 的 autoInstallPeers 兜底才能装上），本轮补齐后钉住。
 *
 * 排除项：
 *   - `@deepseek-ai/cordis` 与 `@deepseek-ai/schemastery` 刻意让 peer 行宽于 dev 行
 *     （peer `^4.0.2` / dev `^4.0.3`），属既有宽松策略，本测试只要求「两侧都在」，
 *     不要求范围字符串完全一致。
 *   - `dsh-agent` / `dsh-api-remotes` 在 `src/` 与 `test/` 零引用（连 `import type` 都
 *     没有），仍按书面约定双列，**且按同一把尺子标 optional**——与客户端平台模块
 *     （react / ui-slots / client-store…）同属「为宿主侧类型面声明、插件自身不直接
 *     引用」。判据：`src/` + `test/` 全部 0 命中的 `@deepseek-ai/*` peer 一律 optional，
 *     由下面的「零引用 peer 必须标 optional」测试钉住。
 *   - 宿主侧 peer 兼容校验（`evaluatePluginCompatibility`）只比较 `@deepseek-ai/dsh*`
 *     的版本区间，**不读 `peerDependenciesMeta`**；`optional` 影响的是包管理器安装期
 *     的必要性判定，不是运行时准入。故标 optional 不会掩盖任何「理应声明」的依赖，
 *     只是让「未安装」从报错降级为跳过。
 */

const root = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('package.json', `file://${root}`), 'utf8'))

const RANGE_EXEMPT = new Set(['@deepseek-ai/cordis', '@deepseek-ai/schemastery'])

test('@deepseek-ai/* 依赖同时出现在 peerDependencies 与 devDependencies', () => {
  const peer = new Set(Object.keys(pkg.peerDependencies ?? {}))
  const dev = new Set(Object.keys(pkg.devDependencies ?? {}))
  const all = new Set([...peer, ...dev].filter(k => k.startsWith('@deepseek-ai/')))

  const peerOnly = [...all].filter(k => !dev.has(k))
  const devOnly = [...all].filter(k => !peer.has(k))

  assert.deepEqual(peerOnly, [],
    `只列了 peerDependencies（宿主侧能校验、本地解析不到）：${peerOnly.join(', ') || '(无)'}`)
  assert.deepEqual(devOnly, [],
    `只列了 devDependencies（本地能解析、宿主侧 peer 校验缺声明）：${devOnly.join(', ') || '(无)'}`)
})

test('@deepseek-ai/dsh-* 依赖两侧版本范围一致（cordis / schemastery 按宽松策略豁免）', () => {
  const peer = pkg.peerDependencies ?? {}
  const dev = pkg.devDependencies ?? {}
  const mismatched = []
  for (const [name, range] of Object.entries(peer)) {
    if (!name.startsWith('@deepseek-ai/')) continue
    if (RANGE_EXEMPT.has(name)) continue
    if (dev[name] === undefined) continue
    if (dev[name] !== range) mismatched.push(`${name}: peer ${range} vs dev ${dev[name]}`)
  }
  assert.deepEqual(mismatched, [],
    `同一依赖两侧版本范围不一致：\n  ${mismatched.join('\n  ') || '(无)'}`)
})

test('src/test 零引用的 @deepseek-ai/* peer 必须标 optional（口径守卫）', () => {
  // 2026-09-25 的 Code Review 发现口径分裂：`dsh-agent` / `dsh-api-remotes` 同样在
  // src/ 与 test/ 零引用，却未标 optional（而同为零引用的 dsh-client-ui-plugin-manager
  // 已正确标了）。这里把「零引用 ⇒ optional」这条判据钉住，防止以后再漏。
  //
  // 注意扫的是**真实引用**（import / from 子句），注释与说明文字里点名该包不算
  // 引用——deps-double-listing.test.mjs 自身就在注释里逐个点名这些包名。判据见文件
  // 顶部的 referencesPackage：先削块注释 / 引号外行注释，再匹配 import 子句形态。若这里退回
  // 裸 includes(name)，「防止再漏标」的键子会被自己的注释喂成恒真。
  const root3 = fileURLToPath(import.meta.url).replace(/[^/]+$/, '')
  const walk = (dir, sink) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        walk(full, sink)
      } else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name) && entry.name !== 'deps-double-listing.test.mjs') {
        sink.push(full)
      }
    }
  }
  const files = []
  walk(join(root3, '..', 'src'), files)
  walk(join(root3, '..', 'test'), files)

  const meta = pkg.peerDependenciesMeta ?? {}
  const unmarked = findUnmarkedOptionalPeers(
    files.map((file) => readFileSync(file, 'utf8')),
    meta,
    Object.keys(pkg.peerDependencies ?? {}).filter((name) => name.startsWith('@deepseek-ai/')),
  )
  assert.deepEqual(unmarked, [],
    `以下 @deepseek-ai/* peer 在 src/ 与 test/ 零引用却未标 optional（宿主侧 typecheck 会因缺包失败）：${unmarked.join(', ') || '(无)'}`)
})

test('referencesPackage：只认真实 import 形态，注释与字符串里的包名不算引用', () => {
  const pkg = '@deepseek-ai/dsh-agent'
  const cases = [
    [`import {} from '${pkg}'`, true, '静态 import'],
    [`import type { X } from '${pkg}/sub'`, true, '带子路径的类型 import'],
    [`export * from "${pkg}"`, true, 're-export'],
    [`const m = await import('${pkg}')`, true, '动态 import'],
    [`const u = 'https://x.dev/y'\nimport {} from '${pkg}'`, true, '前一行有 URL 字符串'],
    [`// provider: ${pkg}`, false, '行注释点名不算引用'],
    [`  // import {} from '${pkg}'`, false, '缩进行的注释也不算'],
    [`const u = 'https://x.dev/y' // import {} from '${pkg}'`, false, '行尾注释'],
    [`/* ${pkg} 由下面的测试钩住 */`, false, '块注释点名不算引用'],
    [`const s = '${pkg} appears in a string'`, false, '字符串里的包名不算引用'],
    ['const t = `template ' + pkg + ' inside`', false, '模板字符串里的包名不算引用'],
    [`import {} from '${pkg}-extra'`, false, '包名前缀不冒认'],
  ]
  for (const [source, expected, label] of cases) {
    assert.equal(referencesPackage(source, pkg), expected, `${label}: ${JSON.stringify(source)}`)
  }
  // 反证这条键子存在的理由：裸 includes 会把上面每一条 false 情形都判成「已引用」。
  assert.equal(`// ${pkg}`.includes(pkg), true, 'includes 会把注释当引用（正是要排除的）')
})

test('零引用扫描不会被注释喂成恒真（变异验证，与口径共用同一判据）', () => {
  const pkg = '@deepseek-ai/dsh-agent'
  // 伪引用：包名只出现在注释里（包括把完整 import 语句写进注释）。
  const pseudoSource = `// 供应商声明：${pkg}\n// import {} from '${pkg}'`
  const bare = { [pkg]: {} }
  const marked = { [pkg]: { optional: true } }

  assert.deepEqual(findUnmarkedOptionalPeers([pseudoSource], bare, [pkg]), [pkg],
    '含注释的伪引用应该被判为零引用：若返回 [] 说明这把尺子把注释当引用了')
  assert.deepEqual(findUnmarkedOptionalPeers([`import {} from '${pkg}'`], bare, [pkg]), [],
    '真实 import 应该让该包逃脱判定')
  assert.deepEqual(findUnmarkedOptionalPeers([pseudoSource], marked, [pkg]), [],
    '已标 optional 的包不进列表')
  assert.ok(pseudoSource.includes(pkg),
    '反证：裸 includes 会把这份只含注释的代码当成已引用，而口径不会')
})
