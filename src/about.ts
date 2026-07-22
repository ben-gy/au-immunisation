// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
import type { Dataset } from './data';
import { escapeHtml } from './ui';
import { gl } from './glossary';

export function renderAbout(el: HTMLElement, ds: Dataset): void {
  const c = ds.meta.counts;
  el.innerHTML = `
    <div class="modal-head">
      <div class="m-title"><div class="view-title" style="font-size:1.25rem">About this data</div></div>
      <button class="modal-close" data-close aria-label="Close">×</button>
    </div>
    <div class="modal-body">
      <p>This site brings the Australian Government's childhood immunisation coverage releases together in one place, and measures every region against the <strong>95% ${gl('herd immunity')}</strong> target.</p>

      <h3>What it shows</h3>
      <p>For each ${gl('sa3', 'SA3 region')} it reports the share of children who are <strong>${gl('fully immunised')}</strong> at the 1, 2 and 5 year milestones, plus coverage of each individual vaccine. First Nations coverage is shown at ${gl('phn', 'PHN')} level, alongside all-children coverage, so the gap can be seen and tracked.</p>

      <h3>Where it comes from</h3>
      <ul>
        <li><strong>Coverage:</strong> ${gl('air', 'Australian Immunisation Register')}, published by the Department of Health, Disability and Ageing — separate workbooks per state (SA3) and nationally (PHN).</li>
        <li><strong>Boundaries:</strong> ABS ASGS 2021 Statistical Area Level 3 (CC BY 4.0).</li>
      </ul>

      <h3>How to read it</h3>
      <ul>
        <li>Figures are a <strong>${gl('rolling four quarters', 'rolling four quarters')}</strong> average, so they move slowly and are robust to small-area noise.</li>
        <li>Where fewer than 25 children are counted, the rate is <strong>${gl('suppressed', 'suppressed')}</strong> for privacy and appears grey / “n/p”.</li>
        <li>National trend figures are an <em>unweighted average across PHNs</em> — a fair indicator of direction, not the official population-weighted national rate.</li>
      </ul>

      <h3>Current release</h3>
      <p>${escapeHtml(ds.meta.sa3Period || '—')}<br>
      ${c.sa3} SA3 regions · ${c.phn} PHNs (${c.withFN} with First Nations data) · updated quarterly.</p>

      <p class="note">Built for general information. Always follow advice from your GP, immunisation provider or state health department. Not affiliated with any government agency.</p>
    </div>
  `;
  el.querySelector('[data-close]')!.addEventListener('click', () => {
    el.classList.remove('open');
    if (!location.hash.startsWith('#sa3=')) document.getElementById('overlay')!.classList.remove('open');
  });
}
