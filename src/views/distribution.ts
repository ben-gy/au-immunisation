import type { Ctx } from '../main';
import { withData, countBelow, type Age } from '../data';
import { binCoverage, layoutHistogram, median, fmtPct } from '../format';
import { covColor } from '../scale';
import { ageControl, wireAge, viewHead } from '../ui';

export function renderDistribution(ctx: Ctx): void {
  const { root, ds } = ctx;
  const age = ctx.age as Age;
  const values = withData(ds.sa3, age).map((s) => s.cov[age].fully as number);
  const total = values.length;
  const { edges, counts } = binCoverage(values);
  const med = median(values);
  const meet = total - countBelow(ds.sa3, age, 95);
  const below90 = countBelow(ds.sa3, age, 90);

  const W = 900, H = 380, padL = 40, padR = 20, padT = 20, padB = 46;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const bars = layoutHistogram(counts, edges, plotW, plotH, 8);

  const label = (from: number, to: number) => (to > 99 ? `${from}+` : `${from}–${to}`);
  let barSvg = '';
  let xlab = '';
  bars.forEach((b) => {
    const mid = (b.from + Math.min(b.to, 100)) / 2;
    const x = padL + b.x, y = padT + b.y;
    barSvg += `<rect class="hist-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${b.w.toFixed(1)}" height="${b.h.toFixed(1)}" rx="3" fill="${covColor(mid)}" data-tip="${label(b.from, b.to)}% coverage — ${b.count} region${b.count === 1 ? '' : 's'} (${Math.round((b.count / total) * 100)}%)"/>`;
    if (b.count > 0) barSvg += `<text x="${(x + b.w / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-secondary)">${b.count}</text>`;
    xlab += `<text x="${(x + b.w / 2).toFixed(1)}" y="${H - padB + 18}" text-anchor="middle" font-size="10.5">${label(b.from, b.to)}</text>`;
  });
  // 95 line: left edge of last bin
  const lastBin = bars[bars.length - 1];
  const lineX = padL + lastBin.x - 4;
  const herd = `<line class="ref-line" x1="${lineX.toFixed(1)}" y1="${padT}" x2="${lineX.toFixed(1)}" y2="${padT + plotH}"/>` +
    `<text class="ref-label" x="${(lineX - 6).toFixed(1)}" y="${padT + 12}" text-anchor="end">95% line →</text>`;
  const baseline = `<line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="var(--border-default)"/>`;

  root.innerHTML =
    viewHead(
      'How the regions spread out',
      `Distribution of the ${total} SA3 regions by fully-immunised coverage at the ${age}-year milestone. A healthy system would pile up to the right of the 95% line — most regions sit to the left.`
    ) +
    `<div class="controls">${ageControl(ctx)}</div>
     <div class="stat-row">
       <div class="stat"><div class="stat-val">${fmtPct(med, 1)}</div><div class="stat-label">Median region coverage</div></div>
       <div class="stat good"><div class="stat-val">${meet}</div><div class="stat-label">Regions at or above 95%</div></div>
       <div class="stat ${below90 > 0 ? 'bad' : ''}"><div class="stat-val">${below90}</div><div class="stat-label">Regions below 90%</div></div>
     </div>
     <div class="panel panel-pad">
       <div class="chart-scroll">
         <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Histogram of regional immunisation coverage">
           ${baseline}${barSvg}${herd}${xlab}
           <text x="${padL}" y="${H - 6}" font-size="11" fill="var(--text-tertiary)">Fully immunised coverage (%)</text>
         </svg>
       </div>
       <p class="note">Bars are shaded on the coverage colour scale. Hover a bar for the exact count.</p>
     </div>`;
  wireAge(ctx, root);
}
