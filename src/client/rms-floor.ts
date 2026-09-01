/**
 * dsh-asr-voice — 自适应噪声底估计器（纯逻辑，模块顶层不碰 DOM，node --test 可直跑）。
 *
 * 能量 VAD 的阈值是「设备噪声底」的函数，而噪声底随设备/环境变化（内置麦 vs 耳机麦、
 * 空调/风扇/键盘）。本估计器在**静音期**持续观测 RMS，维护一个分位数底噪估计，
 * 供两类消费者使用：
 *
 *   1. `vad.rmsAuto`：segmented 引擎的 VAD 阈值 = max(用户基线, floor × margin)——
 *      噪声环境自动抬高阈值，安静环境自动放低，换设备免重校。
 *   2. barge-in 门控（D19）：播放 TTS 期间以「播放窗 p25」估回声底，人声须显著
 *      超出才打断，不把机器人自己的声音当成说话。
 *
 * 关键纪律：
 *   - 只吃**静音期**的帧（调用方用 VAD 自身的 inSpeech 判定喂过来）——语音帧会
 *     污染分位数，让底噪被抬高。
 *   - 新加入的帧是「观测值」，不是直接令 floor = 观测值：走环形缓冲分位数，
 *     呼吸/键盘这类瞬时尖峰拉不动中位数。
 *   - threshold 未学到（缓冲未满）时返回 0，调用方回退用户配置的基线阈值。
 */
export interface RmsFloorTuning {
  /** 静音期观测窗长（毫秒）：越短对噪声变化越灵敏，越短越容易在说话间隙学错。 */
  windowMs: number
  /** 分位数等级（0~1）：越低取噪底越保守（阈值更贴近底），越高越激进。 */
  quantile: number
  /** 阈值裕量倍率：threshold = floor × margin。语音突发通常比底噪高一个量级。 */
  margin: number
  /** 帧长（毫秒），用于把 windowMs 折算成缓冲长度。 */
  frameMs: number
}

/** 估计器默认参数：2s 观测窗、p30、×3 裕量、40ms 帧。 */
export const DEFAULT_RMS_FLOOR_TUNING: RmsFloorTuning = {
  windowMs: 2_000,
  quantile: 0.3,
  margin: 3,
  frameMs: 40,
}

/** 噪声底估计器的最小面（VAD 与 barge-in 门控都只依赖它）。 */
export interface RmsFloorEstimator {
  /** 投喂一帧 RMS 与「这一帧是否处于语音期」。语音期帧不参与底噪学习。 */
  observe(rms: number, speechActive: boolean): void
  /** 当前阈值 = floor × margin；缓冲未满时返回 0（调用方回退基线）。 */
  readonly threshold: number
  /** 当前底噪估计（0 = 尚无观测）。 */
  readonly floor: number
  reset(): void
}

/** 构造估计器。`windowMs`/`quantile`/`margin` 来自 tuning。 */
export function createRmsFloorEstimator(tuning: RmsFloorTuning = DEFAULT_RMS_FLOOR_TUNING): RmsFloorEstimator {
  const cap = Math.max(4, Math.round(tuning.windowMs / tuning.frameMs))
  const buf = new Float64Array(cap)
  const sorted = new Float64Array(cap)
  let len = 0
  let head = 0

  const observe = (rms: number, speechActive: boolean): void => {
    if (speechActive || !Number.isFinite(rms) || rms <= 0) return
    buf[head] = rms
    head = (head + 1) % cap
    if (len < cap) len += 1
  }

  const floor = (): number => {
    if (len === 0) return 0
    for (let i = 0; i < len; i++) sorted[i] = buf[i] ?? 0
    // 单次帧数非常小，用插入排序的最简实现即可；full 缓冲时顺序已高度接近有序。
    for (let i = 1; i < len; i++) {
      const v = sorted[i] ?? 0
      let j = i - 1
      while (j >= 0 && (sorted[j] ?? 0) > v) { sorted[j + 1] = sorted[j] ?? 0; j -= 1 }
      sorted[j + 1] = v
    }
    const idx = Math.min(len - 1, Math.max(0, Math.floor(len * tuning.quantile)))
    return sorted[idx] ?? 0
  }

  return {
    observe,
    get floor(): number { return floor() },
    get threshold(): number {
      const f = floor()
      return len >= cap ? f * tuning.margin : 0
    },
    reset(): void {
      len = 0
      head = 0
    },
  }
}

