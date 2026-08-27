/**
 * dsh-asr-voice — client 词典（zh / en）。
 */

/** 词典键（设置卡片 + 录音按钮 + 预览卡共用）。 */
export type LocaleKey =
  | 'cardTitle'
  | 'cardCopy'
  | 'groupAsr'
  | 'asrProviderLabel'
  | 'asrProviderAuto'
  | 'asrProviderBrowser'
  | 'asrProviderCloud'
  | 'cloudPresetLabel'
  | 'cloudPresetCustom'
  | 'cloudBaseUrlLabel'
  | 'cloudApiKeyLabel'
  | 'cloudModelLabel'
  | 'cloudModelHint'
  | 'groupOptimize'
  | 'optimizeModeLabel'
  | 'optimizeHeuristic'
  | 'optimizeLlm'
  | 'llmDefaultHint'
  | 'llmProviderLabel'
  | 'llmModelLabel'
  | 'llmCurrentDefault'
  | 'llmCustomHint'
  | 'llmModelsEmpty'
  | 'languageLabel'
  | 'languageAuto'
  | 'groupBehavior'
  | 'autoSendLabel'
  | 'autoSendDesc'
  | 'holdToTalkLabel'
  | 'holdToTalkDesc'
  | 'hotkeyLabel'
  | 'hotkeyDesc'
  | 'hotkeyPlaceholder'
  | 'hotkeyClear'
  | 'save'
  | 'saveFailed'
  | 'loadFailed'
  | 'micTitle'
  | 'recordingTitle'
  | 'transcribingTitle'
  | 'optimizingTitle'
  | 'errNoMic'
  | 'errNoSpeechSupport'
  | 'errWebSpeechNetwork'
  | 'errCloudNotConfigured'
  | 'noSpeechDetected'
  | 'fallbackToCloud'
  | 'errTranscribe'
  | 'errOptimize'
  | 'previewTitle'
  | 'previewOriginal'
  | 'previewOptimized'
  | 'previewConfirm'
  | 'previewCancel'
  | 'autoSendHint'

/** 词典值（支持 {x} 插值）。 */
export type LocaleDict = Record<LocaleKey, string>

/** 词典绑定后的翻译函数。 */
export type LocaleT = (key: LocaleKey, vars?: Record<string, string | number>) => string

export const zh: LocaleDict = {
  cardTitle: '语音输入',
  cardCopy: '开口成文：识别、优化、填入草稿。',
  groupAsr: '识别引擎',
  asrProviderLabel: 'ASR 引擎',
  asrProviderAuto: '自动（浏览器优先，云端兜底）',
  asrProviderBrowser: '浏览器（Web Speech，免费免 key）',
  asrProviderCloud: '云端（OpenAI-compatible）',
  cloudPresetLabel: '服务商预置',
  cloudPresetCustom: '自定义',
  cloudBaseUrlLabel: 'Base URL',
  cloudApiKeyLabel: 'API Key（仅存本机服务端）',
  cloudModelLabel: '模型',
  cloudModelHint: '预置自动填充，可自行修改；自定义端点可填任意 OpenAI-compatible 模型。',
  groupOptimize: '提示词优化',
  optimizeModeLabel: '优化方式',
  optimizeHeuristic: '本地启发式（免费、离线）',
  optimizeLlm: 'LLM 重写（默认用当前所选模型）',
  llmDefaultHint: '默认使用当前所选 LLM；可在此指定 DSH 已配置的模型。',
  llmProviderLabel: '模型提供方',
  llmModelLabel: '模型',
  llmCurrentDefault: '当前所选（默认）',
  llmCustomHint: '如需自定义模型，请到 DSH 模型列表添加后再选择。',
  llmModelsEmpty: '该提供方暂无可用模型',
  languageLabel: '识别语言',
  languageAuto: '自动（跟随浏览器/系统）',
  groupBehavior: '交互行为',
  autoSendLabel: '识别后自动发送',
  autoSendDesc: '开启后说完即发（push-to-talk 风格），关闭则填入草稿待确认。',
  holdToTalkLabel: '按住说话',
  holdToTalkDesc: '开启后按住快捷键说话、松开结束；关闭为点击开始/点击或静音自动结束。',
  hotkeyLabel: '快捷键',
  hotkeyDesc: '点击后按新组合键（如 Ctrl+Shift+Space）；留空关闭。',
  hotkeyPlaceholder: '点击录制快捷键',
  hotkeyClear: '清除',
  save: '保存',
  saveFailed: '保存失败',
  loadFailed: '加载失败',
  micTitle: '语音输入',
  recordingTitle: '录音中…点击结束',
  transcribingTitle: '识别中…',
  optimizingTitle: '优化中…',
  errNoMic: '未检测到麦克风',
  errNoSpeechSupport: '当前浏览器不支持 Web Speech，请改用云端 ASR（Chrome/Edge 均支持）。',
  errWebSpeechNetwork: '浏览器语音识别网络不可用（服务可能被网络屏蔽），已请改用云端 ASR。',
  errCloudNotConfigured: '云端 ASR 未配置：请到设置填写 Base URL 与 API Key。',
  noSpeechDetected: '未检测到语音',
  fallbackToCloud: '浏览器语音识别不可用，已自动切换云端 ASR',
  errTranscribe: '识别失败',
  errOptimize: '优化失败',
  previewTitle: '提示词优化预览',
  previewOriginal: '原始转写',
  previewOptimized: '优化后',
  previewConfirm: '填入并发送',
  previewCancel: '取消',
  autoSendHint: '识别后将自动发送',
}

