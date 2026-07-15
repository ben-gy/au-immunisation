// Collect childhood immunisation coverage from the Australian Immunisation
// Register (Dept of Health) + ABS ASGS 2021 SA3 boundaries.
//
// Source: quarterly rolling-four-quarters coverage workbooks published per
// state (SA3) and nationally (PHN, all children + First Nations) at
// health.gov.au. Files are discovered by scraping the collection + publication
// pages and picking the newest workbook that validates for each slot, so the
// pipeline keeps working as the department re-publishes each quarter.
//
// Writes raw parsed data to pipeline/tmp/ ; aggregate.mjs shapes the final
// public/data JSON and simplifies the boundaries.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, 'tmp');
mkdirSync(TMP, { recursive: true });

const HOST = 'https://www.health.gov.au';
const COLLECTION =
  HOST + '/resources/collections/childhood-immunisation-coverage-data-phn-and-sa3';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/537.36';

const ANTIGENS = ['dtp', 'polio', 'hib', 'hep', 'mmr', 'pneumo', 'menc', 'varicella', 'fully'];

// ---------- fetch helpers ----------
async function fetchText(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return await r.text();
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  throw new Error('fetchText failed: ' + url);
}
async function fetchBuf(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 800 * (i + 1)));
  }
  throw new Error('fetchBuf failed: ' + url);
}

// ---------- link discovery ----------
function absUrl(href) {
  if (href.startsWith('http')) return href;
  return HOST + (href.startsWith('/') ? href : '/' + href);
}
// A sortable date from the /sites/default/files/YYYY-MM/ or /files/documents/YYYY/MM/ path.
function folderDate(url) {
  let m = url.match(/\/files\/(\d{4})-(\d{2})\//);
  if (m) return Number(m[1] + m[2]);
  m = url.match(/\/files\/documents\/(\d{4})\/(\d{2})\//);
  if (m) return Number(m[1] + m[2]);
  return 0;
}
function xlsxLinks(html) {
  const set = new Map();
  const re = /href="([^"]+\.xlsx)"/gi;
  let m;
  while ((m = re.exec(html))) {
    const u = absUrl(m[1].replace(/&amp;/g, '&'));
    if (!set.has(u)) set.set(u, folderDate(u));
  }
  // newest folder first
  return [...set.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
}

// ---------- workbook parsing ----------
function sheetRows(buf) {
  const wb = XLSX.read(buf, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null });
}
function findHeader(rows, mustHave) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = (rows[i] || []).map((c) => String(c ?? '').toLowerCase());
    if (mustHave.every((h) => cells.some((c) => c.includes(h)))) return i;
  }
  return -1;
}
function titleText(rows) {
  return (rows.slice(0, 4).flat().map((c) => String(c ?? '')).join(' ')).toLowerCase();
}
function detectScale(rows, headerIdx, fullyCol) {
  let mx = 0;
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const v = rows[i]?.[fullyCol];
    if (typeof v === 'number' && v > mx) mx = v;
  }
  return mx <= 1.5 ? 'prop' : 'pct';
}
// parse one coverage cell -> percent number (0..100) or null
function parseCov(cell, scale) {
  if (cell == null) return null;
  if (typeof cell === 'number') {
    if (cell === 0) return null; // 0 = antigen not assessed at this age
    let v = scale === 'prop' ? cell * 100 : cell;
    return Math.round(v * 10) / 10;
  }
  const s = String(cell).trim();
  if (!s) return null;
  const up = s.toUpperCase();
  if (up.startsWith('NP') || up.startsWith('NM') || up.includes('NOT PUB') || up.includes('NOT MAP'))
    return null;
  const m = s.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (s.includes('≥') || s.includes('>=')) return v; // "≥95.00"/"≥99.00" already percent
  if (scale === 'prop' && v <= 1.5) v = v * 100;
  return Math.round(v * 10) / 10;
}
function ageKey(raw) {
  const s = String(raw ?? '').toLowerCase();
  const m = s.match(/(\d+)/);
  if (!m) return null;
  let n = Number(m[1]);
  if (/month/.test(s)) n = Math.round(n / 12); // "12 months" -> 1
  if (n === 12) return '1';
  if (n === 24) return '2';
  if (n === 60) return '5';
  return n === 1 || n === 2 || n === 5 ? String(n) : null;
}
function period(rows) {
  for (let i = 0; i < 6; i++) {
    const s = String((rows[i] || [])[0] ?? '');
    if (/rolling|quarter/i.test(s)) return s.trim();
  }
  return '';
}

