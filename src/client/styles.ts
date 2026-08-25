/**
 * dsh-asr-voice — client 样式。
 *
 * 全部用 DSH 主题 CSS 变量（--dsw-*），随明暗主题自适应；data 标签
 * `dsh-asr-voice` 唯一，避免与其它插件样式冲突（独立性契约）。
 * GSAP 驱动的波纹/过渡由 animate.ts 写内联 transform/opacity，本表只提供
 * 基础布局、主题变量与降级关键帧。
 */

export const CSS = `
[dsh-asr-voice] {
  --dshav-accent: var(--dsw-alias-state-business-primary, #4f8cff);
  --dshav-accent-soft: color-mix(in srgb, var(--dshav-accent) 18%, transparent);
  --dshav-danger: var(--dsw-alias-state-error-primary, #e5484d);
  --dshav-bg: var(--dsw-alias-bg-base, #ffffff);
  --dshav-bg-layer: var(--dsw-alias-bg-layer-1, #f7f7f8);
  --dshav-border: var(--dsw-alias-border-l1, #e6e6e9);
  --dshav-text: var(--dsw-alias-label-primary, #1f1f23);
  --dshav-text-2: var(--dsw-alias-label-secondary, #5c5c66);
  --dshav-text-3: var(--dsw-alias-label-caption, #8b8b95);
}

/* ── 录音按钮（conversation.input.right） ─────────────────────────── */
.dshav-mic-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dshav-mic-button {
  position: relative;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--dshav-text-2);
  cursor: pointer;
  padding: 0;
  transition: color .18s ease, background .18s ease;
}
.dshav-mic-button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05));
  color: var(--dshav-text);
}
.dshav-mic-button[data-state='recording'] {
  color: var(--dshav-danger);
  background: color-mix(in srgb, var(--dshav-danger) 12%, transparent);
}
.dshav-mic-button[data-state='transcribing'] {
  color: var(--dshav-accent);
}
.dshav-mic-button:disabled {
  opacity: .45;
  cursor: default;
}
.dshav-mic-button svg {
  width: 15px;
  height: 15px;
  display: block;
}

/* 录音波纹：三个同心圆，GSAP 驱动 scale/opacity（此处放降级静态环）。 */
.dshav-wave {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  pointer-events: none;
}
.dshav-wave-ring {
  position: absolute;
  inset: -2px;
  border-radius: 11px;
  border: 2px solid var(--dshav-danger);
  opacity: 0;
}
.dshav-wave-ring[data-ring='1'] { inset: -2px; }
.dshav-wave-ring[data-ring='2'] { inset: -6px; }
.dshav-wave-ring[data-ring='3'] { inset: -10px; }

/* 快捷键录制时的呼吸提示。 */
.dshav-hotkey-hint {
  position: absolute;
  right: 34px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--dshav-border);
  border-radius: 10px;
  background: var(--dshav-bg-layer);
  color: var(--dshav-text-2);
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: var(--dsw-shadow-lv3, 0 4px 16px rgba(0,0,0,.12));
}
.dshav-hotkey-hint .dshav-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dshav-danger);
  animation: dshav-blink 1.1s ease-in-out infinite;
}

/* ── 预览卡（LLM 优化：原始 → 优化） ──────────────────────────────── */
.dshav-preview {
  position: fixed;
  left: 50%;
  bottom: 92px;
  transform: translateX(-50%);
  z-index: 1200;
  width: min(560px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 14px 14px 12px;
  border: 1px solid var(--dshav-border);
  border-radius: 14px;
  background: var(--dshav-bg);
  box-shadow: var(--dsw-shadow-lv3, 0 8px 28px rgba(0,0,0,.16));
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dshav-preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dshav-text);
}
.dshav-preview-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dshav-preview-label {
  font-size: 11px;
  color: var(--dshav-text-3);
  letter-spacing: .02em;
}
.dshav-preview-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dshav-text);
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.dshav-preview-text[data-role='original'] { color: var(--dshav-text-2); text-decoration: line-through; text-decoration-color: color-mix(in srgb, var(--dshav-text-3) 45%, transparent); }
.dshav-preview-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.dshav-button {
  border: 0;
  border-radius: 8px;
  padding: 6px 12px;
  font: inherit;
  font-size: 12.5px;
  line-height: 1.4;
  cursor: pointer;
  transition: filter .15s ease, transform .15s ease;
}
.dshav-button:active { transform: scale(.97); }
.dshav-button-ghost {
  background: transparent;
  color: var(--dshav-text-2);
  border: 1px solid var(--dshav-border);
}
.dshav-button-ghost:hover { background: var(--dshav-bg-layer); }
.dshav-button-primary {
  background: var(--dshav-accent);
  color: #fff;
}
.dshav-button-primary:hover { filter: brightness(1.06); }

/* ── 设置卡片 ─────────────────────────────────────────────────────── */
.dshav-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  color: var(--dshav-text);
}
.dshav-head { display: flex; flex-direction: column; gap: 5px; }
.dshav-title { font-size: 17px; line-height: 24px; font-weight: 600; }
.dshav-copy { max-width: 640px; color: var(--dshav-text-2); font-size: 13px; line-height: 20px; }
.dshav-group { display: flex; flex-direction: column; gap: 12px; }
.dshav-groupTitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--dshav-text-3);
  text-transform: uppercase;
  letter-spacing: .05em;
  margin: 2px 0 -4px;
}
.dshav-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.dshav-rowText { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.dshav-rowTitle { font-size: 13.5px; line-height: 20px; font-weight: 500; }
.dshav-rowDesc { margin: 0; font-size: 12px; line-height: 18px; color: var(--dshav-text-3); }
.dshav-field { display: flex; align-items: center; gap: 8px; flex: none; }
.dshav-field select,
.dshav-field input[type='text'] {
  box-sizing: border-box;
  height: 30px;
  border: 1px solid var(--dshav-border);
  border-radius: 8px;
  background: var(--dshav-bg-layer);
  color: var(--dshav-text);
  font: inherit;
  font-size: 12.5px;
  padding: 0 8px;
}
.dshav-field select { min-width: 180px; cursor: pointer; }
.dshav-field input[type='text'] { width: 240px; }
.dshav-field input[type='text'].dshav-wide { width: 320px; }
.dshav-stack { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.dshav-stack .dshav-row { align-items: center; }
.dshav-status { font-size: 12px; color: var(--dshav-text-2); min-height: 16px; }
.dshav-status[data-kind='err'] { color: var(--dshav-danger); }
.dshav-status[data-kind='ok'] { color: var(--dshav-accent); }
.dshav-card-actions { display: flex; justify-content: flex-end; }

@keyframes dshav-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .25; }
}
@media (prefers-reduced-motion: reduce) {
  .dshav-hotkey-hint .dshav-dot { animation: none; }
}
`
