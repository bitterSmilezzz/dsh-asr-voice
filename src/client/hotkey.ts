/** dsh-asr-voice — client 快捷键解析与匹配（跨平台）。 */

/** 解析后的组合键规格。 */
export interface HotkeySpec {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  key: string
}

/** 无修饰键时是否放行（单键 hotkey）：只允许 F 功能键（F1~F24）。
 *  字母/数字/符号/空格/回车/方向键等在文本输入里会打出字符或移动焦点，
 *  而 client 的监听挂在 window capture（不豁免输入框），命中后 preventDefault
 *  会把字符吞掉——单字母快捷键 = 打字劫持。F 键不产生字符（浏览器默认行为
 *  如刷新/全屏被 preventDefault 接管，是用户自选的配置），故保留。 */
export function bareKeyAllowed(key: string): boolean {
  return /^F([1-9]|1\d|2[0-4])$/.test(key)
}

/** 把规范字符串（如 "Ctrl+Shift+Space"）解析为规格；空/非法返回 null。 */
export function parseHotkey(spec: string): HotkeySpec | null {
  if (!spec || spec.trim() === '') return null
  const parts = spec.split('+').map((s) => s.trim()).filter((s) => s !== '')
  const out: HotkeySpec = { ctrl: false, alt: false, shift: false, meta: false, key: '' }
  for (const part of parts) {
    const p = part.toLowerCase()
    if (p === 'ctrl' || p === 'control') out.ctrl = true
    else if (p === 'alt' || p === 'option') out.alt = true
    else if (p === 'shift') out.shift = true
    else if (p === 'meta' || p === 'cmd' || p === 'command' || p === 'win' || p === 'super') out.meta = true
    else out.key = normalizeKey(part)
  }
  if (out.key === '') return null
  // 无修饰键时只放行 F 功能键（见 bareKeyAllowed）：单字母/数字/符号/空格/回车/
  // 方向键会劫持打字。旧配置里误录的单键（如 "A"）解析返回 null = 快捷键失效，
  // 宁可失效也不吞用户输入。
  if (!out.ctrl && !out.alt && !out.shift && !out.meta && !bareKeyAllowed(out.key)) return null
  return out
}

/** 主键规范化（与设置卡片录制器一致）。 */
/** 主键规范化（设置卡片录制器共用）：空格→Space、单字符大写、方向键/特殊键统一短名。 */
export function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  const map: Record<string, string> = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Escape: 'Escape', Spacebar: 'Space',
  }
  return map[key] ?? key
}

/** 判断键盘事件是否命中规格。Ctrl 兼容 Cmd（macOS 上 Control/Command 都算）。 */
export function matchHotkey(e: KeyboardEvent, spec: HotkeySpec): boolean {
  if (e.key === 'Control' || e.key === 'Alt' || e.key === 'Shift' || e.key === 'Meta') return false
  const ctrl = e.ctrlKey || e.metaKey
  const wantCtrl = spec.ctrl || spec.meta
  const ctrlOk = ctrl === wantCtrl
  const altOk = e.altKey === spec.alt
  const shiftOk = e.shiftKey === spec.shift
  // 录制器把 Cmd 记作 Ctrl（keyCombo 中 ctrlKey||metaKey → 'Ctrl'），
  // 所以 spec.ctrl=true 时须同时接受 Ctrl 和 Cmd，与注释「Ctrl 兼容 Cmd」一致。
  const metaOk = spec.ctrl ? true : e.metaKey === spec.meta
  return ctrlOk && altOk && shiftOk && metaOk && normalizeKey(e.key) === spec.key
}
