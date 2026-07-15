import { describe, expect, it } from 'vitest';
import {
  withData, avgFully, countBelow, stateAntigenAvg, nationalAntigenAvg, phnGaps, buildInsights,
  type SA3, type PHN, type Cov, type Age, type Dataset,
} from '../src/data';

function cov(fully: number | null, mmr: number | null = null): Cov {
  return { dtp: fully, polio: fully, hib: fully, hep: fully, mmr, pneumo: mmr, menc: mmr, varicella: mmr, fully };
}
function sa3(code: string, state: string, name: string, f1: number | null, f2: number | null, f5: number | null): SA3 {
  return { code, name, state, cov: { '1': cov(f1, f1 === null ? null : f1 - 1), '2': cov(f2, f2), '5': cov(f5, f5) } as Record<Age, Cov> };
}

const areas: SA3[] = [
  sa3('10001', 'NSW', 'Alpha', 96, 95, 97),
  sa3('10002', 'NSW', 'Beta', 88, 86, 90),
  sa3('20001', 'VIC', 'Gamma', 92, 91, 93),
  sa3('20002', 'VIC', 'Delta', null, null, null), // suppressed
];

const phns: PHN[] = [
  { code: 'PHN1', name: 'Metro', all: { '1': cov(95), '2': cov(94), '5': cov(96) } as any, fn: { '1': cov(90), '2': cov(88), '5': cov(92) } as any },
  { code: 'PHN2', name: 'Regional', all: { '1': cov(92), '2': cov(90), '5': cov(93) } as any, fn: null },
];

const ds: Dataset = {
  meta: { generated: '', sa3Period: 'test', phnPeriod: 'test', ages: ['1', '2', '5'], antigens: [], counts: { sa3: 4, phn: 2, withFN: 1, below95: {} as any, below90: {} as any }, sources: {} },
  sa3: areas, phn: phns, trends: [
    { year: 2020, period: '', byAge: { '1': 95, '2': 93, '5': 96 } },
    { year: 2025, period: '', byAge: { '1': 92, '2': 90, '5': 94 } },
  ],
};

describe('withData / avgFully', () => {
  it('drops suppressed areas', () => {
    expect(withData(areas, '1')).toHaveLength(3);
    expect(withData(areas, '1').map((s) => s.code)).not.toContain('20002');
  });
  it('avgFully is unweighted mean of non-suppressed', () => {
    expect(avgFully(areas, '1')).toBeCloseTo((96 + 88 + 92) / 3, 6);
  });
  it('null when all suppressed', () => {
    expect(avgFully([sa3('x', 'NSW', 'x', null, null, null)], '1')).toBeNull();
  });
});

describe('countBelow', () => {
  it('counts areas under threshold', () => {
    expect(countBelow(areas, '1', 95)).toBe(2); // 88, 92
    expect(countBelow(areas, '1', 90)).toBe(1); // 88
  });
  it('excludes suppressed', () => {
    expect(countBelow(areas, '1', 100)).toBe(3); // not 4
  });
});

describe('state / national antigen averages', () => {
  it('state average across that state only', () => {
    expect(stateAntigenAvg(areas, 'NSW', '1', 'fully')).toBeCloseTo((96 + 88) / 2, 6);
  });
  it('national average across all areas', () => {
    expect(nationalAntigenAvg(areas, '1', 'fully')).toBeCloseTo((96 + 88 + 92) / 3, 6);
  });
  it('null antigen (not scheduled) excluded from mean', () => {
    // at age 1 mmr = fully-1 for non-suppressed; suppressed contributes null
    const v = nationalAntigenAvg(areas, '1', 'mmr');
    expect(v).toBeCloseTo((95 + 87 + 91) / 3, 6);
  });
});

describe('phnGaps', () => {
  it('computes all - fn, only where both present, sorted by gap desc', () => {
    const g = phnGaps(phns, '1');
    expect(g).toHaveLength(1); // PHN2 has no fn
    expect(g[0].code).toBe('PHN1');
    expect(g[0].gap).toBeCloseTo(5, 6);
  });
  it('returns empty when no fn data at all', () => {
    expect(phnGaps([phns[1]], '1')).toHaveLength(0);
  });
});

describe('buildInsights', () => {
  it('produces cards with a below-95 headline', () => {
    const ins = buildInsights(ds, '1');
    expect(ins.length).toBeGreaterThanOrEqual(4);
    expect(ins.some((i) => /below the 95%/.test(i.title))).toBe(true);
  });
  it('identifies the lowest-coverage area', () => {
    const ins = buildInsights(ds, '1');
    expect(ins.some((i) => i.title.includes('Beta'))).toBe(true);
  });
  it('reports the 5-year trend movement', () => {
    const ins = buildInsights(ds, '1');
    expect(ins.some((i) => /since 2020/.test(i.title))).toBe(true);
  });
});
