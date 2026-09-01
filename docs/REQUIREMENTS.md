# dsh-asr-voice — 需求记录与设计决策

> 状态：grilling 审视完成，等待用户确认设计。记录时间：2026-08-25

## 需求来源

给 DSH 增加「语音输入 + 提示词优化」，类似 Codex 语音输入体验。
插件名 **dsh-asr-voice**，public 仓库，约束参照 dsh-plugins 伞仓库 AGENTS.md。

## 需求清单

### R1 功能
- 语音输入：说话 → 识别文字 → 填入输入框
- 提示词优化：清理口语词/组织成清晰 prompt
- 设置页可配置 ASR 模型选择

### R2 发布
- public 仓库；开发约束参照 `../dsh-plugins/AGENTS.md`（单一来源指针）

### R3 动效与设计
- 动效用 **GSAP**（打包进 bundle）；UI 参考前端设计 skill

### R4 跨平台（设计之初）
- macOS + Windows 双平台：客户端浏览器天然跨平台；host 半区不得依赖
  macOS 专属工具；ASR 方案双平台可用

## grilling 设计树 — 已确认决策

### 第一轮（根决策）
| # | 决策 | 结论 |
|---|---|---|
| D1 | ASR 引擎策略 | **混合**：默认浏览器 Web Speech API（免费免 key，Chrome/Edge 双平台），可选云端 OpenAI-compatible ASR |
| D2 | 提示词优化 | **本地启发式（默认）+ 可选 LLM 优化**（走 host 代理） |
| D3 | 入口 UI | **输入框工具行按钮**（`conversation.input.right`）+ 可选全局快捷键 |
| D4 | 识别后行为 | **填入 draft + 可选『自动发送』开关** |
| D5 | 语言 | **中文 + 英文，跟随浏览器/系统语言**，可显式指定 |
| D6 | GSAP 范围 | **录音波纹 + 状态过渡 + 设置页微动效** |

### 第二轮（二级决策）
| # | 决策 | 结论 |
|---|---|---|
| D7 | 云端 provider | **OpenAI-compatible 统一端点 + 常用预置** |
| D8 | API key 存放 | **host 设置 + 服务端代理**（key 不进浏览器） |
| D9 | LLM 优化配置 | **插件独立 OpenAI-compatible 配置**（可与 ASR 共用 key） |
| D10 | 录音交互 | **点击式 + 静音自动停止**，可选『按住说话』模式 |
| D11 | 快捷键 | **默认启用，键位可配置** |
| D12 | GSAP 引入 | **打包进 client bundle**（离线可用、版本锁定） |

### 第三轮（收尾决策）
| # | 决策 | 结论 |
|---|---|---|
| D13 | 自动发送默认 | **默认关闭**（防误发），设置页开启 |
| D14 | 云端预置列表 | **OpenAI + Groq + 国产（硅基流动 SiliconFlow、通义/阿里云百炼 Qwen-ASR）** |
| D15 | 本地 ASR 引擎 | **不做专用本地引擎**（OpenAI-compatible 端点天然兼容本地服务，如 local-ai） |
| D16 | 转写后 UX | **默认直接填优化文本；LLM 优化耗时时先展示 原始→优化 预览卡** |

### 第四轮（实时语音对话）
| # | 决策 | 结论 |
|---|---|---|
| D17 | 对话形态 | 豆包式闭环：连续字幕 → 停顿即发起回合 → 回复朗读 → 自动还麦。**同座位第二个按钮**（`conversation.input.right`，order 11），随 `realtime.enabled` 即时注册/注销，不重载页面 |
| D18 | 轮次边界 | 浏览器 Web Speech 不给 VAD/轮次信号：**以转写文字静默判完**（`turn.settleMs` + `turn.tailMs` 宽限接住最后一个词的迟到结果）。整段模式那一次点击在这里不存在 |
| D19 | 双工 | **半双工**：朗读期间 `pause()` 收音，回声不会被当成输入。打断只有按钮 / 快捷键 / 提示条三处入口——浏览器回声消除能否吃掉自己外放的合成语音**未实测**，实测通过前不做语音插话 |
| D20 | 播报通路 | **浏览器 `speechSynthesis`**：Chrome/Edge/Safari 交集内唯一零配置、零密钥、零依赖的播放通路。经 `SpeakSink` 接缝（云 TTS 可换实现而调用方不动）；`utterance.onend` 不可信 → **每句挂看门狗**，否则麦克风被永久扣住 |
| D21 | 回复读取与取消 | 不加新槽位：owner share（`InputZone`）的 `session.partial.blocks` 就是逐 chunk 累积正文，`running` 是官方发送↔停止信号。`InputActions` 不含 cancel → 打断走 `sessions.scope(id).get('conversation').cancel()`，**不**把 `conversation` 加进插件硬依赖 |
| D22 | 实时路径的优化 | **不做提示词优化**：对话要的是即时；`optimize.*` 只作用于整段录音模式 |
| D23 | 出字引擎 | 两引擎共用一个 `RealtimeSession` 接缝，按 `realtime.engine` 分派：`browser`（Web Speech 逐字流式，零 key、零新协议）与 `segmented`（本地能量 VAD 切句 + **已有**整段转写通道）。选后者的唯一前提：不新增云商协议、不新增 key 也能端到端验证闭环。两者共用同一份 `turn.*` 静默判定——切换引擎只改段边界的**来源**，不改「什么时候算说完」。VAD 判据是设备噪声底的函数，故 `vad.rms`/`silenceMs`/`minSpeechMs` 等一律开放为设置，不硬编码；分析窗长（20ms）不是偏好项，不开放。真·流式云通道（PCM 上行 + SSE 下行 + `RealtimeProvider` 接缝）是后续阶段，`capture.ts` 已为它备好采集原语 |

