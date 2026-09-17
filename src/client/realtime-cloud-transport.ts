/** dsh-asr-voice — 云端实时引擎的浏览器传输层（真实 fetch/SSE 实现）。
 * 对应 host 半区 `RealtimeHost` 的 4 条 exact 路由：
 * POST  /api/asr-voice/realtime/session   → { ok, sid }
 * POST  /api/asr-voice/realtime/audio     → 上行 int16 PCM（?sid=…）
 * GET   /api/asr-voice/realtime/events    → SSE 下行（?sid=…）
 * POST  /api/asr-voice/realtime/close     → 关会话（?sid=…）
 * 信任围栏由 host 侧 `isTrusted` 负责（本机回环同源天然通过），client 侧不
 * 携带任何密钥。SSE 用 fetch + ReadableStream 逐行解析 `data: …`（不用
 * EventSource：后者无法带 AbortController 精确关闭，且对错误恢复的控制更弱）。
 */
import type { CloudProviderEvent, CloudTransport } from './realtime-cloud.ts'

const BASE = '/api/asr-voice/realtime'

/** 会话建连/上行超时（毫秒）：host 本机回环，正常远低于此。 */
const ROUTE_TIMEOUT_MS = 15_000

/** SSE 单帧缓冲上限（字符）：host 被异常对端喂进无换行巨型帧时，不能无限累积。
 *  正常事件（含大段字幕）远小于此，只兜底断帧/恶意对端。
 *  导出只为单测能钉住这条背压防线（改大改小都必须让测试跟着变）。 */
export const MAX_SSE_BUF = 64 * 1024

/** 一个已切出的 SSE 帧里的数据行（`data: ` 后的原文，未做 JSON 解析）。
 *  `event` 是帧内 `event:` 字段（缺省 `message`）——目前调用方不区分事件名，
 *  但仍原样带出，避免「解析」和「投递」两件事纠缠在一起。 */
export interface SseFrame {
  event: string
  data: string
}

/** SSE 分帧（纯函数，无 IO）：把新到的 chunk 拼到残帧 buffer 上，切出所有以空行结尾的帧。
 *
 *  为什么单独抽出来：这是 client 侧唯一的真实网络解析路径，历史上出过「SSE 背压
 *  重复投递」的回归，而它原来埋在 openEvents 的异步闭包里——只有把「字节 → 帧」
 *  这一步做成可直测的纯函数，回归才有便宜的证据。
 *
 *  行为刻意与抽取前的实现逐字一致（不是 SSE 规范的完整实现，两处已知偏差见下）：
 *  - 分隔符只认 `\n\n`：CRLF 帧（`\r\n\r\n`）不会被切分，只能等后面再来一个 `\n\n`
 *    才被顺带切出（届时行尾的 `\r` 由 JSON.parse 容忍）。上游若改写成 CRLF，
 *    事件会一直不出直到撞上 MAX_SSE_BUF 判死——留待真出问题时再改，不在重构里顺手改语义。
 *  - 不做多行 `data:` 拼接：同一帧里每行 `data: ` 各自成一条（规范要求用 `\n` 连接后
 *    整体成一条）。host 侧每条事件都只写一行 `data: `，故线上行为等价。
 *  - 数据行前缀必须是 `data: `（带空格）：`data:{…}` 不被认。
 *  - 注释行（`:` 开头，含心跳）与其余字段行都不产出事件。
 * @param buffer - 上一轮留下的残帧（未出现空行的尾巴）。
 * @param chunk - 本轮新解码出的文本。
 * @returns events = 本轮可投递的帧（按出现顺序）；rest = 仍需留到下一轮的残帧。
 */
