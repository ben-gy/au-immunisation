// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Ctx } from '../main';
import { ANTIGENS, STATE_ORDER, STATE_NAMES, type SA3, type Age, type AntigenKey } from '../data';
import { ageControl, wireAge, pill, escapeHtml, viewHead } from '../ui';

type SortKey = 'name' | 'state' | 'fully' | AntigenKey;

export function renderExplorer(ctx: Ctx): void {
  const { root, ds } = ctx;
  let sort: SortKey = 'fully';
  let dir: 1 | -1 = 1; // 1 asc, -1 desc
  let q = '';
  let state = 'ALL';
  let timer: number | undefined;

  root.innerHTML =
    viewHead('Explorer', 'Every region and every vaccine, side by side. Search for your area, sort any column, and click a row for the full breakdown. “n/p” = privacy-suppressed.') +
    `<div class="controls">
       ${ageControl(ctx)}
       <div class="search-wrap"><input type="search" id="q" placeholder="Search region…" aria-label="Search region"></div>
       <select id="stf" aria-label="Filter state">
         <option value="ALL">All states</option>
         ${STATE_ORDER.map((s) => `<option value="${s}">${STATE_NAMES[s]}</option>`).join('')}
       </select>
       <span class="control-label" id="count"></span>
     </div>
     <div class="table-scroll"><table class="data"><thead id="thead"></thead><tbody id="tbody"></tbody></table></div>`;
  wireAge(ctx, root);

  const cols: { key: SortKey; label: string; num: boolean }[] = [
    { key: 'name', label: 'Region', num: false },
    { key: 'state', label: 'State', num: false },
    { key: 'fully', label: 'Fully', num: true },
    ...ANTIGENS.map((a) => ({ key: a.key as SortKey, label: a.short, num: true })),
  ];

  const thead = root.querySelector('#thead')!;
  const tbody = root.querySelector<HTMLElement>('#tbody')!;
  const countEl = root.querySelector('#count')!;

  const drawHead = () => {
    thead.innerHTML =
      '<tr>' +
      cols
        .map((c) => {
          const sorted = c.key === sort;
          const arrow = sorted ? (dir === 1 ? '▲' : '▼') : '▲';
          return `<th class="${c.num ? 'num' : ''} ${sorted ? 'sorted' : ''}" data-key="${c.key}">${c.label} <span class="arrow">${arrow}</span></th>`;
        })
        .join('') +
      '</tr>';
    thead.querySelectorAll<HTMLElement>('th').forEach((th) => {
      th.addEventListener('click', () => {
        const k = th.dataset.key as SortKey;
        if (k === sort) dir = (dir === 1 ? -1 : 1);
        else { sort = k; dir = k === 'name' || k === 'state' ? 1 : -1; }
        drawHead(); drawBody();
      });
    });
  };

  const drawBody = () => {
    const age = ctx.age as Age;
    let rows = ds.sa3.slice();
    if (state !== 'ALL') rows = rows.filter((r) => r.state === state);
    if (q) { const lq = q.toLowerCase(); rows = rows.filter((r) => r.name.toLowerCase().includes(lq) || (STATE_NAMES[r.state] || '').toLowerCase().includes(lq)); }

    rows.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name) * dir;
      if (sort === 'state') return (a.state.localeCompare(b.state) || a.name.localeCompare(b.name)) * dir;
      const av = a.cov[age][sort as AntigenKey], bv = b.cov[age][sort as AntigenKey];
      if (av === null && bv === null) return a.name.localeCompare(b.name);
      if (av === null) return 1; // nulls last regardless of dir
      if (bv === null) return -1;
      return (av - bv) * dir;
    });

    countEl.textContent = `${rows.length} region${rows.length === 1 ? '' : 's'}`;
    if (!rows.length) { tbody.innerHTML = `<tr><td colspan="${cols.length}"><div class="empty">No regions match your search.</div></td></tr>`; return; }
    tbody.innerHTML = rows.map((r) => bodyRow(r, age)).join('');
    tbody.querySelectorAll<HTMLElement>('tr[data-code]').forEach((tr) => tr.addEventListener('click', () => ctx.openSA3(tr.dataset.code!)));
  };

  root.querySelector<HTMLInputElement>('#q')!.addEventListener('input', (e) => {
    window.clearTimeout(timer);
    const val = (e.target as HTMLInputElement).value;
    timer = window.setTimeout(() => { q = val; drawBody(); }, 300);
  });
  root.querySelector<HTMLSelectElement>('#stf')!.addEventListener('change', (e) => { state = (e.target as HTMLSelectElement).value; drawBody(); });

  drawHead();
  drawBody();
}

function bodyRow(r: SA3, age: Age): string {
  const c = r.cov[age];
  const cells = ANTIGENS.map((a) => {
    const v = c[a.key];
    return `<td class="num">${v === null ? '<span style="color:var(--text-muted)">n/a</span>' : v.toFixed(1)}</td>`;
  }).join('');
  return `<tr data-code="${r.code}">
    <td class="area-name">${escapeHtml(r.name)}</td>
    <td>${r.state}</td>
    <td class="num">${pill(c.fully)}</td>
    ${cells}
  </tr>`;
}
