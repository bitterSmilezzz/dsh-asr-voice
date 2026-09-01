/**
 * dsh-asr-voice — client 半区入口（单 fiber）。
 *
 * 组合：设置卡片（settings.plugin.item）、录音按钮（conversation.input.right）、
 * 快捷键（可选按住说话）。配置由 host settings 服务持有（config.ts）。
 *
 * 独立性契约：入口 id / locale namespace / CSS data 标签 / 路由全部唯一，
 * 只依赖官方 @deepseek-ai/* 服务，不 import 任何第三方插件。
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the ui-renderer Context merge (ctx.slots), moved here in dsh-settings alpha.2.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings slot merges (settings.general.item / settings.plugins.tab).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { zh, en } from './locales.ts'
import { CSS } from './styles.ts'
import {
  adaptLegacyCredentials, bindConfigScope, bindCredentialsApi, config, subscribeConfig,
  type CredentialsApiLike, type LegacyCredentialsApiLike,
} from './config.ts'
import { VoiceSettingsCard } from './settings-card.tsx'
import { VoiceButton, voiceController } from './voice-button.tsx'
import { VoiceChatButton, voiceChatController } from './voice-chat-button.tsx'
import { matchHotkey, parseHotkey, type HotkeySpec } from './hotkey.ts'

export { zh, en }

const NS = 'asr-voice'

/** 硬依赖：设置卡/配置读写必须的顶层服务（与兄弟插件同款：settingsScope 必须硬依赖，
 * 否则卡片包在 scoped inject 里会因某服务不可注入而永不注册——这正是此前设置卡消失的根因）。 */
export const inject = [
  'slots',
  'locale',
  'settingsScope',
]

/** 快捷键处理（按住说话 / 点击切换 / 实时对话进出），随 fiber 生命周期注册。 */
function applyHotkey(): () => void {
  let held = false
  // -------- 快捷键规格缓存：keydown 是高频路径，只有 hotkey 字符串变化才重解析 --------
  let cachedHotkey = ''
  let cachedSpec: HotkeySpec | null = null
  const hotkeySpec = (): HotkeySpec | null => {
    const hk = config.behavior.hotkey
    if (hk !== cachedHotkey) {
      cachedHotkey = hk
      cachedSpec = parseHotkey(hk)
    }
    return cachedSpec
  }
  let cachedChatHotkey = ''
  let cachedChatSpec: HotkeySpec | null = null
  /** 对话快捷键（realtime.hotkey）：关掉总开关即失效，两个键撞在一起时对话优先。 */
  const chatHotkeySpec = (): HotkeySpec | null => {
    if (!config.realtime.enabled) return null
    const hk = config.realtime.hotkey
    if (hk !== cachedChatHotkey) {
      cachedChatHotkey = hk
      cachedChatSpec = parseHotkey(hk)
    }
    return cachedChatSpec
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    const chatSpec = chatHotkeySpec()
    if (chatSpec !== null && matchHotkey(e, chatSpec)) {
      e.preventDefault()
      e.stopPropagation()
      voiceChatController.toggle()
      return
    }
    const spec = hotkeySpec()
    if (spec === null) return
    if (!matchHotkey(e, spec)) return
    e.preventDefault()
    e.stopPropagation()
    if (config.behavior.holdToTalk) {
      // busy（识别/优化中）：按一次 = 打断，不进入 held（避免松键误触发新录音）。
      if (voiceController.isBusy()) {
        voiceController.toggle()
        return
      }
      if (!held && !voiceController.isRecording()) {
        held = true
        voiceController.toggle()
      }
    } else if (!voiceController.isRecording()) {
      voiceController.toggle()
    }
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    if (!held) return
    const spec = hotkeySpec()
    if (spec === null || !matchHotkey(e, spec)) return
    held = false
    if (config.behavior.holdToTalk) voiceController.toggle()
  }
  const off = subscribeConfig(() => {
    // 快捷键变更即时生效：无额外动作，监听器每次按键实时解析 config
  })
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('keyup', onKeyUp, true)
  return () => {
    off()
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
  }
}

