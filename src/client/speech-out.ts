/** dsh-asr-voice — 语音播报出口（SpeakSink）与「流式回复 → 可朗读句子」的分句泵。
 * 一期只有浏览器 `speechSynthesis` 一种实现：它是三浏览器交集内唯一零配置、零密钥、
 * 零依赖的播放通路，且与麦克风走不同的音频路由（回声消除能否吃掉它决定半双工还是
 * 全双工，见 README 的实时对话一节）。接缝留在这里，云 TTS 落地时新增一个实现，
 * 调用方（语音对话按钮）不需要知道播报是谁做的。
 * 两处不显眼但会决定体验的坑：
 * 1. `utterance.onend` 不可信——Chrome 对长句常不回调，队列会永久卡住、麦克风再也不
 * 交还。故每句都挂看门狗（realtime.speech.utteranceWatchdogMs）。
 * 2. agent 回复是**逐块累积**的字符串，不是天生分好句的。泵负责「只朗读已经说完的
 * 句子」，并且在新回合/新 step 使文本流从头开始时，把旧流的尾巴先吐干净。
 */

/** 一次朗读的最小生命周期回调。 */
export interface SpeakSink {
  /** 追加一句到队列（空闲时立即开播）。 */
  enqueue(text: string): void
  /** 队列里还有话要说，或正在说。半双工门控据此决定麦克风给不给。 */
  readonly active: boolean
  /** 打断：停止当前发声并清空队列，**不**触发 onDrain。 */
  cancel(): void
  /** 队列排空时回调（每次排空都回调，调用方自己判断是不是真的说完了）。 */
  onDrain: (() => void) | null
  /** 释放：断开音色监听、清空队列、停止发声。 */
  dispose(): void
  /** 在用户手势里调用一次，为 Safari 建立发声权限。 */
  prime(): void
}

/** 浏览器是否具备语音合成能力。 */
export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

/** 未闭合句子的硬切上限（字符）。与 utteranceWatchdogMs 是一对：块必须能在看门狗时限 内念完，否则会被看门狗误判成「播完」而截断。正常句长远小于此，只有全程无标点的 退化回复才会撞上。 */
export const MAX_UTTERANCE_CHARS = 200

/** 中日韩句读：出现即断句，不需要后接空白。 */
const CJK_STOP = '。！？…；'
/** 拉丁句末符：只在词尾（后接空白或到结尾）才断句。 */
const LATIN_STOP = '!?;:'
// 已知代价：`Mr. Smith` / `e.g.` 这类「点后跟空格」的缩写会被判成句末，多切出一个短句。
// 认了——加缩写表会引入语言分支，而这里最坏只是多一句几百毫秒的片段，不会漏念。
/** 跟着句末符一起归入上一句的收尾引号/括号。 */
const CLOSERS = '”’）)』」】'

/** text 中 from 之后**第一个**句子边界的结束下标（含紧随的句末符、收尾符与空白）； 没有边界返回 -1。正向扫描：一次 feed 里含多句时也要切成多段，才能及早可打断、 且每段都落在看门狗盖得住的长度内。 */
function nextBreak(text: string, from = 0): number {
  for (let i = from; i < text.length; i++) {
    const c = text[i] ?? ''
    if (c === '\n') return i + 1
    const isCjk = CJK_STOP.includes(c)
    if (!isCjk && !LATIN_STOP.includes(c) && c !== '.') continue
    // 小数点不断句：回复里的 `3.5`、版本号远比「句子以数字结尾」常见，
    // 真到句尾的那一个由 finish() 或硬切上限兜住。
    if (c === '.' && /\d/.test(text[i - 1] ?? ' ')) continue
    let j = i + 1
    for (let nj = j; nj < text.length; nj++) {
      const t = text[nj] ?? ''
      if (!CJK_STOP.includes(t) && !LATIN_STOP.includes(t) && !CLOSERS.includes(t)) break
      j = nj + 1
    }
    // 拉丁句末符只有站在词尾才算结束：`U.S.` 里点后面紧跟字母时不算。
    if (!isCjk && j < text.length && !/\s/.test(text[j] ?? '')) continue
    while (j < text.length && (text[j] === ' ' || text[j] === '\t')) j++
    return j
  }
  return -1
}

