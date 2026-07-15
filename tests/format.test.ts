import { describe, expect, it } from 'vitest';
import { fmtPct, fmtSigned, binCoverage, layoutHistogram, median, mean, type Bar } from '../src/format';

describe('fmtPct', () => {
  it('formats with default 1dp', () => expect(fmtPct(92.34)).toBe('92.3%'));
  it('honours dp arg', () => expect(fmtPct(92.34, 0)).toBe('92%'));
  it('handles null/undefined/NaN', () => {
    expect(fmtPct(null)).toBe('—');
    expect(fmtPct(undefined)).toBe('—');
    expect(fmtPct(NaN)).toBe('—');
  });
  it('handles 0 and 100', () => { expect(fmtPct(0)).toBe('0.0%'); expect(fmtPct(100)).toBe('100.0%'); });
});

describe('fmtSigned', () => {
  it('prefixes + for positive', () => expect(fmtSigned(2.5)).toBe('+2.5'));
  it('keeps - for negative', () => expect(fmtSigned(-2.5)).toBe('-2.5'));
  it('zero has no explicit sign beyond value', () => expect(fmtSigned(0)).toBe('0.0'));
});

describe('median / mean', () => {
  it('median odd', () => expect(median([3, 1, 2])).toBe(2));
  it('median even averages middle two', () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it('ignores null/NaN', () => expect(median([1, null as any, NaN, 3])).toBe(2));
  it('empty -> null', () => { expect(median([])).toBeNull(); expect(mean([])).toBeNull(); });
  it('mean averages', () => expect(mean([90, 92, 94])).toBeCloseTo(92, 6));
});

describe('binCoverage', () => {
  it('counts into the right bins', () => {
    const { counts, edges } = binCoverage([96, 94.5, 90.1, 84]);
    expect(edges[edges.length - 1]).toBeGreaterThan(100);
    // 96 -> last bin (>=95), 94.5 -> [94,95), 90.1 -> [90,92), 84 -> [80,85)
    const total = counts.reduce((a, b) => a + b, 0);
    expect(total).toBe(4);
    expect(counts[counts.length - 1]).toBe(1); // the 96
  });
  it('clamps out-of-range values into end bins', () => {
    const { counts } = binCoverage([70, 105]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(2);
  });
  it('skips null/NaN', () => {
    const { counts } = binCoverage([null as any, NaN, 95]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

// ---- positional layout tests (area-only tests pass on broken layouts) ----
const EPS = 1e-6;
function hOverlap(a: Bar, b: Bar): number {
  return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
}

describe('layoutHistogram — positional correctness', () => {
  const cases: number[][] = [
    [5, 3, 2, 1],
    [0, 10, 0],
    [1],
    Array.from({ length: 7 }, (_, i) => (i + 1) * 3),
    [0, 0, 0],
  ];
  const dims: Array<[number, number]> = [[900, 380], [400, 200]];

  for (const counts of cases) {
    for (const [W, H] of dims) {
      it(`${counts.length} bins in ${W}×${H}: in-bounds, ordered, no overlap, no NaN`, () => {
        const edges = Array.from({ length: counts.length + 1 }, (_, i) => 80 + i);
        const bars = layoutHistogram(counts, edges, W, H, 8);
        expect(bars).toHaveLength(counts.length);
        for (const b of bars) {
          expect(Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.w) && Number.isFinite(b.h)).toBe(true);
          expect(b.w).toBeGreaterThanOrEqual(0);
          expect(b.h).toBeGreaterThanOrEqual(0);
          expect(b.x).toBeGreaterThanOrEqual(-EPS);
          expect(b.x + b.w).toBeLessThanOrEqual(W + EPS * W);
          expect(b.y).toBeGreaterThanOrEqual(-EPS);
          expect(b.y + b.h).toBeLessThanOrEqual(H + EPS * H);
          // bars are bottom-anchored
          expect(b.y + b.h).toBeCloseTo(H, 6);
        }
        // ordered left-to-right, no horizontal overlap
        for (let i = 1; i < bars.length; i++) {
          expect(bars[i].x).toBeGreaterThanOrEqual(bars[i - 1].x - EPS);
          expect(hOverlap(bars[i - 1], bars[i])).toBeLessThan(0.5);
        }
        // height proportional to count; max-count bar reaches full height
        const max = Math.max(1, ...counts);
        bars.forEach((b, i) => expect(b.h).toBeCloseTo((counts[i] / max) * H, 6));
        if (Math.max(...counts) > 0) {
          const tallest = bars[counts.indexOf(Math.max(...counts))];
          expect(tallest.h).toBeCloseTo(H, 6);
        }
      });
    }
  }

  it('empty input -> empty output', () => {
    expect(layoutHistogram([], [], 100, 100)).toEqual([]);
  });
});
