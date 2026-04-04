# Local Asset Library

Use this file before drawing new medical-viewer icons. It explains how to use the bundled SVG references under `assets/`.

## Directories

- `assets/Weasis/`: strong workstation-style references with heavier visual mass and explicit tool metaphors
- `assets/ohif/`: cleaner web-viewer references with consistent modern toolbar semantics

## How To Use Them

Use the bundled SVGs as benchmark snapshots for:

- semantic metaphor
- occupied area and silhouette strength
- relative stroke/fill balance
- pane framing and layout structure
- restrained two-tone placement

Do not copy source dimensions, colors, or incidental styling blindly. Normalize them to the destination icon system.

## When To Prefer Which Set

Prefer `Weasis` when:

- an icon feels too airy or too small
- a tool needs stronger pane or viewport structure
- the command is operational and should feel dense or instrument-like

Prefer `ohif` when:

- the icon belongs to a web-style toolbar or panel
- you need cleaner geometric simplification
- the command already has a strong modern viewer metaphor

Use both when:

- you want OHIF's clarity but Weasis's visual mass
- the repo needs a hybrid family that reads well in dense dark chrome

## Fast Lookup Hints

Start by searching nearby filenames for the concept you need:

- selection and navigation: `selection`, `pan`, `crosshair`, `zoom`, `mouse*`
- measurements and ROI: `measure`, `drawLine`, `drawAngle`, `drawEllipse`, `drawRectangle`, `drawPolyline`, `drawPolygon`
- viewport and layout: `layout`, `tile`, `orthographic`, `mpr-*`, `IconMPR`, `ViewportViews`
- display and rendering: `winLevel`, `lut`, `inverseLut`, `rotation`, `flip`, `reset`, `zoomBestFit`
- annotations and metadata: `drawText`, `metadata`, `DicomTagBrowser`, `keyImage`, `editKeyImage`
- sync and orchestration: `synch`, `synchLarge`, `synchStar`, `Link`, `JumpToSlice`

## Repo Guidance

For `/Users/hucheng/my/github/mini-viewer`, prefer:

- OHIF-like metaphor clarity
- Weasis-like occupied area and legibility
- muted dark-clinical accents instead of bright product colors
- literal tool semantics over consumer-app abstraction
