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
			groupAsr: "识别引擎",
			asrProviderLabel: "ASR 引擎",
			asrProviderAuto: "自动（浏览器优先，云端兜底）",
			asrProviderBrowser: "浏览器（Web Speech，免费免 key）",
			asrProviderCloud: "云端（OpenAI-compatible）",
			cloudPresetLabel: "服务商预置",
			cloudPresetCustom: "自定义",
			cloudBaseUrlLabel: "Base URL",
			cloudApiKeyLabel: "API Key（仅存本机服务端）",
			cloudModelLabel: "模型",
			cloudModelHint: "预置自动填充，可自行修改；自定义端点可填任意 OpenAI-compatible 模型。",
			cloudModeLabel: "调用通道",
			cloudModeAuto: "自动（按模型名判定）",
			cloudModeTranscriptions: "whisper 式 /audio/transcriptions",
			cloudModeChat: "chat + input_audio（MiMo/Qwen-ASR）",
			addProvider: "＋ 添加供应商",
			removeProvider: "删除",
			providersEmpty: "尚未配置云端供应商，点「添加供应商」开始。",
			activeProvider: "当前使用",
			providerInactive: "备选",
			fetchModels: "获取模型",
			fetchModelsLoading: "获取中…",
			fetchModelsPick: "选择模型",
			fetchModelsCurrent: "当前模型",
			fetchModelsEmpty: "该供应商暂无 ASR 模型",
			fetchModelsFail: "获取模型失败",
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
			llmCustomHint: "如需自定义模型，请到 DSH 模型列表添加后再选择。",
			llmModelsEmpty: "该提供方暂无可用模型",
			languageLabel: "识别语言",
			languageAuto: "自动（跟随浏览器/系统）",
			groupBehavior: "交互行为",
			autoSendLabel: "识别后自动发送",
			autoSendDesc: "开启后说完即发（push-to-talk 风格），关闭则填入草稿待确认。",
			silenceStopLabel: "静音自动停止",
			silenceStopDesc: "关闭（默认）：只有手动点击/快捷键结束录音，点停止即整段去识别；开启：静音持续 2.5 秒自动结束。",
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
			dismiss: "关闭",
			save: "保存",
			saveFailed: "保存失败",
			configSaveFailed: "配置写回宿主失败——改动可能在重启后丢失，请检查宿主状态后重试",
			loadFailed: "加载失败",
			micTitle: "语音输入",
			recordingTitle: "录音中…点击结束",
			transcribingTitle: "识别中…点击取消",
			optimizingTitle: "优化中…点击取消",
			errNoMic: "未检测到麦克风",
			errNoSound: "未检测到声音：录音为静音，未发送识别。请检查麦克风权限、系统输入音量，并在浏览器地址栏站点设置/授权弹窗中把输入设备选为「内置麦克风」（虚拟音频设备常被误选导致静音）",
			errNoSpeechSupport: "当前浏览器不支持 Web Speech，请改用云端 ASR（Chrome/Edge 均支持）。",
			errWebSpeechNetwork: "浏览器语音识别网络不可用（服务可能被网络屏蔽），已请改用云端 ASR。",
			errCloudNotConfigured: "云端 ASR 未配置：请到设置填写 Base URL 与 API Key。",
			noSpeechDetected: "未检测到语音",
			fallbackToCloud: "浏览器语音识别不可用，已自动切换云端 ASR",
			errTranscribe: "识别失败",
			errOptimize: "优化失败",
			previewTitle: "提示词优化预览",
			previewOriginal: "原始转写",
			previewOptimized: "优化后",
			previewConfirm: "填入并发送",
			previewCancel: "取消",
			autoSendHint: "识别后将自动发送",
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
			groupAsr: "Recognition engine",
			asrProviderLabel: "ASR engine",
			asrProviderAuto: "Auto (browser first, cloud fallback)",
			asrProviderBrowser: "Browser (Web Speech, free, no key)",
			asrProviderCloud: "Cloud (OpenAI-compatible)",
			cloudPresetLabel: "Provider preset",
			cloudPresetCustom: "Custom",
			cloudBaseUrlLabel: "Base URL",
			cloudApiKeyLabel: "API key (stored on this machine, server-side)",
			cloudModelLabel: "Model",
			cloudModelHint: "Pre-filled from the preset; editable. Custom endpoints accept any OpenAI-compatible model.",
			cloudModeLabel: "Endpoint mode",
			cloudModeAuto: "Auto (by model name)",
			cloudModeTranscriptions: "Whisper-style /audio/transcriptions",
			cloudModeChat: "Chat + input_audio (MiMo/Qwen-ASR)",
			addProvider: "+ Add provider",
			removeProvider: "Remove",
			providersEmpty: "No cloud provider configured — click “Add provider” to begin.",
			activeProvider: "Active",
			providerInactive: "Standby",
			fetchModels: "Fetch models",
			fetchModelsLoading: "Fetching…",
			fetchModelsPick: "Pick a model",
			fetchModelsCurrent: "Current model",
			fetchModelsEmpty: "No ASR models from this provider",
			fetchModelsFail: "Failed to fetch models",
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
			llmCustomHint: "To use a custom model, add it to the DSH model list first, then pick it here.",
			llmModelsEmpty: "No models available for this provider",
			languageLabel: "Recognition language",
			languageAuto: "Auto (follows browser/system)",
			groupBehavior: "Behavior",
			autoSendLabel: "Auto-send after recognition",
			autoSendDesc: "When on, the prompt is submitted right after recognition (push-to-talk style). When off, it fills the draft for confirmation.",
			silenceStopLabel: "Auto-stop on silence",
			silenceStopDesc: "Off (default): recording ends only when you stop it manually — everything you said goes to recognition at once. On: ends automatically after 2.5s of silence.",
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
			dismiss: "Dismiss",
			save: "Save",
			saveFailed: "Save failed",
			configSaveFailed: "Failed to persist config to host — changes may be lost on restart. Check host status and retry.",
			loadFailed: "Load failed",
			micTitle: "Voice input",
			recordingTitle: "Recording… click to stop",
			transcribingTitle: "Transcribing… click to cancel",
			optimizingTitle: "Optimizing… click to cancel",
			errNoMic: "No microphone detected",
			errNoSound: "No sound detected: the recording was silent and was not sent. Check the mic permission, system input volume, and pick the built-in microphone as the input device in the browser site settings / permission prompt (virtual audio devices are often selected by mistake and record silence)",
			errNoSpeechSupport: "Web Speech is not supported by this browser; switch to cloud ASR (Chrome/Edge support it).",
			errWebSpeechNetwork: "Browser speech recognition network is unavailable (the service may be blocked); switch to cloud ASR.",
			errCloudNotConfigured: "Cloud ASR is not configured: set Base URL and API key in settings.",
			noSpeechDetected: "No speech detected",
			fallbackToCloud: "Browser speech unavailable; switched to cloud ASR",
			errTranscribe: "Transcription failed",
			errOptimize: "Optimization failed",
			previewTitle: "Prompt optimization preview",
			previewOriginal: "Raw transcript",
			previewOptimized: "Optimized",
			previewConfirm: "Fill & send",
			previewCancel: "Cancel",
			autoSendHint: "Will auto-send after recognition",
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
.dshav-toggle input[type='checkbox'] {
  flex: none;
  width: 16px;
  height: 16px;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
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
		/** 运行时配置快照：初始为默认值，scope 订阅与 setConfig 共同维护。 */
		const config = structuredClone({
			asr: {
				provider: "auto",
				cloud: {
					providers: [],
					active: "",
					preset: "openai",
					baseUrl: "",
					apiKey: "",
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
				copyToClipboard: true
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
		/** host settings scope 的写路径（apply 时绑定；未绑定则只更新本地快照）。 */
		let voiceScope;
		/** 广播配置变更（设置卡片/录音按钮监听，驱动重渲染）。 */
		function announce() {
			const detail = { ...config };
			window.dispatchEvent(new CustomEvent("dsh-asr-voice:config", { detail }));
			for (const fn of listeners) fn();
		}
		/** 深合并 host 快照到本地 config（只覆盖已存在的顶层键）。 */
		function mergeHostValue(value) {
			const assign = (target, src) => {
				if (!src || typeof src !== "object" || Array.isArray(src)) return;
				for (const key of Object.keys(target)) {
					const next = src[key];
					if (next === void 0) continue;
					if (key === "providers" && Array.isArray(next)) {
						target[key] = next;
						continue;
					}
					if (target[key] !== null && typeof target[key] === "object" && !Array.isArray(target[key])) assign(target[key], next);
					else target[key] = next;
				}
			};
			assign(config, value);
		}
		/**
		* 绑定 host settings scope 并订阅：首次读取当前值，之后 scope 变化回写本地
		* 快照并广播。settingsScope 为可选服务——由调用方（apply 里 scoped inject）
		* 把 binder 传入；拿不到则不绑定，仅用本地快照。
		* @param binder - settingsScope 服务的 binder（SettingsScopeBinder）。
		* @returns 订阅 disposer（随 fiber 清理）。
		*/
		function bindConfigScope(binder) {
			const scope = binder.bind({ namespace: "asr-voice" });
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
		* 更新一个配置字段：改本地快照 → 广播 → 写 host settings。
		* @param field - 顶层字段名。
		* @param mutator - 修改快照的闭包（同步执行后读取新值写 host）。
		*/
		function setConfig(field, mutator) {
			mutator();
			announce();
			if (voiceScope !== void 0) voiceScope.set(field, config[field]).catch(() => {
				window.dispatchEvent(new CustomEvent("dsh-asr-voice:config-error", { detail: { field } }));
			});
		}
		/** 解析当前生效的云端供应商配置（多供应商 active/首个，或旧单配置）。 */
		function activeCloudProvider() {
			const cloud = config.asr.cloud;
			if (cloud.providers.length > 0) return cloud.providers.find((p) => p.id === cloud.active) ?? cloud.providers[0];
			return {
				id: "legacy",
				preset: cloud.preset,
				baseUrl: cloud.baseUrl,
				apiKey: cloud.apiKey,
				model: cloud.model,
				mode: cloud.mode
			};
		}
		/** 当前生效云端供应商是否已配置（baseUrl + apiKey 均非空）。 */
		function cloudConfigured() {
			const p = activeCloudProvider();
			return p.baseUrl.trim() !== "" && p.apiKey.trim() !== "";
		}
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
		/** 预置默认 id。 */
		const DEFAULT_PRESET_ID = "openai";
		//#endregion
		//#region src/client/settings-card.tsx
		/**
		* dsh-asr-voice — client 设置卡片（settings.plugin.item, key: 'asr-voice'）。
		*
		* 「设置 → 插件 → 配置」下的折叠卡片：识别引擎（含多供应商云端）/ 提示词优化 /
		* 语言 / 交互行为（含文本模式、剪贴板）/ 用量统计。
		* 所有控件读写 config 快照（host settings 为权威源），文本输入立即写回。
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
		function ToggleRow({ title, desc, checked, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-field-item",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: "dshav-toggle",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "checkbox",
						checked,
						onChange
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: title })]
				}), desc ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: "dshav-field-hint",
					children: desc
				}) : null]
			});
		}
		/** 文本输入字段（立即写回 host settings）。 */
		function TextRow({ title, desc, value, onChange, wide, type = "text" }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
				title,
				desc,
				control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "dshav-field",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: wide ? "dshav-wide" : void 0,
						type,
						value,
						spellCheck: false,
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
		/** 快捷键录制器：点击后捕获下一组组合键；支持清除。 */
		function HotkeyRecorder({ value, onChange, t }) {
			const [arming, setArming] = react.useState(false);
			const inputRef = react.useRef(null);
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
					ref: inputRef,
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
					setStatus("ok");
				} catch {
					setStatus("err");
				}
			}, []);
			react.useEffect(() => {
				load();
			}, [load]);
			const modelOptions = (providers?.find((p) => p.provider === provider))?.models ?? [];
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
		/** 供应商 ASR 模型拉取：点击「获取模型」→ /api/asr-voice/asr-models 动态拉取最新 ASR 模型并可选。 */
		function AsrModelFetch({ t, providerId, model, onModel }) {
			const [models, setModels] = react.useState(null);
			const [status, setStatus] = react.useState("idle");
			const [errMsg, setErrMsg] = react.useState("");
			const fetchModels = async () => {
				setStatus("loading");
				setErrMsg("");
				try {
					const res = await fetch(`/api/asr-voice/asr-models?providerId=${encodeURIComponent(providerId)}`, {
						cache: "no-store",
						signal: AbortSignal.timeout(3e4)
					});
					const data = await res.json().catch(() => ({}));
					if (!res.ok || data.ok !== true || !Array.isArray(data.models)) throw new Error(data.reason || "fetch failed");
					setModels(data.models);
					setStatus("ok");
				} catch (error) {
					setStatus("err");
					setErrMsg(error instanceof Error ? error.message : String(error));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-field",
				style: { flexWrap: "wrap" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "dshav-button dshav-button-outline dshav-button-sm",
						onClick: () => {
							fetchModels();
						},
						disabled: status === "loading",
						children: status === "loading" ? t("fetchModelsLoading") : t("fetchModels")
					}),
					status === "ok" && models !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
						value: model,
						onChange: (e) => onModel(e.target.value),
						title: t("fetchModelsPick"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: "",
							children: model === "" ? t("fetchModelsPick") : t("fetchModelsCurrent")
						}), models.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: m.id,
							children: m.name
						}, m.id))]
					}),
					status === "ok" && models !== null && models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "dshav-field-hint",
						children: t("fetchModelsEmpty")
					}) : null,
					status === "err" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "dshav-field-hint",
						children: [t("fetchModelsFail"), errMsg ? `：${errMsg}` : ""]
					}) : null
				]
			});
		}
		/** 单个云端供应商编辑器（预置 / baseUrl / key / 模型+拉取 / 通道 / 删除）。 */
		function CloudProviderEditor({ t, provider, active, onUpdate, onRemove, onSetActive, removable }) {
			const preset = presetById(provider.preset) ?? presetById("openai");
			const presetOptions = [...CLOUD_PRESETS.map((p) => ({
				value: p.id,
				label: p.label
			})), {
				value: "custom",
				label: t("cloudPresetCustom")
			}];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "dshav-stack",
				style: {
					border: "1px solid var(--dsw-alias-border-l2)",
					borderRadius: 10,
					padding: "0 10px",
					marginBottom: 6
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "dshav-field-head",
						style: { padding: "10px 0 2px" },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "dshav-toggle",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "radio",
									name: "dshav-active-provider",
									checked: active,
									onChange: () => onSetActive(provider.id)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: active ? t("activeProvider") : t("providerInactive") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { flex: 1 } }),
							removable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "dshav-button dshav-button-outline dshav-button-sm",
								onClick: () => onRemove(provider.id),
								children: t("removeProvider")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
						title: t("cloudPresetLabel"),
						value: provider.preset,
						options: presetOptions,
						onChange: (v) => onUpdate(provider.id, (p) => {
							p.preset = v;
							const pr = presetById(v);
							if (pr) {
								p.baseUrl = pr.baseUrl;
								p.model = pr.defaultModel;
								p.mode = pr.mode;
							}
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, {
						title: t("cloudBaseUrlLabel"),
						value: provider.baseUrl,
						onChange: (v) => onUpdate(provider.id, (p) => {
							p.baseUrl = v;
							p.preset = "custom";
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TextRow, {
						title: t("cloudApiKeyLabel"),
						value: provider.apiKey,
						onChange: (v) => onUpdate(provider.id, (p) => {
							p.apiKey = v;
						}),
						type: "password"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
						title: t("cloudModelLabel"),
						desc: t("cloudModelHint"),
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AsrModelFetch, {
							t,
							providerId: provider.id,
							model: provider.model,
							onModel: (v) => onUpdate(provider.id, (p) => {
								p.model = v;
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
						title: t("cloudModeLabel"),
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
						onChange: (v) => onUpdate(provider.id, (p) => {
							p.mode = v;
						})
					}),
					preset ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "dshav-field-hint",
						children: preset.hint
					}) : null
				]
			});
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
		/** 生成供应商唯一 id。 */
		function providerId() {
			const c = globalThis.crypto;
			if (c?.randomUUID) return c.randomUUID();
			return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
		}
		/** 设置卡片（折叠交互与其他插件一致：可点击 header + chevron 旋转 + 条件 body）。 */
		function VoiceSettingsCard({ t }) {
			useConfigVersion();
			const [open, setOpen] = react.useState(false);
			const [saveErr, setSaveErr] = react.useState(false);
			react.useEffect(() => {
				const onError = () => setSaveErr(true);
				window.addEventListener("dsh-asr-voice:config-error", onError);
				return () => window.removeEventListener("dsh-asr-voice:config-error", onError);
			}, []);
			react.useEffect(() => {
				const cloud = config.asr.cloud;
				if (cloud.providers.length === 0 && cloud.baseUrl.trim() !== "") setConfig("asr", () => {
					config.asr.cloud.providers = [{
						id: "legacy",
						preset: cloud.preset || "custom",
						baseUrl: cloud.baseUrl,
						apiKey: cloud.apiKey,
						model: cloud.model,
						mode: cloud.mode
					}];
					config.asr.cloud.active = "legacy";
				});
			}, []);
			const setProvider = (v) => {
				setConfig("asr", () => {
					config.asr.provider = v === "cloud" ? "cloud" : v === "browser" ? "browser" : "auto";
				});
			};
			const updateProvider = (id, mutator) => {
				setConfig("asr", () => {
					const p = config.asr.cloud.providers.find((x) => x.id === id);
					if (p) mutator(p);
				});
			};
			const addProvider = () => {
				setConfig("asr", () => {
					const p = presetById(DEFAULT_PRESET_ID);
					config.asr.cloud.providers.push({
						id: providerId(),
						preset: p.id,
						baseUrl: p.baseUrl,
						apiKey: "",
						model: p.defaultModel,
						mode: p.mode
					});
					if (config.asr.cloud.active === "") config.asr.cloud.active = config.asr.cloud.providers[config.asr.cloud.providers.length - 1].id;
				});
			};
			const removeProvider = (id) => {
				setConfig("asr", () => {
					config.asr.cloud.providers = config.asr.cloud.providers.filter((p) => p.id !== id);
					if (config.asr.cloud.active === id) config.asr.cloud.active = config.asr.cloud.providers[0]?.id ?? "";
				});
			};
			const setActive = (id) => {
				setConfig("asr", () => {
					config.asr.cloud.active = id;
				});
			};
			const setOptimizeMode = (v) => {
				setConfig("optimize", () => {
					config.optimize.mode = v === "llm" ? "llm" : "heuristic";
				});
			};
			const setOptimizePreview = (v) => {
				setConfig("optimize", () => {
					config.optimize.preview = v;
				});
			};
			const setLlmProvider = (v) => {
				setConfig("optimize", () => {
					config.optimize.llm.provider = v;
					config.optimize.llm.model = "";
				});
			};
			const setLlmModel = (v) => {
				setConfig("optimize", () => {
					config.optimize.llm.model = v;
				});
			};
			const setLanguage = (v) => {
				setConfig("language", () => {
					config.language = v;
				});
			};
			const setAutoSend = (v) => {
				setConfig("behavior", () => {
					config.behavior.autoSend = v;
				});
			};
			const setSilenceStop = (v) => {
				setConfig("behavior", () => {
					config.behavior.silenceStop = v;
				});
			};
			const setHoldToTalk = (v) => {
				setConfig("behavior", () => {
					config.behavior.holdToTalk = v;
				});
			};
			const setHotkey = (v) => {
				setConfig("behavior", () => {
					config.behavior.hotkey = v;
				});
			};
			const setTextMode = (v) => {
				setConfig("behavior", () => {
					config.behavior.textMode = v === "append" ? "append" : "replace";
				});
			};
			const setCopyToClipboard = (v) => {
				setConfig("behavior", () => {
					config.behavior.copyToClipboard = v;
				});
			};
			const providers = config.asr.cloud.providers;
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
						saveErr ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "dshav-field-hint",
							role: "alert",
							children: t("configSaveFailed")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-groupTitle",
									children: t("groupAsr")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
									title: t("asrProviderLabel"),
									value: config.asr.provider,
									options: [
										{
											value: "auto",
											label: t("asrProviderAuto")
										},
										{
											value: "browser",
											label: t("asrProviderBrowser")
										},
										{
											value: "cloud",
											label: t("asrProviderCloud")
										}
									],
									onChange: setProvider
								}),
								config.asr.provider === "cloud" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dshav-stack",
									children: [providers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: "dshav-field-hint",
										children: t("providersEmpty")
									}) : providers.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CloudProviderEditor, {
										t,
										provider: p,
										active: p.id === config.asr.cloud.active,
										onUpdate: updateProvider,
										onRemove: removeProvider,
										onSetActive: setActive,
										removable: providers.length > 1
									}, p.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "dshav-field",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: "dshav-button dshav-button-outline dshav-button-sm",
											onClick: addProvider,
											children: t("addProvider")
										})
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-groupTitle",
									children: t("groupOptimize")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
									title: t("optimizeModeLabel"),
									value: config.optimize.mode,
									options: [{
										value: "heuristic",
										label: t("optimizeHeuristic")
									}, {
										value: "llm",
										label: t("optimizeLlm")
									}],
									onChange: setOptimizeMode
								}),
								config.optimize.mode === "llm" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "dshav-stack",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dshav-field-hint",
											children: t("llmDefaultHint")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelPicker, {
											t,
											provider: config.optimize.llm.provider,
											model: config.optimize.llm.model,
											onProvider: setLlmProvider,
											onModel: setLlmModel
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											className: "dshav-field-hint",
											children: t("llmCustomHint")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
											title: t("optimizePreviewLabel"),
											desc: t("optimizePreviewDesc"),
											checked: config.optimize.preview,
											onChange: () => setOptimizePreview(!config.optimize.preview)
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-groupTitle",
								children: t("languageLabel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
								title: t("languageLabel"),
								value: config.language,
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
								onChange: setLanguage
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "dshav-groupTitle",
									children: t("groupBehavior")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
									title: t("autoSendLabel"),
									desc: t("autoSendDesc"),
									checked: config.behavior.autoSend,
									onChange: () => setAutoSend(!config.behavior.autoSend)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
									title: t("silenceStopLabel"),
									desc: t("silenceStopDesc"),
									checked: config.behavior.silenceStop,
									onChange: () => setSilenceStop(!config.behavior.silenceStop)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
									title: t("holdToTalkLabel"),
									desc: t("holdToTalkDesc"),
									checked: config.behavior.holdToTalk,
									onChange: () => setHoldToTalk(!config.behavior.holdToTalk)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectRow, {
									title: t("textModeLabel"),
									desc: t("textModeDesc"),
									value: config.behavior.textMode,
									options: [{
										value: "replace",
										label: t("textModeReplace")
									}, {
										value: "append",
										label: t("textModeAppend")
									}],
									onChange: setTextMode
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToggleRow, {
									title: t("copyToClipboardLabel"),
									desc: t("copyToClipboardDesc"),
									checked: config.behavior.copyToClipboard,
									onChange: () => setCopyToClipboard(!config.behavior.copyToClipboard)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									title: t("hotkeyLabel"),
									desc: t("hotkeyDesc"),
									control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HotkeyRecorder, {
										value: config.behavior.hotkey,
										onChange: setHotkey,
										t
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "dshav-group",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "dshav-groupTitle",
								children: t("groupStats")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageStats, { t })]
						})
					]
				}) : null]
			});
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
		/** 录音最长时长（毫秒）。 */
		const MAX_RECORD_MS = 12e4;
		/** 云端转写请求超时（毫秒）：上游不可达/卡住时不把 UI 永远钉在「识别中」。 */
		const TRANSCRIBE_TIMEOUT_MS = 6e4;
		/** 静音判定阈值（RMS，0~1）。 */
		const SILENCE_RMS = .02;
		/** 静音持续多久自动停止（毫秒）。 */
		const SILENCE_MS = 2500;
		/** 浏览器是否可用 Web Speech API。 */
		function isWebSpeechSupported() {
			return typeof window !== "undefined" && "webkitSpeechRecognition" in window;
		}
		/** 语言参数：auto → 返回 undefined（交给浏览器/服务端默认）。 */
		function resolveLang(language) {
			if (!language || language === "auto") return void 0;
			return language;
		}
		/** 浏览器引擎：Web Speech API。 */
		function createBrowserRecorder(language, onError) {
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
			let levelRaf = 0;
			let simLevel = .05;
			let levelPhase = Math.random() * Math.PI * 2;
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
				const loop = () => {
					if (stopped) {
						levelRaf = 0;
						return;
					}
					levelPhase += .16 + Math.random() * .12;
					const base = .24 + .16 * Math.sin(levelPhase);
					const burst = Math.random() < .07 ? Math.random() * .45 : 0;
					const next = Math.min(1, Math.max(.02, base + burst + Math.random() * .12));
					simLevel += (next - simLevel) * .32;
					recorder.onLevel?.(simLevel);
					levelRaf = requestAnimationFrame(loop);
				};
				levelRaf = requestAnimationFrame(loop);
			};
			const stopLevelSim = () => {
				if (levelRaf) cancelAnimationFrame(levelRaf);
				levelRaf = 0;
			};
			const emitInterim = () => {
				const text = `${finalText}${finalText && interim ? " " : ""}${interim}`.trim();
				recorder.onInterim?.(text);
			};
			const settle = () => {
				if (stopped) return;
				stopped = true;
				stopLevelSim();
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
				}, MAX_RECORD_MS);
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
		function createCloudRecorder(language, onError, silenceStop) {
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
			* 仅当 silenceStop 开启时附带静音自动停止逻辑。
			* 注意：静音判定不依赖此处（Web Audio 双消费/挂起会误读），改由 onstop 里
			* 基于「转换后 WAV 的真实峰值」判定，此处只做实时反馈。
			*/
			const startLevelMeter = (withSilenceStop) => {
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
						let sum = 0;
						for (let i = 0; i < data.length; i++) {
							const v = (data[i] - 128) / 128;
							sum += v * v;
						}
						const rms = Math.sqrt(sum / data.length);
						recorder.onLevel?.(Math.min(1, rms * 4));
						if (withSilenceStop) {
							if (rms < SILENCE_RMS) {
								if (silentSince === null) silentSince = performance.now();
								else if (performance.now() - silentSince > SILENCE_MS) {
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
							if (wavPeak >= 0 && wavPeak < .005) {
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
				startLevelMeter(silenceStop);
				maxTimer = setTimeout(() => {
					recorder.stop().catch(() => {});
				}, MAX_RECORD_MS);
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
				const channels = audio.numberOfChannels;
				const srcLen = audio.length;
				const mono = new Float32Array(srcLen);
				for (let ch = 0; ch < channels; ch++) {
					const data = audio.getChannelData(ch);
					for (let i = 0; i < srcLen; i++) mono[i] = (mono[i] ?? 0) + data[i] / channels;
				}
				const targetRate = 16e3;
				const sourceRate = audio.sampleRate;
				const outLen = Math.max(1, Math.round(srcLen * targetRate / sourceRate));
				const out = new Float32Array(outLen);
				const ratio = sourceRate / targetRate;
				for (let i = 0; i < outLen; i++) {
					const pos = i * ratio;
					const i0 = Math.floor(pos);
					const i1 = Math.min(i0 + 1, srcLen - 1);
					const frac = pos - i0;
					out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
				}
				let peak = 0;
				for (let i = 0; i < outLen; i++) {
					const a = Math.abs(out[i]);
					if (a > peak) peak = a;
				}
				const gain = peak > 1e-4 ? Math.min(4, .9 / peak) : 1;
				const dataLen = outLen * 2;
				const wav = new ArrayBuffer(44 + dataLen);
				const view = new DataView(wav);
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
				view.setUint32(24, targetRate, true);
				view.setUint32(28, targetRate * 2, true);
				view.setUint16(32, 2, true);
				view.setUint16(34, 16, true);
				writeStr(36, "data");
				view.setUint32(40, dataLen, true);
				for (let i = 0; i < outLen; i++) {
					const s = Math.max(-1, Math.min(1, out[i] * gain));
					view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
				}
				return {
					wav: new Blob([wav], { type: "audio/wav" }),
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
		/** 上传音频到 host 转写代理（带超时，防上游卡死钉住 UI）。 */
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
		* @param silenceStop - 云端引擎是否启用静音自动停止（默认关 = 手动关麦）。
		*/
		function createVoiceRecorder(engine, language, onError, silenceStop = false) {
			if (engine === "cloud") return createCloudRecorder(language, onError, silenceStop);
			return createBrowserRecorder(language, onError);
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
		* 重渲染 VoiceButton 时柱子的虚拟 DOM 不再重建（柱形是静态的，仅高度
		* 由 CSS 变量 --level 在帧循环驱动）。
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
					}, config.behavior.silenceStop);
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
							error,
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
							notice,
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
		/** 只依赖实际存在的硬服务；settingsScope 走 scoped inject（可选）。 */
		const inject = ["slots", "locale"];
		/** 快捷键处理（按住说话 / 点击切换），随 fiber 生命周期注册。 */
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
			const onKeyDown = (e) => {
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
			ctx.effect(applyHotkey, "asr-voice: hotkey");
			ctx.inject(["settingsScope"], (raw) => {
				const c = raw;
				const binder = c.settingsScope;
				if (binder === void 0) return;
				c.effect(() => bindConfigScope(binder), "asr-voice: settings scope sync");
				c.slots.inject("settings.plugin.item", () => c.slots.register({
					name: "settings.plugin.item",
					key: "asr-voice",
					locale: NS
				}, () => react_jsx_runtime.jsx(VoiceSettingsCard, { t })));
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