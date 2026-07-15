// Coverage colour scale — diverging around the 95% herd-immunity line.
// The SAME scale is used everywhere (map, table pills, matrix, bars, histogram)
// so a colour always means the same coverage level.

export const HERD_IMMUNITY = 95;

export interface Band {
  min: number; // inclusive
  label: string;
  color: string;
  text: string; // legible text colour on that fill
}

// Ordered high → low.
export const BANDS: Band[] = [
  { min: 95, label: '≥95% (herd immunity)', color: '#15803d', text: '#ffffff' },
  { min: 94, label: '94–95%', color: '#4d9f5b', text: '#ffffff' },
  { min: 92, label: '92–94%', color: '#84cc16', text: '#14340a' },
  { min: 90, label: '90–92%', color: '#eab308', text: '#3a2c00' },
  { min: 87, label: '87–90%', color: '#f97316', text: '#3a1500' },
  { min: 0, label: 'below 87%', color: '#dc2626', text: '#ffffff' },
];

export const SUPPRESSED_COLOR = '#e2e8f0';

export function bandFor(v: number | null | undefined): Band | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  for (const b of BANDS) if (v >= b.min) return b;
  return BANDS[BANDS.length - 1];
}

export function covColor(v: number | null | undefined): string {
  const b = bandFor(v);
  return b ? b.color : SUPPRESSED_COLOR;
}

export function covText(v: number | null | undefined): string {
  const b = bandFor(v);
  return b ? b.text : '#475569';
}

// A darker, on-white-legible ink per band (for numbers/labels on light bg).
const INK: Record<string, string> = {
  '#15803d': '#15803d', '#4d9f5b': '#2f7d43', '#84cc16': '#557c0b',
  '#eab308': '#a16207', '#f97316': '#c2410c', '#dc2626': '#dc2626',
};
export function covInk(v: number | null | undefined): string {
  const b = bandFor(v);
  return b ? (INK[b.color] ?? b.color) : '#64748b';
}
