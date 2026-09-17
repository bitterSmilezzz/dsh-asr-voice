/** dsh-asr-voice — 草稿合并纯函数（无 DOM/React 依赖，node --test 直测）。 */

/** append 模式：把新识别文本接到既有草稿末尾。
 * 语义与两处原实现（voice-button finalize / voice-chat commitTurn）逐字一致：
 * - 草稿为空 → 直接返回新文本（不补前置空格）；
 * - 草稿已有内容且不以空格/换行结尾 → 用一个空格分隔；
 * - 草稿已以空格/换行结尾 → 原样拼接（不重复加分隔）。
 * 注意与 realtime.ts 的 `joinText` 的**刻意差异**：joinText 会把连续空白折叠成一个空格
 * （逐字字幕不该因重启/多段拼接而抖动），草稿则要保留用户已有的排版。两者不是同一条
 * 规则的两份实现——改一处不必同步另一处。
 */
export function appendDraftText(existing: string, text: string): string {
  if (existing === '') return text
  return `${existing}${/[ \n]$/.test(existing) ? '' : ' '}${text}`
}
