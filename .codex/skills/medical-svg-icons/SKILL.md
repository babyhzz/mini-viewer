---
name: medical-svg-icons
description: Use when creating or revising SVG icons for medical imaging, DICOM viewers, radiology tools, measurement tools, overlays, or toolbar actions. This skill enforces mainstream viewer benchmarking, a consistent icon system with fixed grid, strong semantic metaphors, larger perceived size, serious workstation styling, and optional two-tone color layers so icon sets stay visually unified and readable.
---

# Medical SVG Icons

Use this skill when icon quality depends on consistency more than novelty.

Goal: generate medical-imaging SVG icons that look like one family, feel serious and professional, render crisply in dense workstation UI, and communicate function immediately instead of relying on generic app metaphors.

## Benchmark First

When browsing is available, do not redesign icons from memory alone.

Before drawing or revising a set:

1. Benchmark at least 3 mainstream medical imaging viewers from official docs, official screenshots, or official repositories.
2. Write down what those products do well in terms of icon size, silhouette strength, literalness, and toolbar readability.
3. Borrow proven metaphors and proportions from that benchmark instead of inventing novelty.

Preferred benchmark set for this repo:

- OHIF
- Weasis
- RadiAnt
- 3D Slicer if multi-pane or crosshair behavior is relevant

If browsing is not available, read [references/market-benchmarks.md](references/market-benchmarks.md) before drawing.

## Default System

Unless the user explicitly asks otherwise:

- use `viewBox="0 0 24 24"`
- target a rendered size of `18px` to `22px`, but keep source art on the 24 grid
- optimize for a larger perceived size, not maximum empty margin
- default to a serious radiology-workstation style rather than a playful app-icon style
- prefer strong outline-plus-solid-accent icons over ultra-thin pure outline icons
- primary geometry may use `stroke="currentColor"` and a selective secondary fill or accent color
- use `stroke-width="1.9"` to `2.2` when needed for legibility at toolbar sizes
- use `stroke-linecap="round"` and `stroke-linejoin="round"`
- keep all meaningful strokes inside an optical safe area of roughly `1.5..22.5`
- align endpoints and major bends to whole or half-pixels for crisp rendering
- keep visual weight balanced across the set; avoid one icon feeling noticeably weaker or smaller than its neighbors

Default color behavior:

- mono is allowed, but do not default to mono if two-tone improves meaning
- for two-tone icons, keep one dominant ink color plus one restrained accent layer
- the accent layer should separate semantic planes, not decorate
- avoid bright consumer-app colors; prefer restrained clinical palettes

If the project already uses a different grid or visual language, match the existing system instead of forcing this one.

## Mini-Viewer Repo Defaults

For `/Users/hucheng/my/github/mini-viewer`, apply these repo-specific defaults unless the user explicitly overrides them:

- keep toolbar and dropdown icons in the same family and at the same rendered size
- use the shared size variable in `app/globals.css` (`--viewer-toolbar-icon-size`) instead of sizing menu and toolbar icons separately
- when drawing new repo-local icons, prefer a `32 x 32` source grid even if intermediate code still reuses legacy `24`-grid geometry
- prefer a lighter stroke band than generic outline systems; this repo currently targets about `2.1` to `2.35` effective stroke width on the `32` grid
- use dark muted accent colors for two-tone layers, such as steel blue or desaturated teal; do not fall back to gray-only accent planes unless mono is specifically requested
- the `pan` tool should default to a four-way cross-arrow metaphor, not a hand icon
- `select` should stay a cursor metaphor
- ROI icons should not include `+` or create badges
- `fit`, `reset`, `rotate`, and `flip` icons are primary toolbar actions, not submenu-only utilities
- if the toolbar gets crowded, let it wrap to multiple rows before shrinking icon size or hiding primary tools in overflow

## Workflow

