window.__ModuleLoader__.load({
	id: "dsh-asr-voice",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react_jsx_runtime = require("react/jsx-runtime");
		react_jsx_runtime = __toESM(react_jsx_runtime, 1);
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/locales.ts
		const zh = {
			cardTitle: "语音输入",
			cardCopy: "开口成文：识别、优化、填入草稿。",
			readOnlyDoc: "宿主当前不接受配置写入（文档只读或连接未就绪），下面的控件已禁用。",
			howTo: "怎么办：① 选「云端」→ ② 点一个服务商 → ③ 按密钥那行的提示走，就完事了。",
			stepEngineTitle: "识别方式",
			engineAuto: "自动（推荐）",
			engineBrowser: "仅浏览器（无需配置）",
			engineCloud: "云端（更准，需要 key）",
			engineHintAuto: "先用浏览器内置识别，不可用时自动切到云端。什么都没配过就选这个。",
			engineHintBrowser: "完全在浏览器里识别：免费、不需要任何 key。准确率一般，且只有 Chrome / Edge 支持。",
			engineHintCloud: "调用 OpenAI-compatible 云端识别：准确率和多语种更好，需要一把 API key（下一步起）。",
			stepProviderTitle: "服务商",
			stepProviderHint: "点一个即选中，BaseURL、模型和调用通道会自动填好。「自定义」可接任意 OpenAI-compatible 端点。",
			cloudPresetCustom: "自定义",
			addProvider: "＋ 自定义服务商",
			removeProvider: "删除",
			providersEmpty: "还没有云端服务商，点「＋ 自定义服务商」加一行。",
			stepKeyTitle: "密钥与自检",
			keyChecking: "正在查询本机凭据…",
			keyQueryFailed: "凭据状态查询失败",
			keyConfigured: "已使用 DSH 凭据 {ref}，不用再填。",
			keyNeedsValue: "尚未配置密钥：把 {ref} 粘贴到下面并保存。",
			keyNameNeeded: "先给这个服务商起个显示名——密钥引用名由它派生。",
			keySave: "保存密钥",
			keySaving: "保存中…",
			keySavedHint: "密钥已写入 DSH 凭据 {ref}。",
			keySaveFailed: "密钥保存失败",
			keyKeepHint: "密钥只写入 DSH 凭据：不进配置文件、不回显、不经过这个页面读取。",
			keyKeepPlaceholder: "留空即不改动",
			keyPastePlaceholder: "粘贴 API key",
			testConnection: "测试连接",
			testAndSave: "保存并测试",
			testBusy: "测试中…",
			testOk: "连接正常，取到 {n} 个模型。",
			testFail: "测试失败",
			save: "保存",
			savingHint: "保存中…",
			savedHint: "已保存。",
			saveNotApplied: "「{section}」写回后读回不一致，可能没落盘：请重试或看宿主日志。",
			unsavedHint: "有未保存的更改。",
			discard: "放弃更改",
			advancedTitle: "高级",
			advancedHint: "展开：BaseURL / 模型 / 通道 / 多服务商 / 语言 / 优化 / 快捷键 / 用量",
			advancedCollapse: "已展开，点这里收起",
			groupAsr: "识别引擎",
			providerNameLabel: "显示名",
			providerNameDesc: "这个服务商的密钥存在 DSH 凭据 {ref} 下。自定义服务商的引用名由显示名派生——改名等于换一把 key。",
			providerListLabel: "全部服务商",
			providerListDesc: "选中即切换当前使用的供应商；删除只移除这一行配置，不会动 DSH 凭据。",
			cloudBaseUrlLabel: "Base URL",
			cloudBaseUrlDesc: "OpenAI-compatible 根地址，通常以 /v1 结尾。预置已填好，改这里即接入自建或代理端点。",
			cloudModelLabel: "模型",
			cloudModelDesc: "识别模型名。想知道端点里到底有哪些模型，用第 ③ 步的「测试连接」。",
			cloudModelPicked: "「测试连接」成功后，这里会列出该端点真实可用的模型。",
			cloudModeLabel: "调用通道",
			cloudModeDesc: "音频走哪条协议：whisper 式转写接口，或 chat + input_audio。选「自动」按模型名判定。",
			cloudModeAuto: "自动（按模型名判定）",
			cloudModeTranscriptions: "whisper 式 /audio/transcriptions",
			cloudModeChat: "chat + input_audio（MiMo/Qwen-ASR）",
			fetchModelsPick: "选择模型",
			fetchModelsEmpty: "该端点没有返回可用模型，请检查 Base URL、密钥和模型名。",
			groupOptimize: "提示词优化",
			optimizeModeLabel: "优化方式",
			optimizeHeuristic: "本地启发式（免费、离线）",
			optimizeLlm: "LLM 重写（默认用当前所选模型）",
			optimizePreviewLabel: "优化结果先预览确认",
			optimizePreviewDesc: "关闭（默认）：停止录音立即把清洗版文本填入草稿，LLM 优化在后台完成后自动替换（不覆盖你的编辑）；开启：等优化完成弹出预览卡，确认后再填入。",
			optimizingHint: "优化中…草稿已填入，可直接编辑或发送",
			transcribingHint: "识别中…",
			cancelBusy: "取消（丢掉本次语音）",
			optimizeFailedKeep: "优化失败，已保留草稿中的清洗版文本",
			llmDefaultHint: "默认使用当前所选 LLM；可在此指定 DSH 已配置的模型。",
			llmProviderLabel: "模型提供方",
			llmModelLabel: "模型",
			llmCurrentDefault: "当前所选（默认）",
			llmModelsEmpty: "该提供方暂无可用模型",
			languageLabel: "识别语言",
			languageAuto: "自动（跟随浏览器/系统）",
			groupBehavior: "交互行为",
			autoSendLabel: "识别后自动发送",
			autoSendDesc: "开启后说完即发（push-to-talk 风格），关闭则填入草稿待确认。",
			silenceStopLabel: "静音自动停止",
			silenceStopDesc: "关闭（默认）：只有手动点击/快捷键结束录音，点停止即整段去识别；开启：静音持续下方「静音判定时长」后自动结束。",
			holdToTalkLabel: "按住说话",
			holdToTalkDesc: "开启后按住快捷键说话、松开结束；关闭为点击开始、再点结束（静音自动结束由「静音自动停止」开关决定）。",
			textModeLabel: "文本输入",
			textModeDesc: "完整替换：清空草稿后填入；末尾追加：在已有文字后插入。",
			textModeReplace: "完整替换（默认）",
			textModeAppend: "在已有文字后追加",
			copyToClipboardLabel: "自动复制到剪贴板",
			copyToClipboardDesc: "识别优化后自动把结果复制到系统剪贴板，方便粘贴到其它地方。",
			hotkeyLabel: "快捷键",
			hotkeyDesc: "点击后按新组合键（如 Ctrl+Shift+Space）；留空关闭。",
			hotkeyPlaceholder: "点击录制快捷键",
			hotkeyClear: "清除",
			maxRecordMsLabel: "单次录音上限",
			maxRecordMsDesc: "单位毫秒。到点自动结束并送识别，避免忘记关麦一直录。",
			silenceMsLabel: "静音判定时长",
			silenceMsDesc: "单位毫秒。连续安静这么久就判定说完了（需先开启「静音自动停止」）。",
			silenceRmsLabel: "静音阈值",
			silenceRmsDesc: "0~1 的响度比例，低于它算安静。环境嘈杂就调高，说话很轻就调低。",
			groupRealtime: "实时语音对话",
			realtimeEnableLabel: "启用「语音对话」按钮",
			realtimeEnableDesc: "在麦克风按钮旁再加一个：边说边上屏，停顿即发起回合，并把回复朗读出来。默认开启。",
			realtimeTtsLabel: "回复播报",
			realtimeTtsDesc: "用浏览器内置语音把 agent 的回复读出来；选「不播报」则只上屏文字。",
			realtimeTtsBrowser: "浏览器语音（默认）",
			realtimeTtsCloud: "云端 TTS（Qwen，需 key）",
			realtimeTtsOff: "不播报",
			realtimeTtsVoiceLabel: "云端音色",
			realtimeTtsVoiceDesc: "qwen3-tts-flash-realtime 的系统音色名（如 Cherry），key 复用 DSH 凭据 DASHSCOPE_API_KEY。",
			realtimeHotkeyLabel: "对话快捷键",
			bargeInLabel: "语音插话（全双工，默认关）",
			bargeInDesc: "播报回复期间继续收音：你开口说话（持续超过回声门）就直接打断朗读、取消当前回合。默认关——浏览器 AEC 在虚拟设备上实测不生效（0.42 dB），真机回环复测通过前先保持半双工最稳；仅按句切段引擎（segmented）支持。",
			realtimeHotkeyDesc: "点击后按新组合键，用于开始/结束对话或打断播报；留空表示只用按钮。与上面的录音快捷键互不影响。",
			realtimeSettleMsLabel: "断句等待",
			realtimeSettleMsDesc: "单位毫秒。识别文字停止变化这么久，就认为这句说完并上屏。",
			realtimeTailMsLabel: "收尾延时",
			realtimeTailMsDesc: "单位毫秒。上屏前再多等一会儿，接住最后一个词的迟到结果；0 表示不等。",
			realtimeEngineLabel: "实时引擎",
			realtimeEngineDesc: "Web Speech 逐字出字、不花配额；按句转写用本地静音检测切句，每句走一次已配置的云端转写，出字会慢一拍；云端实时把采集帧上行到本机实时通道，服务端判回合。",
			realtimeEngineBrowser: "Web Speech（逐字，免费）",
			realtimeEngineSegmented: "按句转写（本地切句 + 云端识别）",
			realtimeEngineCloud: "云端实时（服务端判回合）",
			realtimeProviderLabel: "实时服务商",
			realtimeProviderDesc: "云端实时走哪个 provider。选「内置模拟」用 host 端假 provider（开发态，不花配额）；选阿里云百炼接真云端 qwen3-asr-flash-realtime（服务端 VAD 判回合，key 复用 DSH 凭据 DASHSCOPE_API_KEY）。",
			vadRmsAutoLabel: "有声阈值自动校准",
			vadRmsAutoDesc: "按设备噪声底自动调整实际判阈值（下限仍是你设置的「有声阈值」）：安静环境更灵、嘈杂环境不乱切句，换设备免重校。",
			vadFrameMsLabel: "采集帧长",
			vadFrameMsDesc: "单位毫秒。每帧的时长，越小越省延迟、越大越省调度。",
			vadRmsLabel: "有声阈值",
			vadRmsDesc: "0~1 的 RMS。按你的设备噪声底调：偏低会把键盘呼吸当话，偏高会切掉轻声句尾。",
			vadSilenceMsLabel: "切句静音",
			vadSilenceMsDesc: "单位毫秒。安静这么久算一句说完，也是每句上屏的固定延迟。",
			vadPrerollMsLabel: "段前缓冲",
			vadPrerollMsDesc: "单位毫秒。把开口前的一小段一起送上去，否则第一个音节必被切掉。",
			vadMinSpeechMsLabel: "最短语音",
			vadMinSpeechMsDesc: "单位毫秒。实际发声短于此不成为一句，不该为咳嗽花一次配额。",
			vadMaxSegmentMsLabel: "最长单句",
			vadMaxSegmentMsDesc: "单位毫秒。说个不停也到这个长度就出字，同时封顶单次上传大小。",
			vadMaxPendingLabel: "待转写队列",
			vadMaxPendingDesc: "最多攒几句待转写。转写慢过说话时丢最早的一句。",
			realtimeMaxSessionLabel: "单次对话上限",
			realtimeMaxSessionDesc: "单位毫秒。到点自动结束这次对话并交还麦克风，避免忘了关而一直听。",
			realtimeFirstSentenceLabel: "首句最少字数",
			realtimeFirstSentenceDesc: "播报时第一句先攒到这么多字才起音，避免一两个短词就开始读。",
			realtimeWatchdogLabel: "播报兜底超时",
			realtimeWatchdogDesc: "单位毫秒。浏览器迟迟不回「播完」事件时，最迟过这么久也按播完处理。",
			chatTitle: "语音对话",
			chatListeningTitle: "正在听…点击结束对话",
			chatThinkingTitle: "思考中…点击打断",
			chatSpeakingTitle: "朗读中…点击打断",
			chatThinkingHint: "等回复…",
			chatSpeakingHint: "朗读中…",
			chatInterrupt: "打断",
			chatEndedLimit: "已达单次对话上限，对话自动结束",
			chatNoReply: "这句没有发起回合，继续听",
			chatNoTts: "当前浏览器不支持语音播报，只显示字幕",
			chatGap: "转写跟不上，已丢掉最早的一句，字幕可能不完整",
			errSegmentedNeedsCloud: "按句转写需要先配好云端 ASR（设置 → 语音转文字 → 云端供应商）",
			errSegmentedUnsupported: "当前浏览器不支持实时音频采集（需支持 AudioWorklet），请改用 Web Speech 引擎",
			errSegmentedUnreachable: "转写服务连续失败，本次对话已结束",
			dismiss: "关闭",
			loadFailed: "加载失败",
			micTitle: "语音输入",
			recordingTitle: "录音中…点击结束",
			transcribingTitle: "识别中…点击取消",
			optimizingTitle: "优化中…点击取消",
			errNoMic: "未检测到麦克风",
			errNoSound: "未检测到声音：录音为静音，未发送识别。请检查麦克风权限、系统输入音量，并在浏览器地址栏站点设置/授权弹窗中把输入设备选为「内置麦克风」（虚拟音频设备常被误选导致静音）",
			errNoSpeechSupport: "当前浏览器不支持 Web Speech，请改用云端 ASR（Chrome/Edge 均支持）。",
			errWebSpeechNetwork: "浏览器语音识别网络不可用（服务可能被网络屏蔽），已请改用云端 ASR。",
			errCloudNotConfigured: "云端 ASR 未配置：到设置选服务商、填 Base URL，密钥放在 DSH 凭据里。",
			noSpeechDetected: "未检测到语音",
			fallbackToCloud: "浏览器语音识别不可用，已自动切换云端 ASR",
			errTranscribe: "识别失败",
			errOptimize: "优化失败",
			previewTitle: "提示词优化预览",
			previewOriginal: "原始转写",
			previewOptimized: "优化后",
			previewConfirm: "填入并发送",
			previewCancel: "取消",
			groupStats: "用量统计",
			statsTitle: "ASR 用量",
			statsCount: "已识别 {n} 次",
			statsChars: "累计 {n} 字符",
			statsLastAt: "最近 {time}",
			statsEmpty: "暂无用量数据"
		};
		const en = {
			cardTitle: "Voice Input",
			cardCopy: "Speak to prompt — recognized, optimized, delivered.",
			readOnlyDoc: "The host is not accepting config writes right now (read-only document or connection not ready), so the controls below are disabled.",
			howTo: "What to do: ① pick Cloud → ② click a provider → ③ follow the hint on the key row. That is all.",
			stepEngineTitle: "Recognition engine",
			engineAuto: "Auto (recommended)",
			engineBrowser: "Browser only (no setup)",
			engineCloud: "Cloud (more accurate, needs a key)",
			engineHintAuto: "Tries the built-in browser recognition first and falls back to cloud when it is unavailable. Pick this if you have configured nothing yet.",
			engineHintBrowser: "Runs entirely in the browser: free, no key at all. Average accuracy, and only Chrome / Edge support it.",
			engineHintCloud: "Calls an OpenAI-compatible cloud recognizer: better accuracy and languages, and it needs an API key (next step).",
			stepProviderTitle: "Provider",
			stepProviderHint: "Click to select — Base URL, model and endpoint mode fill themselves. “Custom” takes any OpenAI-compatible endpoint.",
			cloudPresetCustom: "Custom",
			addProvider: "+ Custom provider",
			removeProvider: "Remove",
			providersEmpty: "No cloud provider yet — click “+ Custom provider” to add one.",
			stepKeyTitle: "Key & self-test",
			keyChecking: "Checking local credentials…",
			keyQueryFailed: "Credential status query failed",
			keyConfigured: "Using DSH credential {ref} — nothing to fill in.",
			keyNeedsValue: "No key yet: paste {ref} below and save.",
			keyNameNeeded: "Give this provider a display name first — the credential ref is derived from it.",
			keySave: "Save key",
			keySaving: "Saving…",
			keySavedHint: "Key written to DSH credential {ref}.",
			keySaveFailed: "Failed to save the key",
			keyKeepHint: "The key is written only into DSH credentials: never into the settings document, never echoed back to this page.",
			keyKeepPlaceholder: "Leave blank to keep it",
			keyPastePlaceholder: "Paste API key",
			testConnection: "Test connection",
			testAndSave: "Save & test",
			testBusy: "Testing…",
			testOk: "Connection OK — {n} models listed.",
			testFail: "Test failed",
			save: "Save",
			savingHint: "Saving…",
			savedHint: "Saved.",
			saveNotApplied: "“{section}” did not match after the write-back — it may not have persisted. Retry or check the host log.",
			unsavedHint: "Unsaved changes.",
			discard: "Discard",
			advancedTitle: "Advanced",
			advancedHint: "Expand: Base URL / model / endpoint mode / providers / language / optimization / hotkey / usage",
			advancedCollapse: "Expanded — click to collapse",
			groupAsr: "Recognition engine",
			providerNameLabel: "Display name",
			providerNameDesc: "This provider reads its key from DSH credential {ref}. For a custom provider the ref is derived from the display name — renaming it means a different key.",
			providerListLabel: "All providers",
			providerListDesc: "Select one to make it current; removing a row only deletes that config entry, never the DSH credential.",
			cloudBaseUrlLabel: "Base URL",
			cloudBaseUrlDesc: "OpenAI-compatible root, usually ending in /v1. Presets fill it; edit here to point at a self-hosted or proxied endpoint.",
			cloudModelLabel: "Model",
			cloudModelDesc: "Recognition model name. Use “Test connection” in step ③ to see what the endpoint actually offers.",
			cloudModelPicked: "After a successful “Test connection”, the models really available on this endpoint are listed here.",
			cloudModeLabel: "Endpoint mode",
			cloudModeDesc: "Which protocol the audio goes over: Whisper-style transcriptions, or chat + input_audio. “Auto” decides by model name.",
			cloudModeAuto: "Auto (by model name)",
			cloudModeTranscriptions: "Whisper-style /audio/transcriptions",
			cloudModeChat: "Chat + input_audio (MiMo/Qwen-ASR)",
			fetchModelsPick: "Pick a model",
			fetchModelsEmpty: "The endpoint returned no usable model. Check Base URL, key and model name.",
			groupOptimize: "Prompt optimization",
			optimizeModeLabel: "Optimization mode",
			optimizeHeuristic: "Local heuristic (free, offline)",
			optimizeLlm: "LLM rewrite (uses current model by default)",
			optimizePreviewLabel: "Preview optimized text before inserting",
			optimizePreviewDesc: "Off (default): the cleaned text fills the draft immediately after recording; the background LLM rewrite replaces it when done (never overrides your edits). On: wait for the rewrite, confirm in a preview card.",
			optimizingHint: "Optimizing… draft is ready — edit or send now",
			transcribingHint: "Transcribing…",
			cancelBusy: "Cancel (discard this utterance)",
			optimizeFailedKeep: "Optimization failed; the cleaned draft was kept",
			llmDefaultHint: "Uses the current model by default; pick a configured DSH model below.",
			llmProviderLabel: "Provider",
			llmModelLabel: "Model",
			llmCurrentDefault: "Current model (default)",
			llmModelsEmpty: "No models available for this provider",
			languageLabel: "Recognition language",
			languageAuto: "Auto (follows browser/system)",
			groupBehavior: "Behavior",
			autoSendLabel: "Auto-send after recognition",
			autoSendDesc: "When on, the prompt is submitted right after recognition (push-to-talk style). When off, it fills the draft for confirmation.",
			silenceStopLabel: "Auto-stop on silence",
			silenceStopDesc: "Off (default): recording ends only when you stop it manually — everything you said goes to recognition at once. On: ends automatically once you stay quiet for the silence window below.",
			holdToTalkLabel: "Hold to talk",
			holdToTalkDesc: "When on, hold the hotkey to talk and release to stop. When off, click to start and click again to stop (silence auto-stop is controlled by its own toggle).",
			textModeLabel: "Text insertion",
			textModeDesc: "Replace: clear the draft then fill. Append: insert after existing text.",
			textModeReplace: "Replace draft (default)",
			textModeAppend: "Append to existing text",
			copyToClipboardLabel: "Auto-copy to clipboard",
			copyToClipboardDesc: "Copy the recognized/optimized result to the system clipboard automatically.",
			hotkeyLabel: "Hotkey",
			hotkeyDesc: "Click, then press a new combo (e.g. Ctrl+Shift+Space). Clear to disable.",
			hotkeyPlaceholder: "Click to record hotkey",
			hotkeyClear: "Clear",
			maxRecordMsLabel: "Max recording length",
			maxRecordMsDesc: "Milliseconds. Recording stops and is sent for recognition at the limit, so a forgotten-open mic cannot run forever.",
			silenceMsLabel: "Silence window",
			silenceMsDesc: "Milliseconds of quiet that counts as \"done talking\" (needs the auto-stop toggle above).",
			silenceRmsLabel: "Silence threshold",
			silenceRmsDesc: "Loudness ratio from 0 to 1; anything below counts as quiet. Raise it in noisy rooms, lower it if you speak softly.",
			groupRealtime: "Realtime voice chat",
			realtimeEnableLabel: "Show the voice chat button",
			realtimeEnableDesc: "Adds a second button next to the mic: live captions while you speak, a turn starts on your pause, and the reply is read back. On by default.",
			realtimeTtsLabel: "Speak replies",
			realtimeTtsDesc: "Reads the agent reply aloud with the browser built-in voice. Choose \"off\" for captions only.",
			realtimeTtsBrowser: "Browser speech (default)",
			realtimeTtsCloud: "Cloud TTS (Qwen, needs key)",
			realtimeTtsOff: "Do not speak",
			realtimeTtsVoiceLabel: "Cloud voice",
			realtimeTtsVoiceDesc: "A qwen3-tts-flash-realtime system voice name (e.g. Cherry); reuses the DASHSCOPE_API_KEY credential.",
			realtimeHotkeyLabel: "Chat hotkey",
			bargeInLabel: "Barge-in (full duplex, off by default)",
			bargeInDesc: "Keep listening while the reply is spoken: your voice (sustained past the echo gate) cuts the TTS and cancels the turn. Off by default — Chromium AEC measured 0.42 dB on virtual devices, so half-duplex stays the default until a real acoustic-loop retest; segmented engine only.",
			realtimeHotkeyDesc: "Click, then press a new combo to start, stop or interrupt the chat. Leave empty to use the button only. Independent from the recording hotkey above.",
			realtimeSettleMsLabel: "Turn settle time",
			realtimeSettleMsDesc: "Milliseconds. Once the transcript stops changing for this long, the turn is considered finished and put on screen.",
			realtimeTailMsLabel: "Turn tail delay",
			realtimeTailMsDesc: "Milliseconds. Waits a bit longer before submitting so the last word's late result still makes it in. 0 means no extra wait.",
			realtimeEngineLabel: "Realtime engine",
			realtimeEngineDesc: "Web Speech streams words as you speak and costs nothing; per-sentence mode segments on local silence and sends each sentence to your configured cloud ASR, so captions land one round trip late.",
			realtimeEngineBrowser: "Web Speech (word by word, free)",
			realtimeEngineSegmented: "Per-sentence (local segmentation + cloud ASR)",
			realtimeEngineCloud: "Cloud realtime (server-side turn detection)",
			realtimeProviderLabel: "Realtime provider",
			realtimeProviderDesc: "Which provider drives cloud realtime. \"Built-in simulation\" uses the host-side fake provider (dev mode, no quota); Alibaba Cloud Qwen connects to real qwen3-asr-flash-realtime (server-side VAD, reuses the DASHSCOPE_API_KEY credential).",
			vadRmsAutoLabel: "Auto-calibrate speech threshold",
			vadRmsAutoDesc: "Raise the effective threshold above your device noise floor automatically (your \"Speech threshold\" stays the lower bound): more responsive when quiet, no phantom sentences when noisy — no recalibration after switching devices.",
			vadFrameMsLabel: "Capture frame",
			vadFrameMsDesc: "Milliseconds per captured audio frame. Smaller is snappier, larger is cheaper to schedule.",
			vadRmsLabel: "Speech threshold",
			vadRmsDesc: "RMS from 0 to 1, tuned to your device noise floor. Too low turns keyboard clicks into sentences; too high clips quiet sentence endings.",
			vadSilenceMsLabel: "Segment silence",
			vadSilenceMsDesc: "Milliseconds of silence that end a sentence — also the fixed delay before each caption appears.",
			vadPrerollMsLabel: "Pre-roll",
			vadPrerollMsDesc: "Milliseconds kept from before speech starts. Without it the first syllable is always cut off.",
			vadMinSpeechMsLabel: "Min speech",
			vadMinSpeechMsDesc: "Milliseconds of actual voicing a segment needs to count. Coughs should not spend ASR quota.",
			vadMaxSegmentMsLabel: "Max sentence length",
			vadMaxSegmentMsDesc: "Milliseconds. An endless monologue still gets captions at this length, and it caps the upload size.",
			vadMaxPendingLabel: "Transcription queue",
			vadMaxPendingDesc: "How many sentences may wait for transcription. When ASR falls behind, the oldest is dropped.",
			realtimeMaxSessionLabel: "Max conversation length",
			realtimeMaxSessionDesc: "Milliseconds. The conversation ends on its own at the limit and the microphone is handed back, so an unattended session cannot keep listening.",
			realtimeFirstSentenceLabel: "First sentence min length",
			realtimeFirstSentenceDesc: "When speaking a reply, the first sentence waits until it has this many characters, so reading does not start on a two-word fragment.",
			realtimeWatchdogLabel: "Broadcast watchdog",
			realtimeWatchdogDesc: "Milliseconds. If the browser never reports the utterance as finished, treat it as done after this long.",
			chatTitle: "Voice chat",
			chatListeningTitle: "Listening… click to end the chat",
			chatThinkingTitle: "Thinking… click to interrupt",
			chatSpeakingTitle: "Speaking… click to interrupt",
			chatThinkingHint: "Waiting for the reply…",
			chatSpeakingHint: "Reading the reply…",
			chatInterrupt: "Interrupt",
			chatEndedLimit: "Reached the max conversation length — the chat ended by itself",
			chatNoReply: "That line did not start a turn, still listening",
			chatNoTts: "This browser cannot speak replies — captions only",
			chatGap: "Transcription fell behind — the oldest sentence was dropped, captions may be incomplete",
			errSegmentedNeedsCloud: "Per-sentence mode needs a configured cloud ASR provider (Settings → Voice → Cloud providers)",
			errSegmentedUnsupported: "This browser cannot capture live audio (AudioWorklet is required) — switch back to the Web Speech engine",
			errSegmentedUnreachable: "Transcription failed repeatedly, this conversation ended",
			dismiss: "Dismiss",
			loadFailed: "Load failed",
			micTitle: "Voice input",
			recordingTitle: "Recording… click to stop",
			transcribingTitle: "Transcribing… click to cancel",
			optimizingTitle: "Optimizing… click to cancel",
			errNoMic: "No microphone detected",
			errNoSound: "No sound detected: the recording was silent and was not sent. Check the mic permission, system input volume, and pick the built-in microphone as the input device in the browser site settings / permission prompt (virtual audio devices are often selected by mistake and record silence)",
			errNoSpeechSupport: "Web Speech is not supported by this browser; switch to cloud ASR (Chrome/Edge support it).",
			errWebSpeechNetwork: "Browser speech recognition network is unavailable (the service may be blocked); switch to cloud ASR.",
			errCloudNotConfigured: "Cloud ASR is not configured: pick a provider and set the Base URL in settings; the key lives in DSH credentials.",
			noSpeechDetected: "No speech detected",
			fallbackToCloud: "Browser speech unavailable; switched to cloud ASR",
			errTranscribe: "Transcription failed",
			errOptimize: "Optimization failed",
			previewTitle: "Prompt optimization preview",
			previewOriginal: "Raw transcript",
			previewOptimized: "Optimized",
			previewConfirm: "Fill & send",
			previewCancel: "Cancel",
			groupStats: "Usage stats",
			statsTitle: "ASR usage",
			statsCount: "{n} transcriptions",
			statsChars: "{n} chars total",
			statsLastAt: "last at {time}",
			statsEmpty: "No usage data yet"
		};
		//#endregion
		//#region src/client/styles.ts
		/**
		* dsh-asr-voice — client 样式。
		*
		* 全部用 DSH 主题 CSS 变量（--dsw-*），随明暗主题自适应；data 标签
		* `dsh-asr-voice` 唯一，避免与其它插件样式冲突（独立性契约）。
		* GSAP 驱动的波纹/过渡由 animate.ts 写内联 transform/opacity，本表只提供
		* 基础布局、主题变量与降级关键帧。
		*/
		const CSS = `
/* 主题变量挂 :root（页面没有 [dsh-asr-voice] 属性的容器元素——那是 <style> 标签的
   data 属性，不作用于渲染树；挂错选择器会让 --dshav-* 全部未定义 → 背景透明）。
   --dshav-* 前缀唯一，挂全局不影响其它插件（独立性契约）。 */
:root {
  --dshav-accent: var(--dsw-alias-state-business-primary, #4f8cff);
  --dshav-accent-soft: color-mix(in srgb, var(--dshav-accent) 18%, transparent);
  --dshav-danger: var(--dsw-alias-state-error-primary, #e5484d);
  --dshav-bg: var(--dsw-alias-bg-base, #ffffff);
  --dshav-bg-layer: var(--dsw-alias-bg-layer-1, #f7f7f8);
  --dshav-border: var(--dsw-alias-border-l1, #e6e6e9);
  --dshav-text: var(--dsw-alias-label-primary, #1f1f23);
  --dshav-text-2: var(--dsw-alias-label-secondary, #5c5c66);
  --dshav-text-3: var(--dsw-alias-label-caption, #8b8b95);
  /* Motion tokens（microanimations 规范：进入缓、退出快，非对称） */
  --dshav-ease-enter: cubic-bezier(.2, 0, 0, 1);
  --dshav-ease-exit: cubic-bezier(.3, 0, .8, .15);
  --dshav-ease-bounce: cubic-bezier(.34, 1.56, .64, 1);
  --dshav-dur-enter: 250ms;
  --dshav-dur-exit: 180ms;
}

/* ── 录音按钮（conversation.input.right） ─────────────────────────── */
.dshav-mic-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dshav-mic-button {
  position: relative;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--dshav-text-2);
  cursor: pointer;
  padding: 0;
  transition: color .18s ease, background .18s ease, transform .14s var(--dshav-ease-bounce, cubic-bezier(.34,1.56,.64,1));
}
.dshav-mic-button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05));
  color: var(--dshav-text);
}
.dshav-mic-button:hover svg { transform: scale(1.1); }
.dshav-mic-button:active { transform: scale(.9); }
.dshav-mic-button svg {
  width: 15px;
  height: 15px;
  display: block;
  transition: transform .2s ease;
}
.dshav-mic-button[data-state='recording'] {
  color: var(--dshav-danger);
  background: color-mix(in srgb, var(--dshav-danger) 12%, transparent);
}
.dshav-mic-button[data-state='recording'] .dshav-rec-dot {
  animation: dshav-blink 1.1s ease-in-out infinite;
}
.dshav-mic-button[data-state='transcribing'],
.dshav-mic-button[data-state='optimizing'] {
  color: var(--dshav-accent);
}
.dshav-mic-button:disabled {
  opacity: .45;
  cursor: default;
}

/* ── 语音对话按钮（复用上面的按钮壳，只有状态色不同） ─────────────── */
.dshav-chat-button[data-state='listening'] {
  color: var(--dshav-danger);
  background: color-mix(in srgb, var(--dshav-danger) 12%, transparent);
}
.dshav-chat-button[data-state='listening'] .dshav-rec-dot {
  animation: dshav-blink 1.1s ease-in-out infinite;
}
.dshav-chat-button[data-state='thinking'] {
  color: var(--dshav-accent);
}
.dshav-chat-button[data-state='speaking'] {
  color: var(--dshav-accent);
  background: var(--dshav-accent-soft);
}
/* 字幕行：这里上屏的文字就是主角，给它比状态提示更宽的可视区（截断在 JS 做）。 */
.dshav-hotkey-hint[data-kind='caption'] {
  max-width: min(520px, calc(100vw - 120px));
}
.dshav-hotkey-hint[data-kind='caption'][data-state='speaking'] .dshav-hint-text {
  color: var(--dshav-accent);
}

/* 录音实心点（呼吸）。 */
.dshav-rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  display: block;
}

/* 录音波纹：多层呼吸光环，GSAP 驱动 scale/opacity（此处放降级静态环）。 */
.dshav-wave {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  pointer-events: none;
}
.dshav-wave-ring {
  position: absolute;
  inset: -2px;
  border-radius: 11px;
  border: 2px solid var(--dshav-danger);
  opacity: 0;
  box-shadow: 0 0 12px 0 color-mix(in srgb, var(--dshav-danger) 45%, transparent);
  /* 录音中持续缩放动画：提升为合成层，避免每帧重绘（transform 走 GPU）。 */
  will-change: transform, opacity;
}
.dshav-wave-ring[data-ring='1'] { inset: -2px; }
.dshav-wave-ring[data-ring='2'] { inset: -6px; }
.dshav-wave-ring[data-ring='3'] { inset: -10px; }

/* 状态提示条：从按钮右侧滑入 + 呼吸点 + 频谱条。 */
.dshav-hotkey-hint {
  position: absolute;
  right: 34px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  max-width: min(420px, calc(100vw - 120px));
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, var(--dshav-border));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-3, var(--dshav-bg-layer));
  color: var(--dsw-alias-label-secondary, var(--dshav-text-2));
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: var(--dsw-shadow-lv3, 0 4px 16px rgba(0,0,0,.12));
  animation: dshav-hint-in .22s var(--dshav-ease-exit, cubic-bezier(.3,0,.8,.15));
}
.dshav-hotkey-hint[data-kind='err'] {
  color: var(--dshav-danger);
  /* 错误信息允许换行：诊断详情（设备/浏览器）不能被 nowrap 截断 */
  white-space: normal;
  line-height: 1.35;
  max-width: min(480px, calc(100vw - 120px));
}
/* err/notice 的文本包进 span 后必须可换行：
   1) flex 子项默认按 min-content 收缩——中文每字可断行 → 每个字单独一行（纵向溢出）；
      必须 min-width: 0 + flex: 1 让文本占满剩余宽度再折行。
   2) 长 token（设备名/URL）不炸行：overflow-wrap: anywhere。 */
.dshav-hotkey-hint[data-kind='err'] .dshav-hint-text,
.dshav-hotkey-hint[data-kind='notice'] .dshav-hint-text {
  flex: 1 1 auto;
  min-width: 0;
  max-width: none;
  white-space: normal;
  line-height: 1.35;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;
}
.dshav-hotkey-hint[data-kind='err'] .dshav-hint-dismiss { align-self: flex-start; }
.dshav-hint-dismiss {
  flex: none;
  margin-left: 2px;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1;
  opacity: .55;
  cursor: pointer;
  border-radius: 4px;
}
.dshav-hint-dismiss:hover { opacity: 1; background: var(--dsw-alias-fill-2, rgba(128,128,128,.18)); }
.dshav-hotkey-hint .dshav-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dshav-danger);
  animation: dshav-blink 1.1s ease-in-out infinite;
}
.dshav-hint-text {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 频谱条：CSS 变量 --level（0~1）驱动柱高；每柱 --bar 系数错落。 */
.dshav-spectrum {
  --level: .2;
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  padding: 1px 0;
}
.dshav-bar {
  width: 3px;
  border-radius: 2px;
  background: var(--dshav-danger);
  height: calc(var(--level) * 16px * var(--bar));
  opacity: .85;
  transition: height 60ms linear;
}

/* 转圈（transcribing / optimizing）。 */
.dshav-spinner {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--dshav-accent) 25%, transparent);
  border-top-color: var(--dshav-accent);
  animation: dshav-spin .7s linear infinite;
}

/* ── 预览卡（LLM 优化：原始 → 优化） ──────────────────────────────── */
.dshav-preview {
  position: fixed;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  z-index: 1200;
  width: min(460px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 12px 12px 10px;
  border: 1px solid var(--dshav-border);
  border-radius: 14px;
  background: var(--dshav-bg);
  box-shadow: var(--dsw-shadow-lv3, 0 10px 32px rgba(0,0,0,.18));
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: dshav-preview-in .22s var(--dshav-ease-enter, ease-out);
}
.dshav-preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dshav-text);
}
/* 标题麦克风固定小尺寸（SVG 无 width/height 默认渲染 300px，必须显式约束） */
.dshav-preview-title svg {
  width: 15px;
  height: 15px;
  color: var(--dshav-accent);
  display: block;
}
.dshav-preview-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dshav-preview-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--dshav-bg-layer);
  border: 1px solid var(--dshav-border);
}
/* 优化后区块轻微强调，突出「要用的结果」 */
.dshav-preview-block[data-role='optimized'] {
  background: color-mix(in srgb, var(--dshav-accent) 6%, var(--dshav-bg-layer));
  border-color: color-mix(in srgb, var(--dshav-accent) 22%, var(--dshav-border));
}
.dshav-preview-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--dshav-text-3);
  letter-spacing: .03em;
}
.dshav-preview-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dshav-text);
  max-height: 96px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
/* 原始：次级色即可，不用删除线（划线=删除感，反而看不清） */
.dshav-preview-text[data-role='original'] { color: var(--dshav-text-2); }
/* 优化后：主色加粗突出 */
.dshav-preview-text[data-role='optimized'] { color: var(--dshav-text); font-weight: 500; }
.dshav-preview-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.dshav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  height: 36px;
  padding: 0 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  transition: background .15s ease, color .15s ease;
}
.dshav-button:disabled { cursor: not-allowed; opacity: .4; }
.dshav-button-sm {
  height: 28px;
  font-size: 12px;
  line-height: 18px;
  padding: 0 10px;
  border-radius: 14px;
}
.dshav-button-primary {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}
.dshav-button-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.dshav-button-outline {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
}
.dshav-button-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshav-button-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshav-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}

/* ── 设置卡片（对齐官方 PluginCard：折叠 + hover/cardOpen/focus） ── */
.dshav-card {
  box-sizing: border-box;
  list-style: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  transition: border-color .16s, background .16s;
}
.dshav-card:hover { border-color: var(--dsw-alias-label-dimmed); }
.dshav-card.dshav-card-open {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.dshav-header {
  width: 100%;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
}
.dshav-header:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
.dshav-headtext {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dshav-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.dshav-desc { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dshav-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  transition: transform .16s;
}
.dshav-chevron.dshav-open { transform: rotate(180deg); }
.dshav-body {
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 0 16px;
  padding-bottom: 8px;
}
.dshav-group { display: flex; flex-direction: column; }
/* 分组之间用与字段一致的分割线（官方 border-l2）。 */
.dshav-group + .dshav-group { border-top: 1px solid var(--dsw-alias-border-l2); }
.dshav-groupTitle {
  margin: 14px 0 2px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
/* 字段：垂直布局（label / control / hint），字段间 border-top —— 对齐官方 fields */
.dshav-field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
}
.dshav-field-item + .dshav-field-item { border-top: 1px solid var(--dsw-alias-border-l2); }
.dshav-field-head { display: flex; align-items: center; gap: 8px; }
.dshav-field-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}
.dshav-field-control { display: flex; width: 100%; min-width: 0; }
.dshav-field-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dshav-stack { display: flex; flex-direction: column; }
.dshav-field { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
/* checkbox 行：checkbox 与文本同行左对齐（官方 ModelListEditor 排布） */
.dshav-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dshav-toggle input[type='checkbox'],
.dshav-toggle input[type='radio'] {
  flex: none;
  width: 16px;
  height: 16px;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
/* 条件禁用（如 barge-in 仅 segmented 引擎可用）：整行降透明度并去掉指针 */
.dshav-field-disabled {
  opacity: 0.55;
  pointer-events: none;
}
/* ── 原生控件：跟随 DSH 主题（--dsw-alias-*），与官方设置页一致 ── */
.dshav-field select,
.dshav-field input[type='text'],
.dshav-field input[type='password'] {
  box-sizing: border-box;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}
.dshav-field select:focus-visible,
.dshav-field input:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}
.dshav-field input::placeholder { color: var(--dsw-alias-label-dimmed); }
.dshav-field input:disabled,
.dshav-field select:disabled { opacity: .6; cursor: default; }
/* select：原生外观 + 主题 chevron（与官方 selectInput 一致） */
.dshav-field select {
  appearance: none;
  max-width: 240px;
  min-width: 180px;
  padding-right: 32px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px 12px;
}
.dshav-field input[type='text'],
.dshav-field input[type='password'] { flex: 1; min-width: 0; width: auto; }
.dshav-status { font-size: 12px; color: var(--dshav-text-2); min-height: 16px; }
.dshav-status[data-kind='err'] { color: var(--dshav-danger); }
.dshav-status[data-kind='ok'] { color: var(--dshav-accent); }

/* ── 三步向导 ─────────────────────────────────────────────────────── */
.dshav-step {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 0 16px;
}
.dshav-step-head { display: flex; align-items: center; gap: 8px; }
.dshav-step-index {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--dshav-accent) 14%, transparent);
  color: var(--dshav-accent);
  font-size: 12px;
  line-height: 1;
}
.dshav-step-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
/* chip 单选行：换行排布，选中态用主色描边 + 浅底（不靠颜色单独表意） */
.dshav-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.dshav-chip {
  box-sizing: border-box;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 15px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease, color .15s ease;
}
.dshav-chip:hover:not(:disabled) { border-color: var(--dsw-alias-label-dimmed); color: var(--dsw-alias-label-primary); }
.dshav-chip[data-selected='true'] {
  border-color: var(--dshav-accent);
  background: color-mix(in srgb, var(--dshav-accent) 10%, transparent);
  color: var(--dshav-accent);
  font-weight: 600;
}
.dshav-chip:disabled { opacity: .5; cursor: default; }
.dshav-chip:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
/* 密钥已就绪的一行（绿色 ✓ 文案，非输入态） */
.dshav-ok-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dshav-accent);
}
/* 保存条：状态文案在左，按钮在右，常驻避免用户以为没生效 */
.dshav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}
.dshav-actions > p { flex: 1; min-width: 0; }
/* 高级折叠：整行可点，展开后列出全部既有字段 */
.dshav-advanced-toggle {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0 10px;
  border: none;
  background: none;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
  text-align: left;
  cursor: pointer;
}
.dshav-advanced-toggle:hover { color: var(--dsw-alias-label-primary); }
.dshav-advanced-toggle:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
  border-radius: 6px;
}
.dshav-provider-list { display: flex; flex-direction: column; gap: 8px; }
.dshav-provider-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.dshav-provider-row > label { flex: 1; min-width: 0; }

@keyframes dshav-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .25; }
}
@keyframes dshav-hint-in {
  from { opacity: 0; transform: translate(8px, -50%); }
  to { opacity: 1; transform: translate(0, -50%); }
}
@keyframes dshav-spin {
  to { transform: rotate(360deg); }
}
@keyframes dshav-preview-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .dshav-mic-button,
  .dshav-mic-button svg,
  .dshav-mic-button .dshav-rec-dot,
  .dshav-hotkey-hint .dshav-dot,
  .dshav-spinner { animation: none !important; transition: none !important; }
  .dshav-hotkey-hint { animation: none !important; }
}
`;
		//#endregion
		//#region src/presets.ts
		/** 内置预置：OpenAI / Groq（国际）+ 硅基流动 / 小米 MiMo / 通义 Qwen-ASR（国产）。 */
		const CLOUD_PRESETS = [
			{
				id: "openai",
				label: "OpenAI Whisper",
				baseUrl: "https://api.openai.com/v1",
				defaultModel: "whisper-1",
				mode: "transcriptions",
				hint: "OpenAI 官方 /audio/transcriptions"
			},
			{
				id: "groq",
				label: "Groq Whisper",
				baseUrl: "https://api.groq.com/openai/v1",
				defaultModel: "whisper-large-v3",
				mode: "transcriptions",
				hint: "Groq 高速推理，whisper-large-v3"
			},
			{
				id: "siliconflow",
				label: "硅基流动 SiliconFlow",
				baseUrl: "https://api.siliconflow.cn/v1",
				defaultModel: "FunAudioLLM/SenseVoiceSmall",
				mode: "transcriptions",
				hint: "国产，SenseVoice 系语音识别"
			},
			{
				id: "mimo",
				label: "小米 MiMo",
				baseUrl: "https://api.xiaomimimo.com/v1",
				defaultModel: "mimo-v2.5-asr",
				mode: "chat",
				hint: "小米 MiMo-V2.5-ASR（OpenAI 兼容 chat input_audio；key 复用 DSH 凭据 MIMO_API_KEY）"
			},
			{
				id: "dashscope",
				label: "通义/阿里云百炼 Qwen-ASR",
				baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
				defaultModel: "qwen3-asr-flash",
				mode: "chat",
				hint: "国产，Qwen-ASR（compatible-mode OpenAI 兼容 chat input_audio）"
			}
		];
		/** 按 id 取预置（找不到返回 undefined）。 */
		function presetById(id) {
			return CLOUD_PRESETS.find((p) => p.id === id);
		}
		/** 内置实时预置：阿里云百炼 Qwen-ASR Realtime（服务端 VAD 断句）。 */
		const REALTIME_PRESETS = [{
			id: "builtin",
			label: "内置模拟（开发）",
			wssUrl: "",
			defaultModel: "",
			keyPreset: "openai",
			hint: "I3/I4 开发态：host 用能量 VAD 假 provider 驱动整条管道，不花配额"
		}, {
			id: "dashscope-realtime",
			label: "阿里云百炼 Qwen-ASR Realtime",
			wssUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
			defaultModel: "qwen3-asr-flash-realtime",
			keyPreset: "dashscope",
			hint: "服务端 VAD 判回合；key 复用 DSH 凭据 DASHSCOPE_API_KEY（约 ¥1.19/音频小时）"
		}];
		/** 预置默认 id。 */
		const DEFAULT_PRESET_ID = "openai";
		//#endregion
		//#region src/key-ref.ts
		/**
		* dsh-asr-voice — API key 的凭据引用名（host / client 共用的唯一真相）。
		*
		* key 既不存 settings 也不进浏览器：统一落在 DSH credentials 服务里，按引用名读取。
		* 预置供应商刻意沿用官方 LLM provider 的命名（`<PROVIDER>_API_KEY`，派生方式见
		* packages/client/ui-settings-models/src/client/store.ts 的 deriveKeyRef），因此用户
		* 在 DSH 里配过 OpenAI / Groq / MiMo / 百炼的 LLM，ASR 直接复用同一把 key，一次都不用填。
		* 自定义供应商带一个可读 name，派生成 `ASR_VOICE_<NAME>_API_KEY`，不与其它插件撞名。
		*
		* 引用名受网关校验：必须是 POSIX 环境变量形状 `^[A-Za-z_][A-Za-z0-9_]*$`
		* （packages/host/apiproxy/src/api/credentials.schema.ts），故非字母数字一律折叠成 `_`。
		*/
		/** 可复用官方 LLM 凭据的预置 id 集合（其余一律按自定义处理）。 */
		const PRESET_IDS = new Set(CLOUD_PRESETS.map((p) => p.id));
		/** 任意标签 → 合法引用名片段（无可用字符时返回空串，由调用方决定退路）。 */
		function slug(raw) {
			return raw.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
		}
		/**
		* 求某供应商的 API key 引用名。
		* @param p - 供应商身份（预置 id、显示名、行 id）。
		* @returns credentials 服务里的引用名。
		*/
		function keyRefFor(p) {
			if (PRESET_IDS.has(p.preset)) return `${slug(p.preset)}_API_KEY`;
			const fromName = slug(p.name);
			const label = fromName !== "" ? fromName : slug(p.id);
			return `ASR_VOICE_${label === "" ? "CUSTOM" : label}_API_KEY`;
		}
		/** 运行时配置快照：初始为默认值，scope 订阅与写回共同维护。 */
		const config = structuredClone({
			asr: {
				provider: "auto",
				cloud: {
					providers: [],
					active: "",
					preset: "openai",
					baseUrl: "",
					model: "",
					mode: "auto"
				}
			},
			optimize: {
				mode: "llm",
				preview: false,
				llm: {
					provider: "",
					model: ""
				}
			},
			language: "auto",
			behavior: {
				autoSend: false,
				silenceStop: false,
				holdToTalk: false,
				hotkey: "Ctrl+Shift+Space",
				textMode: "replace",
				copyToClipboard: true,
				maxRecordMs: 12e4,
				silenceRms: .02,
				silenceMs: 2500
			},
			realtime: {
				enabled: true,
				engine: "browser",
				provider: "builtin",
				tts: "browser",
				ttsVoice: "Cherry",
				hotkey: "",
				bargeIn: false,
				turn: {
					settleMs: 900,
					tailMs: 300
				},
				vad: {
					frameMs: 40,
					rms: .02,
					rmsAuto: true,
					silenceMs: 700,
					prerollMs: 200,
					minSpeechMs: 250,
					maxSegmentMs: 8e3,
					maxPending: 3
				},
				maxSessionMs: 6e5,
				speech: {
					firstSentenceMinChars: 12,
					utteranceWatchdogMs: 6e4
				}
			}
		});
		/** 配置变更订阅（模块级，供组件 useSyncExternalStore / 事件驱动重渲染）。 */
		const listeners = /* @__PURE__ */ new Set();
		/** 订阅配置变更，返回退订函数。 */
		function subscribeConfig(fn) {
			listeners.add(fn);
			return () => {
				listeners.delete(fn);
			};
		}
		/** settings namespace（host schema 注册与 client 绑定共用同一个名字）。 */
		const ASR_VOICE_NS = "asr-voice";
		/** 把旧版凭据通道适配成新版形状（alpha.3 前的老运行时仍暴露旧面时兜底）。 */
		function adaptLegacyCredentials(legacy) {
			if (legacy === void 0) return void 0;
			const writeOutcome = (r) => r.ok ? { ok: true } : r.error === void 0 ? { ok: false } : {
				ok: false,
				error: r.error
			};
			return {
				describe: async (refs) => {
					const response = await legacy.describe({ refs });
					if (!response.result.ok) return response.result.error === void 0 ? { ok: false } : {
						ok: false,
						error: response.result.error
					};
					return {
						ok: true,
						value: response.result.value.credentials ?? {}
					};
				},
				set: async (ref, value) => writeOutcome((await legacy.set({
					ref,
					value
				})).result),
				unset: async (ref) => writeOutcome((await legacy.unset({ ref })).result)
			};
		}
		/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
		let voiceScope;
		let credentialsApi;
		/** 广播配置变更（设置卡片/录音按钮监听，驱动重渲染）。 */
		function announce() {
			const detail = structuredClone(config);
			window.dispatchEvent(new CustomEvent("dsh-asr-voice:config", { detail }));
			for (const fn of listeners) fn();
		}
		/** 是否普通数据对象（数组与 null 都不算）。 */
		function isPlainObject(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function str(value) {
			return typeof value === "string" ? value : "";
		}
		/** 数值字段：非有限数（NaN/Infinity/字符串/缺省）一律退回本地值。 */
		function num(value, fallback) {
			return typeof value === "number" && Number.isFinite(value) ? value : fallback;
		}
		/** 逐字段重建供应商行：只取本客户端认识的字段（宿主多出来的键一律不带走）。 */
		function normalizeProvider(row) {
			const src = isPlainObject(row) ? row : {};
			return {
				id: str(src.id),
				preset: str(src.preset) === "" ? "openai" : str(src.preset),
				name: str(src.name),
				baseUrl: str(src.baseUrl),
				model: str(src.model),
				mode: str(src.mode) === "" ? "auto" : str(src.mode)
			};
		}
		/**
		* 把 host 快照并回本地 config（只覆盖认识的键）。
		*
		* 每个进来的对象/数组都先落成自己的拷贝：宿主值是深度冻结的，漏一个引用进来就是
		* 一处「改了不生效」的静默故障（见文件头铁律 1）。
		*/
		function mergeHostValue(value) {
			if (!isPlainObject(value)) return;
			const assign = (target, src) => {
				for (const key of Object.keys(target)) {
					const next = src[key];
					const current = target[key];
					if (isPlainObject(current)) {
						if (isPlainObject(next)) assign(current, next);
						continue;
					}
					if (Array.isArray(current)) {
						if (Array.isArray(next)) target[key] = key === "providers" ? next.map(normalizeProvider) : structuredClone(next);
						continue;
					}
					if (typeof current === "number") {
						target[key] = num(next, current);
						continue;
					}
					if (typeof next === typeof current) target[key] = next;
				}
			};
			assign(config, value);
		}
		/** 结构等价（忽略键序）：写回校验用它，避免 {a,b} 与 {b,a} 被误判成没落盘。 */
		function jsonEqual(a, b) {
			if (a === b) return true;
			if (Array.isArray(a) || Array.isArray(b)) {
				if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
				return a.every((item, index) => jsonEqual(item, b[index]));
			}
			if (isPlainObject(a) && isPlainObject(b)) {
				for (const key of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) if (!jsonEqual(a[key], b[key])) return false;
				return true;
			}
			return false;
		}
		/**
		* 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写本地快照并广播。
		* @param binder - settingsScope 服务的 binder（SettingsScopeBinder）。
		* @returns 订阅 disposer（随 fiber 清理）。
		*/
		/**
		* 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写本地快照并广播。
		* @param binder - settingsScope 服务（官方 SettingsScopeBinder，随 fiber 注入）。
		* @returns 订阅 disposer（随 fiber 清理）。
		*/
		function bindConfigScope(binder) {
			const scope = binder.bind({ namespace: ASR_VOICE_NS });
			voiceScope = scope;
			const applySnapshot = () => {
				const value = scope.getSnapshot().value;
				if (value !== void 0) {
					mergeHostValue(value);
					announce();
				}
			};
			const unsub = scope.subscribe(applySnapshot);
			applySnapshot();
			return unsub;
		}
		/**
		* 绑定 credentials 域（可选：拿不到时设置页只显示「本机未启用凭据服务」）。
		* 统一收新形状（alpha.3 `remote.credentials`）；旧形状由调用方经
		* {@link adaptLegacyCredentials} 显式转换后再绑。
		*/
		function bindCredentialsApi(api) {
			credentialsApi = api;
		}
		/** 设置页是否具备写回宿主的能力。 */
		function settingsWritable() {
			return voiceScope?.getSnapshot().writable ?? false;
		}
		/** 复制一份当前配置作为可编辑草稿（与宿主快照完全脱开，随便改都不碰冻结）。 */
		function newDraft() {
			return structuredClone(config);
		}
		/** 浅并一层对象段，返回新草稿。 */
		function withSection(draft, key, patch) {
			return {
				...draft,
				[key]: {
					...draft[key],
					...patch
				}
			};
		}
		/** 取当前配置的录音参数快照（配置 → recorder 的唯一搬运处）。 */
		function recordBehavior(source = config) {
			const { maxRecordMs, silenceStop, silenceRms, silenceMs } = source.behavior;
			return {
				maxRecordMs,
				silenceStop,
				silenceRms,
				silenceMs
			};
		}
		/** 取当前配置的实时对话快照（配置 → 会话/引擎/播报的唯一搬运处）。 */
		function realtimeTuning(source = config) {
			const { enabled, engine, tts, ttsVoice, hotkey, bargeIn, turn, vad, maxSessionMs, speech } = source.realtime;
			return {
				enabled,
				engine,
				tts,
				ttsVoice,
				hotkey,
				bargeIn,
				maxSessionMs,
				language: source.language,
				settleMs: turn.settleMs,
				tailMs: turn.tailMs,
				firstSentenceMinChars: speech.firstSentenceMinChars,
				utteranceWatchdogMs: speech.utteranceWatchdogMs,
				segmented: {
					settleMs: turn.settleMs,
					tailMs: turn.tailMs,
					frameMs: vad.frameMs,
					maxPending: vad.maxPending,
					vad: {
						rms: vad.rms,
						rmsAuto: vad.rmsAuto ?? true,
						silenceMs: vad.silenceMs,
						prerollMs: vad.prerollMs,
						minSpeechMs: vad.minSpeechMs,
						maxSegmentMs: vad.maxSegmentMs
					}
				}
			};
		}
		/** 改识别语言（顶层标量段）。 */
		function withLanguage(draft, language) {
			return {
				...draft,
				language
			};
		}
		/** 写整个 providers 列表（保持 active 指向还在的行）。 */
		function withProviders(draft, providers, active) {
			const nextActive = active ?? (providers.some((p) => p.id === draft.asr.cloud.active) ? draft.asr.cloud.active : providers[0]?.id ?? "");
			return withSection(draft, "asr", { cloud: {
				...draft.asr.cloud,
				providers,
				active: nextActive
			} });
		}
		/** 按 id 打补丁到某一供应商行（重建行对象，永不原地改）。 */
		function patchProvider(draft, id, patch) {
			const rows = draft.asr.cloud.providers;
			const index = rows.findIndex((p) => p.id === id);
			if (index === -1) {
				const synthesized = draftActiveProvider(draft);
				if (synthesized.id !== id) return draft;
				return withProviders(draft, [...rows, {
					...synthesized,
					...patch
				}], id);
			}
			return withProviders(draft, rows.map((p, i) => i === index ? {
				...p,
				...patch
			} : p));
		}
		/** 选预置：连带把 baseUrl / model / mode 刷成该预置的推荐值。 */
		function pickPreset(draft, id, presetId) {
			const preset = presetById(presetId);
			if (!preset) return patchProvider(draft, id, { preset: presetId });
			return patchProvider(draft, id, {
				preset: presetId,
				baseUrl: preset.baseUrl,
				model: preset.defaultModel,
				mode: preset.mode
			});
		}
		/**
		* 新增一行供应商，返回新草稿与新行 id。
		* presetId 命中内置预置时按预置填充；未命中（'custom'）建一行空白自定义端点。
		*/
		function addProvider(draft, presetId = DEFAULT_PRESET_ID, name = "") {
			const preset = presetById(presetId);
			const id = newProviderId();
			const row = preset ? {
				id,
				preset: preset.id,
				name: preset.label,
				baseUrl: preset.baseUrl,
				model: preset.defaultModel,
				mode: preset.mode
			} : {
				id,
				preset: "custom",
				name,
				baseUrl: "",
				model: "",
				mode: "auto"
			};
			return {
				draft: withProviders(draft, [...draft.asr.cloud.providers, row], id),
				id
			};
		}
		/** 删除一行供应商。 */
		function removeProvider(draft, id) {
			return withProviders(draft, draft.asr.cloud.providers.filter((p) => p.id !== id));
		}
		/** 草稿里当前生效的供应商（无行时按旧单配置合成一行 legacy，id 固定以便凭据引用稳定）。 */
		function draftActiveProvider(draft) {
			const cloud = draft.asr.cloud;
			return cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0] ?? {
				id: "legacy",
				preset: cloud.preset,
				name: "",
				baseUrl: cloud.baseUrl,
				model: cloud.model,
				mode: cloud.mode
			};
		}
		/**
		* 把 v0.1 旧单配置在**草稿里**落成一行 providers（id 固定 'legacy'，凭据引用名随之
		* 稳定）。宿主端本来就优先读 providers，所以这一步只影响编辑中的这份副本，不自动写回。
		*/
		function withLegacyMaterialized(draft) {
			const cloud = draft.asr.cloud;
			if (cloud.providers.length > 0 || cloud.baseUrl.trim() === "") return draft;
			return withProviders(draft, [{
				id: "legacy",
				preset: cloud.preset,
				name: "",
				baseUrl: cloud.baseUrl,
				model: cloud.model,
				mode: cloud.mode
			}], "legacy");
		}
		/** 某供应商的 API key 凭据引用名。 */
		function keyRefOf(p) {
			return keyRefFor(p);
		}
		/**
		* 保存草稿：只把真正改过的顶层段写回 host，然后**读回校验**。
		*
		* `SettingsScope.set` 会把失败吞掉并重载宿主状态（promise 成功不代表落盘），所以
		* 判定标准只能是写完之后宿主那边到底剩什么——这也正是官方设置卡的做法。
		* @returns 未落盘的段名，undefined 表示全部落定。
		*/
		async function writeDraft(draft) {
			const scope = voiceScope;
			const host = scope?.getSnapshot().value;
			const changed = [
				"asr",
				"optimize",
				"language",
				"behavior"
			].filter((key) => !jsonEqual(host?.[key] ?? config[key], draft[key]));
			if (scope === void 0) {
				mergeHostValue(draft);
				announce();
				return;
			}
			for (const key of changed) await scope.set(key, draft[key]);
			mergeHostValue(draft);
			announce();
			const resolved = scope.getSnapshot().value;
			return resolved === void 0 ? void 0 : changed.find((key) => !jsonEqual(resolved[key], draft[key]));
		}
		/**
		* 解析一次凭据 describe 的「失败原因」（{ok,value} 形状直接返回 error）。
		*/
		function describeFailure(response) {
			if (response.ok) return null;
			return response.error?.message ?? "credential request rejected";
		}
		/** 查某供应商的密钥是否已配置。 */
		async function readKeyState(p) {
			const ref = keyRefFor(p);
			if (credentialsApi === void 0) return {
				ref,
				configured: false,
				writable: false,
				source: "",
				failure: "credentials service unavailable"
			};
			try {
				const response = await credentialsApi.describe([ref]);
				const failure = describeFailure(response);
				if (failure !== null) return {
					ref,
					configured: false,
					writable: true,
					source: "",
					failure
				};
				const view = response.ok ? response.value[ref] : void 0;
				return {
					ref,
					configured: view?.configured ?? false,
					writable: view?.writable ?? true,
					source: view?.source ?? "",
					failure: null
				};
			} catch (error) {
				return {
					ref,
					configured: false,
					writable: true,
					source: "",
					failure: error instanceof Error ? error.message : String(error)
				};
			}
		}
		/**
		* 写入或清除某供应商的密钥。
		* @param p - 供应商身份（决定引用名）。
		* @param value - 新密钥；空串表示清除。
		* @returns 原始失败原因，undefined 表示成功。
		*/
		async function saveKey(p, value) {
			const ref = keyRefFor(p);
			if (credentialsApi === void 0) return "credentials service unavailable";
			const key = value.trim();
			try {
				const response = key === "" ? await credentialsApi.unset(ref) : await credentialsApi.set(ref, key);
				if (!response.ok) return response.error?.message ?? "credential request rejected";
				const state = await readKeyState(p);
				if (key !== "" && !state.configured) return state.failure ?? `credential ${ref} did not persist`;
				return;
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		}
		/** 当前生效供应商是否已配到可调用云端 ASR 的程度（密钥不再在本地快照里，由服务端判定）。 */
		function cloudConfigured() {
			return activeCloudProvider().baseUrl.trim() !== "";
		}
		/** 运行时快照里当前生效的云端供应商（录音链路只关心「配好了没」）。 */
		function activeCloudProvider() {
			const cloud = config.asr.cloud;
			return cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0] ?? {
				id: "legacy",
				preset: cloud.preset,
				name: "",
				baseUrl: cloud.baseUrl,
				model: cloud.model,
				mode: cloud.mode
			};
		}
		/** 生成供应商唯一 id。 */
		function newProviderId() {
			const c = globalThis.crypto;
			if (c?.randomUUID) return c.randomUUID();
			return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		}
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* dsh-asr-voice — client 设置卡片（settings.plugin.item, key: 'asr-voice'）。
		*
		* 三步向导（① 识别方式 → ② 服务商 → ③ 密钥与自检）+ 默认折叠的「高级」。
		* 卡片只编辑一份本地草稿，按「保存」才过线（写回后读回校验，不信 promise）；
		* API key 单独走 credentials 域，既不进草稿也不进浏览器 DOM。
		*/
		/** 模块级模型目录缓存（同会话 60s 内复用，避免重复拉取 /api/asr-voice/models）。 */
		let modelsCache = null;
		let modelsCacheAt = 0;
		const MODELS_CACHE_TTL_MS = 6e4;
		/** 订阅配置变更，驱动重渲染。 */
		function useConfigVersion() {
			const [v, bump] = react.useReducer((x) => x + 1, 0);
			react.useEffect(() => subscribeConfig(bump), []);
			return v;
		}
		/** 统一字段容器（垂直布局：label / control / hint，与官方 fields 一致）。 */
		function Field({ title, desc, control }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-field-item",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshav-field-head",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshav-field-label",
							children: title
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshav-field-control",
						children: control
					}),
					desc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dshav-field-hint",
						children: desc
					}) : null
				]
			});
		}
		/** 开关字段：checkbox 与标题同行左对齐（官方 checkbox 行排布），desc 作 hint。 */
		function ToggleRow({ title, desc, checked, onChange, disabled }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: disabled ? "dshav-field-item dshav-field-disabled" : "dshav-field-item",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: "dshav-toggle",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked,
						onChange,
						disabled
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: title })]
				}), desc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dshav-field-hint",
					children: desc
				}) : null]
			});
		}
		/** 数值输入字段（min/max 与 host schema 的同一组约束）。 */
		function NumberRow({ title, desc, value, onChange, min, max, step = 1 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
				title,
				desc,
				control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshav-field",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "number",
						value: String(value),
						min,
						max,
						step,
						onChange: (e) => {
							const next = Number(e.target.value);
							if (e.target.value === "" || !Number.isFinite(next)) return;
							onChange(Math.min(max, Math.max(min, next)));
						}
					})
				})
			});
		}
		/** 文本输入字段。 */
		function TextRow({ title, desc, value, onChange, type = "text", placeholder }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
				title,
				desc,
				control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshav-field",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type,
						value,
						placeholder: placeholder ?? "",
						spellCheck: false,
						autoComplete: "off",
						onChange: (e) => onChange(e.target.value)
					})
				})
			});
		}
		/** 选择字段。 */
		function SelectRow({ title, desc, value, options, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
				title,
				desc,
				control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshav-field",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						value,
						onChange: (e) => onChange(e.target.value),
						children: options.map((o) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: o.value,
							children: o.label
						}, o.value))
					})
				})
			});
		}
		/** 步骤标题：① ② ③ + 一句话说明。 */
		function Step({ index, title, desc, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-step",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshav-step-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshav-step-index",
							children: index
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshav-step-title",
							children: title
						})]
					}),
					desc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dshav-field-hint",
						children: desc
					}) : null,
					children
				]
			});
		}
		/** 一行 chip 单选（点即选中并联动，替代原先层层条件展开的下拉）。 */
		function Chips({ items, label, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-chips",
				role: "radiogroup",
				"aria-label": label,
				children: [items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "radio",
					"aria-checked": item.selected,
					className: "dshav-chip",
					"data-selected": item.selected ? "true" : void 0,
					disabled: item.disabled ?? false,
					onClick: item.onSelect,
					children: item.label
				}, item.key)), items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "dshav-field-hint",
					children: t("providersEmpty")
				}) : null]
			});
		}
		/** 快捷键录制器：点击后捕获下一组组合键；支持清除。 */
		function HotkeyRecorder({ value, onChange, t }) {
			const [arming, setArming] = react.useState(false);
			const handleKeyDown = (e) => {
				if (!arming) return;
				e.preventDefault();
				e.stopPropagation();
				const combo = keyCombo(e);
				if (combo !== "") {
					onChange(combo);
					setArming(false);
				} else if (e.key === "Escape") setArming(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "text",
					readOnly: true,
					placeholder: t("hotkeyPlaceholder"),
					value: arming ? "" : value,
					onFocus: () => setArming(true),
					onBlur: () => setArming(false),
					onKeyDown: handleKeyDown
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: "dshav-button dshav-button-outline dshav-button-sm",
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => onChange(""),
					children: t("hotkeyClear")
				})]
			});
		}
		/** 把键盘事件转成规范组合键字符串（修饰键 + 主键，跨平台）。 */
		function keyCombo(e) {
			const parts = [];
			if (e.ctrlKey || e.metaKey) parts.push("Ctrl");
			if (e.altKey) parts.push("Alt");
			if (e.shiftKey) parts.push("Shift");
			const key = normalizeKey$1(e.key);
			if (key === "") return "";
			parts.push(key);
			return parts.join("+");
		}
		/** 优化模型选择器：从 DSH 已配置模型列表选择（留空 = 当前所选 LLM）。 */
		function ModelPicker({ t, provider, model, onProvider, onModel }) {
			const [providers, setProviders] = react.useState(null);
			const [status, setStatus] = react.useState("loading");
			const load = react.useCallback(async () => {
				if (modelsCache !== null && Date.now() - modelsCacheAt < MODELS_CACHE_TTL_MS) {
					setProviders(modelsCache);
					setStatus("ok");
					return;
				}
				setStatus("loading");
				try {
					const res = await fetch("/api/asr-voice/models", {
						cache: "no-store",
						signal: AbortSignal.timeout(3e4)
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok || data.ok !== true || data.providers === void 0) throw new Error(data.reason || "load failed");
					modelsCache = data.providers;
					modelsCacheAt = Date.now();
					setProviders(data.providers);
				} catch {
					setStatus("err");
				}
			}, []);
			react.useEffect(() => {
				load();
			}, [load]);
			const modelOptions = providers?.find((p) => p.provider === provider)?.models ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					title: t("llmProviderLabel"),
					control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshav-field",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: provider,
							onChange: (e) => onProvider(e.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("llmCurrentDefault")
							}), (providers ?? []).map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: p.provider,
								children: p.name
							}, p.provider))]
						})
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
					title: t("llmModelLabel"),
					control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "dshav-field",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							value: model,
							disabled: provider === "",
							onChange: (e) => onModel(e.target.value),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "",
								children: t("llmCurrentDefault")
							}), modelOptions.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: m.id,
								children: m.name
							}, m.id))]
						})
					})
				}),
				status === "err" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dshav-field-hint",
					children: t("loadFailed")
				}) : null,
				status === "ok" && provider !== "" && modelOptions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dshav-field-hint",
					children: t("llmModelsEmpty")
				}) : null
			] });
		}
		/** 用量统计展示（/api/asr-voice/stats，低优先级）。 */
		function UsageStats({ t }) {
			const [stats, setStats] = react.useState(null);
			react.useEffect(() => {
				let live = true;
				const load = async () => {
					try {
						const res = await fetch("/api/asr-voice/stats", {
							cache: "no-store",
							signal: AbortSignal.timeout(1e4)
						});
						const data = await res.json().catch(() => ({}));
						if (live && res.ok && data.ok === true && data.stats) setStats(data.stats);
					} catch {}
				};
				load();
				const tick = () => {
					if (!document.hidden) load();
				};
				const timer = window.setInterval(tick, 5e3);
				const onVisible = () => {
					if (!document.hidden) load();
				};
				document.addEventListener("visibilitychange", onVisible);
				return () => {
					live = false;
					window.clearInterval(timer);
					document.removeEventListener("visibilitychange", onVisible);
				};
			}, []);
			if (stats === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "dshav-field-hint",
				children: t("statsEmpty")
			});
			const lastAt = stats.lastAt ? new Date(stats.lastAt).toLocaleTimeString() : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-field-item",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshav-field-head",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshav-field-label",
						children: t("statsTitle")
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					className: "dshav-field-hint",
					children: [
						t("statsCount", { n: stats.count }),
						" · ",
						t("statsChars", { n: stats.chars }),
						stats.count > 0 && lastAt ? ` · ${t("statsLastAt", { time: lastAt })}` : "",
						stats.lastProvider ? ` · ${stats.lastProvider}` : ""
					]
				})]
			});
		}
		/** 主键规范化（忽略纯修饰键，统一 Space / 字母大写）。 */
		function normalizeKey$1(key) {
			if (key === "Control" || key === "Alt" || key === "Shift" || key === "Meta" || key === "Escape") return "";
			if (key === " ") return "Space";
			if (key.length === 1) return key.toUpperCase();
			return {
				ArrowUp: "Up",
				ArrowDown: "Down",
				ArrowLeft: "Left",
				ArrowRight: "Right",
				Enter: "Enter",
				Tab: "Tab",
				Backspace: "Backspace"
			}[key] ?? key;
		}
		/** 段名 → 分组标题（保存失败时告诉用户到底是哪一段没落盘）。 */
		const SECTION_TITLE = {
			asr: "groupAsr",
			optimize: "groupOptimize",
			language: "languageLabel",
			behavior: "groupBehavior",
			realtime: "groupRealtime"
		};
		/** 设置卡片：外层折叠与其他插件卡一致（header + chevron + 条件 body）。 */
		function VoiceSettingsCard({ t }) {
			const version = useConfigVersion();
			const [open, setOpen] = react.useState(false);
			const [showAdvanced, setShowAdvanced] = react.useState(false);
			const [draft, setDraft] = react.useState(() => withLegacyMaterialized(newDraft()));
			const [dirty, setDirty] = react.useState(false);
			const [notice, setNotice] = react.useState(null);
			const [keyInput, setKeyInput] = react.useState("");
			const [keyBusy, setKeyBusy] = react.useState(false);
			const [keyState, setKeyState] = react.useState(null);
			const [tested, setTested] = react.useState(null);
			const [testing, setTesting] = react.useState(false);
			const writable = settingsWritable();
			const provider = draftActiveProvider(draft);
			const ref = keyRefOf(provider);
			const cloudMode = draft.asr.provider !== "browser";
			const edit = (fn) => {
				setDraft(fn);
				setDirty(true);
				setNotice(null);
			};
			react.useEffect(() => {
				if (!dirty) setDraft(withLegacyMaterialized(newDraft()));
			}, [version, dirty]);
			react.useEffect(() => {
				let live = true;
				setKeyState(null);
				readKeyState(provider).then((state) => {
					if (live) setKeyState(state);
				});
				return () => {
					live = false;
				};
			}, [ref]);
			/** 写回草稿；返回是否全部落盘（读回校验失败会给出段名）。 */
			const commit = async () => {
				if (!dirty) return true;
				setNotice({
					kind: "busy",
					text: t("savingHint")
				});
				const failed = await writeDraft(draft);
				if (failed !== void 0) {
					setNotice({
						kind: "err",
						text: `${t("saveNotApplied", { section: t(SECTION_TITLE[failed]) })}`
					});
					return false;
				}
				setDirty(false);
				setNotice({
					kind: "ok",
					text: t("savedHint")
				});
				return true;
			};
			/** 保存密钥（先落草稿，行不存在时不能往对应引用里写 key）。 */
			const commitKey = async () => {
				setKeyBusy(true);
				if (dirty && !await commit()) {
					setKeyBusy(false);
					return;
				}
				const reason = await saveKey(provider, keyInput);
				setKeyBusy(false);
				if (reason !== void 0) {
					setNotice({
						kind: "err",
						text: `${t("keySaveFailed")}：${reason}`
					});
					return;
				}
				setKeyInput("");
				setKeyState(await readKeyState(provider));
				setNotice({
					kind: "ok",
					text: t("keySavedHint", { ref })
				});
			};
			/**
			* 测试连接 = 用该供应商列一次模型。
			* 选它而不是录一段音：不用麦克风、不打扰人，且一次性验掉 key + baseUrl + 网络三件事，
			* 返回的模型还能直接填进高级里的模型选择。
			*/
			const testConnection = async () => {
				setTesting(true);
				if (dirty && !await commit()) {
					setTesting(false);
					return;
				}
				try {
					const res = await fetch(`/api/asr-voice/asr-models?providerId=${encodeURIComponent(provider.id)}`, {
						cache: "no-store",
						signal: AbortSignal.timeout(3e4)
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok || data.ok !== true || !Array.isArray(data.models)) throw new Error(data.reason ?? "request failed");
					if (data.models.length === 0) setNotice({
						kind: "err",
						text: t("fetchModelsEmpty")
					});
					else {
						setTested({ models: data.models });
						setNotice({
							kind: "ok",
							text: t("testOk", { n: data.models.length })
						});
					}
				} catch (error) {
					setNotice({
						kind: "err",
						text: `${t("testFail")}：${error instanceof Error ? error.message : String(error)}`
					});
				} finally {
					setTesting(false);
				}
			};
			/** 选预置：已有对应行就切过去，否则新建一行并设为当前。 */
			const choosePreset = (presetId) => {
				edit((current) => {
					const existing = current.asr.cloud.providers.find((p) => p.preset === presetId);
					if (existing === void 0) return addProvider(current, presetId).draft;
					const filled = existing.baseUrl.trim() === "" ? pickPreset(current, existing.id, presetId) : current;
					return withProviders(filled, filled.asr.cloud.providers, existing.id);
				});
				setTested(null);
			};
			const presetChips = CLOUD_PRESETS.map((preset) => ({
				key: preset.id,
				label: preset.label,
				selected: provider.preset === preset.id,
				onSelect: () => choosePreset(preset.id),
				disabled: !writable
			}));
			const customChips = draft.asr.cloud.providers.filter((p) => presetById(p.preset) === void 0).map((p) => ({
				key: `row-${p.id}`,
				label: p.name.trim() === "" ? t("cloudPresetCustom") : p.name,
				selected: p.id === provider.id,
				onSelect: () => {
					edit((current) => withProviders(current, current.asr.cloud.providers, p.id));
					setTested(null);
				},
				disabled: !writable
			}));
			const addChip = {
				key: "add-custom",
				label: t("addProvider"),
				selected: false,
				onSelect: () => {
					edit((current) => addProvider(current, "custom", t("cloudPresetCustom")).draft);
				},
				disabled: !writable
			};
			const engineChips = [
				{
					key: "auto",
					label: t("engineAuto"),
					selected: draft.asr.provider === "auto",
					onSelect: () => edit((c) => withSection(c, "asr", { provider: "auto" })),
					disabled: !writable
				},
				{
					key: "browser",
					label: t("engineBrowser"),
					selected: draft.asr.provider === "browser",
					onSelect: () => edit((c) => withSection(c, "asr", { provider: "browser" })),
					disabled: !writable
				},
				{
					key: "cloud",
					label: t("engineCloud"),
					selected: draft.asr.provider === "cloud",
					onSelect: () => edit((c) => withSection(c, "asr", { provider: "cloud" })),
					disabled: !writable
				}
			];
			const needKey = keyState !== null && !keyState.configured && keyState.failure === null;
			const keyNameMissing = presetById(provider.preset) === void 0 && provider.name.trim() === "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "dshav-card" + (open ? " dshav-card-open" : ""),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "dshav-header",
					"aria-expanded": open,
					onClick: () => setOpen(!open),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-headtext",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "dshav-name",
							children: t("cardTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshav-desc",
							children: t("cardCopy")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						className: "dshav-chevron" + (open ? " dshav-open" : ""),
						width: 16,
						height: 16,
						viewBox: "0 0 16 16",
						fill: "none",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M3.5 5.75 8 10.25l4.5-4.5",
							stroke: "currentColor",
							strokeWidth: 1.5,
							strokeLinecap: "round",
							strokeLinejoin: "round"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "dshav-body",
					children: [
						!writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshav-field-hint",
							role: "alert",
							children: t("readOnlyDoc")
						}) : null,
						cloudMode && provider.baseUrl.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshav-field-hint",
							children: t("howTo")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshav-group",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Step, {
								index: "①",
								title: t("stepEngineTitle"),
								desc: t(draft.asr.provider === "browser" ? "engineHintBrowser" : draft.asr.provider === "cloud" ? "engineHintCloud" : "engineHintAuto"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Chips, {
									items: engineChips,
									label: t("stepEngineTitle"),
									t
								})
							})
						}),
						cloudMode ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshav-group",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Step, {
								index: "②",
								title: t("stepProviderTitle"),
								desc: t("stepProviderHint"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Chips, {
									items: [
										...presetChips,
										...customChips,
										addChip
									],
									label: t("stepProviderTitle"),
									t
								}), presetById(provider.preset) !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: "dshav-field-hint",
									children: presetById(provider.preset)?.hint
								}) : null]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "dshav-group",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Step, {
								index: "③",
								title: t("stepKeyTitle"),
								desc: keyNameMissing ? t("keyNameNeeded") : void 0,
								children: [
									keyState === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshav-field-hint",
										children: t("keyChecking")
									}) : keyState.failure !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
										className: "dshav-field-hint",
										role: "alert",
										children: [
											t("keyQueryFailed"),
											"：",
											keyState.failure
										]
									}) : keyState.configured ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
										className: "dshav-ok-line",
										children: [
											"✓ ",
											t("keyConfigured", { ref }),
											keyState.source !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: "dshav-field-hint",
												children: [" · ", keyState.source]
											}) : null
										]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshav-field-hint",
										children: t("keyNeedsValue", { ref })
									}),
									!keyNameMissing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dshav-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "password",
											value: keyInput,
											placeholder: keyState?.configured === true ? t("keyKeepPlaceholder") : t("keyPastePlaceholder"),
											spellCheck: false,
											autoComplete: "off",
											disabled: !writable || keyState?.writable === false,
											onChange: (e) => setKeyInput(e.target.value)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dshav-button dshav-button-outline dshav-button-sm",
											disabled: keyBusy || !writable || keyInput.trim() === "",
											onClick: () => {
												commitKey();
											},
											children: keyBusy ? t("keySaving") : t("keySave")
										})]
									}) : null,
									needKey && keyInput.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshav-field-hint",
										children: t("keyKeepHint")
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dshav-field",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dshav-button dshav-button-primary dshav-button-sm",
											disabled: testing || !writable || provider.baseUrl.trim() === "",
											onClick: () => {
												testConnection();
											},
											children: testing ? t("testBusy") : dirty ? t("testAndSave") : t("testConnection")
										})
									})
								]
							})
						})] }) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshav-actions",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshav-status",
										"aria-live": "polite",
										"data-kind": notice === null ? void 0 : notice.kind === "busy" ? void 0 : notice.kind === "ok" ? "ok" : "err",
										children: notice?.text ?? ""
									}),
									dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshav-button dshav-button-outline dshav-button-sm",
										disabled: !writable,
										onClick: () => {
											setDraft(withLegacyMaterialized(newDraft()));
											setDirty(false);
											setNotice(null);
										},
										children: t("discard")
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "dshav-button dshav-button-primary dshav-button-sm",
										disabled: !dirty || !writable,
										onClick: () => {
											commit();
										},
										children: t("save")
									})
								]
							}), dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dshav-field-hint",
								children: t("unsavedHint")
							}) : null]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "dshav-advanced-toggle",
								"aria-expanded": showAdvanced,
								onClick: () => setShowAdvanced(!showAdvanced),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("advancedTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-field-hint",
									children: showAdvanced ? t("advancedCollapse") : t("advancedHint")
								})]
							}), showAdvanced ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "dshav-stack",
								children: [
									cloudMode ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, {
											title: t("providerNameLabel"),
											desc: t("providerNameDesc", { ref }),
											value: provider.name,
											onChange: (v) => edit((c) => patchProvider(c, provider.id, { name: v }))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, {
											title: t("cloudBaseUrlLabel"),
											desc: t("cloudBaseUrlDesc"),
											value: provider.baseUrl,
											onChange: (v) => edit((c) => patchProvider(c, provider.id, { baseUrl: v }))
										}),
										tested === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, {
											title: t("cloudModelLabel"),
											desc: t("cloudModelDesc"),
											value: provider.model,
											onChange: (v) => edit((c) => patchProvider(c, provider.id, { model: v }))
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
											title: t("cloudModelLabel"),
											desc: t("cloudModelPicked"),
											value: provider.model,
											options: [{
												value: provider.model,
												label: provider.model === "" ? t("fetchModelsPick") : provider.model
											}, ...tested.models.map((m) => ({
												value: m.id,
												label: m.name
											}))],
											onChange: (v) => edit((c) => patchProvider(c, provider.id, { model: v }))
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
											title: t("cloudModeLabel"),
											desc: t("cloudModeDesc"),
											value: provider.mode,
											options: [
												{
													value: "auto",
													label: t("cloudModeAuto")
												},
												{
													value: "transcriptions",
													label: t("cloudModeTranscriptions")
												},
												{
													value: "chat",
													label: t("cloudModeChat")
												}
											],
											onChange: (v) => edit((c) => patchProvider(c, provider.id, { mode: v }))
										}),
										draft.asr.cloud.providers.length > 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
											title: t("providerListLabel"),
											desc: t("providerListDesc"),
											control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: "dshav-provider-list",
												children: draft.asr.cloud.providers.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
													className: "dshav-provider-row",
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
														className: "dshav-toggle",
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
															type: "radio",
															name: "dshav-active-provider",
															checked: p.id === draft.asr.cloud.active,
															disabled: !writable,
															onChange: () => edit((c) => withProviders(c, c.asr.cloud.providers, p.id))
														}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: rowLabel(p, t) })]
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														className: "dshav-button dshav-button-outline dshav-button-sm",
														disabled: !writable,
														onClick: () => edit((c) => removeProvider(c, p.id)),
														children: t("removeProvider")
													})]
												}, p.id))
											})
										}) : null
									] }) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
										title: t("languageLabel"),
										value: draft.language,
										options: [
											{
												value: "auto",
												label: t("languageAuto")
											},
											{
												value: "zh-CN",
												label: "中文（简体）"
											},
											{
												value: "en-US",
												label: "English (US)"
											}
										],
										onChange: (v) => edit((c) => withLanguage(c, v))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshav-groupTitle",
										children: t("groupOptimize")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
										title: t("optimizeModeLabel"),
										value: draft.optimize.mode,
										options: [{
											value: "heuristic",
											label: t("optimizeHeuristic")
										}, {
											value: "llm",
											label: t("optimizeLlm")
										}],
										onChange: (v) => edit((c) => withSection(c, "optimize", { mode: v === "llm" ? "llm" : "heuristic" }))
									}),
									draft.optimize.mode === "llm" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "dshav-stack",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
												className: "dshav-field-hint",
												children: t("llmDefaultHint")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelPicker, {
												t,
												provider: draft.optimize.llm.provider,
												model: draft.optimize.llm.model,
												onProvider: (v) => edit((c) => withSection(c, "optimize", { llm: {
													provider: v,
													model: ""
												} })),
												onModel: (v) => edit((c) => withSection(c, "optimize", { llm: {
													...c.optimize.llm,
													model: v
												} }))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
												title: t("optimizePreviewLabel"),
												desc: t("optimizePreviewDesc"),
												checked: draft.optimize.preview,
												onChange: () => edit((c) => withSection(c, "optimize", { preview: !c.optimize.preview }))
											})
										]
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshav-groupTitle",
										children: t("groupBehavior")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("autoSendLabel"),
										desc: t("autoSendDesc"),
										checked: draft.behavior.autoSend,
										onChange: () => edit((c) => withSection(c, "behavior", { autoSend: !c.behavior.autoSend }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("silenceStopLabel"),
										desc: t("silenceStopDesc"),
										checked: draft.behavior.silenceStop,
										onChange: () => edit((c) => withSection(c, "behavior", { silenceStop: !c.behavior.silenceStop }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("holdToTalkLabel"),
										desc: t("holdToTalkDesc"),
										checked: draft.behavior.holdToTalk,
										onChange: () => edit((c) => withSection(c, "behavior", { holdToTalk: !c.behavior.holdToTalk }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
										title: t("textModeLabel"),
										desc: t("textModeDesc"),
										value: draft.behavior.textMode,
										options: [{
											value: "replace",
											label: t("textModeReplace")
										}, {
											value: "append",
											label: t("textModeAppend")
										}],
										onChange: (v) => edit((c) => withSection(c, "behavior", { textMode: v === "append" ? "append" : "replace" }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("copyToClipboardLabel"),
										desc: t("copyToClipboardDesc"),
										checked: draft.behavior.copyToClipboard,
										onChange: () => edit((c) => withSection(c, "behavior", { copyToClipboard: !c.behavior.copyToClipboard }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										title: t("hotkeyLabel"),
										desc: t("hotkeyDesc"),
										control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HotkeyRecorder, {
											value: draft.behavior.hotkey,
											onChange: (v) => edit((c) => withSection(c, "behavior", { hotkey: v })),
											t
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("maxRecordMsLabel"),
										desc: t("maxRecordMsDesc"),
										value: draft.behavior.maxRecordMs,
										min: 5e3,
										max: 6e5,
										step: 1e3,
										onChange: (v) => edit((c) => withSection(c, "behavior", { maxRecordMs: v }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("silenceMsLabel"),
										desc: t("silenceMsDesc"),
										value: draft.behavior.silenceMs,
										min: 200,
										max: 6e4,
										step: 100,
										onChange: (v) => edit((c) => withSection(c, "behavior", { silenceMs: v }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("silenceRmsLabel"),
										desc: t("silenceRmsDesc"),
										value: draft.behavior.silenceRms,
										min: 0,
										max: 1,
										step: .005,
										onChange: (v) => edit((c) => withSection(c, "behavior", { silenceRms: v }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshav-groupTitle",
										children: t("groupRealtime")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("realtimeEnableLabel"),
										desc: t("realtimeEnableDesc"),
										checked: draft.realtime.enabled,
										onChange: () => edit((c) => withSection(c, "realtime", { enabled: !c.realtime.enabled }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
										title: t("realtimeEngineLabel"),
										desc: t("realtimeEngineDesc"),
										value: draft.realtime.engine,
										options: [
											{
												value: "browser",
												label: t("realtimeEngineBrowser")
											},
											{
												value: "segmented",
												label: t("realtimeEngineSegmented")
											},
											{
												value: "cloud",
												label: t("realtimeEngineCloud")
											}
										],
										onChange: (v) => edit((c) => withSection(c, "realtime", { engine: v === "segmented" ? "segmented" : v === "cloud" ? "cloud" : "browser" }))
									}),
									draft.realtime.engine === "cloud" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
										title: t("realtimeProviderLabel"),
										desc: t("realtimeProviderDesc"),
										value: draft.realtime.provider,
										options: REALTIME_PRESETS.map((p) => ({
											value: p.id,
											label: p.label
										})),
										onChange: (v) => edit((c) => withSection(c, "realtime", { provider: v }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
										title: t("realtimeTtsLabel"),
										desc: t("realtimeTtsDesc"),
										value: draft.realtime.tts,
										options: [
											{
												value: "browser",
												label: t("realtimeTtsBrowser")
											},
											{
												value: "cloud",
												label: t("realtimeTtsCloud")
											},
											{
												value: "off",
												label: t("realtimeTtsOff")
											}
										],
										onChange: (v) => edit((c) => withSection(c, "realtime", { tts: v === "off" ? "off" : v === "cloud" ? "cloud" : "browser" }))
									}),
									draft.realtime.tts === "cloud" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, {
										title: t("realtimeTtsVoiceLabel"),
										desc: t("realtimeTtsVoiceDesc"),
										value: draft.realtime.ttsVoice,
										onChange: (v) => edit((c) => withSection(c, "realtime", { ttsVoice: v }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
										title: t("realtimeHotkeyLabel"),
										desc: t("realtimeHotkeyDesc"),
										control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HotkeyRecorder, {
											value: draft.realtime.hotkey,
											onChange: (v) => edit((c) => withSection(c, "realtime", { hotkey: v })),
											t
										})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("bargeInLabel"),
										desc: t("bargeInDesc"),
										checked: draft.realtime.bargeIn && draft.realtime.engine === "segmented",
										onChange: () => edit((c) => withSection(c, "realtime", { bargeIn: !c.realtime.bargeIn })),
										disabled: draft.realtime.engine !== "segmented"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("realtimeSettleMsLabel"),
										desc: t("realtimeSettleMsDesc"),
										value: draft.realtime.turn.settleMs,
										min: 200,
										max: 1e4,
										step: 100,
										onChange: (v) => edit((c) => withSection(c, "realtime", { turn: {
											...c.realtime.turn,
											settleMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("realtimeTailMsLabel"),
										desc: t("realtimeTailMsDesc"),
										value: draft.realtime.turn.tailMs,
										min: 0,
										max: 5e3,
										step: 100,
										onChange: (v) => edit((c) => withSection(c, "realtime", { turn: {
											...c.realtime.turn,
											tailMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
										title: t("vadRmsAutoLabel"),
										desc: t("vadRmsAutoDesc"),
										checked: draft.realtime.vad.rmsAuto,
										onChange: () => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											rmsAuto: !c.realtime.vad.rmsAuto
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadFrameMsLabel"),
										desc: t("vadFrameMsDesc"),
										value: draft.realtime.vad.frameMs,
										min: 10,
										max: 500,
										step: 10,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											frameMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadRmsLabel"),
										desc: t("vadRmsDesc"),
										value: draft.realtime.vad.rms,
										min: 0,
										max: 1,
										step: .005,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											rms: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadSilenceMsLabel"),
										desc: t("vadSilenceMsDesc"),
										value: draft.realtime.vad.silenceMs,
										min: 200,
										max: 5e3,
										step: 100,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											silenceMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadPrerollMsLabel"),
										desc: t("vadPrerollMsDesc"),
										value: draft.realtime.vad.prerollMs,
										min: 0,
										max: 1e3,
										step: 50,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											prerollMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadMinSpeechMsLabel"),
										desc: t("vadMinSpeechMsDesc"),
										value: draft.realtime.vad.minSpeechMs,
										min: 100,
										max: 3e3,
										step: 50,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											minSpeechMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadMaxSegmentMsLabel"),
										desc: t("vadMaxSegmentMsDesc"),
										value: draft.realtime.vad.maxSegmentMs,
										min: 1e3,
										max: 3e4,
										step: 500,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											maxSegmentMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("vadMaxPendingLabel"),
										desc: t("vadMaxPendingDesc"),
										value: draft.realtime.vad.maxPending,
										min: 1,
										max: 20,
										onChange: (v) => edit((c) => withSection(c, "realtime", { vad: {
											...c.realtime.vad,
											maxPending: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("realtimeMaxSessionLabel"),
										desc: t("realtimeMaxSessionDesc"),
										value: draft.realtime.maxSessionMs,
										min: 3e4,
										max: 36e5,
										step: 3e4,
										onChange: (v) => edit((c) => withSection(c, "realtime", { maxSessionMs: v }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("realtimeFirstSentenceLabel"),
										desc: t("realtimeFirstSentenceDesc"),
										value: draft.realtime.speech.firstSentenceMinChars,
										min: 1,
										max: 200,
										onChange: (v) => edit((c) => withSection(c, "realtime", { speech: {
											...c.realtime.speech,
											firstSentenceMinChars: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(NumberRow, {
										title: t("realtimeWatchdogLabel"),
										desc: t("realtimeWatchdogDesc"),
										value: draft.realtime.speech.utteranceWatchdogMs,
										min: 1e3,
										max: 3e5,
										step: 1e3,
										onChange: (v) => edit((c) => withSection(c, "realtime", { speech: {
											...c.realtime.speech,
											utteranceWatchdogMs: v
										} }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "dshav-groupTitle",
										children: t("groupStats")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageStats, { t })
								]
							}) : null]
						})
					]
				}) : null]
			});
		}
		/** 供应商行显示名（列表里区分同名预置）。 */
		function rowLabel(p, t) {
			const preset = presetById(p.preset);
			const base = p.name.trim() !== "" ? p.name : preset?.label ?? t("cloudPresetCustom");
			return p.baseUrl.trim() === "" ? base : `${base} · ${p.baseUrl.replace(/^https?:\/\//, "")}`;
		}
		//#endregion
		//#region src/client/optimize.ts
		/**
		* dsh-asr-voice — client 提示词优化。
		*
		* 两种模式：
		*   - heuristic：本地启发式清洗（免费、离线、即时）——去语气词/口误、补标点、
		*     分段、拉丁语首字母大写。
		*   - llm：把文本 POST 到 host /api/asr-voice/optimize，由服务端用配置的
		*     OpenAI-compatible chat completions 重写（key 不进浏览器）。
		*/
		/** 常见中文语气词/口头禅（按词删除，保守集合）。 */
		const ZH_FILLERS = [
			"嗯嗯",
			"嗯",
			"呃呃",
			"呃",
			"啊那个",
			"那个那个",
			"那个",
			"这个这个",
			"这个",
			"就是说",
			"怎么说呢",
			"然后呢",
			"然后",
			"就是",
			"是吧",
			"对吧",
			"好不好",
			"明白了没"
		];
		/** 常见英文语气词（整词删除，大小写不敏感）。不收 like/well 等实义词——
		*  整词删除会把 "I like this"→"I this"、"as well as"→"as as" 这类正常句子削坏。 */
		const EN_FILLERS = [
			"um",
			"uh",
			"hmm",
			"erm",
			"you know",
			"i mean"
		];
		/** 规范化空白：折叠连续空白/换行，转为单个空格；保留段落间空行。 */
		function normalizeSpaces(text) {
			return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/ *\n */g, "\n").trim();
		}
		/** 中文字符检测。 */
		function hasCjk(text) {
			return /[\u4e00-\u9fff]/.test(text);
		}
		/** 删除中文语气词。 */
		function stripZhFillers(text) {
			let out = text;
			for (const f of ZH_FILLERS) out = out.replace(new RegExp(`(^|[\\s，。！？、；：,.!?;:\\n])${escapeRegExp(f)}(?=[\\s，。！？、；：,.!?;:\\n]|$)`, "g"), "$1");
			return out;
		}
		/** 删除英文语气词（整词）。 */
		function stripEnFillers(text) {
			let out = ` ${text} `;
			for (const f of EN_FILLERS) out = out.replace(new RegExp(`\\s${escapeRegExp(f)}\\s`, "gi"), " ");
			return out.trim();
		}
		function escapeRegExp(s) {
			return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		/** 补齐/修正标点：折叠重复标点、拉丁语单词间保证单空格、句末补句号。 */
		function fixPunctuation(text) {
			let out = text;
			out = out.replace(/([，。！？；：,.!?;:]){2,}/g, "$1");
			if (hasCjk(out)) {
				out = out.replace(/ *([，。！？；：]) */g, "$1");
				out = out.replace(/ *([,.;:!?]) *([\u4e00-\u9fff])/g, "$1 $2");
			} else out = out.replace(/ *([,.;:!?]) */g, "$1 ");
			out = out.replace(/ {2,}/g, " ");
			const trimmed = out.trimEnd();
			if (trimmed === "") return "";
			const last = trimmed[trimmed.length - 1];
			if (!/[。！？.!?，,；;：:]/.test(last)) out = hasCjk(trimmed) ? `${trimmed}。` : `${trimmed}.`;
			return out;
		}
		/** 拉丁语：每句首字母大写。 */
		function sentenceCase(text) {
			if (hasCjk(text)) return text;
			return text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, p1, p2) => p1 + p2.toUpperCase());
		}
		/** 按空行分段，每段作为独立段落（LLM 预览时保留）。 */
		function segment(text) {
			return text.split(/\n\n+/).map((p) => p.trim()).filter((p) => p !== "").join("\n\n");
		}
		/**
		* 本地启发式优化：清洗语气词/口误 → 折叠空白 → 修正标点 → 分段 → 拉丁语句首大写。
		*/
		function heuristicOptimize(raw) {
			if (!raw || raw.trim() === "") return "";
			let text = normalizeSpaces(raw);
			text = stripZhFillers(text);
			text = stripEnFillers(text);
			text = normalizeSpaces(text);
			text = fixPunctuation(text);
			text = sentenceCase(text);
			text = segment(text);
			return text;
		}
		/** LLM 优化请求超时（毫秒）：模型卡住/过慢时不把 UI 永远钉在「优化中」；超时按失败处理，保留草稿里的清洗版。 */
		const OPTIMIZE_TIMEOUT_MS = 6e4;
		/** 调用 host /api/asr-voice/optimize（用 DSH 已配置模型重写）。 */
		async function llmOptimize(text, target, externalSignal) {
			const body = { text };
			if (target !== void 0 && target.provider !== "" && target.model !== "") {
				body.provider = target.provider;
				body.model = target.model;
			}
			const controller = new AbortController();
			const onExternalAbort = () => controller.abort();
			if (externalSignal !== void 0) {
				if (externalSignal.aborted) controller.abort();
				else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
			}
			const timer = setTimeout(() => controller.abort(), OPTIMIZE_TIMEOUT_MS);
			try {
				const res = await fetch("/api/asr-voice/optimize", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
					signal: controller.signal
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || data.ok !== true || typeof data.text !== "string") throw new Error(data.reason || "optimize failed");
				return data.text;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") throw new Error("optimize timeout");
				throw error;
			} finally {
				clearTimeout(timer);
				externalSignal?.removeEventListener("abort", onExternalAbort);
			}
		}
		//#endregion
		//#region src/client/pcm.ts
		/**
		* dsh-asr-voice — PCM 数学（纯函数，模块顶层不碰 DOM，可被 node --test 直接跑源码）。
		*
		* 整段转写路径（`recorder.ts` 的 blobToWav16k）与实时上行路径共用这一套下混 /
		* 重采样 / 峰值 / 归一 / 量化实现：静音守卫的判据必须只有一份真相，否则两条路径
		* 会在「设备到底有没有采到声」上给出不一致的结论。
		*/
		/** 上行统一采样率：ASR 上游通用要求 16 kHz 单声道。 */
		const PCM_SAMPLE_RATE = 16e3;
		/** 归一化目标幅度（0.9 ≈ 接近满幅但不触顶）。 */
		const NORMALISE_TARGET = .9;
		/** 归一化增益上限：防噪声底被过度放大。 */
		const NORMALISE_MAX_GAIN = 4;
		/** 峰值低于此值视为无信号，不做归一（避免把纯噪声放大 4 倍）。 */
		const NORMALISE_MIN_PEAK = 1e-4;
		/**
		* 静音守卫（ground truth）：转换后 PCM 的真实峰值趋零，说明采集链路没拿到声音，
		* 不该发上游（上游会对静音幻觉出 "yeah" / "no text"）。
		*/
		function isSilentPeak(peak) {
			return peak >= 0 && peak < .005;
		}
		/** 多声道等权下混为单声道。 */
		function downmixToMono(channels, length) {
			const mono = new Float32Array(length);
			if (channels.length === 0) return mono;
			for (const data of channels) for (let i = 0; i < length; i++) mono[i] = (mono[i] ?? 0) + (data[i] ?? 0) / channels.length;
			return mono;
		}
		/** 线性插值重采样到 targetRate（调用方永不假定源采样率，浏览器可能忽略请求的 sampleRate）。 */
		function resampleLinear(src, sourceRate, targetRate) {
			const srcLen = src.length;
			const outLen = Math.max(1, Math.round(srcLen * targetRate / sourceRate));
			const out = new Float32Array(outLen);
			const ratio = sourceRate / targetRate;
			for (let i = 0; i < outLen; i++) {
				const pos = i * ratio;
				const i0 = Math.floor(pos);
				const i1 = Math.min(i0 + 1, srcLen - 1);
				const frac = pos - i0;
				out[i] = (src[i0] ?? 0) * (1 - frac) + (src[i1] ?? 0) * frac;
			}
			return out;
		}
		/** 绝对值峰值（归一化与静音守卫的共同输入）。 */
		function peakAbs(src) {
			let peak = 0;
			for (let i = 0; i < src.length; i++) {
				const a = Math.abs(src[i] ?? 0);
				if (a > peak) peak = a;
			}
			return peak;
		}
		/** 峰值归一化增益：把偏轻的麦克风录音放大到接近满幅，受 NORMALISE_MAX_GAIN 约束。 */
		function normaliseGain(peak) {
			return peak > NORMALISE_MIN_PEAK ? Math.min(NORMALISE_MAX_GAIN, NORMALISE_TARGET / peak) : 1;
		}
		/**
		* 一个 Float32 采样 → 限幅后的 16-bit 有符号整数（gain 在此一并应用）。
		* 两条路径共用同一量化，正负半轴不对称是 int16 本身的取值范围决定
		* （负端多一个 -32768）。
		*
		* 必须四舍五入：向零截断会让所有非零采样一律靠近零，对本插件专门放大的安静录音
		* 是系统性衰减。
		*/
		function quantiseInt16(sample, gain) {
			const s = Math.max(-1, Math.min(1, sample * gain));
			return s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
		}
		/**
		* Float32 采样 → 完整 16-bit 单声道 WAV 字节（44 字节头 + data）。
		* 增益在写采样时一并应用：长录音 outLen 可达数十万采样，多一遍独立增益遍历
		* 是解码之后真实可感的 CPU 开销。
		*/
		function encodeWav16MonoPcm(samples, sampleRate, gain) {
			const dataLen = samples.length * 2;
			const buf = new ArrayBuffer(44 + dataLen);
			const view = new DataView(buf);
			const writeStr = (off, s) => {
				for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
			};
			writeStr(0, "RIFF");
			view.setUint32(4, 36 + dataLen, true);
			writeStr(8, "WAVE");
			writeStr(12, "fmt ");
			view.setUint32(16, 16, true);
			view.setUint16(20, 1, true);
			view.setUint16(22, 1, true);
			view.setUint32(24, sampleRate, true);
			view.setUint32(28, sampleRate * 2, true);
			view.setUint16(32, 2, true);
			view.setUint16(34, 16, true);
			writeStr(36, "data");
			view.setUint32(40, dataLen, true);
			for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, quantiseInt16(samples[i] ?? 0, gain), true);
			return new Uint8Array(buf);
		}
		/**
		* `AnalyserNode.getByteTimeDomainData` 缓冲的 RMS（0~1，无符号 8-bit 以 128 为零位）。
		* 实时电平表与静音自动停止共用。
		*/
		function rmsFromByteTimeDomain(bytes) {
			if (bytes.length === 0) return 0;
			let sum = 0;
			for (let i = 0; i < bytes.length; i++) {
				const v = ((bytes[i] ?? 128) - 128) / 128;
				sum += v * v;
			}
			return Math.sqrt(sum / bytes.length);
		}
		/**
		* Float32 采样的 RMS（0~1）。本地 VAD 判的是 AudioWorklet 直出的采样，不是
		* AnalyserNode 的 8-bit 缓冲——两者的判据不能互抄，否则同一个阈值在电平表和
		* 切段器上会给出不同的「有没有在说话」。
		*/
		function rmsOfFloat(src) {
			if (src.length === 0) return 0;
			let sum = 0;
			for (let i = 0; i < src.length; i++) {
				const v = src[i] ?? 0;
				sum += v * v;
			}
			return Math.sqrt(sum / src.length);
		}
		//#endregion
		//#region src/client/recorder.ts
		/**
		* dsh-asr-voice — client 录音引擎。
		*
		* 两种引擎，统一 `VoiceRecorder` 接口：
		*   - browser：Web Speech API（webkitSpeechRecognition），实时转写、浏览器本地、
		*     免 key；Chrome/Edge 双平台支持。
		*   - cloud：getUserMedia + MediaRecorder 采集音频，停止后把原始字节 POST 到
		*     host /api/asr-voice/transcribe，由服务端转发云端 ASR（key 不进浏览器）。
		*
		* 两者都带：最长录音上限、interim 文本回调、状态回调；cloud 引擎可选静音自动停止
		* （默认关 = 手动关麦，点停止整段去 ASR，见 behavior.silenceStop）。
		*/
		/** 云端转写请求超时（毫秒）：上游不可达/卡住时不把 UI 永远钉在「识别中」。 */
		const TRANSCRIBE_TIMEOUT_MS = 6e4;
		/** 浏览器是否可用 Web Speech API。 */
		function isWebSpeechSupported() {
			return typeof window !== "undefined" && "webkitSpeechRecognition" in window;
		}
		/** 语言参数：auto → 返回 undefined（交给浏览器/服务端默认）。 */
		function resolveLang(language) {
			if (!language || language === "auto") return void 0;
			return language;
		}
		/**
		* 装饰性电平：Web Speech 引擎不暴露音频流，用平滑随机波形近似语音起伏驱动频谱条。
		* 只用于视觉反馈，绝不参与任何静音/回合判定。返回幂等的停止函数。
		*/
		function startLevelSimulation(emit) {
			let raf = 0;
			let level = .05;
			let phase = Math.random() * Math.PI * 2;
			const loop = () => {
				phase += .16 + Math.random() * .12;
				const base = .24 + .16 * Math.sin(phase);
				const burst = Math.random() < .07 ? Math.random() * .45 : 0;
				const next = Math.min(1, Math.max(.02, base + burst + Math.random() * .12));
				level += (next - level) * .32;
				emit(level);
				raf = requestAnimationFrame(loop);
			};
			raf = requestAnimationFrame(loop);
			return () => {
				if (raf) cancelAnimationFrame(raf);
				raf = 0;
			};
		}
		/** 浏览器引擎：Web Speech API。 */
		function createBrowserRecorder(language, onError, behavior) {
			const Ctor = window.webkitSpeechRecognition;
			if (!Ctor) throw new Error("browser: webkitSpeechRecognition unavailable");
			const recognition = new Ctor();
			const lang = resolveLang(language);
			if (lang) recognition.lang = lang;
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.maxAlternatives = 1;
			let finalText = "";
			let interim = "";
			let stopped = false;
			let cancelled = false;
			let delivered = false;
			let endResolve = null;
			let maxTimer = null;
			let stopLevelSim = null;
			const recorder = {
				onInterim: null,
				onState: null,
				onLevel: null,
				onDone: null,
				onFail: null
			};
			/** 一次性送达结果：settle 与 stop() 双入口都可能命中，用 delivered 防重复。 */
			const deliver = (text) => {
				if (delivered || cancelled) return;
				delivered = true;
				recorder.onDone?.(text);
			};
			/** 浏览器引擎无音频流，用平滑的模拟能量驱动频谱（装饰性，视觉近似语音起伏）。 */
			const startLevelSim = () => {
				stopLevelSim ??= startLevelSimulation((level) => {
					recorder.onLevel?.(level);
				});
			};
			const stopLevelSimNow = () => {
				stopLevelSim?.();
				stopLevelSim = null;
			};
			const emitInterim = () => {
				const text = `${finalText}${finalText && interim ? " " : ""}${interim}`.trim();
				recorder.onInterim?.(text);
			};
			const settle = () => {
				if (stopped) return;
				stopped = true;
				stopLevelSimNow();
				if (maxTimer) clearTimeout(maxTimer);
				if (!cancelled && endResolve) {
					const text = finalText.trim();
					endResolve(text);
					endResolve = null;
					deliver(text);
				}
			};
			recognition.onstart = () => {
				recorder.onState?.("recording");
			};
			recognition.onresult = (event) => {
				let finalChunk = "";
				let interimChunk = "";
				for (let i = event.resultIndex; i < event.results.length; i++) {
					const result = event.results.item(i);
					const transcript = result.item(0)?.transcript ?? "";
					if (result.isFinal) finalChunk += transcript;
					else interimChunk += transcript;
				}
				if (finalChunk) finalText = `${finalText}${finalText && finalChunk ? " " : ""}${finalChunk}`;
				if (interimChunk) interim = interimChunk;
				else if (!finalChunk) interim = "";
				emitInterim();
			};
			recognition.onerror = (event) => {
				if (event.error === "not-allowed" || event.error === "service-not-allowed") {
					settle();
					onError("mic-denied");
				} else if (event.error === "no-speech") {
					settle();
					onError("no-speech");
				} else if (event.error === "aborted") settle();
				else if (event.error === "network") {
					settle();
					onError("network");
				} else {
					settle();
					onError(event.error || "unknown");
				}
			};
			recognition.onend = () => settle();
			recorder.start = () => {
				if (stopped) return;
				startLevelSim();
				maxTimer = setTimeout(() => {
					try {
						recognition.stop();
					} catch {}
				}, behavior.maxRecordMs);
				try {
					recognition.start();
				} catch {}
			};
			recorder.stop = () => {
				if (stopped) {
					const text = finalText.trim();
					deliver(text);
					return Promise.resolve(text);
				}
				return new Promise((resolve) => {
					endResolve = (text) => resolve(text);
					try {
						recognition.stop();
					} catch {
						settle();
					}
				});
			};
			recorder.abort = () => {
				cancelled = true;
				try {
					recognition.abort();
				} catch {}
				settle();
			};
			return recorder;
		}
		/** 分析用 AudioContext（电平表）：懒创建、跨录音复用——AudioContext 创建开销大
		* 且系统资源有限，反复 new/close 会抖动；录音开始接新流、结束断流即可。 */
		let meterCtx = null;
		function getMeterCtx() {
			if (meterCtx !== null) return meterCtx;
			try {
				const windowLike = window;
				const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext;
				meterCtx = AudioCtor ? new AudioCtor() : null;
				return meterCtx;
			} catch {
				return null;
			}
		}
		/** 模块级：电平表当前 source 与 rAF 句柄，供录音结束断流/停帧。 */
		let meterSources = [];
		let meterRaf = null;
		/** 录音结束后停止电平表（断流 + 停帧；AudioContext 保留复用）。 */
		function stopLevelMeter() {
			meterRaf?.cancel();
			meterRaf = null;
			for (const src of meterSources) try {
				src.disconnect();
			} catch {}
			meterSources = [];
		}
		/** 云端引擎：MediaRecorder 采集 → host 代理转写。 */
		function createCloudRecorder(language, onError, behavior) {
			const recorder = {
				onInterim: null,
				onState: null,
				onLevel: null,
				onDone: null,
				onFail: null,
				start: () => {},
				stop: () => Promise.resolve(""),
				abort: () => {}
			};
			let stream = null;
			let mediaRecorder = null;
			let chunks = [];
			let maxTimer = null;
			let stopPromise = null;
			let active = false;
			let cancelled = false;
			let stopRequested = false;
			/** 当前转写请求的 AbortController：abort() 时可取消在途的 host 请求。 */
			let transcribeController = null;
			const pickMime = () => {
				for (const m of [
					"audio/webm;codecs=opus",
					"audio/webm",
					"audio/mp4",
					"audio/ogg;codecs=opus"
				]) if (MediaRecorder.isTypeSupported(m)) return m;
				return "";
			};
			/**
			* 实时音量电平（驱动频谱条）。始终启用（能直观看出麦克风是否采到声）；
			* 仅当 behavior.silenceStop 开启时附带静音自动停止逻辑。
			* 注意：静音判定不依赖此处（Web Audio 双消费/挂起会误读），改由 onstop 里
			* 基于「转换后 WAV 的真实峰值」判定，此处只做实时反馈。
			*/
			const startLevelMeter = () => {
				try {
					const audioCtx = getMeterCtx();
					if (audioCtx === null || stream === null) return;
					for (const src of meterSources) try {
						src.disconnect();
					} catch {}
					meterSources = [];
					const source = audioCtx.createMediaStreamSource(stream);
					const analyser = audioCtx.createAnalyser();
					analyser.fftSize = 1024;
					source.connect(analyser);
					meterSources.push(source);
					const data = new Uint8Array(analyser.fftSize);
					let silentSince = null;
					let raf = 0;
					const loop = () => {
						if (!active) {
							raf = 0;
							return;
						}
						analyser.getByteTimeDomainData(data);
						const rms = rmsFromByteTimeDomain(data);
						recorder.onLevel?.(Math.min(1, rms * 4));
						if (behavior.silenceStop) {
							if (rms < behavior.silenceRms) {
								if (silentSince === null) silentSince = performance.now();
								else if (performance.now() - silentSince > behavior.silenceMs) {
									raf = 0;
									recorder.stop().catch(() => {});
									return;
								}
							} else silentSince = null;
						}
						raf = requestAnimationFrame(loop);
					};
					raf = requestAnimationFrame(loop);
					meterRaf = { cancel: () => {
						if (raf) cancelAnimationFrame(raf);
						raf = 0;
					} };
				} catch {}
			};
			/** 当前输入设备的 Chrome 标签（诊断信息，如 "MacBook Pro 麦克风"）。 */
			const currentInputLabel = () => {
				try {
					return stream?.getAudioTracks()[0]?.label ?? "";
				} catch {
					return "";
				}
			};
			recorder.start = async () => {
				if (active) return;
				if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
					onError("no-mic");
					return;
				}
				let s;
				try {
					s = await navigator.mediaDevices.getUserMedia({ audio: true });
				} catch {
					onError("mic-denied");
					return;
				}
				if (cancelled || stopRequested) {
					stopRequested = false;
					for (const t of s.getTracks()) t.stop();
					active = false;
					if (cancelled) return;
					recorder.onDone?.("");
					return;
				}
				stream = s;
				chunks = [];
				active = true;
				const mime = pickMime();
				try {
					mediaRecorder = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
				} catch {
					onError("recorder-unsupported");
					active = false;
					for (const t of s.getTracks()) t.stop();
					return;
				}
				mediaRecorder.ondataavailable = (e) => {
					if (e.data && e.data.size > 0) chunks.push(e.data);
				};
				stopPromise = new Promise((resolve, reject) => {
					mediaRecorder.onstop = async () => {
						stopLevelMeter();
						if (cancelled) {
							active = false;
							for (const t of stream.getTracks()) t.stop();
							return;
						}
						const type = mediaRecorder?.mimeType?.split(";")[0]?.trim() || "audio/webm";
						const blob = new Blob(chunks, { type });
						recorder.onState?.("transcribing");
						try {
							let audio = blob;
							let wavPeak = -1;
							try {
								const r = await blobToWav16k(blob);
								if (cancelled) {
									active = false;
									for (const t of stream.getTracks()) t.stop();
									return;
								}
								audio = r.wav;
								wavPeak = r.peak;
							} catch {}
							if (isSilentPeak(wavPeak)) {
								if (blob.size > 0) fetch("/api/asr-voice/transcribe?capture=1", {
									method: "POST",
									headers: { "content-type": blob.type || "audio/webm" },
									body: blob
								}).catch(() => {});
								active = false;
								for (const t of stream.getTracks()) t.stop();
								const label = currentInputLabel();
								let devices = "";
								try {
									devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.label !== "").map((d) => d.label).slice(0, 5).join("、");
								} catch {}
								const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
								const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : "未知内核";
								const extra = [
									label,
									devices,
									`浏览器:${br}`
								].filter(Boolean).join(" | ");
								const err = /* @__PURE__ */ new Error(extra === "" ? "no-sound" : `no-sound:${extra}`);
								recorder.onFail?.(err);
								reject(err);
								return;
							}
							const controller = new AbortController();
							transcribeController = controller;
							const text = await transcribeViaHost(audio, language, controller.signal);
							transcribeController = null;
							if (cancelled) {
								active = false;
								for (const t of stream.getTracks()) t.stop();
								return;
							}
							if (text.trim().length <= 8 && blob.size > 0) fetch("/api/asr-voice/transcribe?capture=1", {
								method: "POST",
								headers: { "content-type": blob.type || "audio/webm" },
								body: blob
							}).catch(() => {});
							active = false;
							for (const t of stream.getTracks()) t.stop();
							recorder.onDone?.(text);
							resolve(text);
						} catch (error) {
							active = false;
							for (const t of stream.getTracks()) t.stop();
							if (cancelled) return;
							const err = error instanceof Error ? error : new Error(String(error));
							recorder.onFail?.(err);
							reject(err);
						}
					};
					mediaRecorder.onerror = () => {
						stopLevelMeter();
						active = false;
						if (maxTimer) {
							clearTimeout(maxTimer);
							maxTimer = null;
						}
						if (stream) for (const t of stream.getTracks()) t.stop();
						const err = /* @__PURE__ */ new Error("recorder-error");
						if (!cancelled) recorder.onFail?.(err);
						reject(err);
						stopPromise?.catch(() => {});
					};
				});
				mediaRecorder.start(250);
				recorder.onState?.("recording");
				startLevelMeter();
				maxTimer = setTimeout(() => {
					recorder.stop().catch(() => {});
				}, behavior.maxRecordMs);
			};
			recorder.stop = () => {
				if (!active || !mediaRecorder || !stopPromise) {
					stopRequested = true;
					return Promise.resolve("");
				}
				active = false;
				if (maxTimer) clearTimeout(maxTimer);
				if (mediaRecorder.state !== "inactive") try {
					mediaRecorder.stop();
				} catch {}
				return stopPromise;
			};
			recorder.abort = () => {
				cancelled = true;
				stopRequested = true;
				active = false;
				stopLevelMeter();
				if (maxTimer) clearTimeout(maxTimer);
				transcribeController?.abort();
				transcribeController = null;
				if (mediaRecorder && mediaRecorder.state !== "inactive") try {
					mediaRecorder.stop();
				} catch {}
				if (stream) for (const t of stream.getTracks()) t.stop();
				stopPromise = null;
			};
			return recorder;
		}
		/**
		* 把浏览器录音 blob（webm/m4a/ogg…）解码重编码成 16kHz 单声道 16-bit PCM WAV。
		* MiMo-V2.5-ASR 只接受 wav/mp3（实测 webm/m4a 报 Param Incorrect）；whisper 式
		* 通道也兼容 wav，故统一走 WAV。纯浏览器 Web Audio API，无外部依赖。
		* 返回转换结果 + 归一化前的原始峰值（供静音守卫做 ground-truth 判定）。
		*/
		/** 懒加载复用的 AudioContext（避免每次录音新建/关闭，提升转码流畅性）。 */
		let sharedAudioCtx = null;
		function getAudioContext() {
			if (sharedAudioCtx !== null) return sharedAudioCtx;
			const windowLike = window;
			const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext;
			if (!AudioCtor) throw new Error("audio decode unavailable");
			sharedAudioCtx = new AudioCtor();
			return sharedAudioCtx;
		}
		async function blobToWav16k(blob) {
			const ctx = getAudioContext();
			const arrayBuffer = await blob.arrayBuffer();
			try {
				const audio = await ctx.decodeAudioData(arrayBuffer);
				const channels = [];
				for (let ch = 0; ch < audio.numberOfChannels; ch++) channels.push(audio.getChannelData(ch));
				const pcm = resampleLinear(downmixToMono(channels, audio.length), audio.sampleRate, PCM_SAMPLE_RATE);
				const peak = peakAbs(pcm);
				const bytes = encodeWav16MonoPcm(pcm, PCM_SAMPLE_RATE, normaliseGain(peak));
				return {
					wav: new Blob([bytes], { type: "audio/wav" }),
					peak
				};
			} catch (error) {
				if (sharedAudioCtx !== null) {
					sharedAudioCtx = null;
					try {
						return await blobToWav16k(blob);
					} catch {
						sharedAudioCtx = null;
					}
				}
				throw error;
			}
		}
		/** 上传音频到 host 转写代理（带超时，防上游卡死钉住 UI）。实时按句引擎共用这一条通道。 */
		async function transcribeViaHost(blob, language, externalSignal) {
			const lang = resolveLang(language);
			const query = lang ? `?language=${encodeURIComponent(lang)}` : "";
			const controller = new AbortController();
			const onExternalAbort = () => controller.abort();
			if (externalSignal !== void 0) {
				if (externalSignal.aborted) controller.abort();
				else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
			}
			const timer = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);
			try {
				const res = await fetch(`/api/asr-voice/transcribe${query}`, {
					method: "POST",
					headers: { "content-type": blob.type || "audio/webm" },
					body: blob,
					signal: controller.signal
				});
				const data = await res.json().catch(() => ({}));
				if (!res.ok || data.ok !== true || typeof data.text !== "string") throw new Error(data.reason || "transcribe failed");
				return data.text;
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") throw new Error("transcribe timeout");
				throw error;
			} finally {
				clearTimeout(timer);
				externalSignal?.removeEventListener("abort", onExternalAbort);
			}
		}
		/**
		* 创建统一录音控制器。
		* @param engine - browser | cloud。
		* @param language - auto / zh-CN / en-US 等。
		* @param onError - 错误回调（错误码字符串）。
		* @param behavior - 时长与静音参数（来自 settings，见 config.recordBehavior）。
		*/
		function createVoiceRecorder(engine, language, onError, behavior) {
			if (engine === "cloud") return createCloudRecorder(language, onError, behavior);
			return createBrowserRecorder(language, onError, behavior);
		}
		//#endregion
		//#region src/client/animate.ts
		/** 常用缓动（与 GSAP 同名）。 */
		const EASES = {
			power1: (t) => t,
			"power1.in": (t) => t * t,
			"power1.out": (t) => 1 - (1 - t) * (1 - t),
			"power1.inOut": (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
			"power2.out": (t) => 1 - (1 - t) * (1 - t),
			"power3.out": (t) => 1 - Math.pow(1 - t, 3),
			"power2.inOut": (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
			"back.out": (t) => {
				return 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
			},
			"elastic.out": (t) => {
				if (t === 0 || t === 1) return t;
				const c4 = 2 * Math.PI / 3;
				return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * c4) + 1;
			}
		};
		/** 解析 ease：名字 → 函数。 */
		function toEase(ease) {
			if (typeof ease === "function") return ease;
			return EASES[ease ?? "power1.out"] ?? EASES["power1.out"];
		}
		/** 把 vars 里的数值属性与「起始值」提取出来（跳过控制键）。 */
		function extractNumeric(target, vars, from) {
			const control = /* @__PURE__ */ new Set([
				"duration",
				"delay",
				"ease",
				"onUpdate",
				"onComplete",
				"yoyo",
				"repeat",
				"onStart"
			]);
			const props = {};
			for (const [key, value] of Object.entries(vars)) {
				if (control.has(key)) continue;
				if (typeof value !== "number") continue;
				let start = 0;
				if (from && typeof from[key] === "number") start = from[key];
				else start = currentNumeric(target, key);
				props[key] = start;
			}
			return props;
		}
		/** 读取元素当前数值属性（变换缩写从 computed transform 解析，其余读 computed style）。 */
		function currentNumeric(target, key) {
			const cs = getComputedStyle(target);
			if (key === "x" || key === "y") {
				const m = new DOMMatrixReadOnly(cs.transform);
				return key === "x" ? m.m41 : m.m42;
			}
			if (key === "scale" || key === "scaleX" || key === "scaleY") {
				const m = new DOMMatrixReadOnly(cs.transform);
				if (key === "scale") return m.a;
				if (key === "scaleX") return m.a;
				return m.d;
			}
			if (key === "rotate") {
				const m = new DOMMatrixReadOnly(cs.transform);
				return Math.atan2(m.b, m.a) * (180 / Math.PI);
			}
			const raw = cs.getPropertyValue(key);
			const num = parseFloat(raw);
			return Number.isFinite(num) ? num : 0;
		}
		/** 把数值属性应用到元素样式（变换缩写合并为 transform）。 */
		function applyNumeric(target, props, progress, end, baseMatrix) {
			const transformParts = [];
			for (const [key, start] of Object.entries(props)) {
				const value = start + ((end[key] ?? start) - start) * progress;
				if (key === "x") {
					transformParts.push(`translateX(${value}px)`);
					continue;
				}
				if (key === "y") {
					transformParts.push(`translateY(${value}px)`);
					continue;
				}
				if (key === "scale") {
					transformParts.push(`scale(${value})`);
					continue;
				}
				if (key === "scaleX") {
					transformParts.push(`scaleX(${value})`);
					continue;
				}
				if (key === "scaleY") {
					transformParts.push(`scaleY(${value})`);
					continue;
				}
				if (key === "rotate") {
					transformParts.push(`rotate(${value}deg)`);
					continue;
				}
				if (key === "opacity") {
					target.style.opacity = String(value);
					continue;
				}
				if (key in target.style) target.style[key] = `${value}px`;
			}
			if (transformParts.length > 0) {
				if (baseMatrix !== void 0 && (baseMatrix.m41 !== 0 || baseMatrix.m42 !== 0)) transformParts.unshift(`translate(${baseMatrix.m41}px, ${baseMatrix.m42}px)`);
				target.style.transform = transformParts.join(" ");
			}
		}
		/** 读取元素当前基础 transform 位移（补间开始时一次；无 translate 返回 undefined 跳过保留）。 */
		function baseTranslateOf(target) {
			const cs = getComputedStyle(target);
			try {
				const m = new DOMMatrixReadOnly(cs.transform);
				return m.m41 !== 0 || m.m42 !== 0 ? m : void 0;
			} catch {
				return;
			}
		}
		/** 创建补间：从 from（或当前值）到 to。 */
		function tween(target, to, from) {
			const duration = typeof to.duration === "number" ? to.duration : .5;
			const delay = typeof to.delay === "number" ? to.delay : 0;
			const ease = toEase(typeof to.ease === "string" ? to.ease : void 0);
			const yoyo = to.yoyo === true;
			const repeat = typeof to.repeat === "number" ? to.repeat : 0;
			const onUpdate = typeof to.onUpdate === "function" ? to.onUpdate : void 0;
			const onComplete = typeof to.onComplete === "function" ? to.onComplete : void 0;
			const onStart = typeof to.onStart === "function" ? to.onStart : void 0;
			const startProps = extractNumeric(target, to, from);
			const endProps = {};
			for (const [key, value] of Object.entries(to)) if (typeof value === "number") endProps[key] = value;
			const baseMatrix = Object.keys(startProps).some((k) => k === "x" || k === "y" || k === "scale" || k === "scaleX" || k === "scaleY" || k === "rotate") ? baseTranslateOf(target) : void 0;
			let startTime = null;
			let cycles = 0;
			let killed = false;
			let progressVal = 0;
			let completeCb;
			const tick = (now) => {
				if (killed) return;
				if (startTime === null) {
					startTime = now + delay * 1e3;
					onStart?.();
				}
				if (now < startTime) {
					requestAnimationFrame(tick);
					return;
				}
				const local = (now - startTime) / (duration * 1e3);
				const t = Math.min(1, Math.max(0, local));
				const eased = ease(t);
				applyNumeric(target, startProps, eased, endProps, baseMatrix);
				progressVal = t;
				onUpdate?.({ progress: t });
				if (t >= 1) {
					if (yoyo) {
						cycles += 1;
						if (cycles > repeat) {
							finished();
							return;
						}
						startTime = null;
						for (const k of Object.keys(startProps)) startProps[k] = endProps[k];
						requestAnimationFrame(tick);
						return;
					}
					if (repeat > 0 && cycles < repeat) {
						cycles += 1;
						startTime = null;
						requestAnimationFrame(tick);
						return;
					}
					finished();
					return;
				}
				requestAnimationFrame(tick);
			};
			const finished = () => {
				if (killed) return;
				killed = true;
				onComplete?.();
				completeCb?.();
			};
			requestAnimationFrame(tick);
			return {
				kill: () => {
					killed = true;
				},
				progress: () => progressVal,
				isActive: () => !killed,
				onComplete: (cb) => {
					completeCb = cb;
				}
			};
		}
		/** GSAP 风格 fromTo。 */
		function fromTo(target, from, to) {
			return tween(target, to, from);
		}
		//#endregion
		//#region src/client/voice-button.tsx
		/**
		* dsh-asr-voice — client 录音按钮（conversation.input.right 工具行）。
		*
		* 流程：点击/快捷键 → 录音（浏览器 Web Speech 实时 / 云端 MediaRecorder）
		*   → 停止 → 转写文本 → 提示词优化（heuristic 即时 / llm 预览卡）
		*   → 填入草稿（inputActions.setDraft），可选自动发送（inputActions.submit）。
		*
		* 动效（microanimations 原则：反馈/定向/愉悦，克制）：
		*   - 录音：多层呼吸光环（back.out 缓动、错开延迟、非机械）+ 实时频谱条
		*     （cloud 真实 RMS / browser 模拟能量，CSS 变量驱动）
		*   - 状态提示条：滑入 + 呼吸点（recording）/ 转圈（transcribing/optimizing）
		*   - 按钮：hover 微缩放、active 按压缩放
		*
		* 独立契约：本组件只依赖官方 slot 标准 kit（inputActions / session / input），
		* 不依赖任何第三方插件；样式 data 标签与命名空间唯一。
		*/
		/** 频谱条柱数。 */
		const SPECTRUM_BARS = 12;
		/** 全局录音控制器：只驱动「最后挂载」的实例（当前可见会话）。 */
		const voiceController = {
			toggle: () => {
				current?.toggle();
			},
			isRecording: () => current?.isRecording() ?? false,
			/** 是否处于 busy（录音 / 识别 / 优化）——快捷键据此区分"打断"与"开始"。 */
			isBusy: () => current?.isBusy() ?? false,
			mount(instance) {
				current = instance;
				return () => {
					if (current === instance) current = void 0;
				};
			}
		};
		let current;
		/** 麦克风图标。 */
		function MicIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.8",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "9",
						y: "2.5",
						width: "6",
						height: "11",
						rx: "3"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 11a7 7 0 0 0 14 0" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 18v3.5" })
				]
			});
		}
		/** 录音状态图标（实心圆点，带呼吸）。 */
		function RecDot() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshav-rec-dot" });
		}
		/** 转圈（transcribing / optimizing）。 */
		function Spinner() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "dshav-spinner",
				"aria-hidden": "true"
			});
		}
		/**
		* 频谱条（12 根柱，CSS 变量 --bar 错落）：memo 化——interim 文本每次变化
		* 重渲染按钮（麦克风按钮与对话按钮共用）时柱子的虚拟 DOM 不再重建（柱形是
		* 静态的，仅高度由 CSS 变量 --level 在帧循环驱动）。
		*/
		const SpectrumBars = react.memo(() => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Fragment, { children: Array.from({ length: SPECTRUM_BARS }, (_, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "dshav-bar",
			style: { "--bar": String(.35 + i / 11 * .65) }
		}, i)) }));
		/**
		* 录音按钮 + 状态提示条 + 预览卡。
		* @param props - slot 注入的 owner share + 标准 kit + 翻译函数。
		*/
		function VoiceButton(props) {
			const { inputActions, t } = props;
			const disabled = !inputActions;
			const [state, setState] = react.useState("idle");
			const [error, setError] = react.useState(null);
			const [notice, setNotice] = react.useState(null);
			const [interim, setInterim] = react.useState("");
			const [preview, setPreview] = react.useState(null);
			const [optimizingDraft, setOptimizingDraft] = react.useState(false);
			const wrapRef = react.useRef(null);
			const hintRef = react.useRef(null);
			const spectrumRef = react.useRef(null);
			const levelRef = react.useRef(-1);
			const recorderRef = react.useRef(null);
			const optimizeControllerRef = react.useRef(null);
			const stateRef = react.useRef("idle");
			stateRef.current = state;
			const cancelledRef = react.useRef(false);
			const generationRef = react.useRef(0);
			const draftRef = react.useRef("");
			const insertedRef = react.useRef(null);
			react.useEffect(() => {
				draftRef.current = props.input?.draft ?? "";
			}, [props.input?.draft]);
			react.useEffect(() => {
				if (error === null && notice === null) return;
				const timer = setTimeout(() => {
					setError(null);
					setNotice(null);
				}, 6e3);
				return () => clearTimeout(timer);
			}, [error, notice]);
			const dismissHint = () => {
				setError(null);
				setNotice(null);
			};
			const handlersRef = react.useRef({
				begin: async () => {},
				finish: () => {},
				cancel: () => {}
			});
			const instance = react.useMemo(() => ({
				toggle: () => {
					if (stateRef.current === "idle") handlersRef.current.begin();
					else if (stateRef.current === "recording") handlersRef.current.finish();
					else handlersRef.current.cancel();
				},
				isRecording: () => stateRef.current === "recording",
				isBusy: () => stateRef.current !== "idle"
			}), []);
			react.useEffect(() => voiceController.mount(instance), [instance]);
			const setPhase = (next) => {
				stateRef.current = next;
				setState(next);
			};
			const showError = (code, detail) => {
				if (code === "transcribe" && detail?.startsWith("no-sound")) {
					const label = detail.slice(8).replace(/^:/, "");
					const shown = label.length > 80 ? `${label.slice(0, 80)}…` : label;
					setError(`${t("errNoSound")}${shown ? `（${shown}）` : ""}`);
					setNotice(null);
					setPhase("idle");
					return;
				}
				const msg = code === "mic-denied" || code === "no-mic" ? t("errNoMic") : code === "no-speech-support" ? t("errNoSpeechSupport") : code === "network" ? t("errWebSpeechNetwork") : code === "cloud-not-configured" ? t("errCloudNotConfigured") : code === "optimize" ? `${t("errOptimize")}${detail ? `: ${detail}` : ""}` : `${t("errTranscribe")}${detail ? `: ${detail}` : ""}`;
				setError(msg);
				setNotice(null);
				setPhase("idle");
			};
			/** 解析最终引擎：auto = 浏览器优先（Web Speech 可用时），否则回落到已配置的云端。 */
			const resolveEngine = () => {
				const provider = config.asr.provider;
				if (provider === "cloud") return "cloud";
				if (provider === "browser") return "browser";
				if (!isWebSpeechSupported()) return cloudConfigured() ? "cloud" : "browser";
				return "browser";
			};
			/** 启动指定引擎的录音（云端自动兜底：auto 模式下浏览器失败 → 云端重试一次）。 */
			const startWithEngine = (engine) => {
				let recorder;
				const myGen = generationRef.current;
				const stale = () => cancelledRef.current || generationRef.current !== myGen;
				try {
					recorder = createVoiceRecorder(engine, config.language, (code) => {
						if (stale()) return;
						if (code === "no-speech") {
							setPhase("idle");
							setError(null);
							setNotice(t("noSpeechDetected"));
							return;
						}
						const recoverable = code === "network" || code === "not-allowed" || code === "service-not-allowed" || code === "no-speech-support";
						if (engine === "browser" && config.asr.provider === "auto" && recoverable && cloudConfigured()) {
							setNotice(t("fallbackToCloud"));
							startWithEngine("cloud");
							return;
						}
						showError(code);
					}, recordBehavior());
				} catch {
					if (engine === "browser" && config.asr.provider === "auto" && cloudConfigured()) {
						setNotice(t("fallbackToCloud"));
						startWithEngine("cloud");
						return;
					}
					showError("no-speech-support");
					return;
				}
				recorderRef.current = recorder;
				levelRef.current = -1;
				recorder.onInterim = (text) => {
					if (!stale()) setInterim(text);
				};
				recorder.onState = (s) => {
					if (s === "transcribing" && !stale()) setPhase("transcribing");
				};
				recorder.onLevel = (rms) => {
					const was = levelRef.current;
					if (spectrumRef.current && Math.abs(rms - was) >= .01) {
						levelRef.current = rms;
						spectrumRef.current.style.setProperty("--level", rms.toFixed(2));
					}
				};
				recorder.onDone = (text) => {
					if (!stale()) handleTranscribed(text);
				};
				recorder.onFail = (error) => {
					if (!stale()) showTranscribeError(error);
				};
				setPhase("recording");
				startWave();
				recorder.start();
			};
			const begin = async () => {
				setError(null);
				setNotice(null);
				setInterim("");
				setOptimizingDraft(false);
				setPreview(null);
				cancelledRef.current = false;
				generationRef.current += 1;
				optimizeControllerRef.current = new AbortController();
				const engine = resolveEngine();
				if (engine === "cloud" && !cloudConfigured()) {
					showError("cloud-not-configured");
					return;
				}
				if (engine === "browser" && !isWebSpeechSupported()) {
					showError("no-speech-support");
					return;
				}
				startWithEngine(engine);
			};
			/** 转写错误统一入口（onFail）：取消后到达的错误一律丢弃。 */
			const showTranscribeError = (error) => {
				if (cancelledRef.current) return;
				recorderRef.current = null;
				showError("transcribe", String(error instanceof Error ? error.message : error));
			};
			/**
			* 转写完成统一入口（onDone）：默认快速路径（preview=false）——ASR 文本返回后
			* 立即把清洗版填入草稿，LLM 优化在后台跑；preview / autoSend 走等优化路径。
			*/
			const handleTranscribed = (text) => {
				if (cancelledRef.current) return;
				const myGen = generationRef.current;
				recorderRef.current = null;
				const cleaned = text.trim();
				if (cleaned === "") {
					setPhase("idle");
					return;
				}
				if (config.optimize.mode === "llm") {
					const clean = heuristicOptimize(cleaned);
					if (config.behavior.autoSend || config.optimize.preview) {
						if (clean === cleaned) {
							finalize(cleaned);
							return;
						}
						setPhase("optimizing");
						llmOptimize(cleaned, {
							provider: config.optimize.llm.provider,
							model: config.optimize.llm.model
						}, optimizeControllerRef.current?.signal).then((optimized) => {
							if (cancelledRef.current || generationRef.current !== myGen) return;
							if (config.optimize.preview) {
								setPreview({
									original: cleaned,
									optimized
								});
								setPhase("idle");
							} else finalize(optimized);
						}).catch((error) => {
							if (cancelledRef.current || generationRef.current !== myGen) return;
							showError("optimize", String(error instanceof Error ? error.message : error));
						});
						return;
					}
					const fast = clean || cleaned;
					insertedRef.current = fast;
					finalize(fast);
					setOptimizingDraft(true);
					setPhase("optimizing");
					runBackgroundOptimize(cleaned);
					return;
				}
				finalize(heuristicOptimize(cleaned));
			};
			/**
			* 快速路径（preview=false 默认）：ASR 文本返回后立即把清洗版填入草稿，
			* LLM 优化在后台跑，完成后仅在用户未编辑草稿时替换。
			*/
			const runBackgroundOptimize = async (raw) => {
				const myGen = generationRef.current;
				try {
					const optimized = await llmOptimize(raw, {
						provider: config.optimize.llm.provider,
						model: config.optimize.llm.model
					}, optimizeControllerRef.current?.signal);
					if (cancelledRef.current || generationRef.current !== myGen) return;
					if (draftRef.current === insertedRef.current && inputActions !== void 0) inputActions.setDraft(optimized);
				} catch {
					if (cancelledRef.current || generationRef.current !== myGen) return;
					setNotice(t("optimizeFailedKeep"));
				} finally {
					if (cancelledRef.current || generationRef.current !== myGen) return;
					insertedRef.current = null;
					setOptimizingDraft(false);
					setPhase("idle");
				}
			};
			/** 手动停止：结束录音并进入识别（结果经 onDone 送达）。 */
			const finish = () => {
				const recorder = recorderRef.current;
				if (!recorder) {
					setPhase("idle");
					return;
				}
				stopWave();
				setNotice(null);
				setPhase("transcribing");
				recorder.stop().catch(() => {});
			};
			/** 打断：中止录音 / 转写 / 优化，丢弃一切迟到结果，回到 idle。 */
			const cancel = () => {
				if (cancelledRef.current && stateRef.current === "idle") return;
				cancelledRef.current = true;
				const recorder = recorderRef.current;
				recorderRef.current = null;
				optimizeControllerRef.current?.abort();
				optimizeControllerRef.current = null;
				if (recorder) recorder.abort();
				stopWave();
				setInterim("");
				insertedRef.current = null;
				setOptimizingDraft(false);
				setPreview(null);
				setNotice(null);
				setError(null);
				setPhase("idle");
			};
			/** 把最终文本填入草稿（完整替换 / 末尾追加）+ 可选剪贴板。 */
			const finalize = (text) => {
				if (text === "") {
					setPhase("idle");
					return;
				}
				if (inputActions) {
					if (config.behavior.textMode === "append") {
						const existing = draftRef.current;
						const sep = existing !== "" && !/[ \n]$/.test(existing) ? " " : "";
						inputActions.setDraft(existing + sep + text);
					} else inputActions.setDraft(text);
					if (config.behavior.autoSend) inputActions.submit();
				}
				if (config.behavior.copyToClipboard) try {
					navigator.clipboard?.writeText(text).catch(() => {});
				} catch {}
				setPhase("idle");
			};
			handlersRef.current = {
				begin,
				finish,
				cancel
			};
			const onConfirm = () => {
				if (preview) finalize(preview.optimized);
				setPreview(null);
			};
			const waveHandlesRef = react.useRef([]);
			const startWave = () => {
				const wrap = wrapRef.current;
				if (!wrap) return;
				stopWave();
				wrap.querySelectorAll(".dshav-wave-ring").forEach((ring, i) => {
					ring.style.opacity = "0.5";
					const handle = fromTo(ring, {
						scale: .72,
						opacity: .5
					}, {
						scale: 1.9 + i % 2 * .35,
						opacity: 0,
						duration: 1.35 + i % 2 * .2,
						delay: i * .24,
						ease: "back.out",
						repeat: Infinity
					});
					waveHandlesRef.current.push(handle);
				});
			};
			const stopWave = () => {
				for (const handle of waveHandlesRef.current) try {
					handle.kill();
				} catch {}
				waveHandlesRef.current = [];
				const wrap = wrapRef.current;
				if (!wrap) return;
				wrap.querySelectorAll(".dshav-wave-ring").forEach((ring) => {
					ring.style.opacity = "0";
					ring.style.transform = "";
				});
			};
			react.useEffect(() => () => {
				stopWave();
				recorderRef.current?.abort();
				optimizeControllerRef.current?.abort();
			}, []);
			const busy = state !== "idle";
			const title = busy ? state === "recording" ? t("recordingTitle") : state === "transcribing" ? t("transcribingTitle") : t("optimizingTitle") : t("micTitle");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dshav-mic-wrap",
				ref: wrapRef,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "dshav-mic-button",
						"data-state": state,
						title,
						"aria-label": title,
						"aria-pressed": state === "recording",
						disabled,
						onClick: () => {
							if (state === "idle") begin();
							else if (state === "recording") finish();
							else cancel();
						},
						children: [state === "recording" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecDot, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MicIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "dshav-wave",
							"aria-hidden": "true",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-wave-ring",
									"data-ring": "1"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-wave-ring",
									"data-ring": "2"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-wave-ring",
									"data-ring": "3"
								})
							]
						})]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-hotkey-hint",
						"data-kind": "err",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-dot",
								style: { background: "var(--dshav-danger)" }
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: error
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-hint-dismiss",
								"aria-label": t("dismiss"),
								onClick: dismissHint,
								children: "×"
							})
						]
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-hotkey-hint",
						"data-kind": "notice",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshav-dot" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: notice
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-hint-dismiss",
								"aria-label": t("dismiss"),
								onClick: dismissHint,
								children: "×"
							})
						]
					}),
					busy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-hotkey-hint",
						"data-state": state,
						ref: hintRef,
						role: "status",
						children: [
							state === "recording" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshav-dot" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}),
							state === "recording" && interim !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: interim
							}) : null,
							state === "optimizing" && optimizingDraft ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: t("optimizingHint")
							}) : null,
							state === "transcribing" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: t("transcribingHint")
							}) : null,
							state === "recording" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-spectrum",
								ref: spectrumRef,
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SpectrumBars, {})
							}),
							state !== "recording" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-hint-dismiss",
								"aria-label": t("cancelBusy"),
								title: t("cancelBusy"),
								onClick: cancel,
								children: "×"
							})
						]
					})
				]
			}), preview !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-preview",
				role: "dialog",
				"aria-label": t("previewTitle"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshav-preview-title",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MicIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("previewTitle") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshav-preview-body",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-preview-block",
							"data-role": "original",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-preview-label",
								children: t("previewOriginal")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dshav-preview-text",
								"data-role": "original",
								children: preview.original
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-preview-block",
							"data-role": "optimized",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-preview-label",
								children: t("previewOptimized")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "dshav-preview-text",
								"data-role": "optimized",
								children: preview.optimized
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshav-preview-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dshav-button dshav-button-outline dshav-button-sm",
							onClick: () => setPreview(null),
							children: t("previewCancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dshav-button dshav-button-primary dshav-button-sm",
							onClick: onConfirm,
							children: t("previewConfirm")
						})]
					})
				]
			})] });
		}
		//#endregion
		//#region src/client/capture.ts
		/**
		* dsh-asr-voice — 麦克风 → 16 kHz 单声道 PCM 帧（AudioWorklet，port 回调驱动）。
		*
		* 实时链路的采集底座，本地 VAD 引擎与后续 host 上行通道（I3/I4）共用它。分帧必须由
		* worklet port 回调驱动，**不能用 `setInterval` 排片**：后台标签页定时器被节流到 1/s
		* 会直接饿死上行。
		*
		* 与整段模式相反，这里必须显式请求回声消除：播报期间我们自己的 TTS 会被同一支麦克风
		* 收回来，`{ echoCancellation: true }` 是唯一能白拿的抵消手段（`recorder.ts:59-62` 那组
		* 「故意不设」是另一条路径的教训——显式 `false` 在部分 macOS 设备上会得到纯静音）。
		*/
		/**
		* 设备链路失效判据：探测期内峰值连噪声底都没到，说明轨道根本没在产出数据
		* （协商失败时浏览器给的是数字零，而不是环境噪声）。阈值刻意远低于
		* `SILENCE_PEAK_FLOOR`：那是「用户没说话」的量级，这里是「没有声音」。
		*/
		const DEAD_DEVICE_PEAK = 5e-4;
		/** 判死前的观察窗口（毫秒）：安静房间里前几秒没有峰值是常态，别急着报错。 */
		const DEAD_DEVICE_PROBE_MS = 4e3;
		/** worklet 处理器名。 */
		const WORKLET_NAME = "dshav-pcm-slicer";
		/**
		* worklet 源码按行拼接：直接写一大段 JS 字面量会撞上本仓已知的输出静默截断坑。
		* 改动这里必须回读 `lib/client.js` 确认落盘。
		*/
		const WORKLET_LINES = [
			"class DshavPcmSlicer extends AudioWorkletProcessor {",
			"  constructor(options) {",
			"    super()",
			"    const frameMs = (options && options.processorOptions && options.processorOptions.frameMs) || 40",
			"    this.n = Math.max(1, Math.round(sampleRate * frameMs / 1000))",
			"    this.buf = new Float32Array(this.n)",
			"    this.len = 0",
			"  }",
			"  process(inputs) {",
			"    const ch = inputs[0] ? inputs[0][0] : null",
			"    if (ch) {",
			"      for (let i = 0; i < ch.length; i++) {",
			"        this.buf[this.len++] = ch[i]",
			"        if (this.len >= this.n) {",
			"          const out = this.buf.slice(0)",
			"          this.port.postMessage(out, [out.buffer])",
			"          this.len = 0",
			"        }",
			"      }",
			"    }",
			"    return true",
			"  }",
			"}",
			`registerProcessor('${WORKLET_NAME}', DshavPcmSlicer)`
		];
		/** 采集用 AudioContext：懒创建并跨会话复用（新建上下文的开销和数量上限都不划算）。 */
		let captureCtx = null;
		function getCaptureCtx() {
			if (captureCtx !== null) return captureCtx;
			const windowLike = window;
			const AudioCtor = windowLike.AudioContext ?? windowLike.webkitAudioContext;
			if (!AudioCtor) return null;
			captureCtx = new AudioCtor({ latencyHint: "interactive" });
			return captureCtx;
		}
		/** 是否具备 PCM 采集的基本条件（精确的 worklet 缺失只能在运行时报 `no-worklet`）。 */
		function isPcmCaptureSupported() {
			if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
			const windowLike = window;
			return Boolean(windowLike.AudioContext ?? windowLike.webkitAudioContext);
		}
		/** 实时采集需要的约束：显式请求 AEC，其余交给浏览器默认。 */
		function micConstraints() {
			return {
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true,
					channelCount: 1
				},
				video: false
			};
		}
		const NOOP_CAPTURE = {
			stop: () => {},
			setMuted: () => {}
		};
		/**
		* 打开麦克风并按 `frameMs` 产出 16k 帧。
		*
		* 不 reject：所有失败都以 `onFail(code)` 送达并返回一个空操作会话，调用方只有一条
		* 错误出口。前若干语句是同步的——Safari 只在用户激活上下文里允许建立音频会话，
		* 所以调用方必须在点击回调里同步调它。
		*/
		async function startPcmCapture(options) {
			const ctx = getCaptureCtx();
			if (ctx === null) {
				options.onFail("no-audio-context");
				return NOOP_CAPTURE;
			}
			ctx.resume().catch(() => {});
			let stream;
			try {
				stream = await navigator.mediaDevices.getUserMedia(micConstraints());
			} catch {
				options.onFail("no-mic");
				return NOOP_CAPTURE;
			}
			if (typeof ctx.audioWorklet?.addModule !== "function") {
				stream.getTracks().forEach((t) => t.stop());
				options.onFail("no-worklet");
				return NOOP_CAPTURE;
			}
			const blobUrl = URL.createObjectURL(new Blob([WORKLET_LINES.join("\n")], { type: "application/javascript" }));
			let node = null;
			let source = null;
			let mutedSink = null;
			let stopped = false;
			let probeTimer = null;
			/** 重采样只在浏览器没按 16k 交付时才做（Safari 会忽略请求的采样率）。 */
			const sourceRate = ctx.sampleRate;
			let probePeak = 0;
			let probeDone = false;
			const teardown = () => {
				if (stopped) return;
				stopped = true;
				if (probeTimer !== null) clearTimeout(probeTimer);
				probeTimer = null;
				if (node) node.port.onmessage = null;
				try {
					node?.disconnect();
				} catch {}
				try {
					mutedSink?.disconnect();
				} catch {}
				try {
					source?.disconnect();
				} catch {}
				node = null;
				source = null;
				mutedSink = null;
				stream.getTracks().forEach((t) => t.stop());
				URL.revokeObjectURL(blobUrl);
			};
			function onMessage(event) {
				if (stopped) return;
				const raw = event.data;
				const pcm = sourceRate === 16e3 ? raw : resampleLinear(raw, sourceRate, PCM_SAMPLE_RATE);
				if (!probeDone) probePeak = Math.max(probePeak, peakAbs(pcm));
				options.onFrame(pcm);
			}
			try {
				await ctx.audioWorklet.addModule(blobUrl);
				node = new AudioWorkletNode(ctx, WORKLET_NAME, {
					numberOfInputs: 1,
					numberOfOutputs: 1,
					channelCount: 1,
					channelCountMode: "explicit",
					channelInterpretation: "discrete",
					processorOptions: { frameMs: options.frameMs }
				});
				source = ctx.createMediaStreamSource(stream);
				mutedSink = ctx.createGain();
				mutedSink.gain.value = 0;
				source.connect(node);
				node.connect(mutedSink);
				mutedSink.connect(ctx.destination);
				node.port.onmessage = onMessage;
			} catch {
				stream.getTracks().forEach((t) => t.stop());
				URL.revokeObjectURL(blobUrl);
				options.onFail("no-worklet");
				return NOOP_CAPTURE;
			}
			probeTimer = setTimeout(() => {
				probeDone = true;
				if (stopped || probePeak >= DEAD_DEVICE_PEAK) return;
				teardown();
				options.onFail("silent-device");
			}, DEAD_DEVICE_PROBE_MS);
			return {
				stop() {
					teardown();
				},
				setMuted(muted) {
					stream.getAudioTracks().forEach((t) => {
						t.enabled = !muted;
					});
				}
			};
		}
		//#endregion
		//#region src/client/vad.ts
		/**
		* dsh-asr-voice — 本地能量 VAD（纯函数，模块顶层不碰 DOM，可被 node --test 直接跑源码）。
		*
		* 近实时引擎用它把连续麦克风切成一句一句，每句走已有的整段转写通道：不需要新协议，
		* 也不需要任何云商 key。判据只有 RMS，因此阈值是**设备噪声底**的函数——调高会切掉
		* 轻声句尾，调低会把呼吸和键盘当成话；两者都是可预期的失效，不是 bug。
		*
		* 段边界规则：有声窗开启一段并带上 `prerollMs` 的段前缓冲（否则第一个音节必被切掉），
		* 连续静音 `silenceMs` 关闭一段，实际语音时长不足 `minSpeechMs` 的段直接丢弃（杂音不
		* 该花一次上游配额），说到 `maxSegmentMs` 还没停则强制轮换——它同时是单次上传体大小
		* 的上限。段内保留收尾静音：那段静音正是「这句说完了」的证据，省它省不出正确性。
		*/
		/**
		* 分析窗长（毫秒）。固定不开放：窗长是判定的时间分辨率而不是偏好，放到设置里
		* 就允许出现 `silenceMs < frameMs` 这类自相矛盾的组合。
		*/
		const WINDOW_MS = 20;
		/** 把若干窗拼成一段连续采样。 */
		function concatWindows(windows) {
			let n = 0;
			for (const w of windows) n += w.length;
			const out = new Float32Array(n);
			let off = 0;
			for (const w of windows) {
				out.set(w, off);
				off += w.length;
			}
			return out;
		}
		/**
		* 构造一个能量 VAD。`sampleRate` 必须是投喂帧的采样率（本项目为 PCM_SAMPLE_RATE）。
		* `floor` 可选：`tuning.rmsAuto` 时 VAD 每窗把 RMS 与语音期判定反馈给它，并用
		* `floor.threshold`（未学到时为 0）抬高/放低实际判据。
		*/
		function createEnergyVad(sampleRate, tuning, events, floor) {
			const windowSamples = Math.max(1, Math.round(sampleRate * WINDOW_MS / 1e3));
			const prerollWindows = Math.max(0, Math.round(tuning.prerollMs / WINDOW_MS));
			const silenceWindows = Math.max(1, Math.round(tuning.silenceMs / WINDOW_MS));
			const minSpeechWindows = Math.max(1, Math.round(tuning.minSpeechMs / WINDOW_MS));
			const maxSegmentWindows = Math.max(minSpeechWindows + 1, Math.round(tuning.maxSegmentMs / WINDOW_MS));
			const win = new Float32Array(windowSamples);
			let winLen = 0;
			let preroll = [];
			let segment = [];
			/** 当前段内**有声**窗数：静音不计，所以它衡量的是「真说了多久」。 */
			let speechWindows = 0;
			let silenceRun = 0;
			let speaking = false;
			const emitSegment = () => {
				const windows = segment;
				const spoken = speechWindows;
				segment = [];
				speechWindows = 0;
				if (windows.length === 0 || spoken < minSpeechWindows) return;
				events.onSegment(concatWindows(windows));
			};
			const handleWindow = (w) => {
				const rms = rmsOfFloat(w);
				const auto = tuning.rmsAuto === true && floor !== void 0 && floor !== null;
				floor?.observe(rms, speaking);
				if (auto && floor?.threshold === 0) {
					preroll.push(w);
					if (preroll.length > prerollWindows) preroll.shift();
					return;
				}
				const voiced = rms > (auto ? Math.max(tuning.rms, floor.threshold) : tuning.rms);
				if (!speaking) {
					if (!voiced) {
						preroll.push(w);
						if (preroll.length > prerollWindows) preroll.shift();
						return;
					}
					speaking = true;
					silenceRun = 0;
					speechWindows = 1;
					segment = [...preroll, w];
					preroll = [];
					events.onSpeech(true);
					return;
				}
				segment.push(w);
				if (voiced) {
					speechWindows += 1;
					silenceRun = 0;
				} else silenceRun += 1;
				if (silenceRun >= silenceWindows) {
					speaking = false;
					emitSegment();
					events.onSpeech(false);
					return;
				}
				if (speechWindows >= maxSegmentWindows) emitSegment();
			};
			/** 把攒着的半窗当一窗处理掉：那通常是用户刚说完的最后几十毫秒。 */
			const drainPartial = () => {
				if (winLen === 0) return;
				const tail = win.slice(0, winLen);
				winLen = 0;
				handleWindow(tail);
			};
			return {
				feed(chunk) {
					for (let i = 0; i < chunk.length; i++) {
						win[winLen++] = chunk[i] ?? 0;
						if (winLen < windowSamples) continue;
						winLen = 0;
						handleWindow(win.slice(0));
					}
				},
				flush() {
					drainPartial();
					if (!speaking) return;
					speaking = false;
					silenceRun = 0;
					emitSegment();
					events.onSpeech(false);
				},
				reset() {
					const wasSpeaking = speaking;
					winLen = 0;
					preroll = [];
					segment = [];
					speechWindows = 0;
					silenceRun = 0;
					speaking = false;
					if (wasSpeaking) events.onSpeech(false);
				},
				get inSpeech() {
					return speaking;
				}
			};
		}
		//#endregion
		//#region src/client/rms-floor.ts
		/** 估计器默认参数：2s 观测窗、p30、×3 裕量、40ms 帧。 */
		const DEFAULT_RMS_FLOOR_TUNING = {
			windowMs: 2e3,
			quantile: .3,
			margin: 3,
			frameMs: 40
		};
		/** 构造估计器。`windowMs`/`quantile`/`margin` 来自 tuning。 */
		function createRmsFloorEstimator(tuning = DEFAULT_RMS_FLOOR_TUNING) {
			const cap = Math.max(4, Math.round(tuning.windowMs / tuning.frameMs));
			const buf = new Float64Array(cap);
			const sorted = new Float64Array(cap);
			let len = 0;
			let head = 0;
			const observe = (rms, speechActive) => {
				if (speechActive || !Number.isFinite(rms) || rms <= 0) return;
				buf[head] = rms;
				head = (head + 1) % cap;
				if (len < cap) len += 1;
			};
			const floor = () => {
				if (len === 0) return 0;
				for (let i = 0; i < len; i++) sorted[i] = buf[i] ?? 0;
				for (let i = 1; i < len; i++) {
					const v = sorted[i] ?? 0;
					let j = i - 1;
					while (j >= 0 && (sorted[j] ?? 0) > v) {
						sorted[j + 1] = sorted[j] ?? 0;
						j -= 1;
					}
					sorted[j + 1] = v;
				}
				const idx = Math.min(len - 1, Math.max(0, Math.floor(len * tuning.quantile)));
				return sorted[idx] ?? 0;
			};
			return {
				observe,
				get floor() {
					return floor();
				},
				get threshold() {
					const f = floor();
					return len >= cap ? f * tuning.margin : 0;
				},
				reset() {
					len = 0;
					head = 0;
				}
			};
		}
		const DEFAULT_BARGE_IN_TUNING = {
			graceMs: 800,
			windowMs: 1600,
			quantile: .25,
			headroom: 3,
			holdMs: 350,
			frameMs: 40,
			baselineRms: .02
		};
		function createBargeInGate(tuning = DEFAULT_BARGE_IN_TUNING) {
			const cap = Math.max(4, Math.round(tuning.windowMs / tuning.frameMs));
			const buf = new Float64Array(cap);
			const sorted = new Float64Array(cap);
			let len = 0;
			let head = 0;
			let armed = false;
			/** 宽限期内已消耗的帧数。 */
			let graceLeft = 0;
			/** 当前「持续超出背景」的帧数（超出持续了多久）。 */
			let overRun = 0;
			/** 静音期底噪（不用单独估计器：把低于背景的观测当噪声学进窗口，天然含底噪）。 */
			let background = 0;
			const push = (rms) => {
				if (rms < (tuning.baselineRms ?? 0)) return;
				if (background > 0 && rms > background * tuning.headroom) return;
				buf[head] = rms;
				head = (head + 1) % cap;
				if (len < cap) len += 1;
			};
			const updateBackground = () => {
				if (len === 0) return;
				for (let i = 0; i < len; i++) sorted[i] = buf[i] ?? 0;
				for (let i = 1; i < len; i++) {
					const v = sorted[i] ?? 0;
					let j = i - 1;
					while (j >= 0 && (sorted[j] ?? 0) > v) {
						sorted[j + 1] = sorted[j] ?? 0;
						j -= 1;
					}
					sorted[j + 1] = v;
				}
				const idx = Math.min(len - 1, Math.max(0, Math.floor(len * tuning.quantile)));
				background = sorted[idx] ?? 0;
			};
			const feed = (rms, _speechActive) => {
				if (!armed) return false;
				if (graceLeft > 0) {
					push(rms);
					graceLeft -= 1;
					if (graceLeft === 0) updateBackground();
					return false;
				}
				push(rms);
				if (head % 8 === 0) updateBackground();
				if (!(background > 0 && rms > background * tuning.headroom)) {
					overRun = 0;
					return false;
				}
				overRun += 1;
				if (overRun < Math.max(1, Math.round(tuning.holdMs / tuning.frameMs))) return false;
				armed = false;
				len = 0;
				head = 0;
				overRun = 0;
				return true;
			};
			return {
				arm() {
					armed = true;
					len = 0;
					head = 0;
					graceLeft = Math.max(1, Math.round(tuning.graceMs / tuning.frameMs));
					overRun = 0;
					background = 0;
				},
				disarm() {
					armed = false;
					len = 0;
					head = 0;
					graceLeft = 0;
					overRun = 0;
				},
				feed,
				get armed() {
					return armed;
				}
			};
		}
		//#endregion
		//#region src/client/realtime-cloud.ts
		/**
		* dsh-asr-voice — 实时转写引擎·云端通道（cloud）。
		*
		* I4 交付：把 `capture.ts` 的 16k 采集帧上行到 host 实时通道（I3 的
		* `RealtimeHost`），下行经 SSE 收到 `RealtimeProviderEvent`，驱动字幕与回合。
		* 这第三档引擎与 browser（Web Speech）/ segmented（本地 VAD + 整段转写）的
		* 区别：**回合边界由服务端 VAD 给**（provider 发 speech-stopped/final），
		* 本地不再用文字静默判定——换来的是逐字延迟更低的流式体验，代价是必须有
		* 一条 host 实时通道（I3 已交付，I3 阶段用假 provider，I5 换真云端）。
		*
		* 传输层是注入的（`CloudTransport`）：单测直接喂假事件与假采集，不碰网络。
		* 真实的浏览器实现见 `realtime-cloud-transport.ts`。
		*
		* 回合语义：provider 发 `final` 即「这一句说完了」，直接 onTurn；`partial`
		* 驱动字幕；`error` 判死。采集帧在**静音守卫**（趋零不上行）之后量化成
		* int16 LE 字节逐帧上行。
		*/
		/** Float32 帧 → int16 LE 字节（16k 单声道；归一化只在需要时做一次）。 */
		function floatToInt16Le(pcm, gain = 1) {
			const out = new Uint8Array(pcm.length * 2);
			const view = new DataView(out.buffer);
			for (let i = 0; i < pcm.length; i++) view.setInt16(i * 2, quantiseInt16(pcm[i] ?? 0, gain), true);
			return out;
		}
		/** 连续失败判死阈值（上游 error 达此数即结束会话）。 */
		const CLOUD_FAIL_LIMIT = 3;
		/** 上行串行泵：采集帧在回调里来，网络上行是异步的——必须排队逐帧发，不能并发堆叠。 */
		function createUploadPump(upload) {
			let queue = [];
			let inFlight = false;
			const pump = () => {
				if (inFlight) return;
				const next = queue.shift();
				if (next === void 0) return;
				inFlight = true;
				upload(next).finally(() => {
					inFlight = false;
					pump();
				});
			};
			return {
				push(pcm) {
					queue.push(pcm);
					pump();
				},
				clear() {
					queue = [];
				}
			};
		}
		/**
		* 云端实时引擎：采集帧 → int16 上行 → SSE 事件驱动字幕/回合。
		* @param deps - 采集 + 传输层（测试注入；浏览器用默认实现）。
		*/
		function createCloudRealtime(tuning, events, deps) {
			let active = false;
			let paused = true;
			let capture = null;
			let disposeEvents = null;
			let sid = "";
			let failures = 0;
			let pump = createUploadPump((pcm) => deps.transport.upload(sid, pcm));
			/** 会话代际：stop/start 换代会作废在途的上行与事件。 */
			let generation = 0;
			const teardown = () => {
				pump.clear();
				disposeEvents?.();
				disposeEvents = null;
				capture?.stop();
				capture = null;
			};
			const failNow = (code) => {
				active = false;
				paused = true;
				const gen = generation;
				teardown();
				if (sid !== "") deps.transport.closeSession(sid).catch(() => {});
				if (gen === generation) events.onFail(code);
			};
			const onProviderEvent = (ev) => {
				if (!active || paused) return;
				if (ev.type === "partial") events.onPartial(ev.text);
				else if (ev.type === "final") {
					failures = 0;
					const text = ev.text.trim();
					if (text !== "") events.onTurn(text);
				} else if (ev.type === "error") {
					failures += 1;
					if (failures >= CLOUD_FAIL_LIMIT) failNow(ev.code || "provider-unreachable");
				}
			};
			const openCapture = () => {
				deps.capture({
					frameMs: tuning.frameMs,
					onFrame: (pcm) => {
						if (!active || paused) return;
						if (peakAbs(pcm) < .005) return;
						pump.push(floatToInt16Le(pcm));
					},
					onFail: (code) => {
						if (active) failNow(code);
					}
				}).then((next) => {
					if (!active || paused) {
						next.stop();
						return;
					}
					capture = next;
				}, () => {
					if (active) failNow("capture-failed");
				});
			};
			return {
				start() {
					if (active) return;
					active = true;
					paused = false;
					const gen = ++generation;
					pump = createUploadPump((pcm) => deps.transport.upload(sid, pcm));
					deps.transport.createSession().then((next) => {
						if (!active || gen !== generation) {
							deps.transport.closeSession(next).catch(() => {});
							return;
						}
						sid = next;
						disposeEvents = deps.transport.openEvents(next, onProviderEvent);
						openCapture();
					}, () => {
						if (active && gen === generation) failNow("provider-unreachable");
					});
				},
				pause() {
					if (!active || paused) return;
					paused = true;
					pump.clear();
					capture?.setMuted(true);
				},
				resume() {
					if (!active || !paused) return;
					paused = false;
					capture?.setMuted(false);
					if (capture === null) openCapture();
				},
				stop() {
					if (!active) return;
					active = false;
					paused = true;
					generation += 1;
					const closeSid = sid;
					teardown();
					if (closeSid !== "") deps.transport.closeSession(closeSid).catch(() => {});
				},
				get listening() {
					return active && !paused;
				}
			};
		}
		/** 默认采集（真实麦克风）。 */
		function defaultCloudCapture(options) {
			return startPcmCapture(options);
		}
		//#endregion
		//#region src/client/realtime-cloud-transport.ts
		const BASE = "/api/asr-voice/realtime";
		/** 会话建连/上行超时（毫秒）：host 本机回环，正常远低于此。 */
		const ROUTE_TIMEOUT_MS = 15e3;
		/** 一次简单 POST，返回 JSON；非 ok 抛错。 */
		async function postJson(path, search = "") {
			const res = await fetch(`${BASE}${path}${search}`, {
				method: "POST",
				signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS)
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok || data.ok !== true) throw new Error(data.reason || `realtime route ${path} failed`);
			return data;
		}
		/** 上行一段 PCM（int16 LE）。 */
		async function uploadAudio(sid, pcm) {
			const bytes = new Uint8Array(pcm.byteLength);
			bytes.set(pcm);
			const res = await fetch(`${BASE}/audio?sid=${encodeURIComponent(sid)}`, {
				method: "POST",
				headers: { "content-type": "application/octet-stream" },
				body: bytes,
				signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS)
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data.reason || `audio upload failed (HTTP ${res.status})`);
			}
		}
		/** 打开 SSE 下行：返回取消订阅的 disposer（幂等）。 */
		function openEvents(sid, onEvent) {
			const controller = new AbortController();
			let disposed = false;
			(async () => {
				try {
					const res = await fetch(`${BASE}/events?sid=${encodeURIComponent(sid)}`, {
						headers: { accept: "text/event-stream" },
						signal: controller.signal
					});
					if (!res.ok || res.body === null) {
						if (!disposed) onEvent({
							type: "error",
							code: "events-unavailable"
						});
						return;
					}
					const reader = res.body.getReader();
					const decoder = new TextDecoder();
					let buf = "";
					for (;;) {
						const { done, value } = await reader.read();
						if (done) break;
						buf += decoder.decode(value, { stream: true });
						let nl;
						while ((nl = buf.indexOf("\n\n")) >= 0) {
							const block = buf.slice(0, nl);
							buf = buf.slice(nl + 2);
							for (const line of block.split("\n")) if (line.startsWith("data: ")) try {
								onEvent(JSON.parse(line.slice(6)));
							} catch {}
						}
					}
				} catch {
					if (!disposed) onEvent({
						type: "error",
						code: "events-unavailable"
					});
				}
			})();
			return () => {
				disposed = true;
				controller.abort();
			};
		}
		/** 浏览器实时通道传输层。 */
		function createBrowserCloudTransport() {
			return {
				async createSession() {
					const data = await postJson("/session");
					if (typeof data.sid !== "string" || data.sid === "") throw new Error("realtime session returned no sid");
					return data.sid;
				},
				upload: uploadAudio,
				openEvents,
				async closeSession(sid) {
					await postJson("/close", `?sid=${encodeURIComponent(sid)}`);
				}
			};
		}
		//#endregion
		//#region src/client/realtime.ts
		/**
		* dsh-asr-voice — 实时转写引擎（连续会话 + 本地回合判定）。
		*
		* 与 recorder.ts 的整段模式是两种活法：整段模式靠一次点击划回合，实时模式没有那次
		* 点击，边界只能自己判。浏览器 Web Speech 不给任何 VAD/回合信号，所以判定落在
		* **文字稳定性**上：连续 settleMs 没有新结果、再多等 tailMs 接住最后一个词的迟到
		* final，就把这句交出去。云端实时引擎会直接给 speech_stopped，届时这条
		* 本地兜底只在它沉默时起作用。
		*
		* 两个引擎共用同一份回合判定（`createSettleGate`）：换引擎不该换回合边界。
		*   - browser：连续 Web Speech 会话，零 key、零 host 改动。
		*   - segmented：本地能量 VAD 切段 + 已有整段转写通道，逐句出字，同样不需要新协议。
		*
		* 引擎选择不在此处：调用方拿到的就是 RealtimeSession（`createRealtime` 负责分派）。
		*/
		/** Web Speech 在 onend 后重新拉起前的最小间隔：紧接着 start() 会撞 InvalidStateError。 */
		const RESTART_DELAY_MS = 120;
		/** 取一个 webkitSpeechRecognition 构造器；不支持返回 null。 */
		function recognitionCtor() {
			if (!isWebSpeechSupported()) return null;
			return window.webkitSpeechRecognition;
		}
		/** 空白归一：多段拼接与重启动带来的重复空格不应让字幕跳动。 */
		function joinText(...parts) {
			return parts.filter((p) => p !== "").join(" ").replace(/\s+/g, " ").trim();
		}
		/**
		* 回合判定：连续 `settleMs` 没有新结果、再宽限 `tailMs` 接住最后一个词的迟到结果，
		* 才交出这一句。两个引擎共用它，所以换引擎不会换回合边界。
		*
		* `arm(hasText)` 每次调用都重新计时——静默才是「说完了」，噪声式抖动不会提前收尾；
		* `hasText === false` 时不排 timer（空句不该提交）。timer 到点先问 `live()`：
		* 会话已停/已暂停就什么也不做，交出动作由 `commit` 承担。
		*/
		function createSettleGate(tuning, live, commit) {
			const clear = (timer) => {
				if (timer !== null) clearTimeout(timer);
				return null;
			};
			let settleTimer = null;
			let tailTimer = null;
			return {
				arm(hasText) {
					settleTimer = clear(settleTimer);
					tailTimer = clear(tailTimer);
					if (!hasText) return;
					settleTimer = setTimeout(() => {
						settleTimer = null;
						if (!live()) return;
						if (tuning.tailMs <= 0) {
							commit();
							return;
						}
						tailTimer = setTimeout(() => {
							tailTimer = null;
							commit();
						}, tuning.tailMs);
					}, tuning.settleMs);
				},
				cancel() {
					settleTimer = clear(settleTimer);
					tailTimer = clear(tailTimer);
				}
			};
		}
		/** 浏览器引擎：连续的 Web Speech 会话 + 本地回合判定。 */
		function createBrowserRealtime(language, tuning, events) {
			const Ctor = recognitionCtor();
			if (Ctor === null) {
				queueMicrotask(() => {
					events.onFail("no-speech-support");
				});
				return {
					start: () => {},
					pause: () => {},
					resume: () => {},
					stop: () => {},
					listening: false
				};
			}
			const lang = language === "auto" ? "" : language;
			let active = false;
			let paused = true;
			let failed = false;
			let segment = "";
			let interim = "";
			let recognition = null;
			let restartTimer = null;
			let stopLevel = null;
			/** 上一次交出去的文本：识别器重启后可能把同一句再报一遍。 */
			let lastTurn = "";
			const clear = (timer) => {
				if (timer !== null) clearTimeout(timer);
				return null;
			};
			const latest = () => joinText(segment, interim);
			/** 交出当前这句，并为下一句清空累加器。 */
			const commit = () => {
				const text = latest();
				segment = "";
				interim = "";
				if (text === "" || !active || paused) return;
				lastTurn = text;
				events.onTurn(text);
			};
			const gate = createSettleGate(tuning, () => active && !paused, commit);
			/** 收到新结果就重新计时：静默才是「说完了」，噪声式抖动不会提前收尾。 */
			const armSettle = () => {
				gate.arm(latest() !== "");
			};
			const clearTimers = () => {
				gate.cancel();
				restartTimer = clear(restartTimer);
			};
			const emitPartial = () => {
				events.onPartial(latest());
			};
			/** 装一个新的识别器并启动（每段一个实例：重启后旧实例的内部错误态会残留）。 */
			const openRecognition = () => {
				if (recognition !== null) try {
					recognition.abort();
				} catch {}
				const rec = new Ctor();
				if (lang !== "") rec.lang = lang;
				rec.continuous = true;
				rec.interimResults = true;
				rec.maxAlternatives = 1;
				rec.onresult = (event) => {
					let finalChunk = "";
					let interimChunk = "";
					for (let i = event.resultIndex; i < event.results.length; i++) {
						const result = event.results.item(i);
						const transcript = result.item(0)?.transcript ?? "";
						if (result.isFinal) finalChunk += transcript;
						else interimChunk += transcript;
					}
					if (!active || paused) return;
					const chunk = finalChunk.trim();
					const fresh = interimChunk.trim();
					if (chunk === "" && fresh === "") return;
					if (chunk !== "" && segment === "" && chunk === lastTurn) {
						interim = "";
						armSettle();
						return;
					}
					if (chunk !== "") segment = joinText(segment, chunk);
					interim = fresh;
					emitPartial();
					armSettle();
				};
				rec.onerror = (event) => {
					const code = event.error || "unknown";
					if (code === "no-speech" || code === "aborted") return;
					if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
						failed = true;
						active = false;
						clearTimers();
						events.onFail(code === "audio-capture" ? "no-mic" : "mic-denied");
						return;
					}
					if (code === "network") {
						failed = true;
						active = false;
						clearTimers();
						events.onFail("network");
					}
				};
				rec.onend = () => {
					if (recognition === rec) recognition = null;
					if (!active || paused || failed) return;
					restartTimer = clear(restartTimer);
					restartTimer = setTimeout(() => {
						restartTimer = null;
						if (active && !paused && !failed) openRecognition();
					}, RESTART_DELAY_MS);
				};
				recognition = rec;
				try {
					rec.start();
				} catch {}
			};
			const beginListening = () => {
				paused = false;
				stopLevel ??= startLevelSimulation((level) => {
					events.onLevel(level);
				});
				openRecognition();
			};
			return {
				start() {
					if (active) return;
					active = true;
					failed = false;
					beginListening();
				},
				pause() {
					if (!active || paused) return;
					paused = true;
					clearTimers();
					segment = "";
					interim = "";
					const rec = recognition;
					recognition = null;
					try {
						rec?.abort();
					} catch {}
					stopLevel?.();
					stopLevel = null;
				},
				resume() {
					if (!active || !paused) return;
					lastTurn = "";
					beginListening();
				},
				stop() {
					active = false;
					paused = true;
					clearTimers();
					segment = "";
					interim = "";
					const rec = recognition;
					recognition = null;
					try {
						rec?.abort();
					} catch {}
					stopLevel?.();
					stopLevel = null;
				},
				get listening() {
					return active && !paused;
				}
			};
		}
		/** 连败判死阈值：上游持续失败时不该把用户的会话挂在半空（整段模式是同一取向）。 */
		const CONSECUTIVE_FAIL_LIMIT = 3;
		/** 段 → WAV → host 整段转写代理（复用已验证的免费通道，不新增协议）。 */
		async function transcribeWavSegment(pcm, language, signal) {
			const bytes = encodeWav16MonoPcm(pcm, PCM_SAMPLE_RATE, normaliseGain(peakAbs(pcm)));
			return transcribeViaHost(new Blob([bytes], { type: "audio/wav" }), language, signal);
		}
		const DEFAULT_SEGMENTED_DEPS = {
			capture: startPcmCapture,
			transcribe: transcribeWavSegment
		};
		/**
		* 按句转写引擎：本地能量 VAD 切段 + 已有整段转写通道。
		*
		* 出字节奏由「声学段边界 + 上游往返」决定，不是逐字流式：每句在说完 `silenceMs`
		* 后约一个往返才上屏。它换来的是零新协议、零新 key，并且用真实麦克风电平驱动电平表
		* （浏览器引擎只能模拟）。
		*/
		function createSegmentedRealtime(language, tuning, events, deps = DEFAULT_SEGMENTED_DEPS) {
			let active = false;
			let paused = true;
			/** 本期已确认文字（各段转写结果按序拼接）。 */
			let text = "";
			let vad = null;
			let capture = null;
			/** rmsAuto 的噪声底估计器：与 VAD 同生命周期，静音期持续学习。 */
			const floor = tuning.vad.rmsAuto === true ? createRmsFloorEstimator({
				...DEFAULT_RMS_FLOOR_TUNING,
				frameMs: tuning.frameMs
			}) : null;
			/** barge-in 回声门控：播放回复期间武装，只有它触发才打断（D19，默认关）。 */
			const bargeGate = createBargeInGate({
				...DEFAULT_BARGE_IN_TUNING,
				frameMs: tuning.frameMs
			});
			let inFlight = false;
			let failures = 0;
			const queue = [];
			/** 在途请求按代际登记：pause/resume/stop 递增代际并 abort，旧代结果一律作废。 */
			const inflight = /* @__PURE__ */ new Map();
			/**
			* 代际。用它而不是逐个标志位：一段语音的转写请求可能在说话人已经开始下一句之后
			* 才回来，不作废就会把上一句的字幕倒灌进新一句。
			*/
			let generation = 0;
			const commit = () => {
				const out = text;
				text = "";
				if (out === "" || !active || paused) return;
				events.onTurn(out);
			};
			/**
			* 还在出声时不交出回合：转写有往返，先落地的半句字幕不该把一句话说成两半。
			* 静音边沿（onSpeech(false)）会重新计时，所以这里挡下来的一定还有下一次机会。
			*/
			const gate = createSettleGate(tuning, () => active && !paused && !(vad?.inSpeech ?? false), commit);
			const abortAll = () => {
				for (const controller of inflight.values()) controller.abort();
				inflight.clear();
			};
			const tearDown = () => {
				gate.cancel();
				bargeGate.disarm();
				abortAll();
				queue.length = 0;
				inFlight = false;
				text = "";
				vad?.reset();
			};
			const failNow = (code) => {
				active = false;
				paused = true;
				tearDown();
				capture?.stop();
				capture = null;
				events.onFail(code);
			};
			const pump = () => {
				if (!active || paused || inFlight) return;
				const pcm = queue.shift();
				if (pcm === void 0) return;
				const gen = generation;
				const controller = new AbortController();
				inflight.set(gen, controller);
				inFlight = true;
				deps.transcribe(pcm, language, controller.signal).then((result) => {
					if (!inflight.delete(gen)) return;
					inFlight = false;
					failures = 0;
					if (!active || paused) {
						pump();
						return;
					}
					const chunk = result.trim();
					if (chunk !== "") {
						text = joinText(text, chunk);
						events.onPartial(text);
					}
					gate.arm(text !== "");
					pump();
				}, () => {
					if (!inflight.delete(gen)) return;
					inFlight = false;
					if (!active || paused) {
						pump();
						return;
					}
					failures += 1;
					if (failures >= CONSECUTIVE_FAIL_LIMIT) {
						failNow("provider-unreachable");
						return;
					}
					pump();
				});
			};
			const enqueue = (pcm) => {
				queue.push(pcm);
				while (queue.length > tuning.maxPending) {
					queue.shift();
					events.onGap?.();
				}
				pump();
			};
			const ensureVad = () => {
				vad ??= createEnergyVad(PCM_SAMPLE_RATE, tuning.vad, {
					onSegment: (pcm) => {
						if (!active || paused) return;
						if (bargeGate.armed) return;
						if (isSilentPeak(peakAbs(pcm))) return;
						enqueue(pcm);
					},
					onSpeech: (inSpeech) => {
						if (!inSpeech) gate.arm(text !== "");
					}
				}, floor);
				return vad;
			};
			const onFrame = (pcm) => {
				if (!active || paused) return;
				const rms = rmsOfFloat(pcm);
				events.onLevel(rms);
				if (bargeGate.armed && bargeGate.feed(rms, vad?.inSpeech ?? false)) events.onBargeIn?.();
				ensureVad().feed(pcm);
			};
			const openCapture = () => {
				deps.capture({
					frameMs: tuning.frameMs,
					onFrame,
					onFail: (code) => {
						if (active) failNow(code);
					}
				}).then((next) => {
					if (!active || paused) {
						next.stop();
						return;
					}
					capture = next;
				}, () => {
					if (active) failNow("capture-failed");
				});
			};
			return {
				start() {
					if (active) return;
					active = true;
					paused = false;
					generation += 1;
					ensureVad();
					openCapture();
				},
				pause() {
					if (!active || paused) return;
					paused = true;
					generation += 1;
					capture?.setMuted(true);
					tearDown();
				},
				resume() {
					if (!active || !paused) return;
					paused = false;
					generation += 1;
					ensureVad().reset();
					if (capture === null) {
						openCapture();
						return;
					}
					capture.setMuted(false);
				},
				stop() {
					active = false;
					paused = true;
					generation += 1;
					bargeGate.disarm();
					tearDown();
					capture?.stop();
					capture = null;
				},
				get listening() {
					return active && !paused;
				},
				armBargeIn() {
					if (!active) return;
					bargeGate.arm();
					if (paused) {
						paused = false;
						generation += 1;
						ensureVad().reset();
						if (capture === null) openCapture();
						else capture.setMuted(false);
					}
				},
				disarmBargeIn() {
					bargeGate.disarm();
				}
			};
		}
		/** 按配置装配实时引擎（browser/segmented 回合判定同源；cloud 由服务端 VAD 给回合）。 */
		function createRealtime(engine, language, tuning, events) {
			if (engine === "segmented") return createSegmentedRealtime(language, tuning, events);
			if (engine === "cloud") return createCloudRealtime({ frameMs: tuning.frameMs }, events, {
				capture: defaultCloudCapture,
				transport: createBrowserCloudTransport()
			});
			return createBrowserRealtime(language, tuning, events);
		}
		//#endregion
		//#region src/client/speech-out.ts
		/** 浏览器是否具备语音合成能力。 */
		function isSpeechSynthesisSupported() {
			return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
		}
		/** 中日韩句读：出现即断句，不需要后接空白。 */
		const CJK_STOP = "。！？…；";
		/** 拉丁句末符：只在词尾（后接空白或到结尾）才断句。 */
		const LATIN_STOP = "!?;:";
		/** 跟着句末符一起归入上一句的收尾引号/括号。 */
		const CLOSERS = "”’）)』」】";
		/**
		* text 中 from 之后**第一个**句子边界的结束下标（含紧随的句末符、收尾符与空白）；
		* 没有边界返回 -1。正向扫描：一次 feed 里含多句时也要切成多段，才能及早可打断、
		* 且每段都落在看门狗盖得住的长度内。
		*/
		function nextBreak(text, from = 0) {
			for (let i = from; i < text.length; i++) {
				const c = text[i] ?? "";
				if (c === "\n") return i + 1;
				const isCjk = CJK_STOP.includes(c);
				if (!isCjk && !LATIN_STOP.includes(c) && c !== ".") continue;
				if (c === "." && /\d/.test(text[i - 1] ?? " ")) continue;
				let j = i + 1;
				for (let nj = j; nj < text.length; nj++) {
					const t = text[nj] ?? "";
					if (!CJK_STOP.includes(t) && !LATIN_STOP.includes(t) && !CLOSERS.includes(t)) break;
					j = nj + 1;
				}
				if (!isCjk && j < text.length && !/\s/.test(text[j] ?? "")) continue;
				while (j < text.length && (text[j] === " " || text[j] === "	")) j++;
				return j;
			}
			return -1;
		}
		/**
		* 创建一个分句泵：喂**累积**文本，吐出「已经说完的句子」。
		*
		* @param firstSentenceMinChars - 首句最少字数：一句太短就继续攒，避免以「好的。」这种
		*   碎片起音（听众会觉得机器人结巴）。仅作用于每个流的第一个切段。
		*/
		function createSentencePump(firstSentenceMinChars) {
			let buffer = "";
			let seen = "";
			let started = false;
			/** 从 buffer 里尽量切出可朗读句子（按句一段）。final=true 时连尾巴一起吐。 */
			const cut = (final) => {
				const out = [];
				let pos = 0;
				for (;;) {
					const boundary = nextBreak(buffer, pos);
					if (boundary > 0 && boundary <= 200) {
						const head = buffer.slice(0, boundary).trim();
						if (head === "") {
							pos = boundary;
							continue;
						}
						if (!started && !final && head.length < firstSentenceMinChars) {
							pos = boundary;
							continue;
						}
						out.push(head);
						buffer = buffer.slice(boundary);
						pos = 0;
						started = true;
						continue;
					}
					if (buffer.length >= 200) {
						const head = buffer.slice(0, 200).trim();
						buffer = buffer.slice(200);
						pos = 0;
						if (head === "") continue;
						out.push(head);
						started = true;
						continue;
					}
					break;
				}
				if (final && buffer.trim() !== "") {
					out.push(buffer.trim());
					buffer = "";
				}
				return out;
			};
			return {
				feed(cumulative) {
					if (cumulative === seen) return [];
					if (!cumulative.startsWith(seen)) {
						const tail = cut(true);
						seen = cumulative;
						buffer = cumulative;
						started = false;
						return [...tail, ...cut(false)];
					}
					buffer += cumulative.slice(seen.length);
					seen = cumulative;
					return cut(false);
				},
				finish() {
					return cut(true);
				}
			};
		}
		/** 按语言挑音色：没有完全匹配时退到同主语言的任何音色，再退到浏览器默认。 */
		function pickVoice(voices, lang) {
			if (voices.length === 0 || lang === "") return null;
			const wanted = lang.toLowerCase();
			const base = wanted.split("-")[0];
			return voices.find((v) => v.lang.toLowerCase() === wanted) ?? voices.find((v) => v.lang.toLowerCase().split("-")[0] === base) ?? null;
		}
		/**
		* 浏览器语音合成实现。句子按到达顺序排队，一次只播一句；播完（或看门狗判死）自动播
		* 下一句，每从「有内容」落到空闲触发一次 onDrain（处理器常驻，跨回合不失效）。
		*/
		function createSpeechSynthesisSink(tuning) {
			const synth = typeof window === "undefined" ? void 0 : window.speechSynthesis;
			const queue = [];
			let playing = null;
			let pending = false;
			let watchdog = null;
			let drain = null;
			let voices = [];
			let disposed = false;
			const lang = tuning.language === "auto" ? typeof navigator === "undefined" ? "" : navigator.language : tuning.language;
			const clearWatchdog = () => {
				if (watchdog !== null) clearTimeout(watchdog);
				watchdog = null;
			};
			const next = () => {
				if (disposed || playing !== null || synth === void 0) return;
				const text = queue.shift();
				if (text === void 0) {
					if (pending) {
						pending = false;
						drain?.();
					}
					return;
				}
				pending = true;
				const utter = new SpeechSynthesisUtterance(text);
				if (lang !== "") utter.lang = lang;
				const voice = pickVoice(voices, lang);
				if (voice !== null) utter.voice = voice;
				const finish = () => {
					if (playing !== utter) return;
					playing = null;
					clearWatchdog();
					next();
				};
				utter.onend = finish;
				utter.onerror = finish;
				playing = utter;
				watchdog = setTimeout(() => {
					try {
						synth.cancel();
					} catch {}
					finish();
				}, tuning.utteranceWatchdogMs);
				try {
					synth.speak(utter);
				} catch {
					playing = null;
					clearWatchdog();
				}
			};
			const onVoices = () => {
				voices = synth?.getVoices() ?? [];
			};
			onVoices();
			synth?.addEventListener?.("voiceschanged", onVoices);
			return {
				enqueue(text) {
					if (disposed || text.trim() === "") return;
					queue.push(text);
					next();
				},
				get active() {
					return playing !== null || queue.length > 0;
				},
				cancel() {
					queue.length = 0;
					pending = false;
					playing = null;
					clearWatchdog();
					try {
						synth?.cancel();
					} catch {}
				},
				set onDrain(fn) {
					drain = fn;
				},
				get onDrain() {
					return drain;
				},
				dispose() {
					disposed = true;
					queue.length = 0;
					pending = false;
					playing = null;
					clearWatchdog();
					synth?.removeEventListener?.("voiceschanged", onVoices);
					try {
						synth?.cancel();
					} catch {}
				},
				prime() {
					if (disposed || synth === void 0) return;
					onVoices();
					try {
						const blank = new SpeechSynthesisUtterance(" ");
						blank.volume = 0;
						synth.speak(blank);
					} catch {}
				}
			};
		}
		/** 云端 TTS 是否需要 Web Audio（浏览器能力检查）。 */
		function isCloudTtsSupported() {
			const w = typeof window === "undefined" ? void 0 : window;
			return Boolean(w?.AudioContext ?? w?.webkitAudioContext);
		}
		/**
		* 云端 TTS 实现（I6）：文本 → host 私有路由 → 阿里云百炼 qwen3-tts-flash-realtime
		* → base64 PCM（16k int16 LE）→ `AudioBufferSourceNode → ctx.destination` 播放。
		*
		* 与浏览器 speechSynthesis 同接口（SpeakSink），调用方（语音对话按钮）不感知实现。
		* 句子按到达顺序排队、一次播一句；`onended` 是 Web Audio 的精确事件（不像
		* speechSynthesis 的 onend 会漏回调），所以不需要看门狗。云端不可达或合成失败时
		* 跳过该句继续排队（不阻塞对话），失败静默（错误面由录音侧暴露）。
		*/
		function createCloudTtsSink(tuning) {
			const queue = [];
			let ctx = null;
			let current = null;
			let playing = false;
			let pending = false;
			let drain = null;
			let disposed = false;
			const getCtx = () => {
				if (ctx === null) {
					const w = window;
					const Ctor = w.AudioContext ?? w.webkitAudioContext;
					if (Ctor === void 0) return null;
					ctx = new Ctor();
				}
				return ctx;
			};
			/** 合成并播放一句（Promise 在播完时 settle）。 */
			const speak = async (text) => {
				const ac = getCtx();
				if (ac === null || disposed) return;
				let data;
				try {
					data = await (await fetch("/api/asr-voice/tts", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							text,
							voice: tuning.voice
						})
					})).json().catch(() => ({}));
				} catch {
					return;
				}
				if (disposed || data.ok !== true || data.audio === void 0) return;
				const bin = atob(data.audio);
				const pcm = new Uint8Array(bin.length);
				for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
				const frames = pcm.byteLength >> 1;
				const f32 = new Float32Array(frames);
				const view = new DataView(pcm.buffer);
				for (let i = 0; i < frames; i++) f32[i] = view.getInt16(i * 2, true) / 32768;
				if (disposed || frames === 0) return;
				const buffer = ac.createBuffer(1, frames, data.sampleRate ?? 16e3);
				buffer.copyToChannel(f32, 0);
				const source = ac.createBufferSource();
				source.buffer = buffer;
				source.connect(ac.destination);
				current = source;
				await new Promise((resolve) => {
					source.onended = () => resolve();
					source.start();
					const ms = Math.max(2e3, Math.ceil(frames / 16e3) * 1e3 + 1500);
					setTimeout(() => {
						try {
							source.stop();
						} catch {}
					}, ms);
				});
				if (current === source) current = null;
			};
			const next = () => {
				if (disposed || playing) return;
				const text = queue.shift();
				if (text === void 0) {
					if (pending) {
						pending = false;
						drain?.();
					}
					return;
				}
				pending = true;
				playing = true;
				speak(text).finally(() => {
					playing = false;
					next();
				});
			};
			return {
				enqueue(text) {
					if (disposed || text.trim() === "") return;
					queue.push(text);
					next();
				},
				get active() {
					return playing || queue.length > 0;
				},
				cancel() {
					queue.length = 0;
					pending = false;
					if (current !== null) try {
						current.stop();
					} catch {}
					current = null;
				},
				set onDrain(fn) {
					drain = fn;
				},
				get onDrain() {
					return drain;
				},
				dispose() {
					disposed = true;
					queue.length = 0;
					pending = false;
					if (current !== null) try {
						current.stop();
					} catch {}
					current = null;
					if (ctx !== null) {
						ctx.close().catch(() => {});
						ctx = null;
					}
				},
				prime() {
					if (disposed) return;
					const ac = getCtx();
					if (ac !== null && ac.state === "suspended") ac.resume();
				}
			};
		}
		//#endregion
		//#region src/client/voice-chat-button.tsx
		/**
		* dsh-asr-voice — 语音对话按钮（conversation.input.right，与麦克风并列）。
		*
		* 闭环：开始 → 边说边上字幕 → 停顿即把这句 setDraft+submit 发起 agent 回合
		*   → 读 session.partial 的流式回复，分句交给 SpeakSink 朗读
		*   → 念完自动把麦克风还回来，进入下一句。
		*
		* 三条不可让的规矩：
		*   1. **半双工**：一切实弹/播报期间引擎都是 pause() 的。浏览器 AEC 能不能吃掉
		*      我们自己的 TTS 尚未实测，不赌；实测通过前不做语音插话。
		*   2. **一次一个在途回合**：turnRef 非空就是闩，任何路径都不允许第二个提交插进去。
		*   3. **麦克风不无人值守**：realtime.maxSessionMs 到点自动结束并交还设备。
		*
		* 实时路径不做提示词优化：对话要的是即时，不是清洗过的转写。
		*/
		/** 字幕行只显示尾部这么多字符（提示条是单行的，整段回复会把它撑破）。 */
		const CAPTION_TAIL_CHARS = 80;
		/** 全局对话控制器：快捷键只驱动「最后挂载」的实例（当前可见会话）。 */
		const voiceChatController = {
			toggle: () => {
				currentChat?.toggle();
			},
			isActive: () => currentChat?.isActive() ?? false,
			mount(instance) {
				currentChat = instance;
				return () => {
					if (currentChat === instance) currentChat = void 0;
				};
			}
		};
		let currentChat;
		/** 对话图标（声波气泡：与麦克风的实心咪头区分开）。 */
		function ChatIcon() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.8",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5v-3.5H6.5A2.5 2.5 0 0 1 4 13.5z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 10v-1.5M12 11V7.5M15 10v-1.5" })]
			});
		}
		/** 只保留尾部字符，供单行字幕显示长回复。 */
		function tailText(text) {
			const flat = text.replace(/\s+/g, " ").trim();
			return flat.length > CAPTION_TAIL_CHARS ? `…${flat.slice(-80)}` : flat;
		}
		/** 从流式 blocks 里取可见正文（与官方 assistantText 同义，不依赖其未导出路径）。 */
		function replyTextOf(blocks) {
			if (blocks === void 0) return "";
			return blocks.reduce((acc, b) => b.kind === "text" ? acc + (b.text ?? "") : acc, "");
		}
		/**
		* 「语音对话」按钮。
		* @param props - slot 注入的 owner share + 标准 kit + 翻译函数。
		*/
		function VoiceChatButton(props) {
			const { inputActions, t } = props;
			const disabled = !inputActions;
			const [phase, setPhaseState] = react.useState("idle");
			const [live, setLive] = react.useState("");
			const [error, setError] = react.useState(null);
			const [notice, setNotice] = react.useState(null);
			const phaseRef = react.useRef("idle");
			const setPhase = (next) => {
				phaseRef.current = next;
				setPhaseState(next);
			};
			const engineRef = react.useRef(null);
			const sinkRef = react.useRef(null);
			const tuningRef = react.useRef(null);
			/** 在途回合闩：非空表示这句话已提交、回复还没念完。 */
			const turnRef = react.useRef(null);
			const noReplyRef = react.useRef(null);
			const capRef = react.useRef(null);
			const spectrumRef = react.useRef(null);
			const levelRef = react.useRef(-1);
			const mountedRef = react.useRef(true);
			const actionsRef = react.useRef(inputActions);
			const cancelRef = react.useRef(props.cancelTurn);
			const runningRef = react.useRef(props.session?.running ?? false);
			const draftRef = react.useRef(props.input?.draft ?? "");
			actionsRef.current = inputActions;
			cancelRef.current = props.cancelTurn;
			runningRef.current = props.session?.running ?? false;
			const replyText = react.useMemo(() => replyTextOf(props.session?.partial?.blocks), [props.session?.partial?.blocks]);
			const running = props.session?.running ?? false;
			const clearNoReply = () => {
				if (noReplyRef.current !== null) clearTimeout(noReplyRef.current);
				noReplyRef.current = null;
			};
			/** 结束本次对话：拆引擎、拆播报、清闩，并把提示留下。 */
			const endSession = (note, err) => {
				clearNoReply();
				if (capRef.current !== null) {
					clearTimeout(capRef.current);
					capRef.current = null;
				}
				turnRef.current = null;
				engineRef.current?.stop();
				engineRef.current = null;
				sinkRef.current?.dispose();
				sinkRef.current = null;
				tuningRef.current = null;
				setLive("");
				setPhase("idle");
				setError(err ?? null);
				setNotice(note ?? null);
			};
			/** 交还麦克风，开始听下一句（幂等：只有 thinking/speaking 才需要还）。 */
			const resumeListening = () => {
				if (!mountedRef.current || phaseRef.current === "idle" || phaseRef.current === "listening") return;
				if (turnRef.current !== null) return;
				setLive("");
				engineRef.current?.disarmBargeIn?.();
				engineRef.current?.resume();
				setPhase("listening");
			};
			/** 播一句（tts=off 时没有 sink，字幕照常走，回合结束直接还麦）。 */
			const speakSentence = (sentence) => {
				const sink = sinkRef.current;
				if (sink === null) return;
				sink.enqueue(sentence);
				if (phaseRef.current === "thinking") {
					setPhase("speaking");
					if (tuningRef.current?.bargeIn === true) engineRef.current?.armBargeIn?.();
				}
			};
			/** 提交一句 → 发起回合。 */
			const commitTurn = (text) => {
				const tuning = tuningRef.current;
				const actions = actionsRef.current;
				if (turnRef.current !== null || phaseRef.current !== "listening") return;
				if (text === "" || tuning === null || actions === void 0) return;
				let merged = text;
				if (config.behavior.textMode === "append") {
					const existing = draftRef.current;
					if (existing !== "") merged = `${existing}${/[ \n]$/.test(existing) ? "" : " "}${text}`;
				}
				actions.setDraft(merged);
				actions.submit();
				engineRef.current?.pause();
				turnRef.current = {
					armed: false,
					lastText: "",
					pump: createSentencePump(tuning.firstSentenceMinChars)
				};
				clearNoReply();
				noReplyRef.current = setTimeout(() => {
					noReplyRef.current = null;
					const turn = turnRef.current;
					if (turn === null || turn.armed) return;
					turnRef.current = null;
					setNotice(t("chatNoReply"));
					resumeListening();
				}, tuning.settleMs);
				setPhase("thinking");
			};
			/** 打断：止住播报、取消在途回合，立刻回到聆听。 */
			const interrupt = () => {
				engineRef.current?.disarmBargeIn?.();
				sinkRef.current?.cancel();
				clearNoReply();
				turnRef.current = null;
				if (runningRef.current && props.sessionId !== void 0) cancelRef.current?.(props.sessionId);
				setLive("");
				engineRef.current?.resume();
				setPhase("listening");
			};
			const failByCode = (code) => {
				const msg = code === "no-mic" || code === "mic-denied" || code === "silent-device" || code === "no-audio-context" ? t("errNoMic") : code === "network" ? t("errWebSpeechNetwork") : code === "provider-unreachable" || code === "events-unavailable" ? t("errSegmentedUnreachable") : code === "no-worklet" || code === "capture-failed" ? t("errSegmentedUnsupported") : t("errNoSpeechSupport");
				endSession(void 0, msg);
			};
			/** 开始一次对话。必须在点击回调里调用（Safari 的发声权限只认用户激活上下文）。 */
			const begin = () => {
				const tuning = realtimeTuning();
				if (tuning.engine === "segmented") {
					if (!isPcmCaptureSupported()) {
						setError(t("errSegmentedUnsupported"));
						setNotice(null);
						return;
					}
					if (!cloudConfigured()) {
						setError(t("errSegmentedNeedsCloud"));
						setNotice(null);
						return;
					}
				} else if (tuning.engine === "cloud") {
					if (!isPcmCaptureSupported()) {
						setError(t("errSegmentedUnsupported"));
						setNotice(null);
						return;
					}
				} else if (!isWebSpeechSupported()) {
					setError(t("errNoSpeechSupport"));
					setNotice(null);
					return;
				}
				const ttsReady = tuning.tts === "cloud" ? isCloudTtsSupported() : isSpeechSynthesisSupported();
				tuningRef.current = tuning;
				setError(null);
				setNotice(tuning.tts !== "off" && !ttsReady ? t("chatNoTts") : null);
				setLive("");
				levelRef.current = -1;
				if (tuning.tts !== "off" && ttsReady) {
					const sink = tuning.tts === "cloud" ? createCloudTtsSink({
						language: tuning.language,
						voice: tuning.ttsVoice
					}) : createSpeechSynthesisSink({
						utteranceWatchdogMs: tuning.utteranceWatchdogMs,
						language: tuning.language
					});
					sink.onDrain = () => {
						if (turnRef.current === null) resumeListening();
					};
					sinkRef.current = sink;
					sink.prime();
				}
				engineRef.current = createRealtime(tuning.engine, tuning.language, tuning.segmented, {
					onPartial: (text) => {
						if (phaseRef.current === "listening") setLive(text);
					},
					onTurn: (text) => {
						commitTurn(text);
					},
					onLevel: (level) => {
						const el = spectrumRef.current;
						if (el && Math.abs(level - levelRef.current) >= .01) {
							levelRef.current = level;
							el.style.setProperty("--level", level.toFixed(2));
						}
					},
					onFail: (code) => {
						failByCode(code);
					},
					onGap: () => {
						setNotice(t("chatGap"));
					},
					onBargeIn: () => {
						setNotice(null);
						interrupt();
					}
				});
				capRef.current = setTimeout(() => {
					endSession(t("chatEndedLimit"));
				}, tuning.maxSessionMs);
				setPhase("listening");
				engineRef.current.start();
			};
			const toggle = () => {
				if (phaseRef.current === "idle") begin();
				else if (phaseRef.current === "listening") endSession();
				else interrupt();
			};
			const handlersRef = react.useRef({
				toggle: () => {},
				isActive: () => false
			});
			handlersRef.current = {
				toggle,
				isActive: () => phaseRef.current !== "idle"
			};
			const instance = react.useMemo(() => ({
				toggle: () => {
					handlersRef.current.toggle();
				},
				isActive: () => handlersRef.current.isActive()
			}), []);
			react.useEffect(() => voiceChatController.mount(instance), [instance]);
			react.useEffect(() => {
				draftRef.current = props.input?.draft ?? "";
			}, [props.input?.draft]);
			react.useEffect(() => {
				if (error === null && notice === null) return;
				const timer = setTimeout(() => {
					setError(null);
					setNotice(null);
				}, 6e3);
				return () => clearTimeout(timer);
			}, [error, notice]);
			react.useEffect(() => {
				const turn = turnRef.current;
				if (turn === null) return;
				if (replyText !== turn.lastText) {
					turn.lastText = replyText;
					for (const sentence of turn.pump.feed(replyText)) speakSentence(sentence);
				}
				if (running && !turn.armed) {
					clearNoReply();
					turn.armed = true;
				}
				if (turn.armed && !running) {
					for (const sentence of turn.pump.finish()) speakSentence(sentence);
					turnRef.current = null;
					const sink = sinkRef.current;
					if (sink === null || !sink.active) resumeListening();
				}
			}, [replyText, running]);
			react.useEffect(() => {
				mountedRef.current = true;
				return () => {
					mountedRef.current = false;
					clearNoReply();
					if (capRef.current !== null) clearTimeout(capRef.current);
					engineRef.current?.stop();
					sinkRef.current?.dispose();
				};
			}, []);
			const busy = phase !== "idle";
			const title = phase === "idle" ? t("chatTitle") : phase === "listening" ? t("chatListeningTitle") : phase === "thinking" ? t("chatThinkingTitle") : t("chatSpeakingTitle");
			const shown = phase === "listening" ? tailText(live) : tailText(replyText);
			const hintText = shown !== "" ? shown : phase === "listening" ? t("chatListeningTitle") : phase === "thinking" ? t("chatThinkingHint") : t("chatSpeakingHint");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "dshav-mic-wrap",
				"data-variant": "chat",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dshav-mic-button dshav-chat-button",
						"data-state": phase,
						title,
						"aria-label": title,
						"aria-pressed": busy,
						disabled,
						onClick: toggle,
						children: phase === "listening" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecDot, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatIcon, {})
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-hotkey-hint",
						"data-kind": "err",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-dot",
								style: { background: "var(--dshav-danger)" }
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: error
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-hint-dismiss",
								"aria-label": t("dismiss"),
								onClick: () => {
									setError(null);
								},
								children: "×"
							})
						]
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-hotkey-hint",
						"data-kind": "notice",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshav-dot" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: notice
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-hint-dismiss",
								"aria-label": t("dismiss"),
								onClick: () => {
									setNotice(null);
								},
								children: "×"
							})
						]
					}),
					busy && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-hotkey-hint",
						"data-kind": "caption",
						"data-state": phase,
						role: "status",
						"aria-live": "polite",
						children: [
							phase === "listening" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "dshav-dot" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-hint-text",
								children: hintText
							}),
							phase === "listening" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-spectrum",
								ref: spectrumRef,
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SpectrumBars, {})
							}),
							phase !== "listening" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-hint-dismiss",
								"aria-label": t("chatInterrupt"),
								title: t("chatInterrupt"),
								onClick: interrupt,
								children: "×"
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/hotkey.ts
		/** 把规范字符串（如 "Ctrl+Shift+Space"）解析为规格；空/非法返回 null。 */
		function parseHotkey(spec) {
			if (!spec || spec.trim() === "") return null;
			const parts = spec.split("+").map((s) => s.trim()).filter((s) => s !== "");
			const out = {
				ctrl: false,
				alt: false,
				shift: false,
				meta: false,
				key: ""
			};
			for (const part of parts) {
				const p = part.toLowerCase();
				if (p === "ctrl" || p === "control") out.ctrl = true;
				else if (p === "alt" || p === "option") out.alt = true;
				else if (p === "shift") out.shift = true;
				else if (p === "meta" || p === "cmd" || p === "command" || p === "win" || p === "super") out.meta = true;
				else out.key = normalizeKey(part);
			}
			if (out.key === "") return null;
			return out;
		}
		/** 主键规范化（与设置卡片录制器一致）。 */
		function normalizeKey(key) {
			if (key === " ") return "Space";
			if (key.length === 1) return key.toUpperCase();
			return {
				ArrowUp: "Up",
				ArrowDown: "Down",
				ArrowLeft: "Left",
				ArrowRight: "Right",
				Enter: "Enter",
				Tab: "Tab",
				Backspace: "Backspace",
				Escape: "Escape",
				Spacebar: "Space"
			}[key] ?? key;
		}
		/** 事件主键规范化。 */
		function eventKey(key) {
			if (key === " ") return "Space";
			if (key.length === 1) return key.toUpperCase();
			return {
				ArrowUp: "Up",
				ArrowDown: "Down",
				ArrowLeft: "Left",
				ArrowRight: "Right",
				Enter: "Enter",
				Tab: "Tab",
				Backspace: "Backspace",
				Escape: "Escape",
				" ": "Space"
			}[key] ?? key;
		}
		/** 判断键盘事件是否命中规格。Ctrl 兼容 Cmd（macOS 上 Control/Command 都算）。 */
		function matchHotkey(e, spec) {
			if (e.key === "Control" || e.key === "Alt" || e.key === "Shift" || e.key === "Meta") return false;
			const ctrl = e.ctrlKey || e.metaKey;
			const meta = e.metaKey;
			const ctrlOk = ctrl === (spec.ctrl || spec.meta);
			const altOk = e.altKey === spec.alt;
			const shiftOk = e.shiftKey === spec.shift;
			const metaOk = meta === spec.meta;
			return ctrlOk && altOk && shiftOk && metaOk && eventKey(e.key) === spec.key;
		}
		//#endregion
		//#region src/client/index.ts
		const NS = "asr-voice";
		/** 硬依赖：设置卡/配置读写必须的顶层服务（与兄弟插件同款：settingsScope 必须硬依赖，
		* 否则卡片包在 scoped inject 里会因某服务不可注入而永不注册——这正是此前设置卡消失的根因）。 */
		const inject = [
			"slots",
			"locale",
			"settingsScope"
		];
		/** 快捷键处理（按住说话 / 点击切换 / 实时对话进出），随 fiber 生命周期注册。 */
		function applyHotkey() {
			let held = false;
			let cachedHotkey = "";
			let cachedSpec = null;
			const hotkeySpec = () => {
				const hk = config.behavior.hotkey;
				if (hk !== cachedHotkey) {
					cachedHotkey = hk;
					cachedSpec = parseHotkey(hk);
				}
				return cachedSpec;
			};
			let cachedChatHotkey = "";
			let cachedChatSpec = null;
			/** 对话快捷键（realtime.hotkey）：关掉总开关即失效，两个键撞在一起时对话优先。 */
			const chatHotkeySpec = () => {
				if (!config.realtime.enabled) return null;
				const hk = config.realtime.hotkey;
				if (hk !== cachedChatHotkey) {
					cachedChatHotkey = hk;
					cachedChatSpec = parseHotkey(hk);
				}
				return cachedChatSpec;
			};
			const onKeyDown = (e) => {
				const chatSpec = chatHotkeySpec();
				if (chatSpec !== null && matchHotkey(e, chatSpec)) {
					e.preventDefault();
					e.stopPropagation();
					voiceChatController.toggle();
					return;
				}
				const spec = hotkeySpec();
				if (spec === null) return;
				if (!matchHotkey(e, spec)) return;
				e.preventDefault();
				e.stopPropagation();
				if (config.behavior.holdToTalk) {
					if (voiceController.isBusy()) {
						voiceController.toggle();
						return;
					}
					if (!held && !voiceController.isRecording()) {
						held = true;
						voiceController.toggle();
					}
				} else if (!voiceController.isRecording()) voiceController.toggle();
			};
			const onKeyUp = (e) => {
				if (!held) return;
				const spec = hotkeySpec();
				if (spec === null || !matchHotkey(e, spec)) return;
				held = false;
				if (config.behavior.holdToTalk) voiceController.toggle();
			};
			const off = subscribeConfig(() => {});
			window.addEventListener("keydown", onKeyDown, true);
			window.addEventListener("keyup", onKeyUp, true);
			return () => {
				off();
				window.removeEventListener("keydown", onKeyDown, true);
				window.removeEventListener("keyup", onKeyUp, true);
			};
		}
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "asr-voice: dictionaries");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-asr-voice";
				tag.dataset.pluginCss = "dsh-asr-voice";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "asr-voice: styles");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "dsh-asr-voice-button",
				order: 10,
				locale: NS,
				inject: (sessionId) => ({
					sessionId,
					t
				})
			}, (props) => react_jsx_runtime.jsx(VoiceButton, props)));
			/** 打断当前回合：InputActions 只有 5 个成员、不含 cancel，取消只能走会话作用域的 conversation 服务。 */
			let cancelTurn = () => {};
			ctx.inject(["sessions"], (raw) => {
				const sessions = raw.sessions;
				cancelTurn = (sessionId) => {
					try {
						((sessions?.scope(sessionId))?.get("conversation"))?.cancel?.()?.catch?.(() => {});
					} catch {}
				};
			});
			ctx.effect(() => {
				let off;
				const sync = () => {
					const want = config.realtime.enabled;
					if (want && off === void 0) off = ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
						name: "conversation.input.right",
						id: "dsh-asr-voice-realtime-button",
						order: 11,
						locale: NS,
						inject: (sessionId) => ({
							sessionId,
							t,
							cancelTurn
						})
					}, (props) => react_jsx_runtime.jsx(VoiceChatButton, props)));
					else if (!want && off !== void 0) {
						const dispose = off;
						off = void 0;
						dispose();
					}
				};
				sync();
				const unsub = subscribeConfig(sync);
				return () => {
					unsub();
					off?.();
				};
			}, "asr-voice: realtime button");
			ctx.effect(applyHotkey, "asr-voice: hotkey");
			ctx.effect(() => bindConfigScope(ctx.settingsScope), "asr-voice: settings scope sync");
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				key: "asr-voice",
				locale: NS
			}, () => react_jsx_runtime.jsx(VoiceSettingsCard, { t })));
			ctx.inject([
				"settingsScope",
				"connection",
				"remote",
				"remote.credentials"
			], (raw) => {
				const c = raw;
				bindCredentialsApi(c.remote?.credentials ?? adaptLegacyCredentials(c.connection?.api?.credentials));
			});
		}
		const name = "dsh-asr-voice";
		//#endregion
		exports.apply = apply;
		exports.en = en;
		exports.inject = inject;
		exports.name = name;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map