## 设计蓝图（待确认）

### 架构：host + client 双半区

**Host（Node，tsc 构建）**
- 注册 settings namespace `asr-voice`（schema 见下）
- `POST /api/asr-voice/transcribe`：multipart 音频 → 代理到配置的 OpenAI-compatible 端点
- `POST /api/asr-voice/optimize`：文本 → LLM chat completion 重写
- API key 全部在 host 侧；纯 Node HTTP，无平台专属二进制 → 跨平台

**Client（Browser，tsdown → lib/client.js）**
- 中英词典、样式（前端设计 skill）、GSAP 动效
- 设置卡片：`settings.plugin.item`，key `asr-voice`
- 录音按钮：`conversation.input.right`（session 作用域 slot，
  标准 kit 注入 `useInput`/`inputActions`，用 `setDraft`/`submit`）
- 录音引擎：
  - browser：`webkitSpeechRecognition`（continuous + interim，实时预览）
  - cloud：MediaRecorder（webm/opus，Safari 回退 mp4）→ host 代理
- 优化：本地启发式（zh+en 清洗）默认；LLM 时预览卡
- 快捷键：默认 `Ctrl+Shift+Space`（跨平台无冲突），可配置

### 设置 schema（namespace `asr-voice`）
```yaml
asr:
  provider: browser | cloud        # 默认 browser
  cloud:
    preset: openai | groq | siliconflow | dashscope | custom
    baseUrl: string                # 预置自动填充，可改
    apiKey: string                 # host 侧保存
    model: string                  # 预置自动填充（whisper-1 / whisper-large-v3 /
                                   # FunAudioLLM/SenseVoiceSmall / qwen-asr）
optimize:
  mode: heuristic | llm            # 默认 heuristic
  llm:
    baseUrl: string
    apiKey: string
    model: string
language: auto | zh-CN | en-US     # 默认 auto（跟随浏览器/系统）
behavior:
  autoSend: false                  # 默认关闭
  holdToTalk: false                # 可选按住说话
  hotkey: Ctrl+Shift+Space         # 可配置
```

### 合规
- 伞仓库契约：AGENTS.md 只放指针；DSH-Store 准入（入口唯一 `dsh-asr-voice`、
  不动官方组件、manifest 一致、权限保守披露：麦克风/网络/设置读写）；
  Pi 契约（0 个 CLI 工具、核心最小化）；官方规范（inject 硬依赖、
  ctx.effect 挂 fiber、host↔client 私有 JSON）

## 独立性契约（用户补充，⚑ 强制）

**dsh-asr-voice 与 dsh-ui-tweaks（及任何其他插件）互相不依赖、不影响；每个插件
单独可用，组合可用。**

- **运行时零依赖**：本插件只 import 官方 `@deepseek-ai/*` peerDependencies（由 DSH
  提供），**不 import / 不 require 任何第三方插件**（含 dsh-ui-tweaks）。
- **不共享可变状态**：入口 id 唯一（`dsh-asr-voice`）、settings namespace 唯一
  （`asr-voice`）、host 路由唯一（`/api/asr-voice/*`）、client locale namespace 唯一、
  CSS 用插件专属 data 标签（`dsh-asr-voice`）。不写任何插件共享的 localStorage 键。
- **slot 不抢占**：只用 `conversation.input.right`（list 槽，并排放置）与
  `settings.plugin.item`（按 key 独立卡片），不 shadow 官方 `single` 槽、
  不禁用任何官方 entry。
