// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Ctx } from '../main';
import { withData, STATE_ORDER, STATE_NAMES, type SA3, type Age } from '../data';
import { fmtPct } from '../format';
import { covColor, covInk, HERD_IMMUNITY } from '../scale';
import { ageControl, wireAge, escapeHtml, viewHead, coverageLegend } from '../ui';

type Dir = 'low' | 'high';
const FLOOR = 80; // bar scale floor

export function renderLeaderboard(ctx: Ctx): void {
  const { root, ds } = ctx;
  let dir: Dir = (localStorage.getItem('imm.lbDir') as Dir) || 'low';
  let state = localStorage.getItem('imm.lbState') || 'ALL';

  root.innerHTML =
    viewHead(
      'Priority leaderboard',
      'Every region ranked by coverage. “Needs attention” surfaces the areas furthest below the 95% herd-immunity line — where a measles or whooping-cough outbreak would spread fastest.'
    ) +
    `<div class="controls">
       ${ageControl(ctx)}
       <span class="control-label" style="margin-left:var(--sp-md)">Order</span>
       <div class="control-group">
         <button class="seg dir-seg ${dir === 'low' ? 'active' : ''}" data-dir="low">Needs attention</button>
         <button class="seg dir-seg ${dir === 'high' ? 'active' : ''}" data-dir="high">Best covered</button>
       </div>
       <span class="control-label" style="margin-left:var(--sp-md)">State</span>
       <select id="lbState">
         <option value="ALL">All states</option>
         ${STATE_ORDER.map((s) => `<option value="${s}" ${s === state ? 'selected' : ''}>${STATE_NAMES[s]}</option>`).join('')}
       </select>
     </div>
     <div class="panel panel-pad" style="margin-bottom:var(--sp-lg)">${coverageLegend(false)}</div>
     <div id="lbList" class="rank-list"></div>`;
  wireAge(ctx, root);

  const listEl = root.querySelector<HTMLElement>('#lbList')!;
  const draw = () => {
    const age = ctx.age as Age;
    let rows = withData(ds.sa3, age).slice();
    if (state !== 'ALL') rows = rows.filter((r) => r.state === state);
    rows.sort((a, b) => {
      const av = a.cov[age].fully as number, bv = b.cov[age].fully as number;
      return dir === 'low' ? av - bv : bv - av;
    });
    if (!rows.length) { listEl.innerHTML = `<div class="empty">No regions match.</div>`; return; }
    listEl.innerHTML = rows.map((r, i) => row(r, age, i + 1)).join('');
    listEl.querySelectorAll<HTMLElement>('.rank-row').forEach((el) => {
      el.addEventListener('click', () => ctx.openSA3(el.dataset.code!));
    });
  };

  root.querySelectorAll<HTMLButtonElement>('.dir-seg').forEach((b) => {
    b.addEventListener('click', () => {
      dir = b.dataset.dir as Dir; localStorage.setItem('imm.lbDir', dir);
      root.querySelectorAll('.dir-seg').forEach((x) => x.classList.toggle('active', x === b));
      draw();
    });
  });
  root.querySelector<HTMLSelectElement>('#lbState')!.addEventListener('change', (e) => {
    state = (e.target as HTMLSelectElement).value; localStorage.setItem('imm.lbState', state); draw();
  });
  draw();
}

function row(r: SA3, age: Age, rank: number): string {
  const v = r.cov[age].fully as number;
  const w = Math.max(2, Math.min(100, ((v - FLOOR) / (100 - FLOOR)) * 100));
  const gap = v >= HERD_IMMUNITY ? `✓ meets 95%` : `${(HERD_IMMUNITY - v).toFixed(1)} pts below`;
  const tip = `${escapeHtml(r.name)} (${r.state}) — ${fmtPct(v)} fully immunised at ${age}yr`;
  return `<div class="rank-row" data-code="${r.code}" data-tip="${tip}">
    <span class="rank-num">${rank}</span>
    <div class="rank-main">
      <div class="rank-name">${escapeHtml(r.name)}<span class="state-chip">${r.state}</span></div>
      <div class="rank-meta">${gap}</div>
    </div>
    <div class="rank-track" aria-hidden="true"><span style="width:${w}%;background:${covColor(v)}"></span></div>
    <div class="rank-val" style="color:${covInk(v)}">${fmtPct(v)}</div>
  </div>`;
}
