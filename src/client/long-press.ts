/**
 * 长按判定（纯逻辑，无 DOM）。
 *
 * 一个按钮要承担两种动作时，「点」和「长按」只能在手势结束时才分出胜负：
 * 按住跨过阈值 → 立刻触发长按；随后的 click 必须被吞掉，否则长按会被当成
 * 点再执行一次（浏览器在长按后照常补发 click）。
 *
 * 分工刻意做成「长按自己管，短按交给原生 click」：
 * 短按不走 pointerup 而走 click，这样键盘 Enter/Space 触发的 click 天然可用，
 * 也不会出现「pointerup 触发一次 + click 再触发一次」的双发。
 */

/** 定时器抽象：测试注入假时钟即可，无需真的等待。 */
export interface LongPressTimers {
  set: (fn: () => void, ms: number) => number
  clear: (handle: number) => void
}

/** 按住多久算长按。450ms 足够区分「点一下」与「按住」，又不会让人觉得迟钝。 */
export const DEFAULT_LONG_PRESS_MS = 450

export interface LongPressOptions {
  /** 按住超过该毫秒数算长按。 */
  thresholdMs: number
  /** 跨过阈值时触发，一次手势最多一次。 */
  onLongPress: () => void
  /**
   * 长按是否可用（如对话功能被关掉时返回 false）。
   * 返回 false 时按下不排定时器，于是按多久都只走短按分支——
   * 避免「长按被禁用，却把用户的点也吞掉」。
   */
  isLongPressAllowed?: () => boolean
  /** 定时器实现，默认用全局 setTimeout。 */
  timers?: LongPressTimers
}

export interface LongPressGate {
  /** pointerdown：开始一次手势。重复按下（第二个指针）忽略。 */
  press: () => void
  /** pointerup：结束一次手势。 */
  release: () => void
  /** pointercancel / 卸载：丢弃手势，不触发回调。 */
  cancel: () => void
  /**
   * click 处理器开头调用：本次点击是否来自刚结束的长按。
   * 返回 true 时调用方必须直接 return。读取即复位。
   */
  shouldSuppressClick: () => boolean
  /** 当前是否处于按下状态。 */
  readonly pressed: boolean
}

const defaultTimers: LongPressTimers = {
  set: (fn, ms) => globalThis.setTimeout(fn, ms),
  clear: (handle) => {
    globalThis.clearTimeout(handle)
  },
}

export function createLongPressGate(options: LongPressOptions): LongPressGate {
  const timers = options.timers ?? defaultTimers
  let timer: number | null = null
  let pressed = false
  let fired = false
  // 跨过一次 release 仍要留到 click 才消费的标记。
  let suppressClick = false

  const clearTimer = (): void => {
    if (timer !== null) {
      timers.clear(timer)
      timer = null
    }
  }

  const press = (): void => {
    if (pressed) return
    pressed = true
    fired = false
    // 上一轮若被 cancel 打断（长按已触发但浏览器不会补 click），标记会滞留；
    // 新手势开始时清掉，避免它吞掉下一次真正的点击。
    suppressClick = false
    if (options.isLongPressAllowed !== undefined && !options.isLongPressAllowed()) return
    timer = timers.set(() => {
      timer = null
      fired = true
      options.onLongPress()
    }, options.thresholdMs)
  }

  const release = (): void => {
    if (!pressed) return
    pressed = false
    clearTimer()
    // 短按不在这里执行——留给随后原生的 click，保证只有一条执行路径。
    if (fired) suppressClick = true
  }

  const cancel = (): void => {
    // 先读后清：长按已触发时手势虽被浏览器接管，但动作确实发生过了，
    // 若此时残留一次 click 就会重复触发，所以要把吞掉标记留下。
    if (fired) suppressClick = true
    pressed = false
    fired = false
    clearTimer()
  }

  const shouldSuppressClick = (): boolean => {
    const hit = suppressClick
    suppressClick = false
    return hit
  }

  return {
    press,
    release,
    cancel,
    shouldSuppressClick,
    get pressed() {
      return pressed
    },
  }
}