- **组合可用**：与 ui-tweaks 等同时安装时各挂各的槽位/卡片/路由，互不干扰。
- **构建隔离**：build.sh 可能用兄弟插件 node_modules 作**构建期**依赖解析兜底
  （离线环境复用已装包），但这是 dev 便利：junction node_modules 已 gitignore、
  不进发布包；运行时与发布产物完全不依赖它。发布产物只依赖官方 peerDependencies。

## 剩余阶段与待验收（实时语音对话）

阶段划分只记在这里；实现细节以代码与上一节决策为准。**最初的方案原文在开发者本机的 agent 计划目录里，
不随仓库分发**——换机器接手时本节即唯一路线来源。

| 阶段 | 内容 | 用户可感知 |
|---|---|---|
| I3 ✅ | host 实时通道：会话注册表（`sid` 由 host 铸造，4 条 exact 路由全过 `isTrusted`）+ SSE 下行带背压 + `RealtimeProvider` 接缝 + 假 provider；含「undici `WebSocket` 能带 `Authorization`」的**真实 socket 上线证据**测试 | 否（纯管道） |
| I4 ✅ | PCM 上行接上已就位的 `capture.ts`：client 新增第三档引擎 `realtime.engine=cloud`（`src/client/realtime-cloud.ts` + `realtime-cloud-transport.ts`），16k 采集帧量化 int16 LE 上行到 host 实时通道，SSE 下行 `partial/final/error` 驱动字幕与回合（服务端 VAD 判回合，本地不再文字静默判定）。设置卡可选、前置检查按引擎分派、7 例单测。**I4 关键产出实测已有数字（2026-09-01，qa-asr AEC 探针）**：`echoCancellation: true/false` 两轮采集流 RMS 对比，消除率 **0.42 dB**（on 0.06182 vs off 0.06486，峰值几乎相同）——**Chromium 假设备/虚拟管线绕过 APM，AEC 不生效**。含义：①虚拟环境不能作为 AEC 证据，消除率必须真机（真实声学回环）复测；②技术上不能把全双工押在「浏览器 AEC 消干净回声」上，D19 实现路径改为**软件回声门控**（播放参考音量 → 回声底 → 超底且持续才打断），以 `realtime.bargeIn` 开关**默认关闭**交付，真机复测通过前行为保持半双工 | 是 |
| I5 ✅ | 填一条真 provider 行：`REALTIME_PRESETS`（`builtin` 内置模拟 + `dashscope-realtime` 阿里云百炼 `qwen3-asr-flash-realtime`）+ `key-ref.ts` 复用官方同名凭据（keyPreset 指回 CLOUD_PRESETS，`DASHSCOPE_API_KEY` 天然复用）。`src/realtime-dashscope.ts` 实现真 provider（undici WebSocket 握手带 `Authorization: Bearer`，`session.update`(pcm/16000/server_vad) → `input_audio_buffer.append`(base64 PCM) → 事件映射 speech_started/stopped→speech-*、transcription.text(text+stash)→partial、…completed(transcript)→final、error→error），`close()` 先发 `session.finish` 再等 `session.finished` 优雅关闭。host `index.ts` 的 `createProvider` 按 `settings.realtime.provider` 分派（''/builtin→假 provider 回退；预置 id→真云端，无 key 时 connect 抛错让路由 502 带原因，不静默降级）。设置卡 engine=cloud 时新增「实时服务商」下拉。**待真机**：qwen3-asr-flash-realtime 真 key 的端到端转写验证（单测用本地真 WS 服务模拟协议，6 例全绿） | 是 |
| I6 ✅ | `CloudTtsSink`：`src/client/speech-out.ts` 新增云端 TTS 实现（文本 → host 私有路由 `/api/asr-voice/tts` → qwen3-tts-flash-realtime → base64 PCM → `AudioBufferSourceNode → ctx.destination` 播放），与浏览器 speechSynthesis 同 `SpeakSink` 接口，voice-chat-button 按 `realtime.tts` 分派（browser/cloud/off）；`src/realtime-tts.ts` host 通道（握手 `Authorization: Bearer`，session.update(voice/pcm/16000) → append+commit → response.audio.delta 拼 PCM → audio.done 收口 → session.finish 优雅关），凭据复用 `DASHSCOPE_API_KEY`；设置卡新增「云端 TTS」选项 + 音色字段。**待 I4 实测**：`realtime.duplex: 'full'` 语音插话被 Chromium 回声消除率 gate 住，实测通过前保持半双工 | 是 |

