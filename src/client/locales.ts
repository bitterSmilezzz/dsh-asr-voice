/**
 * dsh-asr-voice — client 词典（zh / en）。
 *
 * 键按「三步向导 → 高级 → 录音链路」分块。设置卡片改成 draft + 保存后，
 * 旧的即时写回文案（saveFailed / configSaveFailed）与「获取模型」按钮组已删除。
 */

/** 词典键（设置卡片 + 录音按钮 + 预览卡共用）。 */
export type LocaleKey =
  // 卡片抬头
  | 'cardTitle'
  | 'cardCopy'
  | 'readOnlyDoc'
  | 'howTo'
  // ① 识别方式
  | 'stepEngineTitle'
  | 'engineAuto'
  | 'engineBrowser'
  | 'engineCloud'
  | 'engineHintAuto'
  | 'engineHintBrowser'
  | 'engineHintCloud'
  // ② 服务商
  | 'stepProviderTitle'
  | 'stepProviderHint'
  | 'cloudPresetCustom'
  | 'addProvider'
  | 'removeProvider'
  | 'providersEmpty'
  // ③ 密钥与自检
  | 'stepKeyTitle'
  | 'keyChecking'
  | 'keyQueryFailed'
  | 'keyConfigured'
  | 'keyNeedsValue'
  | 'keyNameNeeded'
  | 'keySave'
  | 'keySaving'
  | 'keySavedHint'
  | 'keySaveFailed'
  | 'keyKeepHint'
  | 'keyKeepPlaceholder'
  | 'keyPastePlaceholder'
  | 'testConnection'
  | 'testAndSave'
  | 'testBusy'
  | 'testOk'
  | 'testFail'
  // 保存条
  | 'save'
  | 'savingHint'
  | 'savedHint'
  | 'saveNotApplied'
  | 'unsavedHint'
  | 'discard'
  // 高级
  | 'advancedTitle'
  | 'advancedHint'
  | 'advancedCollapse'
  | 'groupAsr'
  | 'providerNameLabel'
  | 'providerNameDesc'
  | 'providerListLabel'
  | 'providerListDesc'
  | 'cloudBaseUrlLabel'
  | 'cloudBaseUrlDesc'
  | 'cloudModelLabel'
  | 'cloudModelDesc'
  | 'cloudModelPicked'
  | 'cloudModeLabel'
  | 'cloudModeDesc'
  | 'cloudModeAuto'
  | 'cloudModeTranscriptions'
  | 'cloudModeChat'
  | 'fetchModelsPick'
  | 'fetchModelsEmpty'
  | 'groupOptimize'
  | 'optimizeModeLabel'
  | 'optimizeHeuristic'
  | 'optimizeLlm'
  | 'optimizePreviewLabel'
  | 'optimizePreviewDesc'
  | 'optimizingHint'
  | 'transcribingHint'
  | 'cancelBusy'
  | 'optimizeFailedKeep'
  | 'llmDefaultHint'
  | 'llmProviderLabel'
  | 'llmModelLabel'
  | 'llmCurrentDefault'
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
  | 'maxRecordMsLabel'
  | 'maxRecordMsDesc'
  | 'silenceMsLabel'
  | 'silenceMsDesc'
  | 'silenceRmsLabel'
  | 'silenceRmsDesc'
  // 实时语音对话
  | 'groupRealtime'
  | 'realtimeEnableLabel'
  | 'realtimeEnableDesc'
  | 'realtimeTtsLabel'
  | 'realtimeTtsDesc'
  | 'realtimeTtsBrowser'
  | 'realtimeTtsOff'
  | 'realtimeHotkeyLabel'
  | 'realtimeHotkeyDesc'
  | 'realtimeSettleMsLabel'
  | 'realtimeSettleMsDesc'
  | 'realtimeTailMsLabel'
  | 'realtimeTailMsDesc'
  | 'realtimeEngineLabel'
  | 'realtimeEngineDesc'
  | 'realtimeEngineBrowser'
  | 'realtimeEngineSegmented'
  | 'realtimeEngineCloud'
  | 'vadFrameMsLabel'
  | 'vadFrameMsDesc'
  | 'vadRmsLabel'
  | 'vadRmsDesc'
  | 'vadSilenceMsLabel'
  | 'vadSilenceMsDesc'
  | 'vadPrerollMsLabel'
  | 'vadPrerollMsDesc'
  | 'vadMinSpeechMsLabel'
  | 'vadMinSpeechMsDesc'
  | 'vadMaxSegmentMsLabel'
  | 'vadMaxSegmentMsDesc'
  | 'vadMaxPendingLabel'
  | 'vadMaxPendingDesc'
  | 'realtimeMaxSessionLabel'
  | 'realtimeMaxSessionDesc'
  | 'realtimeFirstSentenceLabel'
  | 'realtimeFirstSentenceDesc'
  | 'realtimeWatchdogLabel'
  | 'realtimeWatchdogDesc'
  // 语音对话按钮
  | 'chatTitle'
  | 'chatListeningTitle'
  | 'chatThinkingTitle'
  | 'chatSpeakingTitle'
  | 'chatThinkingHint'
  | 'chatSpeakingHint'
  | 'chatInterrupt'
  | 'chatEndedLimit'
  | 'chatNoReply'
  | 'chatNoTts'
  | 'chatGap'
  | 'errSegmentedNeedsCloud'
  | 'errSegmentedUnsupported'
  | 'errSegmentedUnreachable'
  // 录音链路 / 预览卡
  | 'dismiss'
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
  readOnlyDoc: '宿主当前不接受配置写入（文档只读或连接未就绪），下面的控件已禁用。',
  howTo: '怎么办：① 选「云端」→ ② 点一个服务商 → ③ 按密钥那行的提示走，就完事了。',

  stepEngineTitle: '识别方式',
  engineAuto: '自动（推荐）',
  engineBrowser: '仅浏览器（无需配置）',
  engineCloud: '云端（更准，需要 key）',
  engineHintAuto: '先用浏览器内置识别，不可用时自动切到云端。什么都没配过就选这个。',
  engineHintBrowser: '完全在浏览器里识别：免费、不需要任何 key。准确率一般，且只有 Chrome / Edge 支持。',
  engineHintCloud: '调用 OpenAI-compatible 云端识别：准确率和多语种更好，需要一把 API key（下一步起）。',

  stepProviderTitle: '服务商',
  stepProviderHint: '点一个即选中，BaseURL、模型和调用通道会自动填好。「自定义」可接任意 OpenAI-compatible 端点。',
  cloudPresetCustom: '自定义',
  addProvider: '＋ 自定义服务商',
  removeProvider: '删除',
  providersEmpty: '还没有云端服务商，点「＋ 自定义服务商」加一行。',

  stepKeyTitle: '密钥与自检',
  keyChecking: '正在查询本机凭据…',
  keyQueryFailed: '凭据状态查询失败',
  keyConfigured: '已使用 DSH 凭据 {ref}，不用再填。',
  keyNeedsValue: '尚未配置密钥：把 {ref} 粘贴到下面并保存。',
  keyNameNeeded: '先给这个服务商起个显示名——密钥引用名由它派生。',
  keySave: '保存密钥',
  keySaving: '保存中…',
  keySavedHint: '密钥已写入 DSH 凭据 {ref}。',
  keySaveFailed: '密钥保存失败',
  keyKeepHint: '密钥只写入 DSH 凭据：不进配置文件、不回显、不经过这个页面读取。',
  keyKeepPlaceholder: '留空即不改动',
  keyPastePlaceholder: '粘贴 API key',
  testConnection: '测试连接',
  testAndSave: '保存并测试',
  testBusy: '测试中…',
  testOk: '连接正常，取到 {n} 个模型。',
  testFail: '测试失败',

  save: '保存',
  savingHint: '保存中…',
  savedHint: '已保存。',
  saveNotApplied: '「{section}」写回后读回不一致，可能没落盘：请重试或看宿主日志。',
  unsavedHint: '有未保存的更改。',
  discard: '放弃更改',

  advancedTitle: '高级',
  advancedHint: '展开：BaseURL / 模型 / 通道 / 多服务商 / 语言 / 优化 / 快捷键 / 用量',
  advancedCollapse: '已展开，点这里收起',
  groupAsr: '识别引擎',
  providerNameLabel: '显示名',
  providerNameDesc: '这个服务商的密钥存在 DSH 凭据 {ref} 下。自定义服务商的引用名由显示名派生——改名等于换一把 key。',
  providerListLabel: '全部服务商',
  providerListDesc: '选中即切换当前使用的供应商；删除只移除这一行配置，不会动 DSH 凭据。',
  cloudBaseUrlLabel: 'Base URL',
  cloudBaseUrlDesc: 'OpenAI-compatible 根地址，通常以 /v1 结尾。预置已填好，改这里即接入自建或代理端点。',
  cloudModelLabel: '模型',
  cloudModelDesc: '识别模型名。想知道端点里到底有哪些模型，用第 ③ 步的「测试连接」。',
  cloudModelPicked: '「测试连接」成功后，这里会列出该端点真实可用的模型。',
  cloudModeLabel: '调用通道',
  cloudModeDesc: '音频走哪条协议：whisper 式转写接口，或 chat + input_audio。选「自动」按模型名判定。',
  cloudModeAuto: '自动（按模型名判定）',
  cloudModeTranscriptions: 'whisper 式 /audio/transcriptions',
  cloudModeChat: 'chat + input_audio（MiMo/Qwen-ASR）',
  fetchModelsPick: '选择模型',
  fetchModelsEmpty: '该端点没有返回可用模型，请检查 Base URL、密钥和模型名。',

  groupOptimize: '提示词优化',
  optimizeModeLabel: '优化方式',
  optimizeHeuristic: '本地启发式（免费、离线）',
  optimizeLlm: 'LLM 重写（默认用当前所选模型）',
  optimizePreviewLabel: '优化结果先预览确认',
  optimizePreviewDesc: '关闭（默认）：停止录音立即把清洗版文本填入草稿，LLM 优化在后台完成后自动替换（不覆盖你的编辑）；开启：等优化完成弹出预览卡，确认后再填入。',
  optimizingHint: '优化中…草稿已填入，可直接编辑或发送',
  transcribingHint: '识别中…',
  cancelBusy: '取消（丢掉本次语音）',
  optimizeFailedKeep: '优化失败，已保留草稿中的清洗版文本',
  llmDefaultHint: '默认使用当前所选 LLM；可在此指定 DSH 已配置的模型。',
  llmProviderLabel: '模型提供方',
  llmModelLabel: '模型',
  llmCurrentDefault: '当前所选（默认）',
  llmModelsEmpty: '该提供方暂无可用模型',
  languageLabel: '识别语言',
  languageAuto: '自动（跟随浏览器/系统）',

  groupBehavior: '交互行为',
  autoSendLabel: '识别后自动发送',
  autoSendDesc: '开启后说完即发（push-to-talk 风格），关闭则填入草稿待确认。',
  silenceStopLabel: '静音自动停止',
  silenceStopDesc: '关闭（默认）：只有手动点击/快捷键结束录音，点停止即整段去识别；开启：静音持续下方「静音判定时长」后自动结束。',
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
  maxRecordMsLabel: '单次录音上限',
  maxRecordMsDesc: '单位毫秒。到点自动结束并送识别，避免忘记关麦一直录。',
  silenceMsLabel: '静音判定时长',
  silenceMsDesc: '单位毫秒。连续安静这么久就判定说完了（需先开启「静音自动停止」）。',
  silenceRmsLabel: '静音阈值',
  silenceRmsDesc: '0~1 的响度比例，低于它算安静。环境嘈杂就调高，说话很轻就调低。',

  groupRealtime: '实时语音对话',
  realtimeEnableLabel: '启用「语音对话」按钮',
  realtimeEnableDesc: '在麦克风按钮旁再加一个：边说边上屏，停顿即发起回合，并把回复朗读出来。默认关闭。',
  realtimeTtsLabel: '回复播报',
  realtimeTtsDesc: '用浏览器内置语音把 agent 的回复读出来；选「不播报」则只上屏文字。',
  realtimeTtsBrowser: '浏览器语音（默认）',
  realtimeTtsOff: '不播报',
  realtimeHotkeyLabel: '对话快捷键',
  realtimeHotkeyDesc: '点击后按新组合键，用于开始/结束对话或打断播报；留空表示只用按钮。与上面的录音快捷键互不影响。',
  realtimeSettleMsLabel: '断句等待',
  realtimeSettleMsDesc: '单位毫秒。识别文字停止变化这么久，就认为这句说完并上屏。',
  realtimeTailMsLabel: '收尾延时',
  realtimeTailMsDesc: '单位毫秒。上屏前再多等一会儿，接住最后一个词的迟到结果；0 表示不等。',
  realtimeEngineLabel: '实时引擎',
  realtimeEngineDesc: 'Web Speech 逐字出字、不花配额；按句转写用本地静音检测切句，每句走一次已配置的云端转写，出字会慢一拍；云端实时把采集帧上行到本机实时通道，服务端判回合。',
  realtimeEngineBrowser: 'Web Speech（逐字，免费）',
  realtimeEngineSegmented: '按句转写（本地切句 + 云端识别）',
  realtimeEngineCloud: '云端实时（服务端判回合）',
  vadFrameMsLabel: '采集帧长',
  vadFrameMsDesc: '单位毫秒。每帧的时长，越小越省延迟、越大越省调度。',
  vadRmsLabel: '有声阈值',
  vadRmsDesc: '0~1 的 RMS。按你的设备噪声底调：偏低会把键盘呼吸当话，偏高会切掉轻声句尾。',
  vadSilenceMsLabel: '切句静音',
  vadSilenceMsDesc: '单位毫秒。安静这么久算一句说完，也是每句上屏的固定延迟。',
  vadPrerollMsLabel: '段前缓冲',
  vadPrerollMsDesc: '单位毫秒。把开口前的一小段一起送上去，否则第一个音节必被切掉。',
  vadMinSpeechMsLabel: '最短语音',
  vadMinSpeechMsDesc: '单位毫秒。实际发声短于此不成为一句，不该为咳嗽花一次配额。',
  vadMaxSegmentMsLabel: '最长单句',
  vadMaxSegmentMsDesc: '单位毫秒。说个不停也到这个长度就出字，同时封顶单次上传大小。',
  vadMaxPendingLabel: '待转写队列',
  vadMaxPendingDesc: '最多攒几句待转写。转写慢过说话时丢最早的一句。',
  realtimeMaxSessionLabel: '单次对话上限',
  realtimeMaxSessionDesc: '单位毫秒。到点自动结束这次对话并交还麦克风，避免忘了关而一直听。',
  realtimeFirstSentenceLabel: '首句最少字数',
  realtimeFirstSentenceDesc: '播报时第一句先攒到这么多字才起音，避免一两个短词就开始读。',
  realtimeWatchdogLabel: '播报兜底超时',
  realtimeWatchdogDesc: '单位毫秒。浏览器迟迟不回「播完」事件时，最迟过这么久也按播完处理。',

  chatTitle: '语音对话',
  chatListeningTitle: '正在听…点击结束对话',
  chatThinkingTitle: '思考中…点击打断',
  chatSpeakingTitle: '朗读中…点击打断',
  chatThinkingHint: '等回复…',
  chatSpeakingHint: '朗读中…',
  chatInterrupt: '打断',
  chatEndedLimit: '已达单次对话上限，对话自动结束',
  chatNoReply: '这句没有发起回合，继续听',
  chatNoTts: '当前浏览器不支持语音播报，只显示字幕',
  chatGap: '转写跟不上，已丢掉最早的一句，字幕可能不完整',
  errSegmentedNeedsCloud: '按句转写需要先配好云端 ASR（设置 → 语音转文字 → 云端供应商）',
  errSegmentedUnsupported: '当前浏览器不支持实时音频采集（需支持 AudioWorklet），请改用 Web Speech 引擎',
  errSegmentedUnreachable: '转写服务连续失败，本次对话已结束',

  dismiss: '关闭',
  loadFailed: '加载失败',
  micTitle: '语音输入',
  recordingTitle: '录音中…点击结束',
  transcribingTitle: '识别中…点击取消',
  optimizingTitle: '优化中…点击取消',
  errNoMic: '未检测到麦克风',
  errNoSound: '未检测到声音：录音为静音，未发送识别。请检查麦克风权限、系统输入音量，并在浏览器地址栏站点设置/授权弹窗中把输入设备选为「内置麦克风」（虚拟音频设备常被误选导致静音）',
  errNoSpeechSupport: '当前浏览器不支持 Web Speech，请改用云端 ASR（Chrome/Edge 均支持）。',
  errWebSpeechNetwork: '浏览器语音识别网络不可用（服务可能被网络屏蔽），已请改用云端 ASR。',
  errCloudNotConfigured: '云端 ASR 未配置：到设置选服务商、填 Base URL，密钥放在 DSH 凭据里。',
  noSpeechDetected: '未检测到语音',
  fallbackToCloud: '浏览器语音识别不可用，已自动切换云端 ASR',
  errTranscribe: '识别失败',
  errOptimize: '优化失败',
  previewTitle: '提示词优化预览',
  previewOriginal: '原始转写',
  previewOptimized: '优化后',
  previewConfirm: '填入并发送',
  previewCancel: '取消',
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
  readOnlyDoc: 'The host is not accepting config writes right now (read-only document or connection not ready), so the controls below are disabled.',
  howTo: 'What to do: ① pick Cloud → ② click a provider → ③ follow the hint on the key row. That is all.',

  stepEngineTitle: 'Recognition engine',
  engineAuto: 'Auto (recommended)',
  engineBrowser: 'Browser only (no setup)',
  engineCloud: 'Cloud (more accurate, needs a key)',
  engineHintAuto: 'Tries the built-in browser recognition first and falls back to cloud when it is unavailable. Pick this if you have configured nothing yet.',
  engineHintBrowser: 'Runs entirely in the browser: free, no key at all. Average accuracy, and only Chrome / Edge support it.',
  engineHintCloud: 'Calls an OpenAI-compatible cloud recognizer: better accuracy and languages, and it needs an API key (next step).',

  stepProviderTitle: 'Provider',
  stepProviderHint: 'Click to select — Base URL, model and endpoint mode fill themselves. “Custom” takes any OpenAI-compatible endpoint.',
  cloudPresetCustom: 'Custom',
  addProvider: '+ Custom provider',
  removeProvider: 'Remove',
  providersEmpty: 'No cloud provider yet — click “+ Custom provider” to add one.',

  stepKeyTitle: 'Key & self-test',
  keyChecking: 'Checking local credentials…',
  keyQueryFailed: 'Credential status query failed',
  keyConfigured: 'Using DSH credential {ref} — nothing to fill in.',
  keyNeedsValue: 'No key yet: paste {ref} below and save.',
  keyNameNeeded: 'Give this provider a display name first — the credential ref is derived from it.',
  keySave: 'Save key',
  keySaving: 'Saving…',
  keySavedHint: 'Key written to DSH credential {ref}.',
  keySaveFailed: 'Failed to save the key',
  keyKeepHint: 'The key is written only into DSH credentials: never into the settings document, never echoed back to this page.',
  keyKeepPlaceholder: 'Leave blank to keep it',
  keyPastePlaceholder: 'Paste API key',
  testConnection: 'Test connection',
  testAndSave: 'Save & test',
  testBusy: 'Testing…',
  testOk: 'Connection OK — {n} models listed.',
  testFail: 'Test failed',

  save: 'Save',
  savingHint: 'Saving…',
  savedHint: 'Saved.',
  saveNotApplied: '“{section}” did not match after the write-back — it may not have persisted. Retry or check the host log.',
  unsavedHint: 'Unsaved changes.',
  discard: 'Discard',

  advancedTitle: 'Advanced',
  advancedHint: 'Expand: Base URL / model / endpoint mode / providers / language / optimization / hotkey / usage',
  advancedCollapse: 'Expanded — click to collapse',
  groupAsr: 'Recognition engine',
  providerNameLabel: 'Display name',
  providerNameDesc: 'This provider reads its key from DSH credential {ref}. For a custom provider the ref is derived from the display name — renaming it means a different key.',
  providerListLabel: 'All providers',
  providerListDesc: 'Select one to make it current; removing a row only deletes that config entry, never the DSH credential.',
  cloudBaseUrlLabel: 'Base URL',
  cloudBaseUrlDesc: 'OpenAI-compatible root, usually ending in /v1. Presets fill it; edit here to point at a self-hosted or proxied endpoint.',
  cloudModelLabel: 'Model',
  cloudModelDesc: 'Recognition model name. Use “Test connection” in step ③ to see what the endpoint actually offers.',
  cloudModelPicked: 'After a successful “Test connection”, the models really available on this endpoint are listed here.',
  cloudModeLabel: 'Endpoint mode',
  cloudModeDesc: 'Which protocol the audio goes over: Whisper-style transcriptions, or chat + input_audio. “Auto” decides by model name.',
  cloudModeAuto: 'Auto (by model name)',
  cloudModeTranscriptions: 'Whisper-style /audio/transcriptions',
  cloudModeChat: 'Chat + input_audio (MiMo/Qwen-ASR)',
  fetchModelsPick: 'Pick a model',
  fetchModelsEmpty: 'The endpoint returned no usable model. Check Base URL, key and model name.',

  groupOptimize: 'Prompt optimization',
  optimizeModeLabel: 'Optimization mode',
  optimizeHeuristic: 'Local heuristic (free, offline)',
  optimizeLlm: 'LLM rewrite (uses current model by default)',
  optimizePreviewLabel: 'Preview optimized text before inserting',
  optimizePreviewDesc: 'Off (default): the cleaned text fills the draft immediately after recording; the background LLM rewrite replaces it when done (never overrides your edits). On: wait for the rewrite, confirm in a preview card.',
  optimizingHint: 'Optimizing… draft is ready — edit or send now',
  transcribingHint: 'Transcribing…',
  cancelBusy: 'Cancel (discard this utterance)',
  optimizeFailedKeep: 'Optimization failed; the cleaned draft was kept',
  llmDefaultHint: 'Uses the current model by default; pick a configured DSH model below.',
  llmProviderLabel: 'Provider',
  llmModelLabel: 'Model',
  llmCurrentDefault: 'Current model (default)',
  llmModelsEmpty: 'No models available for this provider',
  languageLabel: 'Recognition language',
  languageAuto: 'Auto (follows browser/system)',

  groupBehavior: 'Behavior',
  autoSendLabel: 'Auto-send after recognition',
  autoSendDesc: 'When on, the prompt is submitted right after recognition (push-to-talk style). When off, it fills the draft for confirmation.',
  silenceStopLabel: 'Auto-stop on silence',
  silenceStopDesc: 'Off (default): recording ends only when you stop it manually — everything you said goes to recognition at once. On: ends automatically once you stay quiet for the silence window below.',
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
  maxRecordMsLabel: 'Max recording length',
  maxRecordMsDesc: 'Milliseconds. Recording stops and is sent for recognition at the limit, so a forgotten-open mic cannot run forever.',
  silenceMsLabel: 'Silence window',
  silenceMsDesc: 'Milliseconds of quiet that counts as "done talking" (needs the auto-stop toggle above).',
  silenceRmsLabel: 'Silence threshold',
  silenceRmsDesc: 'Loudness ratio from 0 to 1; anything below counts as quiet. Raise it in noisy rooms, lower it if you speak softly.',

  groupRealtime: 'Realtime voice chat',
  realtimeEnableLabel: 'Show the voice chat button',
  realtimeEnableDesc: 'Adds a second button next to the mic: live captions while you speak, a turn starts on your pause, and the reply is read back. Off by default.',
  realtimeTtsLabel: 'Speak replies',
  realtimeTtsDesc: 'Reads the agent reply aloud with the browser built-in voice. Choose "off" for captions only.',
  realtimeTtsBrowser: 'Browser speech (default)',
  realtimeTtsOff: 'Do not speak',
  realtimeHotkeyLabel: 'Chat hotkey',
  realtimeHotkeyDesc: 'Click, then press a new combo to start, stop or interrupt the chat. Leave empty to use the button only. Independent from the recording hotkey above.',
  realtimeSettleMsLabel: 'Turn settle time',
  realtimeSettleMsDesc: 'Milliseconds. Once the transcript stops changing for this long, the turn is considered finished and put on screen.',
  realtimeTailMsLabel: 'Turn tail delay',
  realtimeTailMsDesc: 'Milliseconds. Waits a bit longer before submitting so the last word\'s late result still makes it in. 0 means no extra wait.',
  realtimeEngineLabel: 'Realtime engine',
  realtimeEngineDesc: 'Web Speech streams words as you speak and costs nothing; per-sentence mode segments on local silence and sends each sentence to your configured cloud ASR, so captions land one round trip late.',
  realtimeEngineBrowser: 'Web Speech (word by word, free)',
  realtimeEngineSegmented: 'Per-sentence (local segmentation + cloud ASR)',
  realtimeEngineCloud: 'Cloud realtime (server-side turn detection)',
  vadFrameMsLabel: 'Capture frame',
  vadFrameMsDesc: 'Milliseconds per captured audio frame. Smaller is snappier, larger is cheaper to schedule.',
  vadRmsLabel: 'Speech threshold',
  vadRmsDesc: 'RMS from 0 to 1, tuned to your device noise floor. Too low turns keyboard clicks into sentences; too high clips quiet sentence endings.',
  vadSilenceMsLabel: 'Segment silence',
  vadSilenceMsDesc: 'Milliseconds of silence that end a sentence — also the fixed delay before each caption appears.',
  vadPrerollMsLabel: 'Pre-roll',
  vadPrerollMsDesc: 'Milliseconds kept from before speech starts. Without it the first syllable is always cut off.',
  vadMinSpeechMsLabel: 'Min speech',
  vadMinSpeechMsDesc: 'Milliseconds of actual voicing a segment needs to count. Coughs should not spend ASR quota.',
  vadMaxSegmentMsLabel: 'Max sentence length',
  vadMaxSegmentMsDesc: 'Milliseconds. An endless monologue still gets captions at this length, and it caps the upload size.',
  vadMaxPendingLabel: 'Transcription queue',
  vadMaxPendingDesc: 'How many sentences may wait for transcription. When ASR falls behind, the oldest is dropped.',
  realtimeMaxSessionLabel: 'Max conversation length',
  realtimeMaxSessionDesc: 'Milliseconds. The conversation ends on its own at the limit and the microphone is handed back, so an unattended session cannot keep listening.',
  realtimeFirstSentenceLabel: 'First sentence min length',
  realtimeFirstSentenceDesc: 'When speaking a reply, the first sentence waits until it has this many characters, so reading does not start on a two-word fragment.',
  realtimeWatchdogLabel: 'Broadcast watchdog',
  realtimeWatchdogDesc: 'Milliseconds. If the browser never reports the utterance as finished, treat it as done after this long.',

  chatTitle: 'Voice chat',
  chatListeningTitle: 'Listening… click to end the chat',
  chatThinkingTitle: 'Thinking… click to interrupt',
  chatSpeakingTitle: 'Speaking… click to interrupt',
  chatThinkingHint: 'Waiting for the reply…',
  chatSpeakingHint: 'Reading the reply…',
  chatInterrupt: 'Interrupt',
  chatEndedLimit: 'Reached the max conversation length — the chat ended by itself',
  chatNoReply: 'That line did not start a turn, still listening',
  chatNoTts: 'This browser cannot speak replies — captions only',
  chatGap: 'Transcription fell behind — the oldest sentence was dropped, captions may be incomplete',
  errSegmentedNeedsCloud: 'Per-sentence mode needs a configured cloud ASR provider (Settings → Voice → Cloud providers)',
  errSegmentedUnsupported: 'This browser cannot capture live audio (AudioWorklet is required) — switch back to the Web Speech engine',
  errSegmentedUnreachable: 'Transcription failed repeatedly, this conversation ended',

  dismiss: 'Dismiss',
  loadFailed: 'Load failed',
  micTitle: 'Voice input',
  recordingTitle: 'Recording… click to stop',
  transcribingTitle: 'Transcribing… click to cancel',
  optimizingTitle: 'Optimizing… click to cancel',
  errNoMic: 'No microphone detected',
  errNoSound: 'No sound detected: the recording was silent and was not sent. Check the mic permission, system input volume, and pick the built-in microphone as the input device in the browser site settings / permission prompt (virtual audio devices are often selected by mistake and record silence)',
  errNoSpeechSupport: 'Web Speech is not supported by this browser; switch to cloud ASR (Chrome/Edge support it).',
  errWebSpeechNetwork: 'Browser speech recognition network is unavailable (the service may be blocked); switch to cloud ASR.',
  errCloudNotConfigured: 'Cloud ASR is not configured: pick a provider and set the Base URL in settings; the key lives in DSH credentials.',
  noSpeechDetected: 'No speech detected',
  fallbackToCloud: 'Browser speech unavailable; switched to cloud ASR',
  errTranscribe: 'Transcription failed',
  errOptimize: 'Optimization failed',
  previewTitle: 'Prompt optimization preview',
  previewOriginal: 'Raw transcript',
  previewOptimized: 'Optimized',
  previewConfirm: 'Fill & send',
  previewCancel: 'Cancel',
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