export function parseSseBlocks(buffer: string, chunk: string): { events: SseFrame[]; rest: string } {
  let buf = buffer + chunk
  const events: SseFrame[] = []
  let nl: number
  while ((nl = buf.indexOf('\n\n')) >= 0) {
    const block = buf.slice(0, nl)
    buf = buf.slice(nl + 2)
    // 先取事件名再收数据行（规范里 event: 作用于整帧，与字段书写顺序无关）。
    const lines = block.split('\n')
    let event = 'message'
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
    }
    for (const line of lines) {
      if (line.startsWith('data: ')) events.push({ event, data: line.slice(6) })
    }
  }
  return { events, rest: buf }
}

/** 一次简单 POST，返回 JSON；非 ok 抛错。 */
async function postJson(path: string, search = ''): Promise<{ ok?: boolean; sid?: string; reason?: string }> {
  const res = await fetch(`${BASE}${path}${search}`, {
    method: 'POST',
    signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
  })
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; sid?: string; reason?: string }
  if (!res.ok || data.ok !== true) throw new Error(data.reason || `realtime route ${path} failed`)
  return data
}

/** 上行一段 PCM（int16 LE）。 */
async function uploadAudio(sid: string, pcm: Uint8Array): Promise<void> {
  // Uint8Array<ArrayBufferLike> → fresh Uint8Array<ArrayBuffer> so it satisfies
  // BodyInit under the DOM/undici typings (Node/TS6 Buffer is ArrayBufferLike).
  const bytes = new Uint8Array(pcm.byteLength)
  bytes.set(pcm)
  const res = await fetch(`${BASE}/audio?sid=${encodeURIComponent(sid)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: bytes,
    signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { reason?: string }
    throw new Error(data.reason || `audio upload failed (HTTP ${res.status})`)
  }
}

/** 打开 SSE 下行：返回取消订阅的 disposer（幂等）。 */
function openEvents(sid: string, onEvent: (ev: CloudProviderEvent) => void): () => void {
  const controller = new AbortController()
  let disposed = false
  void (async () => {
    try {
      const res = await fetch(`${BASE}/events?sid=${encodeURIComponent(sid)}`, {
        headers: { accept: 'text/event-stream' },
        signal: controller.signal,
      })
      if (!res.ok || res.body === null) {
        if (!disposed) onEvent({ type: 'error', code: 'events-unavailable' })
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        // 分帧是纯函数（parseSseBlocks）：这里只管「解码 → 分帧 → 投递 → 背压」。
        const parsed = parseSseBlocks(buf, decoder.decode(value, { stream: true }))
        buf = parsed.rest
        for (const frame of parsed.events) {
          try {
            onEvent(JSON.parse(frame.data) as CloudProviderEvent)
          } catch { /* 非 JSON 事件（心跳注释等）忽略 */ }
        }
        // 背压防线：host 被异常对端喂进无换行的巨型帧（或断帧）时，buf 不能
        // 无限增长拖垮浏览器标签页。超过上限按断流处理（与 done 分支同等报错）。
        if (buf.length > MAX_SSE_BUF) {
          if (!disposed) onEvent({ type: 'error', code: 'events-unavailable' })
          reader.cancel().catch(() => {})
          return
        }
      }
      // 服务端干净关流（host 重启/代理超时/provider 结束会话）：与异常路径同等
      // 对待——不报错引擎就聋死（字幕冻结、麦克风开着、永不 onFail）。
      if (!disposed) onEvent({ type: 'error', code: 'events-unavailable' })
    } catch {
      if (!disposed) onEvent({ type: 'error', code: 'events-unavailable' })
    }
  })()
  return () => {
    disposed = true
    controller.abort()
  }
}

/** 浏览器实时通道传输层。 */
export function createBrowserCloudTransport(): CloudTransport {
  return {
    async createSession() {
      const data = await postJson('/session')
      if (typeof data.sid !== 'string' || data.sid === '') throw new Error('realtime session returned no sid')
      return data.sid
    },
    upload: uploadAudio,
    openEvents,
    async closeSession(sid) {
      await postJson('/close', `?sid=${encodeURIComponent(sid)}`)
    },
  }
}
