// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Ctx } from '../main';
import { buildInsights, type Age } from '../data';
import { ageControl, wireAge, viewHead, escapeHtml } from '../ui';

const TAG: Record<string, string> = { alert: 'Alert', warn: 'Watch', good: 'Good', info: 'Note' };

export function renderInsights(ctx: Ctx): void {
  const { root, ds } = ctx;
  const age = ctx.age as Age;
  const insights = buildInsights(ds, age);

  root.innerHTML =
    viewHead('Auto-detected insights', `The stand-out findings for the ${age}-year milestone, recomputed from the latest release. Switch milestone to refresh.`) +
    `<div class="controls">${ageControl(ctx)}</div>
     <div class="insight-grid">
       ${insights.map((i) => `
         <div class="insight-card ${i.severity}">
           <span class="insight-tag">${TAG[i.severity]}</span>
           <div class="insight-title">${escapeHtml(i.title)}</div>
           <div class="insight-detail">${escapeHtml(i.detail)}</div>
         </div>`).join('')}
     </div>`;
  wireAge(ctx, root);
}