/** 创建一个分句泵：喂**累积**文本，吐出「已经说完的句子」。 @param firstSentenceMinChars - 首句最少字数：一句太短就继续攒，避免以「好的。」这种 碎片起音（听众会觉得机器人结巴）。仅作用于每个流的第一个切段。 */
export function createSentencePump(firstSentenceMinChars: number): {
  /** 喂入当前流的累积全文；返回新增的完整句子。 */
  feed(cumulative: string): string[]
  /** 流结束：吐出缓冲里剩下的尾巴（不再受首句字数约束）。 */
  finish(): string[]
} {
  let buffer = ''
  let seen = ''
  let started = false
  /** 从 buffer 里尽量切出可朗读句子（按句一段）。final=true 时连尾巴一起吐。 */
  const cut = (final: boolean): string[] => {
    const out: string[] = []
    let pos = 0
    for (;;) {
      const boundary = nextBreak(buffer, pos)
      if (boundary > 0 && boundary <= MAX_UTTERANCE_CHARS) {
        const head = buffer.slice(0, boundary).trim()
        if (head === '') { pos = boundary; continue }
        if (!started && !final && head.length < firstSentenceMinChars) {
          // 首句太短就往后并一句再念（碎片起音听着像机器人结巴）。没有下一句可并
          // 且流已收尾时，才照念这个短开头。
          pos = boundary
          continue
        }
        out.push(head)
        buffer = buffer.slice(boundary)
        pos = 0
        started = true
        continue
      }
      if (buffer.length >= MAX_UTTERANCE_CHARS) {
        // 只切固定长度：一次喂进 500 字无标点长文时，整段吐出会让看门狗盖不住。
        const head = buffer.slice(0, MAX_UTTERANCE_CHARS).trim()
        buffer = buffer.slice(MAX_UTTERANCE_CHARS)
        pos = 0
        if (head === '') continue // 整刀落在空白里：没有可念内容，不产出空块
        out.push(head)
        started = true
        continue
      }
      break
    }
    if (final && buffer.trim() !== '') {
      out.push(buffer.trim())
      buffer = ''
    }
    return out
  }
  return {
    feed(cumulative: string): string[] {
      if (cumulative === seen) return []
      if (!cumulative.startsWith(seen)) {
        // 回合或 step 换了：blocks 从头部重来。旧流没念完的尾巴必须先吐，否则丢半句。
        const tail = cut(true)
        seen = cumulative
        buffer = cumulative
        started = false
        return [...tail, ...cut(false)]
      }
      buffer += cumulative.slice(seen.length)
      seen = cumulative
      return cut(false)
    },
    finish(): string[] {
      return cut(true)
    },
  }
}

/** 播报参数（来自 config.realtime 快照）。 */
export interface SpeakTuning {
  /** 单句看门狗（毫秒）。 */
  utteranceWatchdogMs: number
  /** 识别语言：auto 时跟随 navigator.language，否则用它挑音色。 */
  language: string
}

/** 排队播放骨架：两条 SpeakSink（浏览器合成/云端 TTS）共用的状态机。
 * 单一来源化的语义（历史上一处回归过：drain 处理器首轮后被摘掉，第二回合起
 * 麦克风永远要不回来）：
 * - 一次一句：上一句 settle 前不起播下一句；
 * - pending-drain：只在「起播过的一批」排空时触发一次 onDrain，空转不重复；
 * - cancel：清队列、止住当前句、active 立即为 false，且**吞掉本轮 drain**
 * （打断后何时还麦由调用方决定）；迟到 settle 一律作废，不抢跑新状态。
 * 播放细节由实现注入：`play` 一句（Promise 在这句结束——自然/被打断/超时——时
 * settle），`interrupt` 止住正在发声的这一句。
 */
interface QueueRunnerDeps {
  play(text: string): Promise<void>
  interrupt(): void
}

function createQueueRunner(deps: QueueRunnerDeps): {
  enqueue(text: string): void
  cancel(): void
  dispose(): void
  /** 是否空闲（既没在播也没排队）。 */
  active(): boolean
  set onDrain(fn: (() => void) | null)
  get onDrain(): (() => void) | null
} {
  const queue: string[] = []
  let token = 0
  let pending = false
  let drain: (() => void) | null = null
  let disposed = false

  const next = (): void => {
    if (disposed || token !== 0) return
    const text = queue.shift()
    if (text === undefined) {
      if (pending) { pending = false; drain?.() }
      return
    }
    pending = true
    const my = ++token
    void deps.play(text).finally(() => {
      // 迟到的旧代 settle（cancel/dispose 后）：不得动新状态（新句可能已在播）。
      if (disposed || my !== token) return
      token = 0
      next()
    })
  }

  return {
    enqueue(text: string): void {
      if (disposed || text.trim() === '') return
      queue.push(text)
      next()
    },
    cancel(): void {
      queue.length = 0
      pending = false
      token = 0
      deps.interrupt()
    },
    dispose(): void {
      disposed = true
      queue.length = 0
      pending = false
      token = 0
      deps.interrupt()
    },
    active: () => token !== 0 || queue.length > 0,
    set onDrain(fn: (() => void) | null) { drain = fn },
    get onDrain(): (() => void) | null { return drain },
  }
}

