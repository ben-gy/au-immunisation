// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Ben Richardson — https://benrichardson.dev
// Additional terms under AGPL-3.0 section 7(b) apply; see ADDITIONAL-TERMS.md.
// Pure formatting + layout helpers (unit-tested).

export function fmtPct(v: number | null | undefined, dp = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toFixed(dp) + '%';
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-AU');
}

export function fmtSigned(v: number, dp = 1): string {
  const s = v.toFixed(dp);
  return (v > 0 ? '+' : '') + s;
}

export const AGE_LABEL: Record<string, string> = {
  '1': '1 year olds',
  '2': '2 year olds',
  '5': '5 year olds',
};

export function ageLabel(age: string): string {
  return AGE_LABEL[age] ?? age;
}

// ---- Histogram layout (hand-rolled → positional test required) ----
export interface Bar {
  x: number;
  y: number;
  w: number;
  h: number;
  count: number;
  from: number;
  to: number;
}

/**
 * Lay out a bar per bin edge across [x0..x0+W] × height H, bars flush and
 * within bounds. `counts[i]` is the number of items in bin i; bar height is
 * proportional to count / max(counts). `edges` has counts.length+1 entries.
 */
export function layoutHistogram(
  counts: number[],
  edges: number[],
  W: number,
  H: number,
  gap = 2,
): Bar[] {
  const n = counts.length;
  if (n === 0) return [];
  const max = Math.max(1, ...counts);
  const slot = W / n;
  return counts.map((count, i) => {
    const h = (count / max) * H;
    return {
      x: i * slot + gap / 2,
      y: H - h,
      w: Math.max(0, slot - gap),
      h,
      count,
      from: edges[i],
      to: edges[i + 1],
    };
  });
}

/** Bin coverage values (0..100) into fixed bands; returns {edges, counts}. */
export function binCoverage(
  values: number[],
  edges: number[] = [80, 85, 88, 90, 92, 94, 95, 100.0001],
): { edges: number[]; counts: number[] } {
  const counts = new Array(edges.length - 1).fill(0);
  for (const v of values) {
    if (v === null || v === undefined || Number.isNaN(v)) continue;
    // clamp into range
    const cv = Math.min(Math.max(v, edges[0]), edges[edges.length - 1] - 1e-9);
    for (let i = 0; i < edges.length - 1; i++) {
      if (cv >= edges[i] && cv < edges[i + 1]) {
        counts[i]++;
        break;
      }
    }
  }
  return { edges, counts };
}

export function median(values: number[]): number | null {
  const v = values.filter((x) => x !== null && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export function mean(values: number[]): number | null {
  const v = values.filter((x) => x !== null && !Number.isNaN(x));
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}
