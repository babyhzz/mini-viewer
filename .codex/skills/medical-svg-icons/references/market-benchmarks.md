# Market Benchmarks

Use this file when you need current, professional icon references for medical imaging viewers and cannot browse, or when you want a quick synthesis before drawing.

Benchmarks last updated: March 29, 2026.

These notes are a visual inference from official product pages and screenshots, not a verbatim summary of product documentation.

## Official Sources

- OHIF toolbar docs: https://docs.ohif.org/user-guide/viewer/toolbar/
- Weasis user guide, DICOM 2DViewer: https://weasis.org/en/basics/index.print.html
- RadiAnt basic tools manual: https://www.radiantviewer.com/dicom-viewer-manual/using_basic_tools.html

## Synthesis

### OHIF

- Best for: modern web viewer toolbar language
- Visual traits:
  - high-contrast monochrome icons on dark chrome
  - consistent 24-28 grid usage
  - measurement and ROI tools use literal, professional metaphors
  - minimal ornament, strong silhouette discipline
- Borrow from OHIF when:
  - building web-native viewer toolbars
  - drawing measurement, ROI, layout, sync, tag, and settings icons

### Weasis

- Best for: dense workstation readability
- Visual traits:
  - stronger visual mass than lightweight web icon sets
  - layout and viewport tools read clearly even in busy clinical toolbars
  - multi-pane and slice-related actions are expressed literally
- Borrow from Weasis when:
  - an icon feels too small or too airy
  - a tool needs a more explicit pane or viewport metaphor

### RadiAnt

- Best for: obvious, operator-first command recognition
- Visual traits:
  - bold, quickly scannable tool glyphs
  - less abstract than general consumer UI iconography
  - primary shapes dominate over small decorative detail
- Borrow from RadiAnt when:
  - a tool needs stronger immediate recognition
  - an icon should feel more practical and less “designed”

## Guidance For This Repo

For `/Users/hucheng/my/github/mini-viewer/src/components/app-icon.tsx`:

- Prefer OHIF-style tool metaphors as the base language.
- Increase icon size and occupied area closer to Weasis and RadiAnt.
- Keep toolbar icons credible in a dark diagnostic workspace.
- Use restrained two-tone only when it improves structure, such as:
  - active pane
  - highlighted slice plane
  - ROI region
  - selected target
- If an icon looks like a generic settings/dashboard/web app icon, redraw it.
