# 更新日志

本文件记录 dsh-asr-voice 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.2.11 起建立并回填：更早的历史以 GitHub Release 与 git tag 为准。

## [未发布]

## [0.2.13] - 2026-09-12

### 修复

- **LLM 文本优化在部分网关下静默失败**：优化请求补上调用方 session ID，使 `llm-pi-ai`
  适配器下发会话头（`x-opencode-session`）。此前经 opencode-go 之类的网关时缺少该头，
  网关直接返回 400 `MissingSessionID`，用户侧只看到笼统的"模型没有返回文本"。
  不依赖会话头的 provider（deepseek-official、xiaomi 等）会忽略该字段，实测无副作用。
- **上游失败原因透出**：优化流程现在从流式 `finish` 事件里取出真实失败原因（错误码 /
  网关响应体，截断至 240 字符）并原样抛给用户，不再被统一吞成"model returned no text"。

### 变更

- **DSH 兼容**：`@deepseek-ai/*` 依赖线对齐 DSH `0.1.5-rc.2`（peer 与 dev 双声明，约束为
  `^0.1.5-rc.2`），并同步 `pnpm-workspace.yaml` 的 release-age 例外清单。
  `0.1.5-rc.1` / `rc.2` 的破坏性变更（`ctx.agent` 移除、`Inbox` 类型化、slot 迁移等）
  均未命中本插件使用的 API。

### 验证

- 双半区 typecheck（host + client）零错误，构建通过。
- 测试 **210/210** 通过（`node --test test/*.test.mjs`）。

## [0.2.12] - 2026-09-08

### 变更

- **设置开关改用官方 `Switch` 组件**：移除自绘 checkbox 样式，与其他配置卡片视觉一致；
  开关自带 `role="switch"` 与 `aria-label`。注意：替换后点击范围收敛到开关本身，
  不再支持"整行点击"；radio 样式保留不动。
- **依赖对齐**：`@deepseek-ai/*` 升级至 `0.1.3-alpha.2`（alpha 通道首发），lockfile 从
  本地软链切回真实 npm 依赖树。

### 修复

- 语音设置卡片可访问性完善（标签关联、状态播报），语音按钮交互整理。
- 会话清理与 SSE 溢出的保序处理；上行音频缓冲与若干健壮性修复。

## [0.2.11] - 2026-09-01

### 修复

- **SSE 背压队列保序**：下行队列积压时保证 `final` 分段不丢句、不乱序。
- **半双工静音探针**：修复静音判定误锁死（不死判），避免通话卡在等待输入状态。
- **超时与竞态清理**：`withTimeout` / `connectTimer` 的定时器竞态与泄漏修正。
- `providerView` 归一化，避免不同 provider 返回值形状差异导致的展示错乱。
- 补上 `http` / `presets` 相关测试用例。

[未发布]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.13...HEAD
[0.2.13]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.12...v0.2.13
[0.2.12]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.10...v0.2.12
[0.2.11]: https://github.com/bitterSmilezzz/dsh-asr-voice/releases/tag/v0.2.11
