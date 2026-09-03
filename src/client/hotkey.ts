/**
 * dsh-asr-voice — client 快捷键解析与匹配（跨平台）。
 */

/** 解析后的组合键规格。 */
export interface HotkeySpec {
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  key: string
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
  return out
}

/** 主键规范化（与设置卡片录制器一致）。 */
function normalizeKey(key: string): string {
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  const map: Record<string, string> = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Escape: 'Escape', Spacebar: 'Space',
  }
  return map[key] ?? key
}

/** 事件主键规范化。 */
function eventKey(key: string): string {
  if (key === ' ') return 'Space'
  if (key.length === 1) return key.toUpperCase()
  const map: Record<string, string> = {
    ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
    Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', Escape: 'Escape', ' ': 'Space',
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
  return ctrlOk && altOk && shiftOk && metaOk && eventKey(e.key) === spec.key
}