已交付：I1（`pcm.ts` 抽取 + 整段模式计时项进 settings）、I2（`browser` 引擎闭环）、D23 的
`segmented` 引擎、**I3（host 实时通道）**、**I4（client cloud 引擎 + AEC 消除率实测
0.42 dB，见上表）**、**I5（真云端实时 provider qwen3-asr-flash-realtime）**、以及
**I6 的 CloudTtsSink（云 TTS PCM 播放）**。D19 全双工被 I4 实测 gate 住：虚拟管线
AEC 不生效 → 改为软件回声门控 + `realtime.bargeIn` 默认关交付，真机复测前保持半双工。
I3 交付物：

- `src/realtime-provider.ts`：`RealtimeProvider` 接缝（`connect() → RealtimeProviderConnection`，
  `send(pcm)` 上行 / `onEvent` 事件下行 / `close()`）+ 假 provider（能量 VAD 把 PCM 切成句，
  句内 partial → 句尾 final + speech-stopped，行为形状对齐真流式通道）。
- `src/realtime-host.ts`：`RealtimeHost` 会话注册表（`sid` = `crypto.randomUUID()`，host 铸造，
  不透明 token）+ `SseChannel` 下行（partial coalesce / final 必达的背压 + 空闲心跳 + 断连清理）
  + 4 条 exact 路由全过 `isTrusted`（`POST session` 建会话 / `POST audio?sid=` PCM 上行 /
  `GET events?sid=` SSE 下行 / `POST close?sid=` 关会话）+ 空闲超时自动拆会话。
- I3 阶段 host 用假 provider 驱动整条管道（纯管道，浏览器侧尚未接线）；I5 换成真云端
  provider 时只替换 `index.ts` 的 `createProvider`，接缝与路由一行不改。
- 测试：`test/realtime-provider.test.mjs`（7 例 VAD 分段行为）、`test/realtime-host.test.mjs`
  （10 例：注册表 / 信任围栏 / 全链路 / 背压 / 缓冲 / 空闲超时）、`test/ws-auth.test.mjs`
  （2 例：undici WebSocket 带 `Authorization` 头完成真实 socket 上线——本地起真 WS 服务，
  握手时服务端校验收到的头，gate 住 I5 的 qwen3-asr-flash-realtime 上行能否带 DSH 凭据）。

- 真机验收（单测代替不了）：

- **AEC 消除率复测（gate 住 D19 的默认开关）**：虚拟管线实测 0.42 dB 不算数，需真实声学
  回环补数字。复测脚本已就位（qa-asr `run-aec.mjs`，页面同时播放合成 WAV + 麦克风采集，
  对比 `echoCancellation` on/off 的 RMS）：`HEADLESS=0` 起真实 Chromium，播放走真实扬声器，
  采集走真实麦克风（把假采集的 `--use-file-for-fake-audio-capture` 换成真设备），喂
  `/tmp/dshav-speech.wav`（或任意含语音的 WAV）循环播放，观察 `eliminationDb`。若真机
  消除率 ≥ 6 dB：D19 可把 `realtime.bargeIn` 默认值改为开；否则保持默认关。**该数字同时
  是「软件回声底」泄漏系数的标定输入**（残余 = 播放音量 × 泄漏系数）。
- 采集链路已在真 Chromium 里验过（`~/workspace/qa-asr`，探针不入库：它要 `playwright-core` 与合成
  WAV，不该进发布包）。假麦克风文件（`--use-file-for-fake-audio-capture`）驱动的三场景：
  语音突发 → 出帧 24.5/s、帧长恒 40ms、按突发切出 5 段；纯静音 → 4s 内触发死设备守卫；
  内置 beep 连续音 → 出帧但不切段。**这轮就是它抓出 `port.addEventListener` 不投递**——
  引擎单测里帧是测试直接喂 `onFrame` 的，绕过了真 MessagePort，所以「整条链路必然报设备静音」
  在 node 侧表现为全绿。改 `capture.ts` 后重跑：`rolldown probe.ts -o probe.js -f iife -p browser`
  → `node run.mjs speech|silence|beep`。
- I2 闭环要在真实 Chrome 过一遍：字幕逐字 → 停顿即上屏发送 → 回复逐句朗读 → 播报期间不收音 →
  点按钮立刻止读。无 `requestAnimationFrame`、无麦克风的内置验收浏览器不能作证据。
- `segmented` 的 `vad.rms` 是设备噪声底的函数，换机器（含 macOS ↔ Windows）需重新校准：
  偏低则呼吸与键盘声白烧配额，偏高则切掉轻声句尾。优化方向：开启 `vad.rmsAuto` 后 VAD 在
  静音期用「分位数噪声底 × 裕量」实时推阈值，用户换设备免重校。
- `dsh web` 由开发者手动起停（`--no-open`），agent 不代劳；本机端口直连要 `--noproxy '*'`。
