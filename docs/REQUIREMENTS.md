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

## 待确认
- 上述设计蓝图整体确认后开始实现（grilling 约定：确认共享理解后才动手）