export function apply(ctx: ClientContext): void {
  // 词典注册。
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'asr-voice: dictionaries')
  // 样式注入（单 <style data-plugin="dsh-asr-voice"> 标签）。
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-asr-voice'
    tag.dataset.pluginCss = 'dsh-asr-voice'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'asr-voice: styles')

  const t = ctx.locale.bind(NS)

  // 录音按钮（conversation.input.right 工具行，输入区 right 端）。
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name: 'conversation.input.right',
    id: 'dsh-asr-voice-button',
    order: 10,
    locale: NS,
    inject: (sessionId: string) => ({ sessionId, t }),
  }, (props) => jsxRuntime.jsx(VoiceButton, props)))

  /** 打断当前回合：InputActions 只有 5 个成员、不含 cancel，取消只能走会话作用域的 conversation 服务。 */
  let cancelTurn: (sessionId: string) => void = () => {}
  ctx.inject(['sessions'], (raw) => {
    const sessions = (raw as { sessions?: {
      scope(id: string): { get(name: string): unknown } | undefined
    } }).sessions
    cancelTurn = (sessionId: string): void => {
      try {
        const scoped = sessions?.scope(sessionId)
        const conversation = scoped?.get('conversation') as { cancel?(): Promise<void> } | undefined
        void conversation?.cancel?.()?.catch?.(() => { /* 取消失败会体现在快照里 */ })
      } catch { /* 无会话作用域：打断退化成「止住播报 + 继续听」 */ }
    }
  })

  // 语音对话按钮：同一座位的第二个 entry，随 realtime.enabled 出现/消失。
  // inject 的工厂在声明已存在时同步执行，返回幂等 disposer——正好用来做「开关一拨就
  // 注册/注销」，而不是等到下次冷启动才生效。
  ctx.effect(() => {
    let off: (() => void) | undefined
    const sync = (): void => {
      const want = config.realtime.enabled
      if (want && off === undefined) {
        off = ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
          name: 'conversation.input.right',
          id: 'dsh-asr-voice-realtime-button',
          order: 11,
          locale: NS,
          inject: (sessionId: string) => ({ sessionId, t, cancelTurn }),
        }, (props) => jsxRuntime.jsx(VoiceChatButton, props)))
      } else if (!want && off !== undefined) {
        const dispose = off
        off = undefined
        dispose()
      }
    }
    sync()
    const unsub = subscribeConfig(sync)
    return () => {
      unsub()
      off?.()
    }
  }, 'asr-voice: realtime button')

  // 快捷键（默认 Ctrl+Shift+Space；可选按住说话）。
  ctx.effect(applyHotkey, 'asr-voice: hotkey')

  // 设置卡片（settings.plugin.item, key: asr-voice）+ 配置绑定。
  // settingsScope 已是顶层硬依赖，卡片直接在 apply 顶层注册（与兄弟插件同款）——
  // 绝不能把卡片包进 ctx.inject([...])：任一服务不可注入则回调永不执行、卡片永不出现
  // （此前把凭据服务的 connection 放进 scoped inject，设置卡就消失过）。
  ctx.effect(() => bindConfigScope(ctx.settingsScope), 'asr-voice: settings scope sync')
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: 'asr-voice',
    locale: NS,
  }, () => jsxRuntime.jsx(VoiceSettingsCard, { t })))

  // 凭据绑定（可选服务，单独 scoped inject）：alpha.3 起凭据域在 `remote.credentials`，
  // 旧运行时经 `connection.api.credentials` 回退，由适配器归一化。这个回调只负责绑定
  // 凭据，任一服务缺席就永远不执行——但不影响上面卡片的注册。
  ctx.inject(['settingsScope', 'connection', 'remote', 'remote.credentials'], (raw) => {
    const c = raw as ClientContext & {
      connection?: { api?: { credentials?: LegacyCredentialsApiLike } }
      remote?: { credentials?: CredentialsApiLike }
    }
    bindCredentialsApi(c.remote?.credentials ?? adaptLegacyCredentials(c.connection?.api?.credentials))
  })
}

export const name = 'dsh-asr-voice'
