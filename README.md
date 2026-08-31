# dsh-asr-voice — 语音输入（Voice Input）

<p align="center">
  <img src="docs/images/cover.png" alt="dsh-asr-voice — DSH 语音输入插件" width="720">
</p>

<p align="center"><strong>开口即成文，落键即送达。</strong><br><em>Speak, and the words are already written.</em></p>

## 关于 About

> 说话，然后文字已经写好。— *Say it; the words are already written.*

dsh-asr-voice 是 DeepSeek Harness 的语音输入之翼：以云端之耳倾听，以优化之手成文，
让每一次开口都直接落为可用的提示词。对着麦克风说出想法，插件把口语转成干净、可直接发送的提示词，
体验如 Codex 语音输入般顺滑。

*A voice-input companion for DeepSeek Harness: it listens with cloud ears and drafts with a
polishing hand, turning every utterance into a clean, send-ready prompt — as fluid as Codex
voice input.*

## 特色 Highlights

- **混合识别，进退自如 — Hybrid ASR, always a way out**
  浏览器 Web Speech 优先（免费、免 key、Chrome/Edge 双平台）；不可用或被网络屏蔽时
  **自动回落**到已配置的云端。云端支持**多供应商**：小米 MiMo / OpenAI / Groq / 硅基流动 /
  通义 Qwen-ASR 可同存并蓄。设置页是一张**三步向导**：选方式 → 点服务商 → 看密钥状态，
  点「测试连接」即自检并把该端点真实可用的模型灌进模型下拉。
  *Web Speech first, with automatic fallback to your cloud ASR. Multiple providers (MiMo, OpenAI,
  Groq, SiliconFlow, Qwen-ASR) can coexist. Settings is a three-step wizard: pick the engine,
  click a provider, check the key — “Test connection” self-checks and lists real models.*

- **优化润于无声 — Polished without interrupting**
  停止录音，约一秒即把清洗版填入草稿；LLM 优化在**后台**润色，完成自动替换，**不覆盖你的编辑**。
  *Stop recording and the cleaned draft lands in about a second, while LLM polish happens in the
  background and replaces it only when done — your edits are never overwritten.*

- **隐私自守 — Privacy by design**
  API key 只落在 **DSH 凭据服务**（与 LLM 共用同一份凭据体系），既不进插件 settings、也不进
  浏览器 DOM，设置页只显示「已配置 / 未配置」。录音在本地完成格式转换后再上传，浏览器仅经
  `/api/asr-voice/*` 私有 JSON 代理而行。
  *API keys live in the DSH credential store only — never in the plugin's settings document nor
  the browser DOM (the UI shows “configured / not configured”, nothing more). Audio is converted
  locally before upload, and the browser talks through a private local proxy.*

- **处处顺手 — Thoughtful touches**
  结果一键复制剪贴板（默认开）、完整替换或末尾追加、快捷键与按住说话、用量统计一目了然。
  *One-tap clipboard, replace-or-append insertion, hotkey & hold-to-talk, and a glanceable usage stats.*

