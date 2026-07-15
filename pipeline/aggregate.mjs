// Shape raw parsed data into the app's public/data JSON and simplify the
// ABS SA3 boundaries with mapshaper (never by hand).

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, 'tmp');
const OUT = join(__dirname, '..', 'public', 'data');
mkdirSync(OUT, { recursive: true });

const raw = JSON.parse(readFileSync(join(TMP, 'raw.json'), 'utf8'));
const AGES = ['1', '2', '5'];

// ---- SA3: one record per code, coverage keyed by age ----
const sa3Map = new Map();
for (const r of raw.sa3) {
  let rec = sa3Map.get(r.code);
  if (!rec) { rec = { code: r.code, name: r.name, state: r.state, cov: {} }; sa3Map.set(r.code, rec); }
  rec.cov[r.age] = r.cov;
}
const sa3 = [...sa3Map.values()].sort((a, b) => a.code.localeCompare(b.code));

// ---- PHN: merge all-children + First Nations by code ----
function groupPHN(rows) {
  const m = new Map();
  for (const r of rows) {
    let rec = m.get(r.code);
    if (!rec) { rec = { code: r.code, name: r.name, cov: {} }; m.set(r.code, rec); }
    rec.cov[r.age] = r.cov;
  }
  return m;
}
const allM = groupPHN(raw.phnAll);
const fnM = groupPHN(raw.phnFN);
const phn = [...allM.values()].map((a) => ({
  code: a.code, name: a.name, all: a.cov, fn: (fnM.get(a.code) || {}).cov || null,
})).sort((a, b) => a.code.localeCompare(b.code));

// ---- meta / headline counts ----
function belowCount(age, threshold) {
  return sa3.filter((s) => s.cov[age] && s.cov[age].fully != null && s.cov[age].fully < threshold).length;
}
const meta = {
  generated: raw.generated,
  sa3Period: raw.sa3Period,
  phnPeriod: raw.phnPeriod,
  ages: AGES,
  antigens: ['dtp', 'polio', 'hib', 'hep', 'mmr', 'pneumo', 'menc', 'varicella'],
  counts: {
    sa3: sa3.length,
    phn: phn.length,
    withFN: phn.filter((p) => p.fn).length,
    below95: Object.fromEntries(AGES.map((a) => [a, belowCount(a, 95)])),
    below90: Object.fromEntries(AGES.map((a) => [a, belowCount(a, 90)])),
  },
  sources: raw.sources,
};

writeFileSync(join(OUT, 'sa3.json'), JSON.stringify(sa3));
writeFileSync(join(OUT, 'phn.json'), JSON.stringify(phn));
writeFileSync(join(OUT, 'trends.json'), JSON.stringify(raw.trend || []));
writeFileSync(join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));

// ---- boundaries: simplify with mapshaper ----
const rawGeo = readFileSync(join(TMP, 'sa3-raw.geojson'), 'utf8');
const cmd =
  '-i raw.geojson ' +
  '-rename-fields code=sa3_code_2021,name=sa3_name_2021 ' +
  '-filter-fields code,name ' +
  '-simplify 1.3% keep-shapes ' +
  '-clean ' +
  '-o format=geojson precision=0.001 sa3.geojson';
const outObj = await mapshaper.applyCommands(cmd, { 'raw.geojson': rawGeo });
const geoStr = outObj['sa3.geojson'].toString();
writeFileSync(join(OUT, 'sa3.geojson'), geoStr);

const kb = (p) => Math.round(statSync(p).size / 1024);
console.log('Wrote:');
console.log('  sa3.json    ', kb(join(OUT, 'sa3.json')), 'KB (', sa3.length, 'SA3s )');
console.log('  phn.json    ', kb(join(OUT, 'phn.json')), 'KB (', phn.length, 'PHNs,', meta.counts.withFN, 'with FN )');
console.log('  trends.json ', kb(join(OUT, 'trends.json')), 'KB (', (raw.trend || []).length, 'periods )');
console.log('  sa3.geojson ', kb(join(OUT, 'sa3.geojson')), 'KB');
console.log('  below 95% (age1/2/5):', JSON.stringify(meta.counts.below95));
