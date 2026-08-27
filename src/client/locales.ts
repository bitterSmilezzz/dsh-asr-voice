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
  | 'cloudModeLabel'
  | 'cloudModeAuto'
  | 'cloudModeTranscriptions'
  | 'cloudModeChat'
  | 'addProvider'
  | 'removeProvider'
  | 'providersEmpty'
  | 'activeProvider'
  | 'providerInactive'
  | 'fetchModels'
  | 'fetchModelsLoading'
  | 'fetchModelsPick'
  | 'fetchModelsCurrent'
  | 'fetchModelsEmpty'
  | 'fetchModelsFail'
  | 'groupOptimize'
  | 'optimizeModeLabel'
  | 'optimizeHeuristic'
  | 'optimizeLlm'
  | 'optimizePreviewLabel'
  | 'optimizePreviewDesc'
  | 'optimizingHint'
  | 'optimizeFailedKeep'
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
  | 'silenceStopLabel'
  | 'silenceStopDesc'
  | 'holdToTalkLabel'
  | 'holdToTalkDesc'
  | 'textModeLabel'
  | 'textModeDesc'
  | 'textModeReplace'
  | 'textModeAppend'
  | 'copyToClipboardLabel'
  | 'copyToClipboardDesc'
  | 'hotkeyLabel'
  | 'hotkeyDesc'
  | 'hotkeyPlaceholder'
  | 'hotkeyClear'
  | 'dismiss'
  | 'save'
  | 'saveFailed'
  | 'loadFailed'
  | 'micTitle'
  | 'recordingTitle'
  | 'transcribingTitle'
  | 'optimizingTitle'
  | 'errNoMic'
  | 'errNoSound'
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
  | 'groupStats'
  | 'statsTitle'
  | 'statsCount'
  | 'statsChars'
  | 'statsLastAt'
  | 'statsEmpty'

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
  cloudModeLabel: '调用通道',
  cloudModeAuto: '自动（按模型名判定）',
  cloudModeTranscriptions: 'whisper 式 /audio/transcriptions',
  cloudModeChat: 'chat + input_audio（MiMo/Qwen-ASR）',
  addProvider: '＋ 添加供应商',
  removeProvider: '删除',
  providersEmpty: '尚未配置云端供应商，点「添加供应商」开始。',
  activeProvider: '当前使用',
  providerInactive: '备选',
  fetchModels: '获取模型',
  fetchModelsLoading: '获取中…',
  fetchModelsPick: '选择模型',
  fetchModelsCurrent: '当前模型',
  fetchModelsEmpty: '该供应商暂无 ASR 模型',
  fetchModelsFail: '获取模型失败',
  groupOptimize: '提示词优化',
  optimizeModeLabel: '优化方式',
  optimizeHeuristic: '本地启发式（免费、离线）',
  optimizeLlm: 'LLM 重写（默认用当前所选模型）',
  optimizePreviewLabel: '优化结果先预览确认',
  optimizePreviewDesc: '关闭（默认）：停止录音立即把清洗版文本填入草稿，LLM 优化在后台完成后自动替换（不覆盖你的编辑）；开启：等优化完成弹出预览卡，确认后再填入。',
  optimizingHint: '优化中…草稿已填入，可直接编辑或发送',
  optimizeFailedKeep: '优化失败，已保留草稿中的清洗版文本',
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
  silenceStopLabel: '静音自动停止',
  silenceStopDesc: '关闭（默认）：只有手动点击/快捷键结束录音，点停止即整段去识别；开启：静音持续 2.5 秒自动结束。',
  holdToTalkLabel: '按住说话',
