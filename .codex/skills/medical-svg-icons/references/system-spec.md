# Medical SVG Icon System Spec

Use this when the user wants a fresh icon family or asks why icons feel inconsistent, too small, too weak, or not serious enough.

## Geometry

- Base grid: `24 x 24`
- Optical padding: about `1.5` to `2`
- Default stroke width: `2`
- Minimum gap between parallel strokes: about `1.5`
- Minimum enclosed negative space: about `2 x 2`
- Default corner treatment: controlled round caps and joins
- Main silhouette should usually occupy more area than in generic outline icon sets

## Optical Priorities

In this skill, the order of priority is:

1. functional clarity
2. serious visual tone
3. perceived size
4. family consistency
5. decorative elegance

If an icon is elegant but reads small or vague, it is wrong for this system.

## Composition

- One icon should express one action.
- Keep to 1 primary shape and 0-2 helper shapes.
- Prefer symmetry when the action is structural, such as layout or MPR.
- Prefer slight asymmetry when the action is directional, such as cursor or annotation.
- Internal detail should never overpower the outer silhouette.
- The dominant shape should be legible from a quick peripheral glance.

## Two-Tone Rules

- Two-tone is encouraged when it makes the function easier to understand.
- Use one primary ink plus one restrained accent.
- Accent planes should be broad and quiet, not tiny colored decorations.
- Good use of accent: active pane, highlighted region, mask slab, selected slice, focused target.
- Bad use of accent: random colored dot, arbitrary gradient, ornamental shading.

Suggested restrained palettes for dark medical UI:

- `currentColor` + muted cyan
- `currentColor` + steel blue
- `currentColor` + desaturated teal
- `currentColor` + dim amber for warnings only

Keep the system usable in monochrome fallbacks.

## Family Rules

- If one tool icon uses an outer frame, related tool icons should usually keep that frame logic.
- Do not let one icon appear 20 percent smaller than its peers.
- If one icon uses a filled accent plane, related icons should use accent planes with similar area and opacity.
- If one icon is diagonal-heavy, check neighboring icons so the toolbar does not become visually noisy.

## Mapping For This Repo

The viewer toolbar in `/Users/hucheng/my/github/mini-viewer/src/components/app-icon.tsx` is now project-local. When adding or replacing icons here:

- prefer a `32 x 32` source grid for new repo-local icon work
- favor toolbar readability over decorative fidelity
- use stronger metaphors than the current overly generic set
- increase visual mass when an icon feels timid in the button
- allow restrained two-tone accents where they clarify pane structure, selection, mask, or focus
- prefer “medical workstation” tone over generic consumer tooling
- keep toolbar and dropdown icons on the same visual scale by following `--viewer-toolbar-icon-size` in `app/globals.css`
- keep stroke weight slightly lighter than the generic default; on the repo's `32`-grid target this is roughly `2.1` to `2.35`
- use dark muted accent colors such as steel blue / desaturated teal instead of gray-only accents or bright saturated blue
- use a four-way cross-arrow icon for `pan`
- keep ROI icons as pure geometry without `+` markers
- keep `fit`, `reset`, `rotateRight`, `flipHorizontal`, and `flipVertical` as first-level toolbar actions

## Delivery Format

Prefer one of these outputs depending on the request:

1. raw SVG
2. TSX icon component
3. a small icon set with shared geometry notes

When producing a set, include a one-line table or bullet list mapping icon names to intended meanings, and note whether the set is mono or two-tone.
