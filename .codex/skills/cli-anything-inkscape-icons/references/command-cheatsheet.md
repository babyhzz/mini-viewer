# cli-anything-inkscape Command Cheatsheet

This cheatsheet summarizes the tested command surface relevant to SVG icon work in this repository.

## Top-Level Commands

`cli-anything-inkscape --help` exposes:

- `document`
- `shape`
- `style`
- `transform`
- `layer`
- `path`
- `gradient`
- `text`
- `export`
- `session`
- `repl`

## Tested Icon-Relevant Options

### Document

```bash
cli-anything-inkscape document new --help
cli-anything-inkscape document save --help
```

Key options:

- `document new -w/--width -h/--height -u/--units -bg/--background -n/--name -o/--output`
- `document save [PATH]`

### Shape

```bash
cli-anything-inkscape shape add-path --help
cli-anything-inkscape shape add-rect --help
cli-anything-inkscape shape add-circle --help
cli-anything-inkscape shape add-line --help
cli-anything-inkscape shape add-polygon --help
```

Useful options:

- `shape add-path --d "M ... Z" -s "fill:none;stroke:#000;stroke-width:2"`
- `shape add-rect --x 4 --y 4 -w 16 -h 16 -s "..."`
- `shape add-circle --cx 12 --cy 12 --r 3 -s "..."`
- `shape add-line --x1 4 --y1 12 --x2 20 --y2 12 -s "..."`
- `shape add-polygon --points "6,12 12,6 18,12" -s "..."`

### Style

```bash
cli-anything-inkscape style set-fill --help
cli-anything-inkscape style set-stroke --help
cli-anything-inkscape style set --help
```

Useful options:

- `style set-fill INDEX COLOR`
- `style set-stroke INDEX COLOR -w 2`
- `style set INDEX PROP VALUE`

Remember: `INDEX` is zero-based and follows object insertion order.

### Transform

```bash
cli-anything-inkscape transform translate --help
cli-anything-inkscape transform rotate --help
cli-anything-inkscape transform scale --help
```

Useful options:

- `transform translate INDEX TX --ty TY`
- `transform rotate INDEX ANGLE --cx 12 --cy 12`
- `transform scale INDEX SX --sy SY`

### Export

```bash
cli-anything-inkscape export svg --help
cli-anything-inkscape export png --help
```

Useful options:

- `export svg OUTPUT_PATH --overwrite`
- `export png OUTPUT_PATH --overwrite`

## Safe Execution Pattern

Do not rely on multiple separate `--project ... <mutating command>` calls.

Use one REPL batch instead:

```text
document new -w 32 -h 32 -bg transparent -n icon -o /tmp/icon.inkscape-cli.json
shape add-rect --x 6 --y 6 -w 20 -h 20 -s "fill:none;stroke:#000;stroke-width:2"
document save
export svg /tmp/icon.svg --overwrite
exit
```

Then run:

```bash
cli-anything-inkscape repl < /tmp/icon.commands.txt
```

## Bundled Wrapper Script

Use the project script to generate a REPL batch automatically:

```bash
python3 .codex/skills/cli-anything-inkscape-icons/scripts/create_svg_icon.py \
  --project .tmp/icon.inkscape-cli.json \
  --svg .tmp/icon.svg \
  --name icon \
  --cmd 'shape add-path --d "M 7 16 H 25" -s "fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"' \
  --cmd 'shape add-path --d "M 16 7 V 25" -s "fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round"'
```

Optional:

- add `--png .tmp/icon.png` for a raster preview
- add `--print-commands` to inspect the generated REPL script

## Minimal Working Example

This exact pattern was validated locally:

```bash
python3 .codex/skills/cli-anything-inkscape-icons/scripts/create_svg_icon.py \
  --project .tmp/frame.inkscape-cli.json \
  --svg .tmp/frame.svg \
  --name frame \
  --cmd 'shape add-rect --x 6 --y 6 -w 20 -h 20 -s "fill:none;stroke:#000;stroke-width:2"'
```

Result:

- the JSON project contains the rectangle object
- the SVG contains the rectangle geometry
- both files are reproducible from the same command list
