/**
 * dsh-asr-voice — 实时转写引擎·云端通道（cloud）。
 *
 * I4 交付：把 `capture.ts` 的 16k 采集帧上行到 host 实时通道（I3 的
 * `RealtimeHost`），下行经 SSE 收到 `RealtimeProviderEvent`，驱动字幕与回合。
 * 这第三档引擎与 browser（Web Speech）/ segmented（本地 VAD + 整段转写）的
 * 区别：**回合边界由服务端 VAD 给**（provider 发 speech-stopped/final），
 * 本地不再用文字静默判定——换来的是逐字延迟更低的流式体验，代价是必须有
 * 一条 host 实时通道（I3 已交付，I3 阶段用假 provider，I5 换真云端）。
 *
 * 传输层是注入的（`CloudTransport`）：单测直接喂假事件与假采集，不碰网络。
 * 真实的浏览器实现见 `realtime-cloud-transport.ts`。
 *
 * 回合语义：provider 发 `final` 即「这一句说完了」，直接 onTurn；`partial`
 * 驱动字幕；`error` 判死。采集帧在**静音守卫**（趋零不上行）之后量化成
 * int16 LE 字节逐帧上行。
 */
import { startPcmCapture, type PcmCapture, type PcmCaptureOptions } from './capture.ts'
import { peakAbs, quantiseInt16 } from './pcm.ts'
import type { RealtimeEvents, RealtimeSession } from './realtime.ts'
import { meaningfulTurn } from './turn-guard.ts'

/** 云端通道收到的上游事件（镜像 host 的 RealtimeProviderEvent 形状）。 */
export type CloudProviderEvent =
  | { type: 'partial'; text: string }
  | { type: 'final'; text: string }
  | { type: 'speech-started' }
  | { type: 'speech-stopped' }
  | { type: 'error'; code: string }

/** 云端通道的传输层（浏览器 fetch 实现见 realtime-cloud-transport.ts）。 */
export interface CloudTransport {
  /** 建会话，返回 host 铸造的 sid。 */
  createSession(): Promise<string>
  /** 上行一段 int16 LE 16k 单声道 PCM 字节。 */
  upload(sid: string, pcm: Uint8Array): Promise<void>
  /** 打开 SSE 下行；返回取消订阅的 disposer。 */
  openEvents(sid: string, onEvent: (ev: CloudProviderEvent) => void): () => void
  /** 关会话（幂等）。 */
  closeSession(sid: string): Promise<void>
}

/** 可注入依赖（单测借此跑真状态机，不碰 DOM/网络）。 */
export interface CloudRealtimeDeps {
  capture(options: PcmCaptureOptions): Promise<PcmCapture>
  transport: CloudTransport
}

/** Float32 帧 → int16 LE 字节（16k 单声道；归一化只在需要时做一次）。 */
export function floatToInt16Le(pcm: Float32Array, gain = 1): Uint8Array {
  const out = new Uint8Array(pcm.length * 2)
  const view = new DataView(out.buffer)
  for (let i = 0; i < pcm.length; i++) {
    view.setInt16(i * 2, quantiseInt16(pcm[i] ?? 0, gain), true)
  }
  return out
}

/** 连续失败判死阈值（上游 error 达此数即结束会话）。 */
const CLOUD_FAIL_LIMIT = 3

/** 上行串行泵：采集帧在回调里来，网络上行是异步的——必须排队逐帧发，不能并发堆叠。 */
function createUploadPump(upload: (pcm: Uint8Array) => Promise<void>): {
  push(pcm: Uint8Array): void
  /** 清空队列（pause/stop 时用，丢弃未发的帧）。 */
  clear(): void
} {
  let queue: Uint8Array[] = []
  let inFlight = false
  const pump = (): void => {
    if (inFlight) return
    const next = queue.shift()
    if (next === undefined) return
    inFlight = true
    void upload(next).finally(() => { inFlight = false; pump() })
  }
  return {
    push(pcm) {
      queue.push(pcm)
      pump()
    },
    clear() {
      queue = []
    },
  }
}

/**
 * 云端实时引擎：采集帧 → int16 上行 → SSE 事件驱动字幕/回合。
 * @param deps - 采集 + 传输层（测试注入；浏览器用默认实现）。
 */
export function createCloudRealtime(
  tuning: { frameMs: number },
  events: RealtimeEvents,
  deps: CloudRealtimeDeps,
): RealtimeSession {
  let active = false
  let paused = true
  let capture: PcmCapture | null = null
  let disposeEvents: (() => void) | null = null
  let sid = ''
  let failures = 0
  let pump = createUploadPump((pcm) => deps.transport.upload(sid, pcm))
  /** 会话代际：stop/start 换代会作废在途的上行与事件。 */
  let generation = 0

  const teardown = (): void => {
    pump.clear()
    disposeEvents?.()
    disposeEvents = null
    capture?.stop()
    capture = null
  }

  const failNow = (code: string): void => {
    active = false
    paused = true
    const gen = generation
    teardown()
    if (sid !== '') void deps.transport.closeSession(sid).catch(() => {})
    if (gen === generation) events.onFail(code)
  }

  const onProviderEvent = (ev: CloudProviderEvent): void => {
    if (!active || paused) return
    if (ev.type === 'partial') {
      events.onPartial(ev.text)
    } else if (ev.type === 'final') {
      failures = 0
      const text = ev.text.trim()
      if (text !== '' && meaningfulTurn(text)) events.onTurn(text)
    } else if (ev.type === 'error') {
      failures += 1
      if (failures >= CLOUD_FAIL_LIMIT) { failNow(ev.code || 'provider-unreachable') }
    }
    // speech-started / speech-stopped：服务端 VAD 边界，本地不消费（final 已含文本）。
  }

  const openCapture = (): void => {
    deps.capture({
      frameMs: tuning.frameMs,
      onFrame: (pcm) => {
        if (!active || paused) return
        // 静音守卫：趋零帧上行只会换来上游幻觉字（与整段模式同一判据）。
        if (peakAbs(pcm) < 0.005) return
        pump.push(floatToInt16Le(pcm))
      },
      onFail: (code) => { if (active) failNow(code) },
    }).then((next) => {
      if (!active || paused) { next.stop(); return }
      capture = next
    }, () => {
      if (active) failNow('capture-failed')
    })
  }

  return {
    start(): void {
      if (active) return
      active = true
      paused = false
      const gen = ++generation
      pump = createUploadPump((pcm) => deps.transport.upload(sid, pcm))
      void deps.transport.createSession().then((next) => {
        if (!active || gen !== generation) { void deps.transport.closeSession(next).catch(() => {}); return }
        sid = next
        disposeEvents = deps.transport.openEvents(next, onProviderEvent)
        openCapture()
      }, () => {
        if (active && gen === generation) failNow('provider-unreachable')
      })
    },
    pause(): void {
      if (!active || paused) return
      paused = true
      pump.clear()
      capture?.setMuted(true)
    },
    resume(): void {
      if (!active || !paused) return
      paused = false
      capture?.setMuted(false)
      if (capture === null) openCapture()
    },
    stop(): void {
      if (!active) return
      active = false
      paused = true
      generation += 1
      const closeSid = sid
      teardown()
      if (closeSid !== '') void deps.transport.closeSession(closeSid).catch(() => {})
    },
    get listening(): boolean { return active && !paused },
  }
}

/** 默认采集（真实麦克风）。 */
export function defaultCloudCapture(options: PcmCaptureOptions): Promise<PcmCapture> {
  return startPcmCapture(options)
}
