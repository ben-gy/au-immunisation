// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Ctx } from '../main';
import { AGES, type Age } from '../data';
import { fmtPct } from '../format';
import { viewHead } from '../ui';
import { HERD_IMMUNITY } from '../scale';

const AGE_COLOR: Record<Age, string> = { '1': '#0ea5e9', '2': '#0f766e', '5': '#7c3aed' };
const AGE_NAME: Record<Age, string> = { '1': '1 year olds', '2': '2 year olds', '5': '5 year olds' };

export function renderTrends(ctx: Ctx): void {
  const { root, ds } = ctx;
  const pts = ds.trends.filter((t) => t.byAge).slice().sort((a, b) => a.year - b.year);

  if (pts.length < 2) {
    root.innerHTML = viewHead('Trends', 'Not enough historical releases were available to draw a trend.') +
      `<div class="panel panel-pad"><div class="empty">Historical trend unavailable in this release.</div></div>`;
    return;
  }

  const years = pts.map((p) => p.year);
  const y0 = years[0], y1 = years[years.length - 1];
  const W = 920, H = 470, padL = 46, padR = 130, padT = 24, padB = 42;
  const yMin = 86, yMax = 96;
  const xOf = (yr: number) => padL + ((yr - y0) / Math.max(1, y1 - y0)) * (W - padL - padR);
  const yOf = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

  // gridlines + y labels
  let grid = '';
  for (let v = yMin; v <= yMax; v += 2) {
    grid += `<line class="gridline" x1="${padL}" y1="${yOf(v)}" x2="${W - padR}" y2="${yOf(v)}"/>` +
      `<text x="${padL - 8}" y="${yOf(v) + 4}" text-anchor="end" font-size="11">${v}%</text>`;
  }
  // x labels
  let xlab = '';
  pts.forEach((p) => {
    xlab += `<text x="${xOf(p.year)}" y="${H - padB + 18}" text-anchor="middle" font-size="11">${p.year}</text>`;
  });

  // herd line
  const herdY = yOf(HERD_IMMUNITY);
  const herd = `<line class="ref-line" x1="${padL}" y1="${herdY}" x2="${W - padR}" y2="${herdY}"/>` +
    `<text class="ref-label" x="${W - padR + 6}" y="${herdY + 4}">95% target</text>`;

  // lines + dots
  let lines = '';
  let dots = '';
  let legend = '';
  AGES.forEach((age) => {
    const seq = pts.filter((p) => typeof p.byAge[age] === 'number');
    if (!seq.length) return;
    const d = seq.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.year).toFixed(1)} ${yOf(p.byAge[age]).toFixed(1)}`).join(' ');
    lines += `<path class="trend-line" d="${d}" stroke="${AGE_COLOR[age]}"/>`;
    seq.forEach((p) => {
      const v = p.byAge[age];
      dots += `<circle class="trend-dot" cx="${xOf(p.year).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="4.5" fill="#fff" stroke="${AGE_COLOR[age]}" stroke-width="2.5" data-tip="${AGE_NAME[age]} · ${p.year}: ${fmtPct(v)} fully immunised (avg across PHNs)"/>`;
    });
    const last = seq[seq.length - 1];
    legend += `<g><line x1="${W - padR + 6}" y1="${yOf(last.byAge[age])}" x2="${W - padR + 22}" y2="${yOf(last.byAge[age])}" stroke="${AGE_COLOR[age]}" stroke-width="3"/>` +
      `<text x="${W - padR + 26}" y="${yOf(last.byAge[age]) + 4}" font-size="11" fill="${AGE_COLOR[age]}" font-weight="700">${age}yr</text></g>`;
  });

  root.innerHTML =
    viewHead(
      'Is coverage rising or falling?',
      'Average fully-immunised coverage across Primary Health Networks, one line per milestone. After peaking around 2020, coverage has slipped back below the 95% herd-immunity line at every age.'
    ) +
    `<div class="panel panel-pad">
       <div class="chart-scroll">
         <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Trend of immunisation coverage by age, ${y0} to ${y1}">
           ${grid}${herd}${lines}${dots}${xlab}${legend}
         </svg>
       </div>
       <div class="legend" style="margin-top:var(--sp-md)">
         ${AGES.map((a) => `<span class="legend-item"><span class="legend-swatch" style="background:${AGE_COLOR[a]}"></span>${AGE_NAME[a]}</span>`).join('')}
         <span class="legend-item"><span class="legend-swatch" style="background:var(--bad)"></span>95% herd-immunity target</span>
       </div>
       <p class="note">Figures are the unweighted mean across the 31 PHNs for each release (rolling four quarters). This tracks direction reliably but is not the official population-weighted national rate.</p>
     </div>`;
}
