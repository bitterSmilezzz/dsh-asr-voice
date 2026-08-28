/**
 * dsh-asr-voice — client 样式。
 *
 * 全部用 DSH 主题 CSS 变量（--dsw-*），随明暗主题自适应；data 标签
 * `dsh-asr-voice` 唯一，避免与其它插件样式冲突（独立性契约）。
 * GSAP 驱动的波纹/过渡由 animate.ts 写内联 transform/opacity，本表只提供
 * 基础布局、主题变量与降级关键帧。
 */

export const CSS = `
/* 主题变量挂 :root（页面没有 [dsh-asr-voice] 属性的容器元素——那是 <style> 标签的
   data 属性，不作用于渲染树；挂错选择器会让 --dshav-* 全部未定义 → 背景透明）。
   --dshav-* 前缀唯一，挂全局不影响其它插件（独立性契约）。 */
:root {
  --dshav-accent: var(--dsw-alias-state-business-primary, #4f8cff);
  --dshav-accent-soft: color-mix(in srgb, var(--dshav-accent) 18%, transparent);
  --dshav-danger: var(--dsw-alias-state-error-primary, #e5484d);
  --dshav-bg: var(--dsw-alias-bg-base, #ffffff);
  --dshav-bg-layer: var(--dsw-alias-bg-layer-1, #f7f7f8);
  --dshav-border: var(--dsw-alias-border-l1, #e6e6e9);
  --dshav-text: var(--dsw-alias-label-primary, #1f1f23);
  --dshav-text-2: var(--dsw-alias-label-secondary, #5c5c66);
  --dshav-text-3: var(--dsw-alias-label-caption, #8b8b95);
  /* Motion tokens（microanimations 规范：进入缓、退出快，非对称） */
  --dshav-ease-enter: cubic-bezier(.2, 0, 0, 1);
  --dshav-ease-exit: cubic-bezier(.3, 0, .8, .15);
  --dshav-ease-bounce: cubic-bezier(.34, 1.56, .64, 1);
  --dshav-dur-enter: 250ms;
  --dshav-dur-exit: 180ms;
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
  transition: color .18s ease, background .18s ease, transform .14s var(--dshav-ease-bounce, cubic-bezier(.34,1.56,.64,1));
}
.dshav-mic-button:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05));
  color: var(--dshav-text);
}
.dshav-mic-button:hover svg { transform: scale(1.1); }
.dshav-mic-button:active { transform: scale(.9); }
.dshav-mic-button svg {
  width: 15px;
  height: 15px;
  display: block;
  transition: transform .2s ease;
}
.dshav-mic-button[data-state='recording'] {
  color: var(--dshav-danger);
  background: color-mix(in srgb, var(--dshav-danger) 12%, transparent);
}
.dshav-mic-button[data-state='recording'] .dshav-rec-dot {
  animation: dshav-blink 1.1s ease-in-out infinite;
}
.dshav-mic-button[data-state='transcribing'],
.dshav-mic-button[data-state='optimizing'] {
  color: var(--dshav-accent);
}
.dshav-mic-button:disabled {
  opacity: .45;
  cursor: default;
}

/* 录音实心点（呼吸）。 */
.dshav-rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
  display: block;
}

/* 录音波纹：多层呼吸光环，GSAP 驱动 scale/opacity（此处放降级静态环）。 */
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
  box-shadow: 0 0 12px 0 color-mix(in srgb, var(--dshav-danger) 45%, transparent);
  /* 录音中持续缩放动画：提升为合成层，避免每帧重绘（transform 走 GPU）。 */
  will-change: transform, opacity;
}
.dshav-wave-ring[data-ring='1'] { inset: -2px; }
.dshav-wave-ring[data-ring='2'] { inset: -6px; }
.dshav-wave-ring[data-ring='3'] { inset: -10px; }

/* 状态提示条：从按钮右侧滑入 + 呼吸点 + 频谱条。 */
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
  max-width: min(420px, calc(100vw - 120px));
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2, var(--dshav-border));
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-3, var(--dshav-bg-layer));
  color: var(--dsw-alias-label-secondary, var(--dshav-text-2));
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  box-shadow: var(--dsw-shadow-lv3, 0 4px 16px rgba(0,0,0,.12));
  animation: dshav-hint-in .22s var(--dshav-ease-exit, cubic-bezier(.3,0,.8,.15));
}
.dshav-hotkey-hint[data-kind='err'] {
  color: var(--dshav-danger);
  /* 错误信息允许换行：诊断详情（设备/浏览器）不能被 nowrap 截断 */
  white-space: normal;
  line-height: 1.35;
  max-width: min(480px, calc(100vw - 120px));
}
.dshav-hotkey-hint[data-kind='err'] .dshav-hint-dismiss { align-self: flex-start; }
.dshav-hint-dismiss {
  flex: none;
  margin-left: 2px;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1;
  opacity: .55;
  cursor: pointer;
  border-radius: 4px;
}
.dshav-hint-dismiss:hover { opacity: 1; background: var(--dsw-alias-fill-2, rgba(128,128,128,.18)); }
.dshav-hotkey-hint .dshav-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dshav-danger);
  animation: dshav-blink 1.1s ease-in-out infinite;
}
.dshav-hint-text {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 频谱条：CSS 变量 --level（0~1）驱动柱高；每柱 --bar 系数错落。 */
.dshav-spectrum {
  --level: .2;
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 16px;
  padding: 1px 0;
}
.dshav-bar {
  width: 3px;
  border-radius: 2px;
  background: var(--dshav-danger);
  height: calc(var(--level) * 16px * var(--bar));
  opacity: .85;
  transition: height 60ms linear;
}

/* 转圈（transcribing / optimizing）。 */
.dshav-spinner {
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--dshav-accent) 25%, transparent);
  border-top-color: var(--dshav-accent);
  animation: dshav-spin .7s linear infinite;
}

/* ── 预览卡（LLM 优化：原始 → 优化） ──────────────────────────────── */
.dshav-preview {
  position: fixed;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  z-index: 1200;
  width: min(460px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 12px 12px 10px;
  border: 1px solid var(--dshav-border);
  border-radius: 14px;
  background: var(--dshav-bg);
  box-shadow: var(--dsw-shadow-lv3, 0 10px 32px rgba(0,0,0,.18));
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: dshav-preview-in .22s var(--dshav-ease-enter, ease-out);
}
.dshav-preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dshav-text);
}
/* 标题麦克风固定小尺寸（SVG 无 width/height 默认渲染 300px，必须显式约束） */
.dshav-preview-title svg {
  width: 15px;
  height: 15px;
  color: var(--dshav-accent);
  display: block;
}
.dshav-preview-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dshav-preview-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--dshav-bg-layer);
  border: 1px solid var(--dshav-border);
}
/* 优化后区块轻微强调，突出「要用的结果」 */
.dshav-preview-block[data-role='optimized'] {
  background: color-mix(in srgb, var(--dshav-accent) 6%, var(--dshav-bg-layer));
  border-color: color-mix(in srgb, var(--dshav-accent) 22%, var(--dshav-border));
}
.dshav-preview-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--dshav-text-3);
  letter-spacing: .03em;
}
.dshav-preview-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--dshav-text);
  max-height: 96px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
/* 原始：次级色即可，不用删除线（划线=删除感，反而看不清） */
.dshav-preview-text[data-role='original'] { color: var(--dshav-text-2); }
/* 优化后：主色加粗突出 */
.dshav-preview-text[data-role='optimized'] { color: var(--dshav-text); font-weight: 500; }
.dshav-preview-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.dshav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  line-height: 22px;
  height: 36px;
  padding: 0 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  transition: background .15s ease, color .15s ease;
}
.dshav-button:disabled { cursor: not-allowed; opacity: .4; }
.dshav-button-sm {
  height: 28px;
  font-size: 12px;
  line-height: 18px;
  padding: 0 10px;
  border-radius: 14px;
}
.dshav-button-primary {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}
.dshav-button-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }
.dshav-button-outline {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
}
.dshav-button-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshav-button-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshav-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}

/* ── 设置卡片（对齐官方 PluginCard：折叠 + hover/cardOpen/focus） ── */
.dshav-card {
  box-sizing: border-box;
  list-style: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  transition: border-color .16s, background .16s;
}
.dshav-card:hover { border-color: var(--dsw-alias-label-dimmed); }
.dshav-card.dshav-card-open {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.dshav-header {
  width: 100%;
  appearance: none;
  border: 0;
  background: none;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
}
.dshav-header:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
.dshav-headtext {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dshav-name { font-size: 15px; font-weight: 600; line-height: 1.4; color: var(--dsw-alias-label-primary); }
.dshav-desc { margin: 0; font-size: 13px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dshav-chevron {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  transition: transform .16s;
}
.dshav-chevron.dshav-open { transform: rotate(180deg); }
.dshav-body {
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 0 16px;
  padding-bottom: 8px;
}
.dshav-group { display: flex; flex-direction: column; }
/* 分组之间用与字段一致的分割线（官方 border-l2）。 */
.dshav-group + .dshav-group { border-top: 1px solid var(--dsw-alias-border-l2); }
.dshav-groupTitle {
  margin: 14px 0 2px;
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
/* 字段：垂直布局（label / control / hint），字段间 border-top —— 对齐官方 fields */
.dshav-field-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
}
.dshav-field-item + .dshav-field-item { border-top: 1px solid var(--dsw-alias-border-l2); }
.dshav-field-head { display: flex; align-items: center; gap: 8px; }
.dshav-field-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}
.dshav-field-control { display: flex; width: 100%; min-width: 0; }
.dshav-field-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }
.dshav-stack { display: flex; flex-direction: column; }
.dshav-field { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
/* checkbox 行：checkbox 与文本同行左对齐（官方 ModelListEditor 排布） */
.dshav-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dshav-toggle input[type='checkbox'] {
  flex: none;
  width: 16px;
  height: 16px;
  accent-color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
/* ── 原生控件：跟随 DSH 主题（--dsw-alias-*），与官方设置页一致 ── */
.dshav-field select,
.dshav-field input[type='text'],
.dshav-field input[type='password'] {
  box-sizing: border-box;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-3);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}
.dshav-field select:focus-visible,
.dshav-field input:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}
.dshav-field input::placeholder { color: var(--dsw-alias-label-dimmed); }
.dshav-field input:disabled,
.dshav-field select:disabled { opacity: .6; cursor: default; }
/* select：原生外观 + 主题 chevron（与官方 selectInput 一致） */
.dshav-field select {
  appearance: none;
  max-width: 240px;
  min-width: 180px;
  padding-right: 32px;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px 12px;
}
.dshav-field input[type='text'],
.dshav-field input[type='password'] { flex: 1; min-width: 0; width: auto; }
.dshav-status { font-size: 12px; color: var(--dshav-text-2); min-height: 16px; }
.dshav-status[data-kind='err'] { color: var(--dshav-danger); }
.dshav-status[data-kind='ok'] { color: var(--dshav-accent); }

@keyframes dshav-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .25; }
}
@keyframes dshav-hint-in {
  from { opacity: 0; transform: translate(8px, -50%); }
  to { opacity: 1; transform: translate(0, -50%); }
}
@keyframes dshav-spin {
  to { transform: rotate(360deg); }
}
@keyframes dshav-preview-in {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .dshav-mic-button,
  .dshav-mic-button svg,
  .dshav-mic-button .dshav-rec-dot,
  .dshav-hotkey-hint .dshav-dot,
  .dshav-spinner { animation: none !important; transition: none !important; }
  .dshav-hotkey-hint { animation: none !important; }
}
`
