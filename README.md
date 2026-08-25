# dsh-asr-voice（语音输入）

DeepSeek Harness（DSH）语音输入插件：**说话 → 识别 → 提示词优化 → 填入/发送**，
体验类似 Codex 语音输入。设置页可配置 ASR 引擎与模型、提示词优化方式、快捷键等。

- 默认**浏览器 Web Speech API**（免费、免 key、Chrome/Edge macOS + Windows 双平台可用）
- 可选**云端 OpenAI-compatible ASR**（OpenAI / Groq / 硅基流动 / 通义 Qwen-ASR，可自定义 baseUrl + model）
- **提示词优化**：默认用**当前所选 LLM** 重写（走官方 LLM 通道，无需单独配 key）；可选本地启发式（免费离线）
- **API key 只存本机服务端**（host settings），浏览器只经 `/api/asr-voice/*` 私有 JSON 代理，key 不进前端

## 功能

- 输入框工具行**麦克风按钮**（`conversation.input.right`）：点击开始/结束，静音自动停止，可选按住说话
- 默认快捷键 **Ctrl+Shift+Space**（可配置，支持 macOS 的 Cmd 兼容）
- 识别后**提示词优化**：默认用当前所选 LLM 重写（识别耗时较长时预览 原始→优化 后确认）；可切换本地启发式（清洗语气词/补标点/分段，即时填入）
- 识别后**填入草稿**待确认；可选「识别后自动发送」（push-to-talk 风格）
- 设置卡片：「设置 → 插件 → 配置 → 语音输入」

## 安装

```sh
dsh plugin --profile <profile> add <本插件路径或 GitHub 仓库>
```

浏览器端依赖官方 client 包（由 DSH 提供），无需额外安装。

## 设置项（namespace `asr-voice`）

| 分组 | 字段 | 默认 | 说明 |
|---|---|---|---|
| 识别引擎 | `asr.provider` | `browser` | `browser`（Web Speech）/ `cloud`（OpenAI-compatible） |
| 云端 | `asr.cloud.preset` | `openai` | `openai` / `groq` / `siliconflow` / `dashscope` / `custom` |
| 云端 | `asr.cloud.baseUrl` | 预置自动填 | 任意 OpenAI-compatible base URL |
| 云端 | `asr.cloud.apiKey` | 空 | 仅存本机服务端 |
| 云端 | `asr.cloud.model` | 预置自动填 | 如 `whisper-1` / `whisper-large-v3` / `FunAudioLLM/SenseVoiceSmall` / `qwen3-asr-flash` |
| 优化 | `optimize.mode` | `llm` | `llm`（默认，用当前所选 LLM 重写）/ `heuristic`（本地启发式） |
| 优化 | `optimize.llm.*` | 空 | 可选：指定特定 LLM（OpenAI-compatible）；留空则用当前所选 LLM |
| 语言 | `language` | `auto` | `auto` / `zh-CN` / `en-US` |
| 行为 | `behavior.autoSend` | `false` | 识别后自动发送 |
| 行为 | `behavior.holdToTalk` | `false` | 按住快捷键说话、松开结束 |
| 行为 | `behavior.hotkey` | `Ctrl+Shift+Space` | 快捷键（空 = 关闭） |

## 云端 ASR 预置

| 预置 | baseUrl | 默认模型 |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `whisper-1` |
| Groq | `https://api.groq.com/openai/v1` | `whisper-large-v3` |
| 硅基流动 SiliconFlow | `https://api.siliconflow.cn/v1` | `FunAudioLLM/SenseVoiceSmall` |
| 通义/阿里云百炼 Qwen-ASR | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3-asr-flash` |

自定义端点兼容任何 OpenAI-compatible `/audio/transcriptions`（含本地/私有部署的 ASR 服务）。

## 外部依赖

- 浏览器：Web Speech API（Chrome/Edge；Safari 部分支持）、`getUserMedia` + `MediaRecorder`
- 云端 ASR / LLM：你配置的 OpenAI-compatible 服务（网络请求由本机 host 发起）
- 运行时**不依赖任何第三方 DSH 插件**（与 dsh-ui-tweaks 等完全独立，可单独用、可组合用）

## 生命周期脚本

**无** `preinstall` / `install` / `postinstall` / `prepare` 等安装期脚本；
`build` / `build:client` / `bundle` / `typecheck` 仅开发者构建用，不参与安装。

## 权限与已知风险（保守披露）

| 权限 | 等级 | 说明 |
|---|---|---|
| 麦克风 | 高 | 浏览器 `getUserMedia` 需要用户授权；录音仅在点击/快捷键触发时进行 |
| 网络 | 中 | 云端 ASR/LLM 时，本机 host 向**你配置的** baseUrl 发起 HTTPS 请求 |
| 设置读写 | 中 | 读写自有 namespace `asr-voice`（含 API key，仅存本机服务端） |
| 文件/命令/凭据 | 无 | 不访问文件系统、不执行命令、不读取其他凭据 |

已知风险：
- 浏览器 Web Speech 在 Firefox 不可用（提示改用云端）；识别质量取决于浏览器/服务商。
- 云端转写会把你的语音上传到所配置的服务商，请确认其隐私政策。
- API key 明文存于本机 DSH settings；仅本机回环可访问代理路由（信任围栏防 CSRF）。
- 动效为**自研 GSAP 风格轻量动画模块**（离线构建环境无 gsap 包可装），API 对齐 GSAP
  （`to`/`fromTo`/`timeline`），后续可一行替换为真 GSAP——不影响组件调用点。

## 开发

- 构建：`bash scripts/build.sh`（自动选用 Node ≥18；依赖树经 junction 链接到已装兄弟插件
  或 `DSH_CHECKOUT`，**仅为构建期**便利，与运行时无关）
- 类型检查：`node_modules/.bin/tsc -p tsconfig.host.json --noEmit && node_modules/.bin/tsc -p tsconfig.client.json --noEmit`
- 契约：本仓库 AGENTS.md 指向伞仓库 `dsh-plugins/AGENTS.md`（单一来源）

## License

MIT