/**
 * barge-in 回声底门控：播放 TTS 期间估计「回声 + 噪声」的背景水平，人声须超过
 * `background × headroom` 并持续 `holdMs` 才判为一次打断（barge-in）。
 *
 * 背景水平 = max(播放窗分位数, 静音底噪估计)。播放窗自带宽限期：刚 arm 时不触发，
 * 先把「TTS 外放在麦克风里的水平」学到，否则机器人开口第一句就会被自己的回声打断。
 */
export interface BargeInGate {
  /** 播放开始：清窗进入宽限，开始积累回声观测。 */
  arm(): void
  /** 播放结束（sink 排空/被打断）：回到非门控状态，窗口清空。 */
  disarm(): void
  /** 喂一帧 RMS 与 VAD 语音期判定；返回 true = 判定为一次真正的打断。 */
  feed(rms: number, speechActive: boolean): boolean
  readonly armed: boolean
}

export interface BargeInTuning {
  /** 宽限期（毫秒）：arm 后这么久内不触发，用来学习回声水平。 */
  graceMs: number
  /** 回声观测窗长（毫秒）。 */
  windowMs: number
  /** 背景分位数（0~1）：取回声背景的保守估计，人声尖峰不应抬高它。 */
  quantile: number
  /** 触发倍率：RMS > background × headroom 才算人声。 */
  headroom: number
  /** 持续超出多久才触发（毫秒）：过滤键盘/关门等瞬态。 */
  holdMs: number
  /** 帧长（毫秒）。 */
  frameMs: number
}

export const DEFAULT_BARGE_IN_TUNING: BargeInTuning = {
  graceMs: 800,
  windowMs: 1_600,
  quantile: 0.25,
  headroom: 3,
  holdMs: 350,
  frameMs: 40,
}

export function createBargeInGate(tuning: BargeInTuning = DEFAULT_BARGE_IN_TUNING): BargeInGate {
  const cap = Math.max(4, Math.round(tuning.windowMs / tuning.frameMs))
  const buf = new Float64Array(cap)
  const sorted = new Float64Array(cap)
  let len = 0
  let head = 0
  let armed = false
  /** 宽限期内已消耗的帧数。 */
  let graceLeft = 0
  /** 当前「持续超出背景」的帧数（超出持续了多久）。 */
  let overRun = 0
  /** 静音期底噪（不用单独估计器：把低于背景的观测当噪声学进窗口，天然含底噪）。 */
  let background = 0

  const push = (rms: number): void => {
    // 只学「不太高」的观测：语音尖峰会拉高背景，让人声更难触发。
    if (background > 0 && rms > background * tuning.headroom) return
    buf[head] = rms
    head = (head + 1) % cap
    if (len < cap) len += 1
  }

  const updateBackground = (): void => {
    if (len === 0) return
    for (let i = 0; i < len; i++) sorted[i] = buf[i] ?? 0
    for (let i = 1; i < len; i++) {
      const v = sorted[i] ?? 0
      let j = i - 1
      while (j >= 0 && (sorted[j] ?? 0) > v) { sorted[j + 1] = sorted[j] ?? 0; j -= 1 }
      sorted[j + 1] = v
    }
    const idx = Math.min(len - 1, Math.max(0, Math.floor(len * tuning.quantile)))
    background = sorted[idx] ?? 0
  }

  const feed = (rms: number, _speechActive: boolean): boolean => {
    if (!armed) return false
    if (graceLeft > 0) {
      push(rms)
      graceLeft -= 1
      if (graceLeft === 0) updateBackground()
      return false
    }
    push(rms)
    // 周期刷新背景（每 8 帧一次，避免每帧全排序）。
    if ((head % 8) === 0) updateBackground()
    const over = rms > background * tuning.headroom
    if (!over) { overRun = 0; return false }
    overRun += 1
    if (overRun < Math.max(1, Math.round(tuning.holdMs / tuning.frameMs))) return false
    // 一次性事件：触发即 disarm，调用方负责在下一句播放时重新 arm。
    armed = false
    len = 0
    head = 0
    overRun = 0
    return true
  }

  return {
    arm(): void {
      armed = true
      len = 0
      head = 0
      graceLeft = Math.max(1, Math.round(tuning.graceMs / tuning.frameMs))
      overRun = 0
      background = 0
    },
    disarm(): void {
      armed = false
      len = 0
      head = 0
      graceLeft = 0
      overRun = 0
    },
    feed,
    get armed(): boolean { return armed },
  }
}