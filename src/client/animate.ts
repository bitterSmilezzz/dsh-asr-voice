/** dsh-asr-voice — 轻量 GSAP 风格动画模块。
 * 设计约束：构建环境离线，无 gsap 包可装，故提供 GSAP 兼容子集的本地实现
 * （`to` / `fromTo`），API 与调用方式对齐 GSAP，
 * 组件里只经本模块驱动动效。将来若引入真 GSAP，只需替换本文件内部实现，
 * 组件调用点不改。
 * 支持：CSS 属性（opacity/scale/x/y/rotate 等变换缩写）、duration/ease/delay、
 * repeat/yoyo、onUpdate/onComplete。基于 requestAnimationFrame。
 */

/** 缓动函数签名。 */
type EaseFn = (t: number) => number

/** 常用缓动（与 GSAP 同名）。 */
const EASES: Record<string, EaseFn> = {
  power1: (t) => t,
  'power1.in': (t) => t * t,
  'power1.out': (t) => 1 - (1 - t) * (1 - t),
  'power1.inOut': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'power2.out': (t) => 1 - (1 - t) * (1 - t),
  'power3.out': (t) => 1 - Math.pow(1 - t, 3),
  'power2.inOut': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  'back.out': (t) => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) },
  'elastic.out': (t) => {
    if (t === 0 || t === 1) return t
    const c4 = (2 * Math.PI) / 3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
}

/** 解析 ease：名字 → 函数。 */
function toEase(ease: string | EaseFn | undefined): EaseFn {
  if (typeof ease === 'function') return ease
  return EASES[ease ?? 'power1.out'] ?? EASES['power1.out']!
}

/** 单条 CSS 目标：数值属性名 → 起始值。 */
type NumProps = Record<string, number>

/** 把 vars 里的数值属性与「起始值」提取出来（跳过控制键）。 */
function extractNumeric(target: HTMLElement, vars: Record<string, unknown>, from?: Record<string, unknown>): NumProps {
  const control = new Set(['duration', 'delay', 'ease', 'onUpdate', 'onComplete', 'yoyo', 'repeat', 'onStart'])
  const props: NumProps = {}
  for (const [key, value] of Object.entries(vars)) {
    if (control.has(key)) continue
    if (typeof value !== 'number') continue
    let start = 0
    if (from && typeof from[key] === 'number') {
      start = from[key] as number
    } else {
      start = currentNumeric(target, key)
    }
    props[key] = start
  }
  return props
}

/** 读取元素当前数值属性（变换缩写从 computed transform 解析，其余读 computed style）。 */
function currentNumeric(target: HTMLElement, key: string): number {
  const cs = getComputedStyle(target)
  if (key === 'x' || key === 'y') {
    const m = new DOMMatrixReadOnly(cs.transform)
    return key === 'x' ? m.m41 : m.m42
  }
  if (key === 'scale' || key === 'scaleX' || key === 'scaleY') {
    const m = new DOMMatrixReadOnly(cs.transform)
    if (key === 'scale') return m.a
    if (key === 'scaleX') return m.a
    return m.d
  }
  if (key === 'rotate') {
    const m = new DOMMatrixReadOnly(cs.transform)
    return Math.atan2(m.b, m.a) * (180 / Math.PI)
  }
  const raw = cs.getPropertyValue(key)
  const num = parseFloat(raw)
  return Number.isFinite(num) ? num : 0
}

/** 把数值属性应用到元素样式（变换缩写合并为 transform）。 */
function applyNumeric(target: HTMLElement, props: NumProps, progress: number, end: NumProps, baseMatrix?: DOMMatrixReadOnly): void {
  const transformParts: string[] = []
  for (const [key, start] of Object.entries(props)) {
    const value = start + ((end[key] ?? start) - start) * progress
    if (key === 'x') { transformParts.push(`translateX(${value}px)`); continue }
    if (key === 'y') { transformParts.push(`translateY(${value}px)`); continue }
    if (key === 'scale') { transformParts.push(`scale(${value})`); continue }
    if (key === 'scaleX') { transformParts.push(`scaleX(${value})`); continue }
    if (key === 'scaleY') { transformParts.push(`scaleY(${value})`); continue }
    if (key === 'rotate') { transformParts.push(`rotate(${value}deg)`); continue }
    if (key === 'opacity') { target.style.opacity = String(value); continue }
    // 通用数值样式属性（px 单位）
    if (key in target.style) {
      (target.style as unknown as Record<string, string>)[key] = `${value}px`
    }
  }
  if (transformParts.length > 0) {
    // 只做一次基础位移保留（动画启动时缓存），避免每帧 getComputedStyle。
    if (baseMatrix !== undefined && (baseMatrix.m41 !== 0 || baseMatrix.m42 !== 0)) {
      transformParts.unshift(`translate(${baseMatrix.m41}px, ${baseMatrix.m42}px)`)
    }
    target.style.transform = transformParts.join(' ')
  }
}

