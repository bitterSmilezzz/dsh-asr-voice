/**
 * Standalone tsdown config for dsh-asr-voice — the official clientBundle
 * browser shape, self-contained (this repo is not inside the deepseek-harness
 * monorepo, so the workspace helper cannot be imported).
 *
 * Emits one artifact:
 *  - lib/client.js — browser half, closure-factory artifact: the bundle
 *    calls window.__ModuleLoader__.load({ id, factory }) and resolves
 *    externals through the loader module table (runtime require).
 *
 * The host half (lib/index.js) is emitted by tsc (tsconfig.host.json) with
 * rewriteRelativeImportExtensions, mirroring the official node-half build.
 *
 * The banner/intro/footer below reproduce the official tsdown.client.ts
 * contract verbatim (PLATFORM_MODULES + the runtime preload row) so the
 * emitted client.js is interchangeable with one built inside the monorepo.
 * The external *set* is no longer a verbatim copy of PLATFORM_MODULES: it is
 * decided by the prefix rule below (official @deepseek-ai/* + react family),
 * which yields the same module-table requests for today's dependency set.
 */
import { defineConfig } from 'tsdown'

/** 模块表 specifier 的判定式：官方半区与 react 家族**一律 external**（走 loader 的
 *  运行时 require），自有源码（相对路径导入）永远内联。
 *
 * 为什么是前缀正则而不是 7 个字面量白名单（原实现 `EXTERNALS.includes(specifier)`）：
 * 白名单是「默认内联、例外 external」，任何**新增的值导入**——尤其官方
 * `@deepseek-ai/*`——只要没被手工加进数组，就会被静默打进 bundle：官方单例被复制
 * 一份（跨插件状态各看各的），而构建**一声不响**。前缀匹配后这类漏网不可能再出现。
 *
 * 覆盖面与残留风险：非官方第三方裸导入仍会被内联（当前没有这种依赖，全仓运行时
 * 依赖只有官方 peerDependencies + react），这一层由 test/bundle-externals.test.mjs
 * 从产物侧兜底（源码里的裸值导入必须在 lib/client.js 里留下 require）。
 *
 * 覆盖：`@deepseek-ai/*`（cordis、dsh-client-ui-* 含 `/client` 子路径）、
 * `react`、`react/jsx-runtime`、`react-dom` 及其子路径（`react-dom/client`）。 */
const EXTERNALS_RE = /^(@deepseek-ai\/|react$|react-dom(\/|$)|react\/jsx-runtime$)/

export default defineConfig([
  {
    name: '@bittersmilezzz/dsh-asr-voice/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: (specifier) => EXTERNALS_RE.test(specifier),
      alwaysBundle: (specifier) => !EXTERNALS_RE.test(specifier),
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "@bittersmilezzz/dsh-asr-voice", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
