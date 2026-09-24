import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
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
 *   - `dsh-agent` / `dsh-api-remotes` 在 `src/` 与 `test/` 零引用（仅类型面），
 *     仍按书面约定双列。
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
