# Local Asset Library

This file records the current bundled-asset situation for `medical-svg-icons`.

## Current State

- the only bundled SVG asset that should be assumed to exist is `assets/icon-template-24.svg`
- vendor benchmark SVG libraries such as `assets/Weasis/` or `assets/ohif/` may be absent
- missing benchmark SVGs are not an error and should not block icon work

## Default Policy

When benchmark SVGs are unavailable:

- use [references/market-benchmarks.md](market-benchmarks.md) for the benchmark summary
- use official screenshots, docs, or repositories when browsing is available
- redraw fresh geometry in the destination icon system instead of reconstructing or restoring deleted vendor assets

## If Vendor Assets Return Later

Treat them as benchmark material only:

- borrow metaphor, silhouette logic, and visual mass
- do not paste vendor paths directly into the product icon set by default
- normalize everything to the repo's own stroke, spacing, scale, and accent system