// Parse a PHN workbook: cols [num, name, age, ...9 antigens]
function parsePHN(rows) {
  const hi = findHeader(rows, ['phn', 'fully']);
  if (hi < 0) return null;
  const scale = detectScale(rows, hi, 11);
  const out = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const code = String(r[0] ?? '').trim();
    const name = String(r[1] ?? '').trim();
    const age = ageKey(r[2]);
    if (!age || !name || !code || /not mapped/i.test(name) || code.toUpperCase() === 'NM') continue;
    const cov = {};
    ANTIGENS.forEach((a, k) => (cov[a] = parseCov(r[3 + k], scale)));
    if (cov.fully == null) continue;
    out.push({ code, name, age, cov });
  }
  return out.length ? { rows: out, period: period(rows) } : null;
}
// Parse an SA3 workbook: cols [state, code, name, age, ...9 antigens]
function parseSA3(rows) {
  const hi = findHeader(rows, ['sa3', 'fully']);
  if (hi < 0) return null;
  const scale = detectScale(rows, hi, 12);
  const out = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const state = String(r[0] ?? '').trim();
    const code = String(r[1] ?? '').trim();
    const name = String(r[2] ?? '').trim();
    const age = ageKey(r[3]);
    if (!age || !/^\d{4,5}$/.test(code) || /not mapped/i.test(name)) continue;
    const cov = {};
    ANTIGENS.forEach((a, k) => (cov[a] = parseCov(r[4 + k], scale)));
    out.push({ state, code, name, age, cov });
  }
  return out.length ? { rows: out, period: period(rows) } : null;
}

// Try candidate urls (newest first) until one parses & validates.
async function firstValid(urls, parseFn, accept) {
  for (const u of urls.slice(0, 8)) {
    try {
      const buf = await fetchBuf(u);
      const rows = sheetRows(buf);
      if (accept && !accept(titleText(rows))) continue;
      const parsed = parseFn(rows);
      if (parsed) {
        console.log('  ok:', u.split('/').pop());
        return { ...parsed, url: u };
      }
    } catch (e) {
      console.log('  skip:', u.split('/').pop(), String(e.message || e).slice(0, 60));
    }
  }
  return null;
}

// ---------- ABS SA3 boundaries ----------
const ABS_SA3 =
  'https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/SA3/MapServer/1/query';
async function fetchSA3Geo() {
  const feats = [];
  const pageSize = 50;
  for (let offset = 0; offset < 1000; offset += pageSize) {
    const url =
      ABS_SA3 +
      '?where=1%3D1&outFields=sa3_code_2021,sa3_name_2021,state_name_2021' +
      '&outSR=4326&resultRecordCount=' + pageSize +
      '&resultOffset=' + offset + '&f=geojson';
    const txt = await fetchText(url);
    const gj = JSON.parse(txt);
    const got = gj.features || [];
    feats.push(...got);
    console.log('  ABS SA3 page offset', offset, '->', got.length, '(total', feats.length + ')');
    if (got.length < pageSize) break;
  }
  return { type: 'FeatureCollection', features: feats };
}

