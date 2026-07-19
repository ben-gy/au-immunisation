// feedback:begin (managed by hub/scripts/feedback/backfill.mjs)
import { mountFeedback } from './feedback';
mountFeedback();
// feedback:end

import './style.css';
import 'leaflet/dist/leaflet.css';
import { loadData, type Dataset, type Age } from './data';
import { initTooltip } from './tooltip';
import { GLOSSARY } from './glossary';
import { renderAbout } from './about';
import { openDrill, closeDrill } from './views/drilldown';

import { renderMap } from './views/map';
import { renderLeaderboard } from './views/leaderboard';
import { renderExplorer } from './views/explorer';
import { renderVaccines } from './views/vaccines';
import { renderEquity } from './views/equity';
import { renderTrends } from './views/trends';
import { renderDistribution } from './views/distribution';
import { renderInsights } from './views/insights';

export interface Ctx {
  ds: Dataset;
  root: HTMLElement;
  age: Age;
  setAge(a: Age): void;
  openSA3(code: string): void;
  navigate(view: string): void;
}

interface ViewDef {
  id: string;
  label: string;
  render(ctx: Ctx): void;
}

const VIEWS: ViewDef[] = [
  { id: 'map', label: 'Map', render: renderMap },
  { id: 'leaderboard', label: 'Leaderboard', render: renderLeaderboard },
  { id: 'explorer', label: 'Explorer', render: renderExplorer },
  { id: 'vaccines', label: 'Vaccines', render: renderVaccines },
  { id: 'equity', label: 'First Nations', render: renderEquity },
  { id: 'trends', label: 'Trends', render: renderTrends },
  { id: 'distribution', label: 'Distribution', render: renderDistribution },
  { id: 'insights', label: 'Insights', render: renderInsights },
];

let ds: Dataset;
let currentView = 'map';
let age: Age = ((localStorage.getItem('imm.age') as Age) || '2');

const app = document.getElementById('app')!;

async function boot() {
  app.innerHTML = `<div class="loading" style="margin:auto"><div class="spinner"></div>Loading immunisation coverage…</div>`;
  try {
    ds = await loadData();
  } catch (e) {
    app.innerHTML = `<div class="error-box" style="margin:auto">Could not load data. Please refresh.<br><span class="note">${String((e as Error).message)}</span></div>`;
    return;
  }
  render();
  initTooltip();
  initGlossary();
  window.addEventListener('hashchange', route);
  route();
}