1. Inspect nearby icons before drawing. Reuse the local style if it is already coherent.
2. Write the function in plain language first: what should a clinician or operator understand in under one second?
3. Reduce the concept to 1 primary metaphor plus at most 1 supporting cue.
4. Draw the strongest recognizable silhouette first, then add only the detail needed to disambiguate it.
5. Enlarge the visual mass until the icon no longer feels timid beside peers.
6. Normalize proportions against peer icons before delivering.
7. Return both the SVG and a short note explaining the metaphor, color logic, and any assumptions.

## Style Direction

Bias toward:

- serious
- clinical
- instrument-like
- stable
- deliberate
- professional workstation UI

Avoid:

- cute or playful metaphors
- overly airy line art
- consumer mobile-app icon language
- decorative flourishes that do not strengthen meaning
- over-rounded shapes that make tools feel toy-like
- “designy” originality that weakens industry-recognizable metaphors

## Size And Readability Rules

If an icon feels too small, the first fixes should usually be:

- enlarge the main silhouette
- reduce unused outer margin
- increase stroke weight slightly
- simplify inner detail
- promote one key shape to a filled or accented plane

Do not fix smallness by making the icon visually noisy.

## Borrowing Policy

For this skill, borrowing established medical-viewer icon ideas is preferred over inventing new metaphors.

- Favor adaptation over originality.
- Stay close to mainstream viewer metaphors when they are already clear and professional.
- It is acceptable to echo the structure of established viewer icons if that produces a more credible result.
- Do not drift toward generic SaaS iconography when the function is radiology-specific.

## Medical Viewer Heuristics

For DICOM and radiology tooling, prefer these metaphors:

- series, stack, study: layered frames, strips, or tiled panels
- measurement: ruler, caliper, segment, angle, ellipse, rectangle, or plotted handles
- MPR or layout: orthogonal panes, slice planes, tri-view grids, or crosshair axes
- window/level: grayscale ramp, contrast window, histogram-like split, or tone bracket
- annotations: mark, text leader, measured callout, or anchored note
- segmentation: contour, filled region edge, mask slab, or highlighted anatomy region
- sync/link: chain, paired panes, mirrored markers, or synchronized slice indicators
- settings: control panel, sliders, or structured parameters rather than a generic playful gear when context allows

Avoid:

- photoreal anatomy details
- too many tiny internal strokes
- ambiguous metaphors that could mean several commands
- icons whose center of mass is too small for the button they sit in
- relying on letters unless the product already does that
- ambiguous crosses that read as “close” instead of “medical”

## Output Contract

When generating mono icons, prefer this structure:

```svg
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="..." stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

When generating two-tone icons, prefer this structure:

```svg
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="..." fill="var(--icon-accent, #4C6FFF)" opacity="0.18"/>
  <path d="..." stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

Two-tone guidance:

- use the accent plane sparingly
- keep contrast readable in dark clinical UI
- the icon must still work if accent collapses to grayscale
- prefer structural accent areas such as a pane, mask, slice plane, or highlight target

If React/TSX is needed, convert the SVG cleanly without changing geometry.

## Consistency Checks

Before finalizing, verify:

- same `viewBox` across the set
- same stroke width band across the set
- same cap and join rules across the set
- no accidental fills unless intentional
- similar visual margin on all sides
- center of mass feels aligned with adjacent icons
- icon still reads at `18px`
- the icon does not feel optically undersized next to neighbors
- the metaphor is recognizable without reading the tooltip
- if two-tone is used, the accent improves meaning rather than merely styling
- dropdown menu icons and toolbar icons feel like the same set, not two different scales

## References

- For the concrete icon spec and dos/don'ts, read [references/system-spec.md](references/system-spec.md).
- For current benchmarked viewer references, read [references/market-benchmarks.md](references/market-benchmarks.md).
- For reusable prompting language, read [references/prompt-template.md](references/prompt-template.md).
- For a starter SVG shell, reuse [assets/icon-template-24.svg](assets/icon-template-24.svg).