/** 按语言挑音色：没有完全匹配时退到同主语言的任何音色，再退到浏览器默认。 */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (voices.length === 0 || lang === '') return null
  const wanted = lang.toLowerCase()
  const base = wanted.split('-')[0]
  return voices.find((v) => v.lang.toLowerCase() === wanted)
    ?? voices.find((v) => v.lang.toLowerCase().split('-')[0] === base)
    ?? null
}

/** 浏览器语音合成实现。排队/一次一句/drain 语义在 QueueRunner；这里只提供 「合成并播一句」（onend/onerror/看门狗三者谁先到都算这句结束）与「止住当前句」。 */
export function createSpeechSynthesisSink(tuning: SpeakTuning): SpeakSink {
  const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis
  let voices: SpeechSynthesisVoice[] = []
  let watchdog: ReturnType<typeof setTimeout> | null = null
  /** 正在播的这句（interrupt/dispose 时 synth.cancel，看门狗一并清）。 */
  let current: SpeechSynthesisUtterance | null = null
  let disposed = false

  const lang = tuning.language === 'auto'
    ? (typeof navigator === 'undefined' ? '' : navigator.language)
    : tuning.language

  const clearWatchdog = (): void => {
    if (watchdog !== null) clearTimeout(watchdog)
    watchdog = null
  }

  const runner = createQueueRunner({
    play(text: string): Promise<void> {
      return new Promise<void>((resolve) => {
        if (synth === undefined) { resolve(); return }
        const utter = new SpeechSynthesisUtterance(text)
        if (lang !== '') utter.lang = lang
        const voice = pickVoice(voices, lang)
        if (voice !== null) utter.voice = voice
        current = utter
        let settled = false
        const finish = (): void => {
          if (settled) return
          settled = true
          if (current === utter) current = null
          clearWatchdog()
          resolve()
        }
        utter.onend = finish
        utter.onerror = finish
        // onend 不可信：Chrome 长句、部分音色会静默不回。超时按播完处理，
        // 否则麦克风永远还不回来（半双工门控挂在 onDrain 上）。
        watchdog = setTimeout(() => {
          try { synth.cancel() } catch { /* noop */ }
          finish()
        }, tuning.utteranceWatchdogMs)
        try {
          synth.speak(utter)
        } catch {
          finish() // 同步失败也结算：队列继续，不因单句卡死
        }
      })
    },
    interrupt(): void {
      clearWatchdog()
      try { synth?.cancel() } catch { /* noop */ }
    },
  })

  // Chrome 的音色表要等 voiceschanged 才填得满，构造时常为空。
  const onVoices = (): void => { voices = synth?.getVoices() ?? [] }
  onVoices()
  synth?.addEventListener?.('voiceschanged', onVoices)

  return {
    enqueue: (text) => runner.enqueue(text),
    get active() { return runner.active() },
    cancel: () => runner.cancel(),
    set onDrain(fn) { runner.onDrain = fn },
    get onDrain() { return runner.onDrain },
    dispose(): void {
      disposed = true
      runner.dispose()
      synth?.removeEventListener?.('voiceschanged', onVoices)
    },
    prime(): void {
      if (disposed || synth === undefined) return
      onVoices()
      // Safari 只在用户激活上下文里允许首次发声：在点击回调内说一个空白片段把
      // 音频会话建起来，真正的内容稍后经队列播出就不会被静默拦掉。
      try {
        const blank = new SpeechSynthesisUtterance(' ')
        blank.volume = 0
        synth.speak(blank)
      } catch { /* noop */ }
    },
  }
}

/** 云端 TTS 是否需要 Web Audio（浏览器能力检查）。 */
export function isCloudTtsSupported(): boolean {
  const w = typeof window === 'undefined' ? undefined : (window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown })
  return Boolean(w?.AudioContext ?? w?.webkitAudioContext)
}