function render() {
  const period = ds.meta.sa3Period || 'latest release';
  app.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <div class="brand">
          <img class="brand-mark" src="${(import.meta.env.BASE_URL || '/')}favicon.svg" alt="" />
          <div class="brand-text">
            <div class="brand-title">Immunisation Coverage</div>
            <div class="brand-sub">Childhood vaccination by region · vs the 95% herd-immunity line</div>
          </div>
        </div>
        <div class="header-spacer"></div>
        <div class="header-actions">
          <button class="icon-btn" id="aboutBtn" aria-label="About this data">ⓘ About</button>
        </div>
      </div>
    </header>
    <nav class="nav"><div class="nav-inner" id="nav"></div></nav>
    <main class="main-content" id="view" role="main"></main>
    <footer class="site-footer">
      <div class="footer-inner">
        <div>
          <p><strong>Immunisation Coverage</strong> unifies the Australian Immunisation Register childhood coverage releases into one map and explorer, measured against the 95% herd-immunity target.</p>
          <p class="footer-src">Data: Australian Immunisation Register, Dept of Health, Disability and Ageing (${escapeHtml(period)}). Boundaries: ABS ASGS 2021 (CC BY 4.0). Not affiliated with any government agency.</p>
        </div>
        <div>
          <p>Built by <a href="https://benrichardson.dev/">benrichardson.dev</a> · <a href="https://hub.benrichardson.dev" target="_blank" rel="noopener">more tools &amp; sites</a></p>
        </div>
      </div>
    </footer>
    <div class="overlay" id="overlay"></div>
    <div class="modal drill" id="drill" role="dialog" aria-modal="true" aria-label="Area detail"></div>
    <div class="modal about" id="about" role="dialog" aria-modal="true" aria-label="About"></div>
  `;

  const nav = document.getElementById('nav')!;
  nav.innerHTML = VIEWS.map((v) => `<button class="nav-tab" data-view="${v.id}">${v.label}</button>`).join('');
  nav.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((b) => {
    b.addEventListener('click', () => { location.hash = b.dataset.view!; });
  });

  document.getElementById('aboutBtn')!.addEventListener('click', () => openAbout());
  document.getElementById('overlay')!.addEventListener('click', () => { closeAbout(); if (location.hash.startsWith('#sa3=')) location.hash = currentView; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeAbout(); if (location.hash.startsWith('#sa3=')) location.hash = currentView; }
  });
  renderAbout(document.getElementById('about')!, ds);
}

const ctx = (): Ctx => ({
  ds,
  root: document.getElementById('view')!,
  age,
  setAge(a: Age) { age = a; localStorage.setItem('imm.age', a); renderCurrent(); },
  openSA3(code: string) { location.hash = 'sa3=' + code; },
  navigate(v: string) { location.hash = v; },
});

function renderCurrent() {
  const def = VIEWS.find((v) => v.id === currentView) ?? VIEWS[0];
  document.querySelectorAll<HTMLButtonElement>('.nav-tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.view === def.id);
  });
  // clear any lingering hover/glossary popovers left over from the prior view
  document.querySelectorAll('.hover-tip.visible, .gloss-pop.visible').forEach((e) => e.classList.remove('visible'));
  const root = document.getElementById('view')!;
  root.innerHTML = '';
  window.scrollTo({ top: 0 });
  def.render(ctx());
}

function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (h.startsWith('sa3=')) {
    const code = h.slice(4);
    if (!document.querySelector('.nav-tab.active')) renderCurrent();
    openDrill(ctx(), code);
    return;
  }
  closeDrill();
  const view = VIEWS.find((v) => v.id === h);
  currentView = view ? view.id : currentView;
  renderCurrent();
}

// ---------- about modal ----------
function openAbout() { document.getElementById('about')!.classList.add('open'); document.getElementById('overlay')!.classList.add('open'); }
function closeAbout() {
  const a = document.getElementById('about');
  if (a?.classList.contains('open')) { a.classList.remove('open'); if (!location.hash.startsWith('#sa3=')) document.getElementById('overlay')!.classList.remove('open'); }
}

// ---------- glossary popover ----------
function initGlossary() {
  const pop = document.createElement('div');
  pop.className = 'gloss-pop';
  document.body.appendChild(pop);
  let open = false;
  const show = (el: HTMLElement) => {
    const key = el.dataset.term!;
    const t = GLOSSARY[key];
    if (!t) return;
    pop.innerHTML = `<b>${t.term}</b>${t.def}`;
    pop.classList.add('visible');
    open = true;
    const r = el.getBoundingClientRect();
    const pw = Math.min(320, window.innerWidth - 24);
    let left = r.left; if (left + pw > window.innerWidth - 12) left = window.innerWidth - pw - 12;
    let top = r.bottom + 8;
    pop.style.left = Math.max(12, left) + 'px';
    pop.style.top = top + 'px';
    // if it would overflow bottom, flip above
    requestAnimationFrame(() => {
      const pr = pop.getBoundingClientRect();
      if (pr.bottom > window.innerHeight - 8) pop.style.top = Math.max(8, r.top - pr.height - 8) + 'px';
    });
  };
  const hide = () => { if (open) { pop.classList.remove('visible'); open = false; } };
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLElement>('.glossary-link');
    if (link) { e.stopPropagation(); show(link); }
    else if (!(e.target as Element).closest('.gloss-pop')) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
    if (e.key === 'Enter' || e.key === ' ') {
      const link = (e.target as Element).closest<HTMLElement>('.glossary-link');
      if (link) { e.preventDefault(); show(link); }
    }
  });
  window.addEventListener('scroll', hide, true);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

boot();
