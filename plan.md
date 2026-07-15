# Site Plan: Immunisation Coverage

## Overview
- **Name:** Immunisation Coverage
- **Repo name:** au-immunisation
- **Tagline:** Is your area protected? Childhood vaccination coverage for every Australian region, measured against the 95% herd-immunity line.

### Naming Convention
Plain topic name "Immunisation Coverage"; country lives in the index `country: "AU"` field (flag).

## Target Audience
Parents and prospective parents checking whether their local area reaches herd immunity; public-health workers, GPs, journalists and policy people tracking under-vaccinated pockets and the Aboriginal & Torres Strait Islander coverage gap. Mostly general public on phones, plus desktop analysts.

## Value Proposition
The Department of Health publishes childhood immunisation coverage as dozens of separate state/PHN Excel workbooks that almost nobody opens. This unifies them into one map + explorer: find your exact SA3, see the % of 1/2/5-year-olds fully immunised, how it compares to the 95% herd-immunity threshold, which specific vaccines lag, and the gap between all children and First Nations children. Nothing else lets a parent type their area and get this instantly.

## Data Sources
| Source | URL | What it provides | Update frequency | Auth required? |
|--------|-----|-------------------|-----------------|----------------|
| AIR childhood immunisation coverage — PHN (all children) | health.gov.au childhood-immunisation-coverage collection | % fully + per-antigen coverage, 31 PHNs × 3 age groups | Quarterly (rolling 4 quarters) | No |
| AIR childhood immunisation coverage — PHN (First Nations) | same collection | Same, Aboriginal & Torres Strait Islander cohort | Quarterly | No |
| AIR childhood immunisation coverage — SA3 (per state) | same collection, 8 state workbooks | ~340 SA3s × 3 age groups, all antigens | Quarterly | No |
| ABS ASGS 2021 SA3 boundaries (generalised) | geo.abs.gov.au ArcGIS ASGS2021/SA3 layer 1 (SA3_GEN) | 359 SA3 polygons for the choropleth | Every ASGS edition (~5yr) | No |

## Key Features
1. SA3 choropleth map coloured against the 95% herd-immunity line, age toggle (1/2/5yr), click-through drill-down.
2. Priority leaderboard — SA3s ranked by coverage / gap-to-95, filter by state & age.
3. Searchable explorer table — every SA3, % fully + all antigens, sort/filter.
4. Vaccine × age matrix heatmap — which antigen at which milestone lags.
5. First Nations equity view — all-children vs First Nations coverage per PHN, ranked by gap.
6. Trends — national average % fully by age group over ~2015→2025 (best-effort history).
7. Distribution histogram — how many SA3s sit in each coverage band.
8. Auto-insights — areas below herd immunity, biggest gaps, worst vaccine/age, First Nations gap.
Plus glossary tooltips, About modal, per-SA3 hash-linked drill-down.

## Style Direction
**Tone:** calm/reassuring, civic-health, trustworthy.
**Colour palette:** clinical light theme — soft white/paper background, deep teal primary, a green→amber→red diverging scale keyed to the 95% herd-immunity line. Health-portal feel, not a terminal.
**UI density:** balanced.
**Dark/light theme:** light.
**Reference sites for tone:** health.gov.au data pages, ourworldindata coverage explorers.

## Technical Architecture
- **Stack:** Vanilla TypeScript + Vite.
- **Data strategy:** pipeline — quarterly cron (source is quarterly, rolling four quarters). Data committed to public/data/.
- **Key libraries:** Leaflet (SA3 choropleth). Everything else hand-rolled SVG. Pipeline uses openpyxl-equivalent (SheetJS `xlsx`) + mapshaper.

## Layout
Fixed header (title + About/? + threshold legend). Sticky nav tabs (words only). Main content fills; footer sticky at bottom. Map/table/charts each in their own overflow-safe container. Panels stack < 768px.

## Pages/Views
Single-page app, hash-routed views: Map, Leaderboard, Explorer, Vaccines (matrix), First Nations, Trends, Distribution, Insights; plus `#sa3=<code>` drill-down panel.

## Visualization Strategy
- **Map (choropleth):** answers "is *my* area protected?" — geographic, threshold-coloured. Hero.
- **Leaderboard:** answers "where are the worst/best pockets?" — ranked, gap-to-95.
- **Explorer table:** answers "exact numbers for any area + which vaccine" — sortable/filterable.
- **Vaccine × age matrix:** answers "which vaccine at which milestone is dragging coverage down?" — heatmap.
- **First Nations equity:** answers "how big is the gap for First Nations kids, and where?" — paired ranked bars.
- **Trends:** answers "is it getting better or worse?" — multi-year lines by age group.
- **Distribution histogram:** answers "how many areas fall below herd immunity?" — binned counts.
- **Insights:** auto-surfaced anomalies and headline findings.
Sankey/network deliberately omitted — the data has no inter-entity flows; forms are chosen for this dataset's shape (geographic + threshold + equity + composition).
