/** dsh-asr-voice — 按钮与状态条共用的图标/装饰件。
 *
 * 单独成文件是为了打断循环依赖：合并成一个按钮后，麦克风按钮要复用对话模块的
 * 逻辑（voice-chat.tsx），而对话状态条又要用这里的图标——图标留在任一侧都会成环。
 * 这些组件没有任何状态与依赖，放中立位置最自然。
 */
import * as react from 'react'

/** 频谱条柱数。 */
export const SPECTRUM_BARS = 12

/** 麦克风图标。 */
export function MicIcon(): react.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3.5" />
    </svg>
  )
}

/** 对话图标（声波气泡：与麦克风的实心咪头区分开）。 */
export function ChatIcon(): react.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3.5v-3.5H6.5A2.5 2.5 0 0 1 4 13.5z" />
      <path d="M9 10v-1.5M12 11V7.5M15 10v-1.5" />
    </svg>
  )
}

/** 录音状态图标（实心圆点，带呼吸）。 */
export function RecDot(): react.ReactElement {
  return <span className="dshav-rec-dot" />
}

/** 转圈（transcribing / optimizing）。 */
export function Spinner(): react.ReactElement {
  return <span className="dshav-spinner" aria-hidden="true" />
}

/** 频谱条（12 根柱，CSS 变量 --bar 错落）：memo 化——interim 文本每次变化重渲染按钮
 * （麦克风与对话共用同一个按钮）时柱子的虚拟 DOM 不再重建（柱形是静态的，
 * 仅高度由 CSS 变量 --level 在帧循环驱动）。 */
export const SpectrumBars = react.memo((): react.ReactElement => (
  <react.Fragment>
    {Array.from({ length: SPECTRUM_BARS }, (_, i) => (
      <span key={i} className="dshav-bar" style={{ '--bar': String(0.35 + (i / (SPECTRUM_BARS - 1)) * 0.65) } as react.CSSProperties} />
    ))}
  </react.Fragment>
))