export const en: LocaleDict = {
  cardTitle: 'Voice Input',
  cardCopy: 'Speak to prompt — recognized, optimized, delivered.',
  groupAsr: 'Recognition engine',
  asrProviderLabel: 'ASR engine',
  asrProviderAuto: 'Auto (browser first, cloud fallback)',
  asrProviderBrowser: 'Browser (Web Speech, free, no key)',
  asrProviderCloud: 'Cloud (OpenAI-compatible)',
  cloudPresetLabel: 'Provider preset',
  cloudPresetCustom: 'Custom',
  cloudBaseUrlLabel: 'Base URL',
  cloudApiKeyLabel: 'API key (stored on this machine, server-side)',
  cloudModelLabel: 'Model',
  cloudModelHint: 'Pre-filled from the preset; editable. Custom endpoints accept any OpenAI-compatible model.',
  groupOptimize: 'Prompt optimization',
  optimizeModeLabel: 'Optimization mode',
  optimizeHeuristic: 'Local heuristic (free, offline)',
  optimizeLlm: 'LLM rewrite (uses current model by default)',
  llmDefaultHint: 'Uses the current model by default; pick a configured DSH model below.',
  llmProviderLabel: 'Provider',
  llmModelLabel: 'Model',
  llmCurrentDefault: 'Current model (default)',
  llmCustomHint: 'To use a custom model, add it to the DSH model list first, then pick it here.',
  llmModelsEmpty: 'No models available for this provider',
  languageLabel: 'Recognition language',
  languageAuto: 'Auto (follows browser/system)',
  groupBehavior: 'Behavior',
  autoSendLabel: 'Auto-send after recognition',
  autoSendDesc: 'When on, the prompt is submitted right after recognition (push-to-talk style). When off, it fills the draft for confirmation.',
  holdToTalkLabel: 'Hold to talk',
  holdToTalkDesc: 'When on, hold the hotkey to talk and release to stop. When off, click to start and click again (or silence) to stop.',
  hotkeyLabel: 'Hotkey',
  hotkeyDesc: 'Click, then press a new combo (e.g. Ctrl+Shift+Space). Clear to disable.',
  hotkeyPlaceholder: 'Click to record hotkey',
  hotkeyClear: 'Clear',
  save: 'Save',
  saveFailed: 'Save failed',
  loadFailed: 'Load failed',
  micTitle: 'Voice input',
  recordingTitle: 'Recording… click to stop',
  transcribingTitle: 'Transcribing…',
  optimizingTitle: 'Optimizing…',
  errNoMic: 'No microphone detected',
  errNoSpeechSupport: 'Web Speech is not supported by this browser; switch to cloud ASR (Chrome/Edge support it).',
  errWebSpeechNetwork: 'Browser speech recognition network is unavailable (the service may be blocked); switch to cloud ASR.',
  errCloudNotConfigured: 'Cloud ASR is not configured: set Base URL and API key in settings.',
  noSpeechDetected: 'No speech detected',
  fallbackToCloud: 'Browser speech unavailable; switched to cloud ASR',
  errTranscribe: 'Transcription failed',
  errOptimize: 'Optimization failed',
  previewTitle: 'Prompt optimization preview',
  previewOriginal: 'Raw transcript',
  previewOptimized: 'Optimized',
  previewConfirm: 'Fill & send',
  previewCancel: 'Cancel',
  autoSendHint: 'Will auto-send after recognition',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-asr-voice unified copy (flat string keys). */
    'asr-voice': string
  }
}
