import { test } from 'node:test'
import assert from 'node:assert/strict'

// presets.ts 是 host/client 共享的纯常量表（顶层无副作用），按既有做法直接跑源码。
const {
  CLOUD_PRESETS, REALTIME_PRESETS, presetById, realtimePresetById,
  autoModeForModel, resolveAsrMode, DEFAULT_PRESET_ID, MAX_AUDIO_BYTES,
} = await import('../src/presets.ts')

test('预置表：id 唯一、都有 baseUrl/默认模型/hint', () => {
  const ids = new Set()
  for (const p of CLOUD_PRESETS) {
    assert.ok(!ids.has(p.id), `CLOUD_PRESETS id 重复: ${p.id}`)
    ids.add(p.id)
    assert.ok(p.baseUrl.startsWith('http'), `${p.id} baseUrl 应为 http(s)`)
    assert.ok(p.defaultModel !== '', `${p.id} defaultModel 不应为空`)
    assert.ok(p.hint !== '', `${p.id} hint 不应为空`)
  }
  assert.ok(CLOUD_PRESETS.some((p) => p.id === DEFAULT_PRESET_ID), '默认预置应存在于表中')
  const rids = new Set()
  for (const p of REALTIME_PRESETS) {
    assert.ok(!rids.has(p.id), `REALTIME_PRESETS id 重复: ${p.id}`)
    rids.add(p.id)
  }
})

test('presetById / realtimePresetById：命中返回预置，未命中返回 undefined', () => {
  assert.equal(presetById('openai')?.label, 'OpenAI Whisper')
  assert.equal(presetById('no-such-preset'), undefined)
  assert.equal(realtimePresetById('dashscope-realtime')?.defaultModel, 'qwen3-asr-flash-realtime')
  assert.equal(realtimePresetById('no-such'), undefined)
})

test('autoModeForModel：音频大模型走 chat，whisper 式走 transcriptions', () => {
  for (const chat of ['qwen3-asr-flash', 'MiMo-V2.5-ASR', 'FunAudioLLM/SenseVoiceSmall', 'parakeet-omni', 'nova-2-audio']) {
    assert.equal(autoModeForModel(chat), 'chat', `${chat} 应判 chat`)
  }
  for (const trans of ['whisper-1', 'whisper-large-v3', 'gpt-4o', 'some/random/model']) {
    assert.equal(autoModeForModel(trans), 'transcriptions', `${trans} 应判 transcriptions`)
  }
  // 词边界判定：裸词作为段的一部分才算，绝不误伤 tts-voiceclone 之类
  assert.equal(autoModeForModel('tts-voiceclone'), 'transcriptions')
  assert.equal(autoModeForModel('myvoice-model'), 'transcriptions')
})

test('resolveAsrMode：显式模式优先，auto 按模型名判定', () => {
  assert.equal(resolveAsrMode('chat', 'whisper-1'), 'chat')
  assert.equal(resolveAsrMode('transcriptions', 'qwen3-asr-flash'), 'transcriptions')
  assert.equal(resolveAsrMode('auto', 'qwen3-asr-flash'), 'chat')
  assert.equal(resolveAsrMode('auto', 'whisper-1'), 'transcriptions')
  assert.equal(resolveAsrMode('', 'whisper-1'), 'transcriptions')
})

test('MAX_AUDIO_BYTES 为合理上限（25 MiB）', () => {
  assert.equal(MAX_AUDIO_BYTES, 25 * 1024 * 1024)
})
