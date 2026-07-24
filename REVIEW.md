# Immunisation Coverage — Build Review

This file exists only to create a reviewable PR. All code is already deployed on `main`.

**Merge this PR to acknowledge the build.** Closing without merging is also fine.

## Links

- **GitHub Pages:** https://ben-gy.github.io/au-immunisation/ *(redirects to custom domain once DNS is set)*
- **Custom domain:** https://au-immunisation.benrichardson.dev

## What it is

Childhood immunisation coverage for every Australian SA3 region, measured against the 95% herd-immunity line — unifying the Department of Health's per-state / per-PHN Australian Immunisation Register releases into one map + explorer, with a First Nations equity view and a 2015–2025 trend.

## DNS setup (already provisioned)

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `au-immunisation` | `ben-gy.github.io` | DNS only (grey cloud) |
