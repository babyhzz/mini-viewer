#!/usr/bin/env python3
"""Create an SVG icon with cli-anything-inkscape in one REPL session.

This wrapper exists because separate one-shot invocations with
`cli-anything-inkscape --project ... shape add-*` do not persist mutations
unless the same process later runs `document save`.
"""

from __future__ import annotations

import argparse
import shlex
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create an SVG icon through cli-anything-inkscape REPL batching.",
    )
    parser.add_argument("--project", required=True, help="Output .inkscape-cli.json path")
    parser.add_argument("--svg", required=True, help="Output SVG path")
    parser.add_argument("--png", help="Optional PNG preview output path")
    parser.add_argument("--name", default="icon", help="Document name")
    parser.add_argument("--width", type=float, default=24, help="Canvas width")
    parser.add_argument("--height", type=float, default=24, help="Canvas height")
    parser.add_argument("--units", default="px", help="Canvas units")
    parser.add_argument(
        "--background",
        default="transparent",
        help="Document background color",
    )
    parser.add_argument(
        "--cmd",
        action="append",
        default=[],
        help="A single REPL command to append. May be provided multiple times.",
    )
    parser.add_argument(
        "--commands-file",
        action="append",
        default=[],
        help="Path to a text file with one REPL command per line.",
    )
    parser.add_argument(
        "--print-commands",
        action="store_true",
        help="Print the generated REPL command batch before execution.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print the captured cli-anything-inkscape output after execution.",
    )
    return parser.parse_args()


def read_command_files(paths: list[str]) -> list[str]:
    commands: list[str] = []
    for raw_path in paths:
        path = Path(raw_path)
        for line in path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            commands.append(stripped)
    return commands


def quote(value: str | Path | float) -> str:
    return shlex.quote(str(value))


def build_repl_script(args: argparse.Namespace, commands: list[str]) -> str:
    project_path = Path(args.project)
    svg_path = Path(args.svg)

    lines = [
        (
            "document new "
            f"-w {args.width} "
            f"-h {args.height} "
            f"-u {quote(args.units)} "
            f"-bg {quote(args.background)} "
            f"-n {quote(args.name)} "
            f"-o {quote(project_path)}"
        )
    ]
    lines.extend(commands)
    lines.append("document save")
    lines.append(f"export svg {quote(svg_path)} --overwrite")
    if args.png:
        lines.append(f"export png {quote(Path(args.png))} --overwrite")
    lines.append("exit")
    return "\n".join(lines) + "\n"


def ensure_outputs(args: argparse.Namespace) -> None:
    expected = [Path(args.project), Path(args.svg)]
    if args.png:
        expected.append(Path(args.png))

    missing = [str(path) for path in expected if not path.exists()]
    if missing:
        raise RuntimeError(f"cli-anything-inkscape finished without creating: {', '.join(missing)}")


def main() -> int:
    args = parse_args()
    commands = read_command_files(args.commands_file) + list(args.cmd)
    if not commands:
        print("At least one drawing command is required via --cmd or --commands-file.", file=sys.stderr)
        return 2

    Path(args.project).parent.mkdir(parents=True, exist_ok=True)
    Path(args.svg).parent.mkdir(parents=True, exist_ok=True)
    if args.png:
        Path(args.png).parent.mkdir(parents=True, exist_ok=True)

    repl_script = build_repl_script(args, commands)
    if args.print_commands:
        print(repl_script, end="")

    result = subprocess.run(
        ["cli-anything-inkscape", "repl"],
        input=repl_script,
        text=True,
        capture_output=True,
        check=False,
    )

    if args.verbose and result.stdout:
        print(result.stdout, end="")
    if args.verbose and result.stderr:
        print(result.stderr, end="", file=sys.stderr)

    if result.returncode != 0:
        if result.stdout:
            print(result.stdout, end="")
        if result.stderr:
            print(result.stderr, end="", file=sys.stderr)
        return result.returncode

    try:
        ensure_outputs(args)
    except RuntimeError as exc:
        if result.stdout:
            print(result.stdout, end="")
        if result.stderr:
            print(result.stderr, end="", file=sys.stderr)
        print(str(exc), file=sys.stderr)
        return 1

    print(f"project={Path(args.project)}")
    print(f"svg={Path(args.svg)}")
    if args.png:
        print(f"png={Path(args.png)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
