// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Small shared UI helpers used across views.
import type { Ctx } from './main';
import { AGES, type Age } from './data';
import { ageLabel, fmtPct } from './format';
import { covColor, covText, BANDS, SUPPRESSED_COLOR, HERD_IMMUNITY } from './scale';

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function viewHead(title: string, sub: string): string {
  return `<div class="view-head"><h1 class="view-title">${title}</h1><p class="view-sub">${sub}</p></div>`;
}

/** Segmented age control. Wires clicks to ctx.setAge (which re-renders). */
export function ageControl(ctx: Ctx, opts: { label?: string } = {}): string {
  const lbl = opts.label ?? 'Milestone';
  const segs = AGES.map(
    (a) => `<button class="seg age-seg ${a === ctx.age ? 'active' : ''}" data-age="${a}">${ageLabel(a)}</button>`
  ).join('');
  return `<span class="control-label">${lbl}</span><div class="control-group">${segs}</div>`;
}

/** Call after render to activate age-seg buttons within `scope`. */
export function wireAge(ctx: Ctx, scope: HTMLElement): void {
  scope.querySelectorAll<HTMLButtonElement>('.age-seg').forEach((b) => {
    b.addEventListener('click', () => ctx.setAge(b.dataset.age as Age));
  });
}

export function pill(v: number | null | undefined): string {
  const label = fmtPct(v, 1);
  if (v === null || v === undefined || Number.isNaN(v)) {
    return `<span class="pill" style="background:${SUPPRESSED_COLOR};color:#475569" data-tip="Suppressed — fewer than 25 children counted">n/p</span>`;
  }
  return `<span class="pill" style="background:${covColor(v)};color:${covText(v)}">${label}</span>`;
}

/** The coverage colour legend, reused on map/leaderboard/etc. */
export function coverageLegend(includeSuppressed = true): string {
  const items = BANDS.map(
    (b) => `<span class="legend-item"><span class="legend-swatch" style="background:${b.color}"></span>${b.label}</span>`
  ).join('');
  const supp = includeSuppressed
    ? `<span class="legend-item"><span class="legend-swatch" style="background:${SUPPRESSED_COLOR}"></span>suppressed</span>`
    : '';
  return `<div class="legend">${items}${supp}</div>`;
}

export const HERD = HERD_IMMUNITY;
