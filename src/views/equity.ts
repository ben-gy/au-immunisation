// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Ctx } from '../main';
import { phnGaps, type Age, mean } from '../data';
import { fmtPct } from '../format';
import { covColor } from '../scale';
import { ageControl, wireAge, viewHead, escapeHtml } from '../ui';
import { gl } from '../glossary';

const FLOOR = 75;
const barW = (v: number) => Math.max(2, Math.min(100, ((v - FLOOR) / (100 - FLOOR)) * 100));

export function renderEquity(ctx: Ctx): void {
  const { root, ds } = ctx;
  const age = ctx.age as Age;
  const gaps = phnGaps(ds.phn, age);
  const natAll = mean(gaps.map((g) => g.all));
  const natFn = mean(gaps.map((g) => g.fn));
  const avgGap = natAll !== null && natFn !== null ? natAll - natFn : null;

  const gapChip = (g: number) => {
    const col = g >= 5 ? 'var(--bad)' : g >= 2 ? 'var(--warn)' : g <= -1 ? 'var(--good)' : 'var(--text-tertiary)';
    const bg = g >= 5 ? '#fde2e2' : g >= 2 ? '#fdeccf' : g <= -1 ? '#d8f0df' : 'var(--bg-active)';
    return `<span class="gap-chip" style="color:${col};background:${bg}">${g > 0 ? '−' : g < 0 ? '+' : ''}${Math.abs(g).toFixed(1)} pts</span>`;
  };

  root.innerHTML =
    viewHead(
      'The First Nations gap',
      `Coverage for ${gl('first nations', 'Aboriginal & Torres Strait Islander children')} compared with all children, by ${gl('phn', 'Primary Health Network')}, sorted by the widest gap. Closing this gap is a Closing the Gap target. Bars are scaled from 75%.`
    ) +
    `<div class="controls">${ageControl(ctx)}</div>
     <div class="stat-row">
       <div class="stat"><div class="stat-val">${fmtPct(natAll, 1)}</div><div class="stat-label">All children — average across PHNs</div></div>
       <div class="stat ${avgGap && avgGap > 3 ? 'warn' : ''}"><div class="stat-val">${fmtPct(natFn, 1)}</div><div class="stat-label">First Nations children — average</div></div>
       <div class="stat ${avgGap && avgGap > 3 ? 'bad' : 'good'}"><div class="stat-val">${avgGap === null ? '—' : (avgGap >= 0 ? '−' : '+') + Math.abs(avgGap).toFixed(1)}</div><div class="stat-label">Average gap (points)</div></div>
     </div>
     <div class="panel">
       <div style="padding:var(--sp-md) var(--sp-lg);border-bottom:1px solid var(--border-default);font-size:var(--fs-sm);color:var(--text-secondary);display:flex;justify-content:space-between">
         <span>${gaps.length} Primary Health Networks · ${age}-year milestone</span><span>gap = all − First Nations</span>
       </div>
       <div id="eqList"></div>
     </div>
     <p class="note">A positive gap (red) means First Nations children are less covered than children overall in that PHN. Negative (green) means higher. First Nations rates are less certain in areas with few children.</p>`;
  wireAge(ctx, root);

  const listEl = root.querySelector<HTMLElement>('#eqList')!;
  if (!gaps.length) { listEl.innerHTML = `<div class="empty">No First Nations data available for this milestone.</div>`; return; }
  listEl.innerHTML = gaps.map((g) => `
    <div class="eq-row" data-tip="${escapeHtml(g.name)} — all ${fmtPct(g.all)}, First Nations ${fmtPct(g.fn)}, gap ${g.gap.toFixed(1)} pts">
      <div class="eq-name"><div class="n">${escapeHtml(g.name)}</div>${gapChip(g.gap)}</div>
      <div class="eq-bars">
        <div class="eq-bar"><span class="lab">All children</span><span class="trk"><span style="width:${barW(g.all)}%;background:${covColor(g.all)}"></span></span><span class="v">${fmtPct(g.all)}</span></div>
        <div class="eq-bar"><span class="lab">First Nations</span><span class="trk"><span style="width:${barW(g.fn)}%;background:${covColor(g.fn)}"></span></span><span class="v">${fmtPct(g.fn)}</span></div>
      </div>
      <div class="eq-gap"></div>
    </div>`).join('');
  // The eq-gap column is intentionally empty on wide layout (chip lives in name col);
  // keep grid balance. Rows are not individually navigable (PHN, not SA3).
}
