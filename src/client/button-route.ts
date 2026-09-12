/** dsh-asr-voice — 单按钮手势 → 动作的路由（纯逻辑，无 DOM）。
 *
 * 一个按钮同时表达「点 = 转写」和「长按 = 对话」，最容易错的是长按之后浏览器
 * 照常补发的那个 click：不吞掉就会「开对话 + 顺手开始一次转写」。
 * 判定依赖三样东西——长按是否刚触发、对话是否在跑、录音链路在哪一档——
 * 全是从组件里读得出来的标量，所以抽成纯函数在这里锁住。
 */

/** 录音链路状态机（与 voice-button.tsx 的 VoiceState 同源）。 */
export type MicPhase = 'idle' | 'recording' | 'transcribing' | 'optimizing'

/** 一次点击该做什么。`none` = 吞掉，不产生任何动作。 */
export type ButtonAction = 'none' | 'chat' | 'begin' | 'finish' | 'cancel'

export interface ButtonPressInput {
  /** 本次 click 是否来自刚结束的长按（由长按门读一次即复位）。 */
  longPress: boolean
  /** 对话是否正在进行。 */
  chatActive: boolean
  /** 录音链路当前状态。 */
  micPhase: MicPhase
}

export function routeButtonPress(input: ButtonPressInput): ButtonAction {
  // 长按优先：动作已经在跨阈值那一刻执行过了，这个 click 是浏览器的补充事件。
  if (input.longPress) return 'none'
  // 对话在跑：按钮整体归对话（结束对话 / 打断播报），绝不并到录音链路去。
  if (input.chatActive) return 'chat'
  if (input.micPhase === 'idle') return 'begin'
  if (input.micPhase === 'recording') return 'finish'
  // transcribing / optimizing：点 = 取消（与快捷键路径的「busy 时按一次即打断」一致）。
  return 'cancel'
}
