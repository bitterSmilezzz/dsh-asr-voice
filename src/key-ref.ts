/** dsh-asr-voice — API key 的凭据引用名（host / client 共用的唯一真相）。
 * key 既不存 settings 也不进浏览器：统一落在 DSH credentials 服务里，按引用名读取。
 * 预置供应商刻意沿用官方 LLM provider 的命名（`<PROVIDER>_API_KEY`，派生方式见
 * packages/client/ui-settings-models/src/client/store.ts 的 deriveKeyRef），因此用户
 * 在 DSH 里配过 OpenAI / Groq / MiMo / 百炼的 LLM，ASR 直接复用同一把 key，一次都不用填。
 * 自定义供应商带一个可读 name，派生成 `ASR_VOICE_<NAME>_API_KEY`，不与其它插件撞名。
 * 引用名受网关校验：必须是 POSIX 环境变量形状 `^[A-Za-z_][A-Za-z0-9_]*$`
 * （packages/host/apiproxy/src/api/credentials.schema.ts），故非字母数字一律折叠成 `_`。
 */
import { CLOUD_PRESETS } from './presets.ts'

/** 可复用官方 LLM 凭据的预置 id 集合（其余一律按自定义处理）。 */
const PRESET_IDS = new Set(CLOUD_PRESETS.map((p) => p.id))

/** 任意标签 → 合法引用名片段（无可用字符时返回空串，由调用方决定退路）。 */
function slug(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

/** 一个参与引用派生的供应商身份（settings 行里不含任何密钥材料）。 */
export interface KeyRefSource {
  preset: string
  name: string
  id: string
}

/** 求某供应商的 API key 引用名。 @param p - 供应商身份（预置 id、显示名、行 id）。 @returns credentials 服务里的引用名。 */
export function keyRefFor(p: KeyRefSource): string {
  if (PRESET_IDS.has(p.preset)) return `${slug(p.preset)}_API_KEY`
  const fromName = slug(p.name)
  const label = fromName !== '' ? fromName : slug(p.id)
  return `ASR_VOICE_${label === '' ? 'CUSTOM' : label}_API_KEY`
}