/** 读取元素当前基础 transform 位移（补间开始时一次；无 translate 返回 undefined 跳过保留）。 */
function baseTranslateOf(target: HTMLElement): DOMMatrixReadOnly | undefined {
  const cs = getComputedStyle(target)
  try {
    const m = new DOMMatrixReadOnly(cs.transform)
    return m.m41 !== 0 || m.m42 !== 0 ? m : undefined
  } catch {
    return undefined
  }
}

/** 一个补间。 */
export interface TweenHandle {
  kill(): void
  progress(): number
  isActive(): boolean
  onComplete(cb: () => void): void
}

/** 创建补间：从 from（或当前值）到 to。 */
export function tween(
  target: HTMLElement,
  to: Record<string, unknown>,
  from?: Record<string, unknown>,
): TweenHandle {
  const duration = typeof to.duration === 'number' ? to.duration : 0.5
  const delay = typeof to.delay === 'number' ? to.delay : 0
  const ease = toEase(typeof to.ease === 'string' ? to.ease : undefined)
  const yoyo = to.yoyo === true
  const repeat = typeof to.repeat === 'number' ? to.repeat : 0
  const onUpdate = typeof to.onUpdate === 'function' ? to.onUpdate : undefined
  const onComplete = typeof to.onComplete === 'function' ? to.onComplete : undefined
  const onStart = typeof to.onStart === 'function' ? to.onStart : undefined

  const startProps = extractNumeric(target, to, from)
  const endProps: NumProps = {}
  for (const [key, value] of Object.entries(to)) {
    if (typeof value === 'number') endProps[key] = value
  }
  // 是否有 transform 缩写属性参与 → 需要保留基础位移时只读一次（补间期间
  // transform 由本补间独占写入，读取一次即可复用，避免每帧 getComputedStyle）。
  const hasTransform = Object.keys(startProps).some((k) =>
    k === 'x' || k === 'y' || k === 'scale' || k === 'scaleX' || k === 'scaleY' || k === 'rotate')
  const baseMatrix = hasTransform ? baseTranslateOf(target) : undefined

  let startTime: number | null = null
  /** delay 只在首帧应用一次：repeat/yoyo 的后续周期从当前帧重新起算，
   *  否则 `repeat: Infinity, delay: .24` 这类循环每圈都白等 delay。 */
  let delayApplied = false
  let cycles = 0
  let killed = false
  let progressVal = 0
  let completeCb: (() => void) | undefined

  const tick = (now: number): void => {
    if (killed) return
    if (startTime === null) {
      startTime = now + (delayApplied ? 0 : delay * 1000)
      delayApplied = true
      onStart?.()
    }
    if (now < startTime) {
      requestAnimationFrame(tick)
      return
    }
    const local = (now - startTime) / (duration * 1000)
    const t = Math.min(1, Math.max(0, local))
    const eased = ease(t)
    applyNumeric(target, startProps, eased, endProps, baseMatrix)
    progressVal = t
    onUpdate?.({ progress: t })
    const done = t >= 1
    const cycleDone = done
    if (cycleDone) {
      if (yoyo) {
        // 简单 yoyo：往返一次视为一个周期
        cycles += 1
        if (cycles > repeat) {
          finished()
          return
        }
        startTime = null
        // 反向播放：起止互换。只把 start 换成 end 会让 start===end，
        // 反向周期变成恒值空转（元素钉在终点不动）——end 必须同时换回原 start。
        for (const k of Object.keys(startProps)) {
          const tmp = startProps[k]!
          startProps[k] = endProps[k]!
          endProps[k] = tmp
        }
        requestAnimationFrame(tick)
        return
      }
      if (repeat > 0 && cycles < repeat) {
        cycles += 1
        startTime = null
        requestAnimationFrame(tick)
        return
      }
      finished()
      return
    }
    requestAnimationFrame(tick)
  }

  const finished = (): void => {
    if (killed) return
    killed = true
    onComplete?.()
    completeCb?.()
  }

  requestAnimationFrame(tick)

  return {
    kill: () => { killed = true },
    progress: () => progressVal,
    isActive: () => !killed,
    onComplete: (cb) => { completeCb = cb },
  }
}

/** GSAP 风格快捷方法。 */
export function to(target: HTMLElement, vars: Record<string, unknown>): TweenHandle {
  return tween(target, vars)
}

/** GSAP 风格 fromTo。 */
export function fromTo(target: HTMLElement, from: Record<string, unknown>, to: Record<string, unknown>): TweenHandle {
  return tween(target, to, from)
}
