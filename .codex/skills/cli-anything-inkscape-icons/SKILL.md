---
name: cli-anything-inkscape-icons
description: Use when creating or revising SVG icons with cli-anything-inkscape. This skill turns icon ideas into REPL-safe command batches, exports SVG plus .inkscape-cli.json state, and avoids the CLI persistence trap of separate one-shot commands.
---

# CLI Anything Inkscape Icons

Use this skill when the task is to create, revise, or iterate on SVG icons with `cli-anything-inkscape`.

This skill is about production workflow, not art direction. It defines how to generate editable SVG assets reproducibly with `cli-anything-inkscape`; it does not define the visual language of a medical viewer icon set.

For `/Users/hucheng/my/github/mini-viewer`, this skill is especially useful for repo-local icon work where we want:

- editable SVG output
- a saved `.inkscape-cli.json` project alongside the SVG
- command-driven generation that can be replayed

If the icon is for the viewer toolbar, menus, or medical-imaging UI, load [../medical-svg-icons/SKILL.md](../medical-svg-icons/SKILL.md) and treat that skill as the source of truth for metaphor, benchmark, proportions, and style. Use this skill only for the command-driven execution path.

## Default Output

Unless the user specifies otherwise:

- use a `32 x 32` canvas
- use `px` units
- use a transparent background
- export both `.inkscape-cli.json` and `.svg`
- prefer path-first geometry that stays easy to replay and edit

## Critical Persistence Rule

Do not rely on separate commands like:

```bash
cli-anything-inkscape --project icon.inkscape-cli.json shape add-path ...
cli-anything-inkscape --project icon.inkscape-cli.json style set-stroke ...
```

In real usage, object mutations live only inside that process unless the same REPL session later runs `document save`.

Preferred approaches:

1. use the bundled wrapper script
2. or run `cli-anything-inkscape repl` and feed a batch of commands in one session

## Workflow

1. If the task is medical-viewer icon work, load `medical-svg-icons` first for the visual spec.
2. Translate the chosen geometry into CLI primitives:
   - `shape add-path` for most production icons
   - `shape add-line` for straight guides or crosshairs
   - `shape add-rect` or `shape add-circle` for literal panels, frames, and badges
   - `gradient add-*` only when the upstream visual spec truly needs it
3. Build the command sequence in drawing order.
4. Run the wrapper script:

```bash
python3 .codex/skills/cli-anything-inkscape-icons/scripts/create_svg_icon.py \
  --project src/icons/tmp/example.inkscape-cli.json \
  --svg src/icons/tmp/example.svg \
  --name example \
  --cmd 'shape add-path --d "M 7 16 H 25" -s "fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"' \
  --cmd 'shape add-path --d "M 16 7 V 25" -s "fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"'
```

5. Inspect the generated SVG and iterate by editing the command list, not by relying on one-off manual fixes.
6. Save the project JSON so the geometry stays reproducible.
7. If visual normalization is needed, hand off to the relevant visual skill or local icon system rather than inventing style rules here.

## Practical Rules

- Prefer `shape add-path` with explicit `style` over adding a shape and styling it later unless index-based edits are clearer.
- When using `style set-*`, remember object indices are zero-based and depend on insertion order.
- Use `transform translate|rotate|scale` only when it simplifies geometry; otherwise write the final path directly.
- Save the project JSON so future edits can stay command-driven.
- Export PNG only as a preview; SVG is the source of truth for icons.

## When To Escalate

Load another skill or inspect references first if:

- the icon is part of a medical viewer tool family
- the metaphor is ambiguous
- multiple icons need to look like one set
- the request implies boolean path ops, advanced text handling, or broader visual-system decisions

## References

- Read [references/inkscape-svg-icon-sop.md](references/inkscape-svg-icon-sop.md) for the project-specific architecture summary and SOP.
- Read [references/command-cheatsheet.md](references/command-cheatsheet.md) for tested commands, wrapper usage, and a minimal working example.
