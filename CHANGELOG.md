# 更新日志

本文件记录 dsh-asr-voice 面向使用者的对外变更。格式参考
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循
[语义化版本](https://semver.org/lang/zh-CN/)。

本 CHANGELOG 自 0.2.11 起建立并回填：更早的历史以 GitHub Release 与 git tag 为准。

## [0.3.3] - 2026-09-17

多视角深度优化轮：正确性、安全边界、可访问性、发布护栏四线并行，测试 248 → **318** 项全绿。

### 修复

- **浏览器整段录音不再被静音截断**：Web Speech 的 `continuous` 会话会在用户停顿数秒后
  自行结束，此前 `onend` 直接收摊——用户继续说，一个字都进不来，UI 却还停在「录音中」。
  现在与实时链路同款冷却重启（已识别文字跨重启保留），连续三次起不来才收尾并报
  `network`（`auto` 模式据此降级云端）；`no-speech` 也按「说过话就续听」区分处理。
- **同一页面第二次实时对话必挂（`segmented` / `cloud` 引擎）**：AudioWorklet 的
  `addModule` 此前每次会话都用新 blob URL 注册同名 processor，第二次必被
  `NotSupportedError` 拒绝，而错误文案指向「浏览器不支持」。现在模块 URL 提到模块级
  只创建一次（`addModule` 对同一 URL 幂等）。
- **按住说话的三处键生命周期缺陷**：松键不再无脑 `toggle()`——录音已自行结束（静音自动
  停止 / `no-speech` / 到达时长上限）时那会取消在途转写（刚口述的文本直接消失）或重新
  开录（键已松开，麦克风录到上限）；改为只收尾「正在录音」这一种状态。`keyup` 只比主键
  （先松 Ctrl 再松 Space 不再让 `held` 卡住、麦克风常开）；窗口失焦 / 切后台一并复位。
- **实时对话回合判定改认 `running` 的上升沿**：打断后立刻说下一句时，旧回合尚未落回的
  `running` 会把新回合提前 arm 掉——表现为提前还麦（半双工被破坏）且回复此后不再朗读。
- **播报看门狗归属到句子**：打断后旧句子的迟到 `onend` 不再摘掉新句子的看门狗
  （Chrome 长句不回 `onend`，失去它麦克风就永远还不回来）。
- 整段录音 `stop()` 补看门狗：`onend` 不来时按已识别文本收尾，不再把 UI 钉在「识别中」。
- 浏览器识别器 `start()` 抛错不再被静默吞掉：走冷却重试，连败判死并报错（此前会变聋但
  UI 仍显示「聆听中」）。
- 云端实时引擎的静音守卫复用 `isSilentPeak`（此前硬编码 `0.005`，改阈值会漏改一处）。
- 解码失败的 AudioContext 现在真的 `close()`（此前只丢引用，反复失败会撞 Chrome 的
  每文档上下文数量上限）；电平表上下文 `suspended` 时恢复一次（否则频谱不动，且开着的
  「静音自动停止」会立刻误停录音）。

### 安全

- **信任围栏补上端口**：同源判定从「主机名相等」改为「scheme + host + **port** 相等」
  （默认端口两侧归一化）。此前 `http://localhost:5173` 上的任意本机页面都能借宿主代理
  花用户的 API key——`Sec-Fetch-Site` 只是 `same-site`，拦不住。
- **上游文本透出前脱敏**：`reason` 里的 `Bearer <key>`、`sk-…`、`ASR_VOICE_…` 形状一律
  替换为 `<redacted>` 并截断到 200 字；上游响应体加 4MB 上限（流式计数，超限即断流），
  TTS 的 PCM 累计加 8MB 上限。
- **诊断音频默认不落盘**：`~/.dsh/asr-voice-debug/` 的写盘与 `?capture=1` 现在只在
  `DSH_ASR_DEBUG_KEEP_WAVS=1` 时生效，裁剪改为「文件数 100 + 总字节 200MB」双约束。
- **实时会话有上限**：并发会话数上限 8（超出 503，且在开上游连接之前拒绝）+ 每会话
  绝对 TTL（取 `realtime.maxSessionMs`）——不再可能靠持续上行无限续命付费 WS。
- `/transcribe` 与 `/optimize` 各加 4 个在途并发上限（超出 503）；
  `/optimize` 补输入（1 万字符）与输出（2 万字符，超出截断并标 `truncated`）上限。
- JSON `null` body 不再抛穿 handler：`/tts` 与 `/optimize` 均显式 400。
- 设置页对明文 `http://` 的 BaseURL 给出警告（API key 将明文传输），不阻断保存。
- 迁移密钥引用与读取路径统一派生入口（此前行缺 `id` 时两条路径派生出不同引用名，
  迁移后密钥不可达）；凭据服务缺席时不再静默早退，改记一条 warn。

### 变更

- 设置卡的快捷键录制框不再吞掉 Tab / Shift+Tab（此前键盘用户进得去出不来，Shift+Tab
  还会被**录成快捷键**）。
- 实时字幕不再被二次截断（提示条内层 span 此前固定 220px，会把最新说出的话裁掉）；
  尾部保留长度与容器宽度对齐（80 → 40 字）。录音中的 interim 字幕同样纳入该宽度。
- 状态条不再挡点击（容器 `pointer-events: none`，仅关闭按钮可点）；`×` 触摸目标
  24×24（此前约 17×13）。
- 字幕不再刷屏屏幕阅读器：逐字字幕 `aria-hidden`，改播报低频状态词。
- 优化预览卡：打开即接管焦点、Esc 关闭、`aria-modal`；主按钮文案按 `autoSend` 显示
  「填入草稿 / 填入并发送」（此前一律「填入并发送」，而默认并不发送）。
- 剪贴板写入失败会提示（此前静默——Safari 在异步回调里会拒绝写入，而该开关默认开）。
- 高级区数字输入框补主题样式（此前是浏览器原生外观，深色模式下还是浅色控件）；
  开关行文字可点；chip 单选组支持方向键（roving tabindex）。
- 兼容 Safari < 16.4：`AbortSignal.timeout` 缺失时退回自建超时信号（此前模型列表与
  「测试连接」会以 `TypeError` 失败）。

### 工程

- `build` / `scripts/build.sh` 在 tsdown 前增加 client 半区类型检查（放在 emit 之前，
  失败则 `lib/` 保持原样）；新增 `pretest` 编译 host（测试跑的是 `lib/` 产物）。
- 发布 workflow 增加护栏：`pnpm install --frozen-lockfile` → typecheck → build →
  `git diff --exit-code -- lib` → 全量测试，任一步失败即中止发布。
- `engines: node >= 22`（云端实时 / TTS 依赖全局 `WebSocket`，旧 Node 上的表现是
  502「云端通道不可用」而非版本错误）；构建脚本的 Node 下限同步。
- `files` 加入 `docs/images`（README 图片此前在 npm 页面 404）；删掉指向从不产出的
  `lib/types/client/index.d.ts` 的 `exports` 映射与 tsconfig 里的死配置。
- tsdown 的 external 策略从「字面量白名单 + 默认内联」改为「前缀正则 + 默认 external」，
  避免将来新增的官方导入被静默打进 bundle（单例被复制且构建不报错）。
- 新增测试：SSE 分帧纯函数与传输层（20 例）、schema ↔ client 默认值一致性守卫（5 例）、
  引擎选择真值表（11 例）、产物 external 白名单（4 例）、host 边界守卫（12 例）；
  信任围栏与迁移引用一致性补用例。

### 文档

- README 修正 5 处与代码不符：单按钮手势（点 = 转写 / 长按 = 对话）、`realtime.hotkey`
  默认值、`realtime.tts` 的 `cloud` 档与缺失的 `provider` / `ttsVoice` 两行、
  「真云端 provider 仍是后续阶段」（早已实现）、Node 版本要求；权限表更新诊断落盘口径。
- `cordis.patch.yml` 同步：实时对话默认开、单按钮、engine 差异、client 侧硬依赖说明。

## [0.3.2] - 2026-09-15

### 变更

- **DSH 兼容**：`@deepseek-ai/*` 依赖线对齐 DSH `0.1.6-alpha.1`（peer 与 dev 双声明，约束为
  `^0.1.6-alpha.1`），并同步 `pnpm-workspace.yaml` 的 release-age 例外清单。
- 本版为纯依赖对齐，**无功能与行为变更**。双半区 typecheck、构建与 248 项回归测试全绿。

## [0.3.1] - 2026-09-13

### 变更

- **包名迁移**：`dsh-asr-voice` → **`@bittersmilezzz/dsh-asr-voice`**，以便发布到 npm registry
  （统一到自有 scope）。同步更新的加载契约：`package.json` name、`cordis.patch.yml` 的
  bundle `name`（`id` 保持短原名，那是实例标识）、客户端 bundle 的
  `window.__ModuleLoader__.load({ id })`、样式注入的 `data-plugin` / `data-plugin-css` 标记。
  功能、配置 schema 与 UI 文案均未改动。
- **npm 首次发布**：本版是包进入 npm registry 的首个版本。
- **桌面端兼容**：客户端平台模块（`react`、`react-dom`、`@deepseek-ai/dsh-client-ui-slots`、
  `@deepseek-ai/dsh-client-ui-primitives`）改标为 **optional peer**（`peerDependenciesMeta`）。
  它们由 DSH 客户端的冻结模块表在运行时提供，不属于宿主共享包；不标 optional 会被
  Desktop 的 profile 校验以 `requires missing …` 拒绝加载。

## [0.3.0] - 2026-09-12

### 变更（破坏性）

- **两个按钮合并成一个：点 = 语音输入，长按 = 语音对话。** 此前输入栏右侧并排两个按钮
  （麦克风 + 气泡），交互面冗余、还占输入栏宽度；现在同一个按钮按手势分派：短按走原来的
  录音转写链路，按住约 450ms 直接进入实时语音对话，对话中再点即结束或打断。
  按钮右上角多了一颗静态小点，表示「长按可对话」可用（对话总开关关闭时不画）。
- **语音对话有了默认快捷键 `Ctrl+Shift+Alt+Space`**（macOS 上等效 Cmd+Shift+Alt+Space）。
  此前默认是空串——对话只能用鼠标点。它与录音键 `Ctrl+Shift+Space` 错开，不会撞车；
  留空仍可关闭，此时按钮长按是唯一入口。
- **两条链路互斥守卫成对补齐**：录音/识别/优化进行中时长按不认（按住只当「点」的拖长，
  用户想的是停止录音）；对话进行中录音键（按钮点击与快捷键两条路）一律不生效。
  两者抓的是同一个输入设备，谁在跑谁独占。
- **对话总开关关闭时，正在进行的对话会立刻收摊**。此前靠「注销第二个按钮」顺带卸载组件
  完成这件事，入口合并成常驻按钮后那个副作用消失了，改为显式监听 `realtime.enabled`
  并结束会话——否则关掉开关后麦克风会一直开着。
- 设置项文案同步：「启用『语音对话』按钮」→「启用语音对话」（不再有第二个按钮），
  对话快捷键与录音快捷键的说明补上长按入口与互斥行为。

### 内部

- 新增 `src/client/long-press.ts`：点/长按判定是纯逻辑（时间源与定时器可注入），
  且**短按刻意走原生 `click`**——键盘 Enter/Space 因此天然可用，也不会出现
  「pointerup 触发一次 + click 再触发一次」的双发。长按后的那个 click 必须吞掉，
  否则一次长按会既开对话又开转写。
- 新增 `src/client/button-route.ts`：手势 → 动作的仲裁抽成纯函数
  （`none` / `chat` / `begin` / `finish` / `cancel`），把「一个按钮两个动作」的真值表
  从 JSX 里拿出来单测。
- 新增 `src/client/icons.tsx`：`MicIcon` / `ChatIcon` / `RecDot` / `Spinner` /
  `SpectrumBars` 集中到中立模块。合并后麦克风按钮要复用对话逻辑、对话状态条又要用图标，
  图标留在任一侧都会成环。
- `src/client/voice-chat-button.tsx` → `src/client/voice-chat.tsx`：由「自带按钮的组件」
  改为 **hook（`useVoiceChat`）+ 它自己的状态条**。对话状态条必须渲染在按钮的
  `.dshav-mic-wrap` 内（`.dshav-hotkey-hint` 是相对它 `right: 34px` 绝对定位的），
  所以两条链路现在共用一条提示位，优先级：对话字幕 > 录音错误/提示 > 录音状态 >
  对话留下的提示。
- `conversation.input.right` 从两个 entry 收敛为一个（`dsh-asr-voice-button`），
  随开关增删第二个 entry 的动态注册逻辑及其副作用一并删除。
- 按钮补 `touch-action: manipulation` 与 `user-select: none`：触屏上不关掉双击缩放与
  长按选中，按住 450ms 会被浏览器判成长按选词，手势根本传不到我们手里。
- `test/config-freeze.test.mjs` 里「快捷键位上的 null 回退默认」断言改为比对
  `DEFAULTS.realtime.hotkey` 而非写死 `''`（默认值本就该随版本变）。

### 验证

- 双半区 typecheck（host + client）零错误，构建通过。
- 测试 **248/248** 通过（新增 14 例：长按判定 10 例、按钮手势仲裁 4 例）；
  Node 22.22.2 与 Node 26.7.0 双版本均全绿。

### 已知限制（本轮未改）

- 长按阈值 450ms 是常量，未进设置面板（改动它属于「手感」调参，先按默认观察）。
- 合并后按钮的悬停提示是唯一的长按发现途径（加上那颗小点）；首次使用者仍可能
  需要读一次设置页说明。

## [0.2.15] - 2026-09-12

### 修复

- **上游报错后会话变「僵尸」，麦克风与 SSE 一直挂着**：provider 报错后 host 不拆会话，
  而客户端仍按 40ms 一帧上行 PCM，每帧都刷新该会话的空闲计时——死连接因此永远等不到
  空闲过期，SSE 长挂、麦克风长开，只能刷新页面。现在上游**终态**报错即停止接受上行、
  停止刷新空闲计时，并进入 5s 收尾宽限（先把错误帧送到客户端再拆会话）。
  配套引入事件级 `fatal` 标记：`provider-timeout` / `provider-unreachable` /
  `provider-closed`（本地即可判定的连接死亡）为终态；而单条音频转写失败
  （`transcription-failed`，官方文档明确它「与其他 error 事件分开处理」）与通用 `error`
  （含 `invalid_request_error` 这类参数错）**不拆会话**——否则用户说错一句就掐掉整场对话。
- **HTTP 状态码语义丢失**：body 读取阶段的错误此前只带 message，路由一律回 502（转写 /
  优化）或 400（实时上行），把「客户端发了 30MB 音频」记成「上游故障」，排查被引向
  服务商。现在 `readRawBody` / `readJsonBody` 抛出携带状态码的 `HttpBodyError`
  （超限 413 / 读取超时 408 / 非法 JSON 400），路由按它映射，其余错误仍回 502。
- **凭据解析故障被吞成「没配 key」**：DSH credentials 的 `resolve()` 契约是「未配置 →
  `undefined`」，**抛错只代表服务真故障**（后端不可用 / 权限拒绝）。原先的空 catch 把
  两者混为一谈，用户看到 "no API key" 提示、去设置页反复确认凭据明明存在，真实故障彻底
  丢失。现在只有「环境变量也没兜到 key」时才把故障抛出并带上原因（路由回 502）。
- **`MediaRecorder.start()` 抛错后麦克风常亮**：该调用未包 try，抛错（设备被其他程序
  抢占等）时 `active` 仍为 true、麦克风轨道不释放、也没有任何错误回调，界面卡在
  「录音中」等一个永不到来的 `onstop`。现在捕获后释放轨道、复位状态并送达
  `recorder-start-failed` 错误码（新增对应中英文案，不再落进「浏览器不支持 Web Speech」
  这类反向提示）。

### 变更

- **`voice-button` 的错误码 → 文案映射由嵌套三元改为 `switch`**：该链已到 8 个分支，
  深层三元改一处极易错位到相邻分支。同时 `recorder-unsupported` 归入「录音启动失败」
  文案（此前显示为笼统的「转写失败: recorder-unsupported」）。
- `RealtimeHost` 新增 `errorLingerMs` 构造项（默认 5s），与既有 `idleMs` / `heartbeatMs`
  一样可注入，便于确定性覆盖收尾路径。

### 验证

- 双半区 typecheck（host + client）零错误，构建通过。
- 测试 **234/234** 通过（新增 19 例：HttpBodyError 状态码与映射 4 例、僵尸会话收尾 4 例、
  实时上行 413/404 各 1 例、凭据解析 6 例、录音启动失败 2 例、`transcription.failed`
  非终态 1 例）；Node 22.22.2 与 Node 26.7.0 双版本均全绿。
- 三个既有断言（事件形状 `deepEqual`）按新增的 `fatal` 字段更新——它们此前钉住了
  `{ type: 'error', code }` 的精确形状，正是这层耦合让「哪些错误是终态」的语义一直没被
  表达出来。

### 已知限制（本轮未修）

- `rmsAuto` 纯语音开场可能当次不出字（同 0.2.14：只有 RMS 一个判据时数学上不可辨识）。
- 信任围栏 `isTrusted` 判定同源时忽略端口（同 0.2.14：跨三仓共用的夹具契约，需同步改）。
- `realtime-host` 的会话空闲上限（10 分钟）与 SSE 心跳（15s）仍未进设置面板，也没有
  会话数上限——单机单人使用下风险有限。
- 采集热路径每帧仍有 `slice` 与重复 RMS 计算（`onFrame` 与 VAD 各算一次），量级微秒级、
  未构成实测瓶颈。

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

[未发布]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.15...v0.3.0
[0.2.15]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.14...v0.2.15
[0.2.14]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.13...v0.2.14
[0.2.13]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.12...v0.2.13
[0.2.12]: https://github.com/bitterSmilezzz/dsh-asr-voice/compare/v0.2.10...v0.2.12
[0.2.11]: https://github.com/bitterSmilezzz/dsh-asr-voice/releases/tag/v0.2.11
