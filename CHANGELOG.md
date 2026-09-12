# 更新日志

本文件记录 dsh-asr-voice 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.2.11 起建立并回填：更早的历史以 GitHub Release 与 git tag 为准。

## [0.2.14] - 2026-09-12

### 修复

- **SSE 下行背压时事件重复投递**：`ServerResponse.write()` 返回 `false` 只表示内核缓冲
  已超水位，**事件本身已被接受并会送出**；下行通道原先把 `false` 当成「没写出去」而
  把该事件留在队列里，`drain` 后冲刷时又写了一遍。`partial` 重放只是字幕冗余，但
  **`final` 重放会让客户端把同一个回合提交两次**。现在写出即出队，返回值只用于置
  背压标志。测试替身 `FakeRes.write` 此前模拟成「背压 = 丢弃」，正是它把实现里的这个
  缺陷一起放过了——已按真实语义改正，并补上「不重复投递」的回归断言。
- **云端实时通道断开后报错误文案**：`provider-closed` / `provider-timeout` /
  `transcription-failed` 等云端错误此前落到「当前浏览器不支持 Web Speech，请改用云端
  ASR」——用户本来就在用云端引擎，指引完全反向。现在按引擎分派，连接级失败一律提示
  「云端实时通道已断开」。
- **异常断连的错误码跨 Node 版本漂移**：`provider-unreachable` / `provider-closed` 原先
  靠「`onerror` 有没有先到」区分，而 undici 对销毁式断连是否补发 `error` 随 Node 版本
  而变（Node 22 只发 `close`、Node 26 先发 `error`），同一个异常断连在 22 上被判成
  `provider-closed`。改用规范定义的 `CloseEvent.wasClean`（关闭握手是否走完）判定，
  两个版本实测一致。该差异此前表现为测试套件在 Node 22 上稳定失败 1 例（210 中的 1）。
- **自适应噪声底的观测窗只有标称一半**：噪声底估计器按采集帧长（默认 40ms）折算窗口，
  但它是被 VAD 每 **20ms 分析窗**投喂一次，实际观测窗因此从 2s 缩到 1s，估计更抖、
  也更易被开场的语音带偏。改按 VAD 分析窗折算。
- **噪声底一次带偏即终身失效**：估计器与实时引擎实例同生命周期，而原先从不重置——
  一次被带偏（阈值抬到语音之上 → 永不判有声 → 整场对话不出字）就要刷新页面才能恢复。
  现在每个会话开始时重置，会话边界是唯一干净的「从零开始」时机。
- **未知 `realtime.provider` 静默降级为内置模拟**：手改配置或预置改名后，用户以为在
  用云端，实际拿到「模拟转写·第 N 段」并被当成真实转写提交。现在明确报错（会话路由
  502 带原因），`''` / `'builtin'` 的开发态模拟保持不变。
- **Web Speech 降级提示被吞**：切到「按句转写」的提示先于 `begin()` 写入、又被 `begin()`
  自己的提示覆盖，用户永远看不到引擎为什么换了。现在经 ref 交给 `begin()` 优先展示。
- **引擎降级跨会话粘住**：Web Speech 因网络被屏蔽而降级后，本实例后续所有会话都被强制
  按句转写，忽略用户改回 `browser`。现在降级只在**当次会话内**有效，新会话按配置重来。

### 变更

- **采集/解码统一请求 16 kHz 上下文**（`createPcmAudioContext`）：此前不指定采样率，
  音频图按设备采样率跑（桌面 Chrome 多为 48k），而 48k→16k 的比恰好是整数 3，线性插值
  退化成「每 3 个点取 1 个」的裸抽取、**没有抗混叠低通**，8 kHz 以上的内容折叠进语音带
  直接伤识别率。现在由浏览器的高质量重采样器直接产出 16k，`resampleLinear` 成为空转；
  浏览器拒绝指定采样率时回落默认（行为与从前一致），调用方始终读回 `ctx.sampleRate`。

### 验证

- 双半区 typecheck（host + client）零错误，构建通过。
- 测试 **215/215** 通过（新增 5 例：16k 上下文请求与回落、SSE 不重复投递、噪声底窗口
  折算与会话重置的接线断言）；Node 22.22.2 与 Node 26.7.0 双版本均全绿。

### 已知限制（本轮未修）

- `rmsAuto` 的噪声底学习期若用户**开口即连续说话**（语音占满整个 2s 观测窗），语音仍会
  被当成底噪、当次会话可能不出字（暂停后自愈）。纯语音开场在只有 RMS 一个判据时数学上
  不可辨识，需要引入更完整的自适应 VAD 才能根治，不在本轮范围。
- 信任围栏 `isTrusted` 判定同源时**忽略端口**（`127.0.0.1:3080` 与 `127.0.0.1:9` 视为
  同源）。这是跨 `dsh-asr-voice` / `dsh-email` / `dsh-retry-settings` 三仓共用的夹具契约
  （`test/trust.test.mjs` 逐字复制、任一侧漂移即变红），未单方面修改；若确认收紧，需三仓
  同步改。

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

[未发布]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.14...HEAD
[0.2.14]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.13...v0.2.14
[0.2.13]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.12...v0.2.13
[0.2.12]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.10...v0.2.12
[0.2.11]: https://github.com/bitterSmilezzz/dsh-asr-voice/releases/tag/v0.2.11
