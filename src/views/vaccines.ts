import type { Ctx } from '../main';
import { ANTIGENS, STATE_ORDER, STATE_NAMES, stateAntigenAvg, nationalAntigenAvg, type Age, type AntigenKey } from '../data';
import { fmtPct } from '../format';
import { covColor, covText } from '../scale';
import { ageControl, wireAge, viewHead, escapeHtml } from '../ui';
import { gl } from '../glossary';

export function renderVaccines(ctx: Ctx): void {
  const { root, ds } = ctx;
  const age = ctx.age as Age;

  const cols: { key: AntigenKey; label: string; title: string }[] = [
    { key: 'fully', label: 'Fully', title: 'Fully immunised' },
    ...ANTIGENS.map((a) => ({ key: a.key, label: a.short, title: a.name })),
  ];

  const rowFor = (label: string, tip: string, get: (k: AntigenKey) => number | null, clickState?: string) =>
    `<tr>
      <th class="row-h" ${clickState ? `data-state="${clickState}" style="cursor:pointer"` : ''} data-tip="${tip}">${label}</th>
      ${cols.map((c) => {
        const v = get(c.key);
        if (v === null) return `<td class="na" aria-label="not scheduled at this age">n/a</td>`;
        return `<td style="background:${covColor(v)};color:${covText(v)}" data-tip="${escapeHtml(label)} · ${escapeHtml(c.title)}: ${fmtPct(v)} (${age}yr avg)">${v.toFixed(1)}</td>`;
      }).join('')}
    </tr>`;

  root.innerHTML =
    viewHead(
      'Which vaccine, which state?',
      `Average coverage by state and vaccine at the ${age === '1' ? '1-year' : age === '2' ? '2-year' : '5-year'} milestone. Reveals which specific ${gl('coverage', 'antigen')} is dragging a region below the line — measles (${gl('mmr', 'MMR')}) is usually the weak point. Figures are the unweighted mean of that state's SA3 regions.`
    ) +
    `<div class="controls">${ageControl(ctx)}</div>
     <div class="panel panel-pad">
       <div class="matrix-scroll">
         <table class="matrix">
           <thead><tr><th class="row-h"></th>${cols.map((c) => `<th data-tip="${escapeHtml(c.title)}">${c.label}</th>`).join('')}</tr></thead>
           <tbody>
             ${rowFor('National', 'Unweighted national average across all SA3 regions', (k) => nationalAntigenAvg(ds.sa3, age, k))}
             ${STATE_ORDER.map((s) => rowFor(STATE_NAMES[s], `Open the ${STATE_NAMES[s]} leaderboard`, (k) => stateAntigenAvg(ds.sa3, s, age, k), s)).join('')}
           </tbody>
         </table>
       </div>
       <p class="note">Cells are shaded on the same scale as the map (green ≥95%, red below 87%). “n/a” means the vaccine is not yet due at that milestone. Click a state to open its leaderboard.</p>
     </div>`;
  wireAge(ctx, root);

  root.querySelectorAll<HTMLElement>('.row-h[data-state]').forEach((th) => {
    th.addEventListener('click', () => {
      localStorage.setItem('imm.lbState', th.dataset.state!);
      ctx.navigate('leaderboard');
    });
  });
}
