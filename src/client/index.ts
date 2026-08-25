/**
 * dsh-asr-voice — client 半区入口（单 fiber）。
 *
 * 组合：设置卡片（settings.plugin.item）、录音按钮（conversation.input.right）、
 * 快捷键（可选按住说话）。配置由 host settings 服务持有（config.ts）。
 *
 * 独立性契约：入口 id / locale namespace / CSS data 标签 / 路由全部唯一，
 * 只依赖官方 @deepseek-ai/* 服务，不 import 任何第三方插件。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the settings slot merges (settings.general.item / settings.plugins.tab).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ui-settings-plugins SlotMap merge (the settings.plugin.item card seat).
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { zh, en } from './locales.ts'
import { CSS } from './styles.ts'
import { bindConfigScope, config, subscribeConfig } from './config.ts'
import { VoiceSettingsCard } from './settings-card.tsx'
import { registerVoiceButton, voiceController } from './voice-button.tsx'
import { matchHotkey, parseHotkey } from './hotkey.ts'

export { zh, en }

const NS = 'asr-voice'

export const inject = [
  'slots',
  'locale',
  'remote',
  'sessions',
  'conversation',
  'inputTriggers',
  'settingsScope',
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
  // 配置权威源是 host settings 服务。
  ctx.effect(() => bindConfigScope(ctx), 'asr-voice: settings scope sync')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'asr-voice: dictionaries')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-asr-voice'
    tag.dataset.pluginCss = 'dsh-asr-voice'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'asr-voice: styles')

  const t = ctx.locale.bind(NS)

  // 设置卡片（settings.plugin.item, key: asr-voice）。
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: 'asr-voice',
    locale: NS,
  }, () => jsxRuntime.jsx(VoiceSettingsCard, { t })))

  // 录音按钮（conversation.input.right 工具行）。
  registerVoiceButton(ctx, t)

  // 快捷键（默认 Ctrl+Shift+Space；可选按住说话）。
  ctx.effect(applyHotkey, 'asr-voice: hotkey')
}

export const name = 'dsh-asr-voice'
