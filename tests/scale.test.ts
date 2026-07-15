import { describe, expect, it } from 'vitest';
import { bandFor, covColor, covText, covInk, BANDS, SUPPRESSED_COLOR, HERD_IMMUNITY } from '../src/scale';

describe('coverage colour scale', () => {
  it('herd-immunity constant is 95', () => expect(HERD_IMMUNITY).toBe(95));

  it('95 and above map to the green herd-immunity band', () => {
    expect(bandFor(95)!.color).toBe('#15803d');
    expect(bandFor(99.5)!.color).toBe('#15803d');
    expect(covColor(96)).toBe('#15803d');
  });

  it('below 87 maps to red', () => {
    expect(covColor(80)).toBe('#dc2626');
    expect(covColor(86.9)).toBe('#dc2626');
  });

  it('boundaries pick the correct band', () => {
    expect(bandFor(94)!.color).toBe('#4d9f5b');
    expect(bandFor(93.9)!.color).toBe('#84cc16');
    expect(bandFor(90)!.color).toBe('#eab308');
    expect(bandFor(89.9)!.color).toBe('#f97316');
  });

  it('null/undefined/NaN -> suppressed colour, no band', () => {
    expect(bandFor(null)).toBeNull();
    expect(bandFor(NaN)).toBeNull();
    expect(covColor(null)).toBe(SUPPRESSED_COLOR);
    expect(covColor(undefined)).toBe(SUPPRESSED_COLOR);
  });

  it('bands are ordered high -> low by min', () => {
    for (let i = 1; i < BANDS.length; i++) expect(BANDS[i].min).toBeLessThan(BANDS[i - 1].min);
  });

  it('text + ink colours are defined for every value', () => {
    expect(covText(96)).toBe('#ffffff');
    expect(covInk(90)).toBe('#a16207');
    expect(covInk(null)).toBe('#64748b');
  });
});