- **独立干净 — Zero third-party runtime**
  运行时只依赖官方 `@deepseek-ai/*` peer 包，可单独用、可组合用。
  *Runs on official @deepseek-ai/* peers only — usable alone or alongside other plugins.*

## 功能 Features

- 输入框工具行**麦克风按钮**（`conversation.input.right`）：点击开始/结束（默认手动关麦，
  点停止即整段去识别；可选静音自动停止），可选按住说话
- 默认快捷键 **Ctrl+Shift+Space**（可配置，支持 macOS 的 Cmd 兼容）
- 识别后**填入草稿**待确认；可选「识别后自动发送」（push-to-talk 风格）
- 设置卡片：「设置 → 插件 → 配置 → 语音输入」= **三步向导** + 默认折叠的「高级」（BaseURL /
  模型 / 通道 / 多服务商 / 语言 / 优化 / 快捷键 / 用量）；改动先进本地草稿，点「保存」才写回，
  写回后按段读回校验

## 快速开始 Quick start

三步，多数情况下**一个 key 都不用填**：

1. **① 识别方式** 选「云端」（只想用浏览器识别的选「仅浏览器」，后面两步直接跳过）。
2. **② 服务商** 点一个 chip（OpenAI / Groq / 硅基流动 / 小米 MiMo / 阿里云百炼 / 自定义），
   BaseURL、模型、调用通道**自动填好**。
3. **③ 密钥与自检** 看这一行的状态：
   - 显示 `✓ 已使用 DSH 凭据 OPENAI_API_KEY` → 已经复用了你在 DSH 里配过的同名 LLM 凭据，**无需任何输入**。
   - 显示未配置 → 把 key 粘进输入框点「保存密钥」；key 只写入 DSH 凭据，不回显、不进配置文件。
   - 点「测试连接」自检（列一次该端点的模型：一次验掉 key + BaseURL + 网络，且不用麦克风）。
4. 点「保存」→ 刷新页面确认仍在，即可对着输入框旁的麦克风开说。

自定义服务商的凭据引用名为 `ASR_VOICE_<显示名>_API_KEY`（显示名参与派生，改名等于换一把 key）。
*Your existing DSH LLM credential for the same provider is reused automatically — most users never
type a key. “Test connection” verifies key + base URL + network in one click without the mic.*

## 效果 Preview

<video src="docs/video-mute.mp4" width="720" controls loop muted></video>

| 输入框麦克风按钮 | 录音中（红色扩散 + 实时频谱） | LLM 优化预览 |
| --- | --- | --- |
| ![输入框麦克风按钮](docs/images/screenshot-idle.png) | ![录音中](docs/images/screenshot-recording.png) | ![LLM 优化预览](docs/images/screenshot-preview.png) |

## 安装 Install

```sh
dsh plugin --profile <profile> add <本插件路径或 GitHub 仓库>
```

浏览器端依赖官方 client 包（由 DSH 提供），无需额外安装。
*The browser side relies on official DSH client packages — nothing extra to install.*

## 设置项 Settings（namespace `asr-voice`）

| 分组 | 字段 | 默认 | 说明 |
|---|---|---|---|
| 识别引擎 | `asr.provider` | `auto` | `auto`（浏览器 Web Speech 优先，失败自动切云端）/ `browser`（Web Speech）/ `cloud`（OpenAI-compatible） |
| 云端 | `asr.cloud.providers` | `[]` | **多供应商列表**：每个含 `{id, preset, name, baseUrl, model, mode}`；`name` 是显示名，也是自定义供应商凭据引用名的派生依据 |
| 云端 | `asr.cloud.active` | 空 | 当前使用的供应商 id（空 = 取第一个）；向导第 ② 步即切换 |
| 云端 | `asr.cloud.preset` / `.baseUrl` / `.model` / `.mode` | `openai` / 预置自动填 | v0.1 的**旧单配置**：`providers` 为空时作为回退读取，新配置一律走 `providers` |
| 云端 | `asr.cloud.providers[].apiKey` / `asr.cloud.apiKey` | 空 | **过渡字段（`role('secret')`）**：只为读走旧文档里的明文 key，首次加载即迁往 DSH 凭据并抹掉；除此之外 settings 与浏览器都不再持有任何密钥 |
| 优化 | `optimize.mode` | `llm` | `llm`（默认，用当前所选 LLM 重写）/ `heuristic`（本地启发式） |
| 优化 | `optimize.preview` | `false` | `false`（默认）：停止录音立即填入清洗版文本，LLM 优化后台完成后自动替换；`true`：等优化完成，预览 原始→优化 后确认填入 |
| 优化 | `optimize.llm.provider` / `.model` | 空 | 可选：从 **DSH 已配置模型列表**指定；留空则用当前所选 LLM。自定义须先到 DSH 模型列表添加 |
| 语言 | `language` | `auto` | `auto` / `zh-CN` / `en-US` |
| 行为 | `behavior.autoSend` | `false` | 识别后自动发送 |
| 行为 | `behavior.silenceStop` | `false` | 静音自动停止（默认关 = 手动点击/快捷键结束录音，点停止即整段去识别） |
| 行为 | `behavior.holdToTalk` | `false` | 按住快捷键说话、松开结束 |
| 行为 | `behavior.textMode` | `replace` | 文本输入模式：`replace`（完整替换草稿）/ `append`（在已有文字后追加） |
| 行为 | `behavior.copyToClipboard` | `true` | 识别/优化后自动把结果复制到剪贴板 |
| 行为 | `behavior.hotkey` | `Ctrl+Shift+Space` | 快捷键（空 = 关闭） |
| 统计 | `/api/asr-voice/stats` | — | ASR 用量统计（次数/字符/最近时间，进程内） |

**API key 不在上表里。** 它存于 DSH 凭据服务，按引用名读取：预置供应商直接用
`<PRESET>_API_KEY`（`OPENAI_API_KEY` / `GROQ_API_KEY` / `SILICONFLOW_API_KEY` /
`MIMO_API_KEY` / `DASHSCOPE_API_KEY`）——与官方 LLM 凭据同名，因此**配过该服务商 LLM 的人
零输入即可用**；自定义供应商用 `ASR_VOICE_<显示名>_API_KEY`。解析顺序：过渡期 settings 里的
残留明文 → `credentials.resolve(ref)` → 环境变量 `ref`。

## 云端 ASR 预置 Presets

| 预置 | baseUrl | 默认模型 | 通道 | 凭据引用名（与 LLM 共用） |
|---|---|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `whisper-1` | whisper 式 `/audio/transcriptions` | `OPENAI_API_KEY` |
| Groq | `https://api.groq.com/openai/v1` | `whisper-large-v3` | whisper 式 `/audio/transcriptions` | `GROQ_API_KEY` |
| 硅基流动 SiliconFlow | `https://api.siliconflow.cn/v1` | `FunAudioLLM/SenseVoiceSmall` | whisper 式 `/audio/transcriptions` | `SILICONFLOW_API_KEY` |
| 小米 MiMo | `https://api.xiaomimimo.com/v1` | `mimo-v2.5-asr` | chat + `input_audio` | `MIMO_API_KEY` |
| 通义/阿里云百炼 Qwen-ASR | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen3-asr-flash` | chat + `input_audio` | `DASHSCOPE_API_KEY` |
| 自定义 | 你填 | 你填 | 按模型选 | `ASR_VOICE_<显示名>_API_KEY` |

两条调用通道（设置项 `asr.cloud.mode`，默认 `auto`）：
- **whisper 式** `transcriptions`：multipart 上传到 `/audio/transcriptions`（OpenAI / Groq / 硅基流动 / 本地部署）。
- **chat + input_audio** `chat`：base64 data URI 走 `/chat/completions`——小米 MiMo-V2.5-ASR、通义 Qwen-ASR 等音频大模型的 OpenAI 兼容姿势。
- **auto**：按模型名自动判定（模型名含 `asr`/`audio`/`omni`/`sensevoice` 走 chat，否则 whisper 式）。

自定义端点兼容任何 OpenAI-compatible 服务（按模型选对应通道）。
*Any OpenAI-compatible endpoint works — pick the channel to match your model.*

## 外部依赖 External Dependencies

- 浏览器：Web Speech API（Chrome/Edge；Safari 部分支持）、`getUserMedia` + `MediaRecorder`
- 云端 ASR / LLM：你配置的 OpenAI-compatible 服务（网络请求由本机 host 发起）
- 运行时**不依赖任何第三方 DSH 插件**（与 dsh-ui-tweaks 等完全独立，可单独用、可组合用）

## 生命周期脚本 Lifecycle Scripts

**无** `preinstall` / `install` / `postinstall` / `prepare` 等安装期脚本；
`build` / `build:client` / `bundle` / `typecheck` 仅开发者构建用，不参与安装。

## 权限与已知风险 Permissions & Known Issues（保守披露）

| 权限 | 等级 | 说明 |
|---|---|---|
| 麦克风 | 高 | 浏览器 `getUserMedia` 需要用户授权；录音仅在点击/快捷键触发时进行 |
| 网络 | 中 | 云端 ASR/LLM 时，本机 host 向**你配置的** baseUrl 发起 HTTPS 请求 |
| 设置读写 | 中 | 读写自有 namespace `asr-voice`（**不含密钥**：两个 `apiKey` 字段标了 `role('secret')`，过线即被脱敏） |
| 凭据读写 | 中 | 只按**自己派生的引用名**读写：`OPENAI_API_KEY` / `GROQ_API_KEY` / `SILICONFLOW_API_KEY` / `MIMO_API_KEY` / `DASHSCOPE_API_KEY` / `ASR_VOICE_*_API_KEY`。预置引用名与官方 LLM 凭据**同名**（刻意复用，代价是共用同一把 key 与配额）。页面上输入的 key 仅在保存那一次经 connection RPC 送到 host 落库；**已存的值永不回传浏览器**，设置页只看得到「已配置 / 未配置」 |
| 文件（诊断落盘） | 中 | 转写失败 / 识别结果异常短 / 显式诊断抓取时，将原始录音写入 `~/.dsh/asr-voice-debug/`（可用 `DSH_ASR_DEBUG_DIR` 重定向，自动裁剪至 100 个）；不执行命令、不读取其他凭据 |

已知风险：

- **若见「未检测到声音」之语，请将浏览器地址栏站点设置中的输入设备选为「内置麦克风」**——
  远程控制/直播软件安装的虚拟音频设备常被误选，徒留静音寂寂；插件静音守卫会拦截此类录音并明言相告，
  不向云端虚报。
  *If you see "no sound detected", pick the built-in microphone as the input device in the
  browser's site settings — virtual audio devices are often selected by mistake and record silence.
  The silence guard blocks such recordings and tells you plainly instead of wasting a cloud call.*
- 浏览器 Web Speech 在 Firefox 不可用（提示改用云端）；识别质量取决于浏览器/服务商。
  *Web Speech is unavailable on Firefox (it will prompt you to use cloud ASR); recognition quality
  varies by browser and provider.*
- 云端转写会把你的语音上传到所配置的服务商，请确认其隐私政策。
  *Audio is uploaded to your configured provider for transcription — review their privacy policy.*
- API key 存于 DSH 凭据服务（落盘位置与格式由 host 的凭据策略决定），仅本机回环可访问代理路由
  （信任围栏防 CSRF）。
  *Keys live in the DSH credential store (where and how they are persisted is the host's policy);
  proxy routes are loopback-only (trusted-origin fence against CSRF).*
- **升级自 v0.1/v0.2 的注意**：旧版本的 `apiKey` 是写在 settings 里的明文字段，且曾随
  `settings.describe` 过线到浏览器。本版本首次加载会自动把这些明文迁进凭据并抹掉 settings 里的值；
  若你想立刻处理，可自己删 `~/.dsh/settings.yaml` 中的 `apiKey` 字段。**迁移前已经过线的那把 key
  建议轮换一次**（如果你在意的话）。若 `credentials.set` 被拒（例如该引用名被只读来源遮蔽），迁移会
  **整批放弃并保留 settings 原值**——识别照旧可用，只是 host 日志里会有一条 warn，而卡片第 ③ 步会显示
  该引用名「尚未配置」；自己按提示填一次即可。
  *Upgrading from v0.1/v0.2: `apiKey` used to be plaintext in the settings document and did cross the
  settings wire to the browser. On first load this version moves those keys into credentials and clears
  the settings copy; delete `apiKey` from `~/.dsh/settings.yaml` by hand if you want it gone now, and
  consider rotating a key you care about. If the credential write is refused, the migration aborts and
  leaves the plaintext in place — transcription keeps working, the host logs one warning, and the card
  shows that ref as “no key yet”.*
- 动效为**自研 GSAP 风格轻量动画模块**（离线构建环境无 gsap 包可装），API 对齐 GSAP
  （`to`/`fromTo`/`timeline`），后续可一行替换为真 GSAP——不影响组件调用点。

## 开发 Development

- 构建：`bash scripts/build.sh`（自动选用 Node ≥18；依赖树经 junction 链接到已装兄弟插件
  或 `DSH_CHECKOUT`，**仅为构建期**便利，与运行时无关）
- 类型检查：`node_modules/.bin/tsc -p tsconfig.host.json --noEmit && node_modules/.bin/tsc -p tsconfig.client.json --noEmit`
- 契约：本仓库 AGENTS.md 指向伞仓库 `dsh-plugins/AGENTS.md`（单一来源）

## License

MIT