// ---------- main ----------
async function main() {
  console.log('Fetching collection page...');
  const collHtml = await fetchText(COLLECTION);

  const pubLinks = [...collHtml.matchAll(/href="(\/resources\/publications\/[^"]+)"/g)].map(
    (m) => absUrl(m[1].split('?')[0])
  );
  const stateSlugs = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'act', 'nt'];
  const sa3Pages = {};
  for (const s of stateSlugs) {
    const hit = pubLinks.find((u) => u.includes(`/${s}-childhood-immunisation-coverage-data-by-sa3`));
    if (hit) sa3Pages[s] = hit;
  }
  const phnYearPages = [...new Set(pubLinks.filter((u) => /\d{4}-phn-childhood-immunisation/.test(u)))]
    .map((u) => ({ url: u, year: Number((u.match(/(\d{4})-phn/) || [])[1] || 0) }))
    .sort((a, b) => b.year - a.year);

  console.log('SA3 state pages:', Object.keys(sa3Pages).join(','));
  console.log('PHN year pages:', phnYearPages.map((p) => p.year).join(','));

  // --- SA3 snapshot (all states) ---
  const sa3 = [];
  let sa3Period = '';
  for (const s of stateSlugs) {
    if (!sa3Pages[s]) { console.log('no page for', s); continue; }
    console.log('SA3', s.toUpperCase());
    const html = await fetchText(sa3Pages[s]);
    const res = await firstValid(xlsxLinks(html), parseSA3, (t) => t.includes('sa3'));
    if (res) {
      res.rows.forEach((r) => sa3.push(r));
      sa3Period = sa3Period || res.period;
    } else {
      console.log('  !! no valid SA3 workbook for', s);
    }
  }

  // --- PHN snapshot (all children + First Nations) from newest year page ---
  let phnAll = null, phnFN = null, phnPeriod = '';
  if (phnYearPages.length) {
    const html = await fetchText(phnYearPages[0].url);
    const links = xlsxLinks(html);
    phnAll = await firstValid(links, parsePHN, (t) => t.includes('all children') || t.includes('all children'));
    phnFN = await firstValid(
      links, parsePHN,
      (t) => t.includes('aboriginal') || t.includes('torres strait') || t.includes('first nations') || t.includes('indigenous')
    );
    phnPeriod = (phnAll && phnAll.period) || '';
  }

  // --- Best-effort historical national trend (unweighted PHN mean of % fully) ---
  const trend = [];
  for (const p of phnYearPages) {
    try {
      const html = await fetchText(p.url);
      const res = await firstValid(
        xlsxLinks(html), parsePHN,
        (t) => t.includes('all children') && !t.includes('aboriginal') && !t.includes('torres')
      );
      if (!res) continue;
      const byAge = {};
      for (const age of ['1', '2', '5']) {
        const vals = res.rows.filter((r) => r.age === age && r.cov.fully != null).map((r) => r.cov.fully);
        if (vals.length) byAge[age] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
      }
      if (Object.keys(byAge).length) {
        trend.push({ year: p.year, period: res.period, byAge });
        console.log('  trend', p.year, byAge);
      }
    } catch (e) {
      console.log('  trend skip', p.year, String(e.message || e).slice(0, 50));
    }
  }
  trend.sort((a, b) => a.year - b.year);

  // --- ABS SA3 boundaries ---
  console.log('Fetching ABS SA3 boundaries...');
  const geo = await fetchSA3Geo();
  writeFileSync(join(TMP, 'sa3-raw.geojson'), JSON.stringify(geo));

  const raw = {
    generated: new Date().toISOString(),
    sa3Period, phnPeriod,
    sa3,
    phnAll: phnAll ? phnAll.rows : [],
    phnFN: phnFN ? phnFN.rows : [],
    trend,
    sources: {
      sa3: Object.values(sa3Pages),
      phnAll: phnAll?.url || null,
      phnFN: phnFN?.url || null,
    },
  };
  writeFileSync(join(TMP, 'raw.json'), JSON.stringify(raw));
  console.log(
    `Done. SA3 rows=${sa3.length} PHN=${raw.phnAll.length} FN=${raw.phnFN.length} trend=${trend.length} geo=${geo.features.length}`
  );
  if (sa3.length < 200) throw new Error('Too few SA3 rows parsed — aborting to avoid shipping partial data');
  if (geo.features.length < 300) throw new Error('Too few SA3 boundaries fetched');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
