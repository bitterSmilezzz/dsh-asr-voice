/** dsh-asr-voice — I5：真云端实时 provider（阿里云百炼 Qwen-ASR-Realtime）。
 * 协议（对齐 OpenAI Realtime 兼容面，官方文档：
 * help.aliyun.com/zh/model-studio/qwen-asr-realtime-api）：
 * WebSocket  URL = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=<model>`
 * 认证          = 握手阶段 `Authorization: Bearer <api_key>`（失败 = HTTP 401/403）
 * 客户端事件     = session.update（pcm / 16000 / server_vad）→ input_audio_buffer.append
 * （base64 PCM）→ … → session.finish（推完必须先发，再关连接）
 * 服务端事件     = session.created / speech_started / speech_stopped /
 * conversation.item.input_audio_transcription.text（partial：
 * text=已确认前缀 + stash=草稿后缀，拼接即完整预览）/
 * …completed（final：transcript）/ …failed / error / session.finished
 * 接缝契约（src/realtime-provider.ts）：connect() → RealtimeProviderConnection，
 * send(pcm) 上行 int16 LE / onEvent 事件下行 / close() 幂等。I5 只替换 host 侧
 * `createProvider` 的工厂，RealtimeHost 的会话注册表与 4 条路由一行不改。
 * 依赖：Node 全局 WebSocket（undici，Node 22+ 稳定；本仓 tsconfig host 用 Node 类型），
 * 握手带自定义头已由 test/ws-auth.test.mjs 给出真实 socket 上线证据。
 */
import type { RealtimeProvider, RealtimeProviderConnection, RealtimeProviderEvent } from './realtime-provider.ts'

/** 建连/关闭兜底超时（毫秒）：本机回环远低于此，云端握手一般也在内。 */
const CONNECT_TIMEOUT_MS = 15_000
/** close() 后等 `session.finished` 的最长期限：服务端要先吐完在途 final。 */
const CLOSE_GRACE_MS = 3_000

/** 真 provider 的构造参数（host 半区按配置注入）。 */
export interface DashscopeRealtimeOptions {
  /** DSH 凭据解析出的 API key（Bearer 后接的内容）。 */
  apiKey: string
  /** 模型名（URL query `model=`，默认 qwen3-asr-flash-realtime）。 */
  model?: string
  /** WebSocket 根地址（不含 query），默认百炼公共域名。 */
  wssUrl?: string
  /** 识别语言（可选；省略 = 服务端自动检测）。 */
  language?: string
  /** 服务端 VAD 参数（可选；默认对齐官方推荐）。 */
  vad?: {
    /** VAD 灵敏度（-1~1，推荐 0.0）。 */
    threshold?: number
    /** 静音持续多久断句（ms，200~6000，推荐 400）。 */
    silenceDurationMs?: number
  }
}

/** 默认 VAD：官方推荐值（低阈值灵敏度高，400ms 断句响应快）。 */
const DEFAULT_VAD = { threshold: 0.0, silenceDurationMs: 400 }

/** 一条与 qwen3-asr-flash-realtime 的实时连接。 */
class DashscopeRealtimeConnection implements RealtimeProviderConnection {
  private readonly ws: WebSocket
  private closed = false
  private sessionUpdateSent = false
  onEvent: ((ev: RealtimeProviderEvent) => void) | null = null

  constructor(url: string, private readonly opts: DashscopeRealtimeOptions) {
    this.ws = new WebSocket(url, { headers: { Authorization: `Bearer ${opts.apiKey}` } })
    const fail = (code: string): void => {
      if (this.closed) return
      this.closed = true
      try { this.ws.close() } catch { /* already closed */ }
      this.onEvent?.({ type: 'error', code })
    }
    const connectTimer = setTimeout(() => fail('provider-timeout'), CONNECT_TIMEOUT_MS)
    this.ws.onopen = (): void => {
      clearTimeout(connectTimer)
      if (this.closed) return
      this.sendSessionUpdate()
    }
    this.ws.onerror = (): void => {
      clearTimeout(connectTimer)
      fail('provider-unreachable')
    }
    this.ws.onclose = (): void => {
      clearTimeout(connectTimer)
      if (this.closed) return
      this.closed = true
      // 正常由 close() 主动关闭（已发 session.finish）→ 不报错；对端异常断开才算错。
      if (!this.byGracefulClose) this.onEvent?.({ type: 'error', code: 'provider-closed' })
    }
    this.ws.onmessage = (msg: MessageEvent): void => {
      if (this.closed) return
      const ev = this.mapServerEvent(String(msg.data))
      if (ev !== null) this.onEvent?.(ev)
    }
  }

  /** 是否正由 close() 的优雅收尾阶段关闭（避免 onclose 误报 error）。 */
  private byGracefulClose = false

