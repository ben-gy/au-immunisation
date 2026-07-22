// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Data types, loading, domain metadata, and pure analysis helpers.
import { mean, median } from './format';

export type Age = '1' | '2' | '5';
export const AGES: Age[] = ['1', '2', '5'];

export interface Cov {
  dtp: number | null;
  polio: number | null;
  hib: number | null;
  hep: number | null;
  mmr: number | null;
  pneumo: number | null;
  menc: number | null;
  varicella: number | null;
  fully: number | null;
}

export interface SA3 {
  code: string;
  name: string;
  state: string;
  cov: Record<Age, Cov>;
}

export interface PHN {
  code: string;
  name: string;
  all: Record<Age, Cov>;
  fn: Record<Age, Cov> | null;
}

export interface TrendPoint {
  year: number;
  period: string;
  byAge: Record<Age, number>;
}

export interface Meta {
  generated: string;
  sa3Period: string;
  phnPeriod: string;
  ages: Age[];
  antigens: string[];
  counts: {
    sa3: number;
    phn: number;
    withFN: number;
    below95: Record<Age, number>;
    below90: Record<Age, number>;
  };
  sources: Record<string, unknown>;
}

export interface Dataset {
  meta: Meta;
  sa3: SA3[];
  phn: PHN[];
  trends: TrendPoint[];
}

export type AntigenKey = keyof Cov;

export interface AntigenMeta {
  key: AntigenKey;
  short: string;
  name: string;
  disease: string;
}

// Order matters — matches the workbook column order.
export const ANTIGENS: AntigenMeta[] = [
  { key: 'dtp', short: 'DTP', name: 'Diphtheria, Tetanus & Pertussis', disease: 'diphtheria, tetanus, whooping cough' },
  { key: 'polio', short: 'Polio', name: 'Poliomyelitis', disease: 'polio' },
  { key: 'hib', short: 'Hib', name: 'Haemophilus influenzae type b', disease: 'Hib meningitis / epiglottitis' },
  { key: 'hep', short: 'HepB', name: 'Hepatitis B', disease: 'hepatitis B' },
  { key: 'mmr', short: 'MMR', name: 'Measles, Mumps & Rubella', disease: 'measles, mumps, rubella' },
  { key: 'pneumo', short: 'Pneumo', name: 'Pneumococcal', disease: 'pneumococcal disease' },
  { key: 'menc', short: 'MenACWY', name: 'Meningococcal ACWY', disease: 'meningococcal disease' },
  { key: 'varicella', short: 'Varicella', name: 'Varicella', disease: 'chickenpox' },
];

export const STATE_NAMES: Record<string, string> = {
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland', WA: 'Western Australia',
  SA: 'South Australia', TAS: 'Tasmania', ACT: 'Aust. Capital Territory', NT: 'Northern Territory',
};
export const STATE_ORDER = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'];

export async function loadData(): Promise<Dataset> {
  const base = import.meta.env.BASE_URL || '/';
  const [meta, sa3, phn, trends] = await Promise.all([
    fetch(base + 'data/meta.json').then((r) => j(r)),
    fetch(base + 'data/sa3.json').then((r) => j(r)),
    fetch(base + 'data/phn.json').then((r) => j(r)),
    fetch(base + 'data/trends.json').then((r) => j(r)),
  ]);
  return { meta, sa3, phn, trends };
}
async function j(r: Response) {
  if (!r.ok) throw new Error('Failed to load ' + r.url);
  return r.json();
}

// ---------- pure analysis ----------

/** SA3s that have a `fully` value at the given age (drops privacy-suppressed). */
export function withData(sa3: SA3[], age: Age): SA3[] {
  return sa3.filter((s) => s.cov[age] && s.cov[age].fully !== null);
}

/** Unweighted mean of `fully` across areas (labelled clearly in UI as such). */
export function avgFully(sa3: SA3[], age: Age): number | null {
  return mean(withData(sa3, age).map((s) => s.cov[age].fully as number));
}

/** Per-state average of a given antigen at an age (unweighted mean of SA3s). */
export function stateAntigenAvg(sa3: SA3[], state: string, age: Age, key: AntigenKey): number | null {
  const vals = sa3
    .filter((s) => s.state === state)
    .map((s) => s.cov[age][key])
    .filter((v): v is number => v !== null);
  return mean(vals);
}

/** National unweighted average of an antigen across all SA3s at an age. */
export function nationalAntigenAvg(sa3: SA3[], age: Age, key: AntigenKey): number | null {
  const vals = sa3.map((s) => s.cov[age][key]).filter((v): v is number => v !== null);
  return mean(vals);
}

/** Count of areas below a threshold on `fully`. */
export function countBelow(sa3: SA3[], age: Age, threshold: number): number {
  return withData(sa3, age).filter((s) => (s.cov[age].fully as number) < threshold).length;
}

export interface PhnGap {
  code: string;
  name: string;
  all: number;
  fn: number;
  gap: number; // all - fn (positive = FN behind)
}

