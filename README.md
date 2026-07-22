# Immunisation Coverage

**Childhood vaccination coverage for every Australian region (SA3), measured against the 95% herd-immunity line.**

🔗 **Live:** [https://au-immunisation.benrichardson.dev](https://au-immunisation.benrichardson.dev)

## What is this?

Australia's childhood immunisation coverage is published by the Department of Health as dozens of separate state and Primary Health Network Excel workbooks — accurate, but almost nobody opens them. This site unifies them into one map and explorer, and holds every region up against the 95% coverage needed for **herd immunity** against highly infectious diseases like measles and whooping cough.

For each of ~340 SA3 regions it shows the share of children who are fully immunised at the 1, 2 and 5 year milestones, plus coverage of every individual vaccine (DTP, polio, Hib, hepatitis B, MMR, pneumococcal, meningococcal, varicella). It also surfaces the gap between all children and Aboriginal & Torres Strait Islander children at PHN level — a Closing the Gap target — and tracks the national trend, which has slipped back below the herd-immunity line since its 2020 peak.

The figures are the Australian Immunisation Register's rolling-four-quarters release, so they are robust to small-area noise and update quarterly.

## Who is this for?

Parents and prospective parents checking whether their local area reaches herd immunity; GPs, public-health and immunisation staff spotting under-vaccinated pockets; journalists and policy people tracking coverage and the First Nations gap. It works on a phone (a stressed parent looking up their suburb) and on a desktop (an analyst comparing regions).

## Data Sources

| Source | What it provides | Update frequency |
|--------|-------------------|-----------------|
| Australian Immunisation Register — childhood immunisation coverage (Dept of Health, Disability and Ageing) | % fully immunised + per-vaccine coverage, by SA3 (per-state) and PHN (all children + First Nations), 1/2/5-year milestones | Quarterly (rolling four quarters) |
| ABS ASGS 2021 Statistical Area Level 3 boundaries | SA3 polygons for the choropleth map | Per ASGS edition (~5 years) |

## Features

- **Map** — SA3 choropleth shaded against the 95% line, with an age toggle and click-through to a per-region breakdown.
- **Priority leaderboard** — every region ranked, "needs attention" first, filterable by state.
- **Explorer** — sortable, searchable table of every region and every vaccine.
- **Vaccines** — a state × vaccine heatmap showing which antigen at which milestone is dragging coverage down.
- **First Nations** — all-children vs Aboriginal & Torres Strait Islander coverage per PHN, ranked by gap.
- **Trends** — national average coverage by milestone, 2015–2025, against the 95% target.
- **Distribution** — histogram of how the regions spread out around herd immunity.
- **Insights** — auto-detected headline findings, plus a plain-language glossary and About panel.

## Tech Stack

- **Runtime:** Vanilla TypeScript
- **Build:** Vite 6
- **Testing:** Vitest (46 tests, incl. positional histogram-layout tests)
- **Hosting:** GitHub Pages (static, no backend)
- **Data:** GitHub Actions pipeline (quarterly) → JSON in `public/data/`
- **Maps:** Leaflet + GeoJSON (ABS ASGS 2021, mapshaper-simplified)

## Local Development

```bash
npm install      # install dependencies
npm run dev      # start dev server
npm test         # run tests
npm run build    # production build
npm run preview  # preview production build

# refresh the data (also runs quarterly in CI)
cd pipeline && npm install
node collect.mjs && node aggregate.mjs
```

## How it works

`pipeline/collect.mjs` scrapes the Department of Health collection page, discovers and downloads the newest coverage workbook for each state (SA3) and nationally (PHN, all children + First Nations), parses them with SheetJS, and fetches ABS SA3 boundaries from the ABS ArcGIS service. `pipeline/aggregate.mjs` shapes the data into compact JSON and simplifies the boundaries with mapshaper. The browser loads those static files and renders everything client-side — no API keys, no backend.

## license

[GNU Affero General Public License v3.0 or later](./LICENSE), with an attribution
requirement added under section 7(b) — see
[ADDITIONAL-TERMS.md](./ADDITIONAL-TERMS.md).

In short: you may run, modify, redistribute and even sell this, but if you
distribute it — or run a modified version where other people can reach it — you
have to publish your source under the same licence and keep the attribution. A
separate commercial licence without those obligations is available on request:
<hi@ben.gy>.

Third-party components keep their own licences — see
[THIRD-PARTY-NOTICES.md](./THIRD-PARTY-NOTICES.md).