  /** 连接建立后第一时间发 session.update（pcm/16000/server_vad）。 */
  private sendSessionUpdate(): void {
    if (this.sessionUpdateSent || this.closed) return
    this.sessionUpdateSent = true
    const { vad } = this.opts
    const v = vad === undefined ? DEFAULT_VAD : { ...DEFAULT_VAD, ...vad }
    const session: Record<string, unknown> = {
      input_audio_format: 'pcm',
      sample_rate: 16000,
      turn_detection: { type: 'server_vad', threshold: v.threshold, silence_duration_ms: v.silenceDurationMs },
    }
    if (this.opts.language !== undefined && this.opts.language !== '') {
      session.input_audio_transcription = { language: this.opts.language }
    }
    this.sendRaw({ type: 'session.update', session })
  }

  /** 上行一段 int16 LE PCM：base64 后走 input_audio_buffer.append。 */
  send(pcm: Uint8Array): void {
    if (this.closed || pcm.byteLength === 0) return
    // undici 的 send() 在 CONNECTING/CLOSING 态会抛 InvalidStateError：连接尚未就绪时静默丢弃
    // （host 侧只在会话建立后才开始上行，正常不会丢；此处只是防御）。
    if (this.ws.readyState !== WebSocket.OPEN) return
    const base64 = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength).toString('base64')
    this.sendRaw({ type: 'input_audio_buffer.append', audio: base64 })
  }

  /** 结束会话（幂等）：先发 session.finish，等 session.finished 或超时再关 WS。 */
  close(): void {
    if (this.closed) return
    this.byGracefulClose = true
    this.closed = true
    // VAD 模式下必须先发 session.finish 再关连接，否则服务端丢弃在途 final。
    try {
      this.sendRaw({ type: 'session.finish' })
    } catch { /* socket gone */ }
    const dispose = (): void => {
      try { this.ws.close() } catch { /* already closed */ }
    }
    // 收到 session.finished 提前关；到点兜底强制关。
    const timer = setTimeout(dispose, CLOSE_GRACE_MS)
    const onFinished = (msg: MessageEvent): void => {
      try {
        const parsed = JSON.parse(String(msg.data)) as { type?: string }
        if (parsed.type === 'session.finished') {
          clearTimeout(timer)
          this.ws.removeEventListener('message', onFinished)
          dispose()
        }
      } catch { /* non-JSON (ping etc.) ignore */ }
    }
    this.ws.addEventListener('message', onFinished)
  }

  /** 发一条客户端事件（JSON 文本帧）。 */
  private sendRaw(payload: unknown): void {
    this.ws.send(JSON.stringify(payload))
  }

  /** 服务端事件 → 接缝事件；无关事件（session.created/updated 等）返回 null。 */
  private mapServerEvent(raw: string): RealtimeProviderEvent | null {
    let parsed: {
      type?: string
      error?: { code?: string }
      item?: { content?: unknown }
      text?: string
      stash?: string
      transcript?: string
    }
    try {
      parsed = JSON.parse(raw) as typeof parsed
    } catch {
      return null // 非 JSON（心跳注释等）忽略
    }
    switch (parsed.type) {
      case 'input_audio_buffer.speech_started':
        return { type: 'speech-started' }
      case 'input_audio_buffer.speech_stopped':
        return { type: 'speech-stopped' }
      case 'conversation.item.input_audio_transcription.text':
        // text=已确认前缀 + stash=仍在处理的草稿后缀：拼接才是当前完整预览。
        return { type: 'partial', text: `${parsed.text ?? ''}${parsed.stash ?? ''}` }
      case 'conversation.item.input_audio_transcription.completed':
        return { type: 'final', text: parsed.transcript ?? '' }
      case 'conversation.item.input_audio_transcription.failed':
        return { type: 'error', code: 'transcription-failed' }
      case 'error':
        return { type: 'error', code: parsed.error?.code ?? 'provider-error' }
      case 'session.finished':
        // 服务端收尾完成：连接使命结束，本地不必再报错（close() 兜底会关）。
        return null
      default:
        return null // session.created/updated/committed/item.created 等不需要
    }
  }
}

/** 真云端实时 provider 工厂（I5：host 侧 createProvider 用它）。 */
export function createDashscopeRealtimeProvider(opts: DashscopeRealtimeOptions): RealtimeProvider {
  const wssUrl = (opts.wssUrl ?? 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime').replace(/\/+$/, '')
  const model = opts.model ?? 'qwen3-asr-flash-realtime'
  const url = `${wssUrl}?model=${encodeURIComponent(model)}`
  return {
    connect: async (): Promise<RealtimeProviderConnection> => {
      if (!opts.apiKey) throw new Error('dashscope realtime: no API key')
      return new DashscopeRealtimeConnection(url, opts)
    },
  }
}
