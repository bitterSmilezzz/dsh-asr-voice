import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

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
  // 注意 grep 的是真实引用（import / from 子句），不含注释与测试自身的说明文字：
  // deps-double-listing.test.mjs 的注释里出现这些包名不算引用。
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
  const unmarked = []
  for (const name of Object.keys(pkg.peerDependencies ?? {})) {
    if (!name.startsWith('@deepseek-ai/')) continue
    if (meta[name]?.optional === true) continue
    const referenced = files.some((file) => readFileSync(file, 'utf8').includes(name))
    if (!referenced) unmarked.push(name)
  }
  assert.deepEqual(unmarked, [],
    `以下 @deepseek-ai/* peer 在 src/ 与 test/ 零引用却未标 optional（宿主侧 typecheck 会因缺包失败）：${unmarked.join(', ') || '(无)'}`)
})