/** 云端 TTS 实现（I6）：文本 → host 私有路由 → 阿里云百炼 qwen3-tts-flash-realtime
 * → base64 PCM（16k int16 LE）→ `AudioBufferSourceNode → ctx.destination` 播放。
 * 与浏览器 speechSynthesis 同接口（SpeakSink），调用方（语音对话按钮）不感知实现。
 * 排队/drain/打断语义在 QueueRunner；这里只提供「合成并播一句」与「止住当前句」。
 * `onended` 是 Web Audio 的精确事件（不像 speechSynthesis 的 onend 会漏回调），
 * 另有播放时长兜底；合成请求带超时，且打断（cancel/dispose）按句子代际作废
 * in-flight 请求——fetch 窗口内的句子不得在打断后再起播。云端不可达或合成失败时
 * 跳过该句继续排队（不阻塞对话），失败静默（错误面由录音侧暴露）。
 */
export function createCloudTtsSink(tuning: { language: string; voice?: string }): SpeakSink {
  let ctx: AudioContext | null = null
  let current: AudioBufferSourceNode | null = null
  let disposed = false
  /** 句子代际：interrupt 递增，in-flight 合成链在起播前按代作废。 */
  let utteranceGen = 0
  /** 合成请求超时：host 挂起时不能让一句永久占用播放槽（半双工门挂在 onDrain 上）。 */
  const TTS_TIMEOUT_MS = 30_000

  const getCtx = (): AudioContext | null => {
    if (ctx === null) {
      const w = window as unknown as { AudioContext?: new () => AudioContext; webkitAudioContext?: new () => AudioContext }
      const Ctor = w.AudioContext ?? w.webkitAudioContext
      if (Ctor === undefined) return null
      ctx = new Ctor()
    }
    return ctx
  }

  const runner = createQueueRunner({
    play(text: string): Promise<void> {
      return (async () => {
        const my = ++utteranceGen
        const ac = getCtx()
        if (ac === null || disposed) return
        let data: { ok?: boolean; audio?: string; sampleRate?: number; reason?: string }
        try {
          const res = await fetch('/api/asr-voice/tts', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text, voice: tuning.voice }),
            signal: AbortSignal.timeout(TTS_TIMEOUT_MS),
          })
          data = await res.json().catch(() => ({})) as typeof data
        } catch {
          return // 网络失败/超时：跳过这句，不阻塞队列
        }
        if (disposed || my !== utteranceGen || data.ok !== true || data.audio === undefined) return
        // base64 → 16k int16 LE → Float32（除以 32768 归一化到 -1~1）。
        const bin = atob(data.audio)
        const pcm = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i)
        const frames = pcm.byteLength >> 1
        const f32 = new Float32Array(frames)
        const view = new DataView(pcm.buffer)
        for (let i = 0; i < frames; i++) f32[i] = view.getInt16(i * 2, true) / 32768
        if (disposed || my !== utteranceGen || frames === 0) return
        const buffer = ac.createBuffer(1, frames, data.sampleRate ?? 16000)
        buffer.copyToChannel(f32, 0)
        const source = ac.createBufferSource()
        source.buffer = buffer
        source.connect(ac.destination)
        current = source
        await new Promise<void>((resolve) => {
          source.onended = () => resolve()
          source.start()
          // 保险：start 后超时（如 ctx 被挂起）不能让队列永久卡住。长句按 5s/1000 帧估算。
          const ms = Math.max(2_000, Math.ceil(frames / 16000) * 1000 + 1_500)
          setTimeout(() => { try { source.stop() } catch { /* already ended */ } }, ms)
        })
        if (current === source) current = null
      })()
    },
    interrupt(): void {
      utteranceGen += 1
      if (current !== null) { try { current.stop() } catch { /* already ended */ } }
      current = null
    },
  })

  return {
    enqueue: (text) => runner.enqueue(text),
    get active() { return runner.active() },
    cancel: () => runner.cancel(),
    set onDrain(fn) { runner.onDrain = fn },
    get onDrain() { return runner.onDrain },
    dispose(): void {
      disposed = true
      runner.dispose()
      if (ctx !== null) { void ctx.close().catch(() => {}); ctx = null }
    },
    prime(): void {
      if (disposed) return
      const ac = getCtx()
      if (ac !== null && ac.state === 'suspended') void ac.resume()
    },
  }
}
