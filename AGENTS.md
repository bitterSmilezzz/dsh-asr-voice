# AGENTS.md

本仓库是 DeepSeek Harness（DSH）插件仓库，隶属 `dsh-plugins` 伞仓库体系（伞目录下所有插件
仓库的契约统一治理）。

**⚑ 硬性约束（必须执行）**：本仓库的所有开发与发布工作，**一律遵守伞仓库根契约**
[`../dsh-plugins/AGENTS.md`](../dsh-plugins/AGENTS.md)（契约**单一来源**在伞仓库，本文件只作
指针、不复制内容——改契约只改伞仓库那一份）。打开本仓库的 agent 在动手前必须先读伞仓库
AGENTS.md；任务结束前按伞仓库约定把经验落档到伞仓库 `doc/experience/` 对应主题文件。

必读要点索引（详见伞仓库 AGENTS.md，此处不展开）：

- **DSH-Store 准入契约**（⚑ 强制）：第三方商城 [DSH-Store](https://github.com/AI-Scarlett/dsh-safe-plugin-manager)
  的上架门禁——固定源发布 / manifest 一致 / 入口唯一且**不动任何 `@deepseek-ai/*` 官方组件**
  （含禁止 `disabled: true` 禁用官方 entry）/ 命名空间合规 / 生命周期脚本透明 / 权限保守披露 /
  README 完整 / 可验证。发布与上架前逐条自检；被拒绝（blocked）按 `statusReason` 整改后重提，
  不绕过门禁直接分发。
- **DSH 官方规则契约**（⚑ 强制）：不改 DSH 源码、契约先查 Inspect Provider、遵循官方插件
  开发规范（inject 硬依赖 / `ctx.effect()` 挂 fiber / host↔client 只走私有 JSON）、不破坏官方行为。
- **Pi 契约约束**（⚑ 强制）：核心最小化、不内置重功能、Context 是最贵资源、代码即真相、
  Bash 足够用等。
- **跨平台纪律**：本插件设计之初即要求 macOS + Windows 双平台可用——host 半区只用纯 Node
  HTTP/标准库，禁止引入平台专属二进制（如 terminal-notifier、PowerShell-only 逻辑）；
  客户端能力以浏览器 Web 标准为准（Chrome/Edge/Safari 双平台交集）。
- **独立性契约**（⚑ 强制）：本插件与任何其他插件（含 dsh-ui-tweaks）互相不依赖、不影响，
  每个插件单独可用、组合可用——运行时只 import 官方 `@deepseek-ai/*` peerDependencies，
  不 import 任何第三方插件；入口 id / settings namespace / host 路由 / locale namespace /
  CSS data 标签全部唯一；不 shadow 官方 single 槽、不禁用官方 entry。build.sh 的
  兄弟插件 node_modules 兜底仅是**构建期** dev 便利（junction 已 gitignore、不进包），
  与运行时无关。

## 本地开发纪律

- 改完立即 `git add + commit`，不攒变更；稳定后 push。
- 构建：`bash scripts/build.sh`（junction 链接依赖树 + tsc host + tsdown client）；
  依赖树缺失时先安装一个兄弟插件（如 dsh-ui-tweaks）或设置 `DSH_CHECKOUT`。