holdToTalkDesc: '开启后按住快捷键说话、松开结束；关闭为点击开始、再点结束（静音自动结束由「静音自动停止」开关决定）。',
  textModeLabel: '文本输入',
  textModeDesc: '完整替换：清空草稿后填入；末尾追加：在已有文字后插入。',
  textModeReplace: '完整替换（默认）',
  textModeAppend: '在已有文字后追加',
  copyToClipboardLabel: '自动复制到剪贴板',
  copyToClipboardDesc: '识别优化后自动把结果复制到系统剪贴板，方便粘贴到其它地方。',
  hotkeyLabel: '快捷键',
  hotkeyDesc: '点击后按新组合键（如 Ctrl+Shift+Space）；留空关闭。',
  hotkeyPlaceholder: '点击录制快捷键',
  hotkeyClear: '清除',
  dismiss: '关闭',
  save: '保存',
  saveFailed: '保存失败',
  loadFailed: '加载失败',
  micTitle: '语音输入',
  recordingTitle: '录音中…点击结束',
  transcribingTitle: '识别中…',
  optimizingTitle: '优化中…',
  errNoMic: '未检测到麦克风',
  errNoSound: '未检测到声音：录音为静音，未发送识别。请检查麦克风权限、系统输入音量，并在浏览器地址栏站点设置/授权弹窗中把输入设备选为「内置麦克风」（虚拟音频设备常被误选导致静音）',
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
  groupStats: '用量统计',
  statsTitle: 'ASR 用量',
  statsCount: '已识别 {n} 次',
  statsChars: '累计 {n} 字符',
  statsLastAt: '最近 {time}',
  statsEmpty: '暂无用量数据',
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
  cloudModeLabel: 'Endpoint mode',
  cloudModeAuto: 'Auto (by model name)',
  cloudModeTranscriptions: 'Whisper-style /audio/transcriptions',
  cloudModeChat: 'Chat + input_audio (MiMo/Qwen-ASR)',
  addProvider: '+ Add provider',
  removeProvider: 'Remove',
  providersEmpty: 'No cloud provider configured — click “Add provider” to begin.',
  activeProvider: 'Active',
  providerInactive: 'Standby',
  fetchModels: 'Fetch models',
  fetchModelsLoading: 'Fetching…',
  fetchModelsPick: 'Pick a model',
  fetchModelsCurrent: 'Current model',
  fetchModelsEmpty: 'No ASR models from this provider',
  fetchModelsFail: 'Failed to fetch models',
  groupOptimize: 'Prompt optimization',
  optimizeModeLabel: 'Optimization mode',
  optimizeHeuristic: 'Local heuristic (free, offline)',
  optimizeLlm: 'LLM rewrite (uses current model by default)',
  optimizePreviewLabel: 'Preview optimized text before inserting',
  optimizePreviewDesc: 'Off (default): the cleaned text fills the draft immediately after recording; the background LLM rewrite replaces it when done (never overrides your edits). On: wait for the rewrite, confirm in a preview card.',
  optimizingHint: 'Optimizing… draft is ready — edit or send now',
  optimizeFailedKeep: 'Optimization failed; the cleaned draft was kept',
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
  silenceStopLabel: 'Auto-stop on silence',
  silenceStopDesc: 'Off (default): recording ends only when you stop it manually — everything you said goes to recognition at once. On: ends automatically after 2.5s of silence.',
  holdToTalkLabel: 'Hold to talk',
holdToTalkDesc: 'When on, hold the hotkey to talk and release to stop. When off, click to start and click again to stop (silence auto-stop is controlled by its own toggle).',
  textModeLabel: 'Text insertion',
  textModeDesc: 'Replace: clear the draft then fill. Append: insert after existing text.',
  textModeReplace: 'Replace draft (default)',
  textModeAppend: 'Append to existing text',
  copyToClipboardLabel: 'Auto-copy to clipboard',
  copyToClipboardDesc: 'Copy the recognized/optimized result to the system clipboard automatically.',
  hotkeyLabel: 'Hotkey',
  hotkeyDesc: 'Click, then press a new combo (e.g. Ctrl+Shift+Space). Clear to disable.',
  hotkeyPlaceholder: 'Click to record hotkey',
  hotkeyClear: 'Clear',
  dismiss: 'Dismiss',
  save: 'Save',
  saveFailed: 'Save failed',
  loadFailed: 'Load failed',
  micTitle: 'Voice input',
  recordingTitle: 'Recording… click to stop',
  transcribingTitle: 'Transcribing…',
  optimizingTitle: 'Optimizing…',
  errNoMic: 'No microphone detected',
  errNoSound: 'No sound detected: the recording was silent and was not sent. Check the mic permission, system input volume, and pick the built-in microphone as the input device in the browser site settings / permission prompt (virtual audio devices are often selected by mistake and record silence)',
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
  groupStats: 'Usage stats',
  statsTitle: 'ASR usage',
  statsCount: '{n} transcriptions',
  statsChars: '{n} chars total',
  statsLastAt: 'last at {time}',
  statsEmpty: 'No usage data yet',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-asr-voice unified copy (flat string keys). */
    'asr-voice': string
  }
}
