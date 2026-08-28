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
// Type-only: pulls the settings slot merges (settings.general.item / settings.plugins.tab).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { zh, en } from './locales.ts'
import { CSS } from './styles.ts'
import { bindConfigScope, config, subscribeConfig, type SettingsBinderLike } from './config.ts'
import { VoiceSettingsCard } from './settings-card.tsx'
import { VoiceButton, voiceController } from './voice-button.tsx'
import { matchHotkey, parseHotkey } from './hotkey.ts'

export { zh, en }

const NS = 'asr-voice'

/** 只依赖实际存在的硬服务；settingsScope 走 scoped inject（可选）。 */
export const inject = [
  'slots',
  'locale',
]

/** 快捷键处理（按住说话 / 点击切换），随 fiber 生命周期注册。 */
function applyHotkey(): () => void {
  let held = false
  const onKeyDown = (e: KeyboardEvent): void => {
    const spec = parseHotkey(config.behavior.hotkey)
    if (spec === null) return
    if (!matchHotkey(e, spec)) return
    e.preventDefault()
    e.stopPropagation()
    if (config.behavior.holdToTalk) {
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
    const spec = parseHotkey(config.behavior.hotkey)
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

  // 快捷键（默认 Ctrl+Shift+Space；可选按住说话）。
  ctx.effect(applyHotkey, 'asr-voice: hotkey')

  // 设置卡片（settings.plugin.item, key: asr-voice）+ 配置绑定。
  // settingsScope 为可选服务：用 scoped inject 拿到 binder，未挂载则只跳过卡片。
  ctx.inject(['settingsScope'], (raw) => {
    const c = raw as ClientContext & { settingsScope?: SettingsBinderLike }
    const binder = c.settingsScope
    if (binder === undefined) return
    c.effect(() => bindConfigScope(binder), 'asr-voice: settings scope sync')
    c.slots.inject('settings.plugin.item', () => c.slots.register({
      name: 'settings.plugin.item',
      key: 'asr-voice',
      locale: NS,
    }, () => jsxRuntime.jsx(VoiceSettingsCard, { t })))
  })
}

export const name = 'dsh-asr-voice'
