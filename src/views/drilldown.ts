// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Ctx } from '../main';
import { ANTIGENS, AGES, STATE_NAMES, type SA3, type Age, mean } from '../data';
import { ageLabel, fmtPct } from '../format';
import { covColor, covInk, HERD_IMMUNITY } from '../scale';
import { pill, escapeHtml } from '../ui';
import { gl } from '../glossary';

const FLOOR = 75;
const barW = (v: number) => Math.max(2, Math.min(100, ((v - FLOOR) / (100 - FLOOR)) * 100));

function stateAvgFully(sa3: SA3[], state: string, age: Age): number | null {
  return mean(sa3.filter((s) => s.state === state).map((s) => s.cov[age].fully).filter((v): v is number => v !== null));
}

export function openDrill(ctx: Ctx, code: string): void {
  const { ds } = ctx;
  const rec = ds.sa3.find((s) => s.code === code);
  const el = document.getElementById('drill')!;
  const overlay = document.getElementById('overlay')!;
  if (!rec) { closeDrill(); return; }

  const blocks = AGES.map((age) => {
    const cov = rec.cov[age];
    const fully = cov.fully;
    const stAvg = stateAvgFully(ds.sa3, rec.state, age);
    let compare = '';
    if (fully !== null) {
      const dTarget = fully - HERD_IMMUNITY;
      const parts: string[] = [];
      parts.push(dTarget >= 0 ? `<strong style="color:var(--good)">meets the 95% target</strong>` : `<strong style="color:${covInk(fully)}">${Math.abs(dTarget).toFixed(1)} pts below the 95% target</strong>`);
      if (stAvg !== null) { const d = fully - stAvg; parts.push(`${d >= 0 ? '+' : ''}${d.toFixed(1)} pts vs ${rec.state} avg (${fmtPct(stAvg, 1)})`); }
      compare = `<div class="compare-line">${parts.join(' · ')}</div>`;
    } else {
      compare = `<div class="compare-line">Coverage ${gl('suppressed', 'suppressed')} — fewer than 25 children counted.</div>`;
    }
    const antigens = ANTIGENS.map((a) => {
      const v = cov[a.key];
      if (v === null) return '';
      return `<div class="antigen-row" data-tip="${a.name}: ${fmtPct(v)}"><span class="a-name">${a.short}</span><span class="a-track"><span style="width:${barW(v)}%;background:${covColor(v)}"></span></span><span class="a-val" style="color:${covInk(v)}">${fmtPct(v, 1)}</span></div>`;
    }).filter(Boolean).join('');
    return `<div class="age-block">
      <h4><span>${ageLabel(age)}</span> ${pill(fully)}</h4>
      ${compare}
      <div style="margin-top:var(--sp-sm)">${antigens || '<span class="note">No vaccines assessed at this milestone.</span>'}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="modal-head">
      <div class="m-title">
        <div class="view-title" style="font-size:1.3rem">${escapeHtml(rec.name)}</div>
        <div class="view-sub">${escapeHtml(STATE_NAMES[rec.state] || rec.state)} · SA3 ${rec.code}</div>
      </div>
      <button class="modal-close" data-close aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p style="font-size:var(--fs-sm)">Share of children <strong>${gl('fully immunised')}</strong> at each milestone, with every scheduled vaccine. Bars are scaled from 75%.</p>
      ${blocks}
      <p class="note">Source: Australian Immunisation Register (${escapeHtml(ds.meta.sa3Period || 'latest')}). Compared against the SA3 regions of ${escapeHtml(STATE_NAMES[rec.state] || rec.state)}.</p>
    </div>`;
  // Clearing the hash triggers route(), which closes the drill and re-renders
  // the current underlying view.
  el.querySelector('[data-close]')!.addEventListener('click', () => { location.hash = ''; });
  el.classList.add('open');
  overlay.classList.add('open');
}

export function closeDrill(): void {
  const el = document.getElementById('drill');
  if (el?.classList.contains('open')) {
    el.classList.remove('open');
    const about = document.getElementById('about');
    if (!about?.classList.contains('open')) document.getElementById('overlay')?.classList.remove('open');
  }
}
