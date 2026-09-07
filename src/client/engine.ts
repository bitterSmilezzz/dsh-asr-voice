/** dsh-asr-voice — 引擎决策纯函数（无 DOM/React 依赖，node --test 直测）。 */

/** 实际启动的识别引擎。 */
export type AsrEngine = 'browser' | 'cloud'

/** 配置态 provider 三态。 */
export type AsrProviderChoice = 'auto' | 'browser' | 'cloud'

/** 解析最终引擎：auto = 浏览器优先（Web Speech 可用时），否则回落到已配置的云端；
 * 云端也未配置时仍回退浏览器（失败路径由调用方给错误提示，而不是决策层死锁）。
 */
export function resolveEngine(
  provider: AsrProviderChoice,
  webSpeechSupported: boolean,
  cloudReady: boolean,
): AsrEngine {
  if (provider === 'cloud') return 'cloud'
  if (provider === 'browser') return 'browser'
  // auto
  if (!webSpeechSupported) return cloudReady ? 'cloud' : 'browser'
  return 'browser'
}

/** 云端兜底判定：auto 模式下浏览器引擎启动/运行失败（错误码 recoverable 命中）且云端已配置。
 * recoverable 缺省 true——同步启动抛错路径没有错误码，按「可兜底」处理（与原 catch 分支一致）。 */
export function shouldFallbackToCloud(
  engine: AsrEngine,
  provider: AsrProviderChoice,
  cloudReady: boolean,
  recoverable = true,
): boolean {
  return engine === 'browser' && provider === 'auto' && cloudReady && recoverable
}
