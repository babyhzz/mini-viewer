---
name: js-ts-clean-code
description: Use when refactoring JavaScript or TypeScript for readability, maintainability, and type safety. Triggers on nested ternaries, repeated branching over string ids, duplicated UI metadata, large render branches, lookup-table refactors, and efforts to codify industry coding best practices.
---

# JS/TS Clean Code

Apply this skill when code works but is getting hard to read, extend, or trust.

## Focus Areas

- Replace nested ternaries and long `if` chains with named helper functions or typed lookup tables.
- Keep one source of truth for UI metadata such as labels, `data-testid`, icons, and menu wiring.
- Use `Record<Union, T>`, `as const`, `Set`, and `Map` to make repeated id-based logic explicit and type-safe.
- Prefer guard clauses and early returns over deep nesting.
- Keep React render logic declarative; move branching-heavy derivation into small pure functions before introducing extra hooks.

## Workflow

1. Find readability hotspots.
   Look for nested ternaries, repeated `item.id === ...` checks, duplicated string literals, and derived state spread across JSX.

2. Choose the lightest abstraction that removes repetition.
   Use a typed config object for static metadata, a pure helper for dynamic labels/titles, and `Set`/`Map` for repeated membership or lookup checks.

3. Preserve behavior while shrinking decision points.
   Keep public props, event ordering, `data-testid`, and UI text stable unless the task explicitly changes behavior.

4. Encode the rule so the code does not regress.
   Prefer adding or tightening lint rules when a smell is objective and cheap to enforce, such as `no-nested-ternary`.

5. Validate after the refactor.
   Run lint, typecheck, and the relevant tests once the structural changes are complete.

## React Notes

- For React and Next.js components, pair this skill with [`vercel-react-best-practices`](/Users/hucheng/.codex/skills/vercel-react-best-practices/SKILL.md).
- Derive display state during render when it is cheap and synchronous.
- Avoid moving logic into effects when a pure function or typed config is enough.

## References

For concise source-backed rationale and links, read `references/sources.md`.
