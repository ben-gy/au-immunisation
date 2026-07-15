import L from 'leaflet';
import type { Ctx } from '../main';
import { type SA3, STATE_NAMES, withData, countBelow } from '../data';
import { fmtPct } from '../format';
import { covColor } from '../scale';
import { ageControl, wireAge, coverageLegend, escapeHtml, viewHead, HERD } from '../ui';
import { ANTIGENS } from '../data';

let geoCache: any = null;

export async function renderMap(ctx: Ctx): Promise<void> {
  const { root, ds, age } = ctx;
  const total = withData(ds.sa3, age).length;
  const meet = total - countBelow(ds.sa3, age, HERD);

  root.innerHTML =
    viewHead(
      'Where are children protected?',
      `Each of Australia's ${ds.meta.counts.sa3} SA3 regions, shaded by the share of ${age === '1' ? '1' : age === '2' ? '2' : '5'}-year-olds fully immunised. Click a region for its full breakdown.`
    ) +
    `<div class="controls">${ageControl(ctx)}
       <span class="control-label" style="margin-left:auto">${meet} of ${total} regions reach the 95% line</span>
     </div>
     <div class="panel panel-pad" style="margin-bottom:var(--sp-lg)">${coverageLegend()}</div>
     <div class="map-wrap"><div id="immMap"></div></div>
     <p class="note">Boundaries: ABS ASGS 2021 (CC BY 4.0). Coverage: Australian Immunisation Register. Grey regions are privacy-suppressed.</p>`;
  wireAge(ctx, root);

  const mapEl = root.querySelector<HTMLElement>('#immMap')!;
  mapEl.className = 'map-canvas';

  try {
    if (!geoCache) {
      geoCache = await fetch((import.meta.env.BASE_URL || '/') + 'data/sa3.geojson').then((r) => {
        if (!r.ok) throw new Error('boundaries');
        return r.json();
      });
    }
  } catch {
    mapEl.innerHTML = `<div class="error-box">Map unavailable — boundaries failed to load.</div>`;
    return;
  }

  const byCode = new Map<string, SA3>();
  ds.sa3.forEach((s) => byCode.set(s.code, s));

  const map = L.map(mapEl, { minZoom: 3, maxZoom: 11, zoomControl: true, scrollWheelZoom: false, attributionControl: true });
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: 'Tiles © CARTO · Boundaries ABS ASGS 2021',
    subdomains: 'abcd', minZoom: 3, maxZoom: 11,
  }).addTo(map);

  const fullyOf = (code: string) => byCode.get(code)?.cov[age]?.fully ?? null;

  const layer = L.geoJSON(geoCache, {
    style: (f: any) => ({
      fillColor: covColor(fullyOf(f.properties.code)),
      fillOpacity: 0.82, color: '#ffffff', weight: 0.5,
    }),
    onEachFeature: (f: any, lyr: any) => {
      const rec = byCode.get(f.properties.code);
      const v = rec?.cov[age]?.fully ?? null;
      const anti = rec
        ? ANTIGENS.map((a) => { const av = rec.cov[age][a.key]; return av === null ? '' : `${a.short} ${fmtPct(av, 0)}`; })
            .filter(Boolean).slice(0, 4).join(' · ')
        : '';
      const name = escapeHtml(f.properties.name || rec?.name || f.properties.code);
      const state = rec ? (STATE_NAMES[rec.state] || rec.state) : '';
      lyr.bindTooltip(
        `<b>${name}</b>${state ? `<br><span style="opacity:.7">${escapeHtml(state)}</span>` : ''}` +
          `<br>Fully immunised: <b>${fmtPct(v)}</b>${v === null ? ' (suppressed)' : v >= HERD ? ' ✓' : ` — ${(HERD - v).toFixed(1)} below target`}` +
          (anti ? `<br><span style="opacity:.75">${anti}</span>` : ''),
        { sticky: true, className: 'map-tip' }
      );
      lyr.on({
        mouseover: () => lyr.setStyle({ weight: 2, color: '#16232e' }),
        mouseout: () => layer.resetStyle(lyr),
        click: () => { if (rec) ctx.openSA3(rec.code); },
      });
    },
  }).addTo(map);

  const bounds = layer.getBounds();
  const fit = () => { map.invalidateSize(); if (bounds.isValid() && mapEl.clientHeight > 50) map.fitBounds(bounds, { padding: [10, 10] }); };
  const ro = new ResizeObserver(() => { if (mapEl.clientHeight > 50) { fit(); ro.disconnect(); } });
  ro.observe(mapEl);
  setTimeout(fit, 350);
}