/** All-children vs First Nations gap per PHN at an age, sorted by gap desc. */
export function phnGaps(phn: PHN[], age: Age): PhnGap[] {
  const out: PhnGap[] = [];
  for (const p of phn) {
    const all = p.all[age]?.fully;
    const fn = p.fn?.[age]?.fully;
    if (all === null || all === undefined || fn === null || fn === undefined) continue;
    out.push({ code: p.code, name: p.name, all, fn, gap: Math.round((all - fn) * 10) / 10 });
  }
  return out.sort((a, b) => b.gap - a.gap);
}

export interface Insight {
  severity: 'alert' | 'warn' | 'info' | 'good';
  title: string;
  detail: string;
}

/** Auto-detected headline findings across the dataset. */
export function buildInsights(ds: Dataset, age: Age): Insight[] {
  const out: Insight[] = [];
  const areas = withData(ds.sa3, age);
  const total = areas.length;

  const below95 = countBelow(ds.sa3, age, 95);
  out.push({
    severity: below95 > total / 2 ? 'alert' : 'warn',
    title: `${below95} of ${total} areas below the 95% herd-immunity line`,
    detail: `Fully-immunised coverage for ${AGE_TXT[age]} is under 95% in ${pct(below95, total)} of Australian SA3 regions.`,
  });

  // worst antigen nationally
  let worst: { key: AntigenKey; name: string; v: number } | null = null;
  for (const a of ANTIGENS) {
    const v = nationalAntigenAvg(ds.sa3, age, a.key);
    if (v === null) continue;
    if (!worst || v < worst.v) worst = { key: a.key, name: a.name, v };
  }
  if (worst) {
    out.push({
      severity: worst.v < 90 ? 'warn' : 'info',
      title: `${worst.name} is the lowest-covered vaccine at ${AGE_TXT[age]}`,
      detail: `National average coverage is ${worst.v.toFixed(1)}% across regions — the weakest of the ${ANTIGENS.length} scheduled antigens at this milestone.`,
    });
  }

  // lowest area
  const sorted = [...areas].sort((a, b) => (a.cov[age].fully as number) - (b.cov[age].fully as number));
  if (sorted.length) {
    const lo = sorted[0];
    out.push({
      severity: 'alert',
      title: `Lowest coverage: ${lo.name} (${lo.state}) at ${(lo.cov[age].fully as number).toFixed(1)}%`,
      detail: `That is ${(95 - (lo.cov[age].fully as number)).toFixed(1)} points below the herd-immunity target.`,
    });
  }

  // First Nations gap
  const gaps = phnGaps(ds.phn, age);
  if (gaps.length) {
    const worstGap = gaps[0];
    const natAll = mean(gaps.map((g) => g.all));
    const natFn = mean(gaps.map((g) => g.fn));
    if (natAll !== null && natFn !== null) {
      out.push({
        severity: natAll - natFn > 3 ? 'warn' : 'info',
        title: `First Nations children trail by ${(natAll - natFn).toFixed(1)} points on average`,
        detail: `Across PHNs, ${AGE_TXT[age]} coverage averages ${natAll.toFixed(1)}% for all children vs ${natFn.toFixed(1)}% for Aboriginal & Torres Strait Islander children. Widest gap: ${worstGap.name} (${worstGap.gap.toFixed(1)} pts).`,
      });
    }
  }

  // trend direction
  if (ds.trends.length >= 2) {
    const latest = ds.trends[ds.trends.length - 1];
    const prior = ds.trends.find((t) => t.year === latest.year - 5) ?? ds.trends[0];
    const dv = (latest.byAge[age] ?? 0) - (prior.byAge[age] ?? 0);
    out.push({
      severity: dv < -0.5 ? 'warn' : dv > 0.5 ? 'good' : 'info',
      title: `Coverage ${dv < 0 ? 'fell' : dv > 0 ? 'rose' : 'held'} ${Math.abs(dv).toFixed(1)} points since ${prior.year}`,
      detail: `Average ${AGE_TXT[age]} coverage moved from ${(prior.byAge[age] ?? 0).toFixed(1)}% (${prior.year}) to ${(latest.byAge[age] ?? 0).toFixed(1)}% (${latest.year}).`,
    });
  }

  // areas meeting the line
  const meeting = total - below95;
  out.push({
    severity: meeting > 0 ? 'good' : 'info',
    title: `${meeting} area${meeting === 1 ? '' : 's'} reach herd immunity at ${AGE_TXT[age]}`,
    detail: `${pct(meeting, total)} of regions are at or above 95% fully immunised.`,
  });

  return out;
}

const AGE_TXT: Record<string, string> = { '1': '1-year-olds', '2': '2-year-olds', '5': '5-year-olds' };
function pct(n: number, d: number): string {
  return d ? Math.round((n / d) * 100) + '%' : '0%';
}

export { median, mean };
