# Inkscape SVG Icon SOP

This reference adapts the provided "Inkscape: Project-Specific Analysis & SOP" to the `mini-viewer` repository and the installed `cli-anything-inkscape` tool.

## Architecture Summary

Inkscape's native format is SVG, which means icon generation can stay fully text-based:

- the final artifact is SVG XML
- project state is tracked in a sidecar `.inkscape-cli.json`
- shapes, layers, styles, transforms, and gradients map cleanly to CLI commands

That makes the CLI suitable for deterministic icon generation workflows where we want reproducible geometry instead of manual GUI-only editing.

## Why This Fits Icon Work

For small icons we usually need:

- a fixed `24 x 24` coordinate system
- a handful of paths or simple shapes
- explicit fill and stroke styling
- precise transforms when reusing geometry

Those all map well to the CLI's supported operations:

- `document new`
- `shape add-path|add-rect|add-circle|add-line|add-polygon`
- `style set-fill|set-stroke|set`
- `transform translate|rotate|scale`
- `layer add|move-object`
- `export svg`

## Project Format

The JSON sidecar tracks the working document:

- document width, height, units, and background
- object list with ids, types, geometry, style, transform, and layer
- layers and gradients
- metadata timestamps

This is valuable for icons because we can revisit generated work later without reverse-engineering the final SVG.

## Important Real-World Constraint

`cli-anything-inkscape` is stateful inside a single process.

Observed behavior in this environment:

- `document new -o file.json` writes the initial project
- `--project file.json shape add-*` mutates in memory for that process
- a later separate process reopening `--project file.json` does not see the unsaved mutation

So the safe workflow is:

1. run a single `cli-anything-inkscape repl` session
2. send all drawing commands there
3. run `document save`
4. run `export svg`

The bundled wrapper script automates exactly that.

## Recommended Icon Workflow

1. Define the icon metaphor in plain language.
2. Reduce it to one or two SVG primitives or paths.
3. Start a transparent `24 x 24` document.
4. Add shapes in visual stacking order.
5. Prefer full style strings on creation for stable, replayable commands.
6. Save the project JSON.
7. Export SVG.
8. Compare the result against neighboring icons for optical weight and margin.

## Shape Strategy

For icons, the most useful primitives are:

- `shape add-path`: best for final production geometry
- `shape add-rect`: panels, frames, ROI boxes, viewport blocks
- `shape add-circle`: handles, targets, nodes
- `shape add-line`: crosshair arms, rulers, axes
- `shape add-polygon`: simple chevrons or wedges

Use gradients sparingly. Most toolbar icons in this repo should stay mono or restrained two-tone.

## Rendering Notes

- SVG export is the high-fidelity path and should be treated as the canonical output.
- PNG export is good for previews, but the CLI's Pillow renderer is only basic.
- If advanced rendering is needed, Inkscape itself can still render from the exported SVG.

## Deliverables

For each generated icon, prefer producing:

- `<name>.inkscape-cli.json`
- `<name>.svg`
- optionally a command file or repeated `--cmd` list that explains how it was built

That gives the next contributor a fully reproducible edit path.
