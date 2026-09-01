/**
 * dsh-asr-voice — 回合文本闸门（纯逻辑，三引擎共用，node --test 可直跑）。
 *
 * 实时路径不做提示词优化，噪声/幻觉必须拦在上屏之前。分段引擎的本地
 * VAD 可能把底噪切成段送上云（真机复现：无人说话时字幕持续出现「嗯」），
 * 云端对噪声段幻觉出语气词——这些回合既浪费 agent 配额，也污染会话。
 */
export function meaningfulTurn(text: string): boolean {
  const t = text.trim()
  const unit = t.replace(/[，。！？、,.!?\s]/g, '')
  if (unit === '') return false
  // 纯语气词（中文 嗯/啊/哦/呃/额/唉/呀/哈/噢/喔 的任意组合与重复，英文
  // um/uh/emm/hmm/ah/oh/ok/okay 的任意重复）→ 无意义，丢弃。
  if (/^[嗯啊哦呃额唉呀哈噢喔]+$/.test(unit)) return false
  if (/^(um|uh|emm|hmm|ah|oh|ok|okay)+$/i.test(unit)) return false
  // 单字无论是否语气词一律不放行：一个汉字换一轮 agent 思考的代价远高于
  // 丢失一次口语化回复，而「没人说话却一直嗯」正是单字幻觉的高发形态。
  if (unit.length <= 1) return false
  return true
}