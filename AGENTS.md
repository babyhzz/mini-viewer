# Repository Guidelines

## Project Structure & Module Organization
This repository is a single-project Next.js DICOM viewer.

- `app/`: App Router pages, global styles, providers, and API routes.
- `app/api/hierarchy/route.ts`: Scans `dicom/` and returns the study/series/image tree.
- `app/api/dicom/route.ts`: Streams `.dcm` files by validated relative path.
- `app/api/settings/route.ts`: Reads and writes persisted viewer settings from local SQLite storage and always responds with `no-store`.
- `app/providers.tsx`: Ant Design registry/theme setup and the React 19 compatibility patch import.
- `src/components/`: Viewer UI pieces such as the left navigator, thumbnails, and Cornerstone viewport.
- `src/components/viewer-settings-drawer.tsx`: Right-side settings panel for viewport overlay configuration.
- `src/lib/`: Shared runtime logic, including DICOM filesystem access and Cornerstone initialization.
- `src/lib/settings/`: Viewer settings defaults, normalization, overlay schema helpers, and SQLite persistence.
- `src/lib/tools/`: Registry-driven viewport toolbar definitions, Cornerstone tool-group wiring, and the custom polyline measurement tool.
- `src/types/`: Shared DTO and type definitions.
- `tests/e2e/`: Playwright smoke tests for API and browser-level viewer behavior.
- `dicom/`: Local sample data in `study/series/image.dcm` layout. Treat as input data, not app source.
- `storage/`: Runtime SQLite files for persisted viewer settings. Treat as local state, not application source.

## Build, Test, and Development Commands
- `npm install`: Install project dependencies.
- `npm run dev`: Start the local development server.
- `npm run build`: Create a production build and catch bundling issues.
- `npm run start`: Run the production build locally.
- `npm run lint`: Run Next.js ESLint checks.
- `npm run typecheck`: Run strict TypeScript validation.
- `npm run test:e2e`: Run Playwright smoke tests against the production build.
- `npm run test:e2e:dev`: Run Playwright against `next dev` while iterating locally.
- `npm run test:e2e:headed`: Run Playwright in headed mode while debugging UI behavior locally.
- `npm run verify`: Run lint, typecheck, build, and Playwright end-to-end checks in sequence.

After every feature or bug fix, run `npm run verify`. Use `npm run test:e2e:dev` only for faster local iteration; the merge gate should remain `npm run verify`.

## Coding Style & Naming Conventions
- Use TypeScript with strict typing; avoid `any` unless there is no workable alternative.
- Follow existing 2-space indentation and double-quoted strings.
- Prefer small, focused modules under `src/lib/` and `src/components/`.
- Use `PascalCase` for React components, `camelCase` for functions/variables, and descriptive file names such as `stack-viewport.tsx`.
- Keep API route logic thin; move reusable logic into `src/lib/`.
- Keep viewport tools registry-driven. When adding tools, actions, or groups, update `src/lib/tools/registry.ts`, `src/lib/tools/cornerstone-tool-adapter.ts`, and the relevant UI/tests together.
- Treat viewer settings as schema-driven persisted documents. Extend defaults and normalization in `src/lib/settings/overlay.ts` before changing the stored shape.

## Toolbar Icon & Viewer Chrome Rules
- Treat `src/components/app-icon.tsx` as the single source of truth for project-local toolbar and menu icons. Do not reintroduce external icon packages for the viewer toolbar UI.
- When revising medical-viewer icons, follow the project skill at `.codex/skills/medical-svg-icons/` and keep metaphors aligned with mainstream viewers such as OHIF, Weasis, and RadiAnt.
- Prefer literal, workstation-style toolbar metaphors:
  - `select`: cursor / pointer
  - `pan`: four-way cross arrows, not a hand icon
  - measurement tools: ruler / line / angle / polyline semantics
  - ROI tools: plain geometry without add/create `+` badges
- Keep `fit`, `reset`, `rotateRight`, `flipHorizontal`, and `flipVertical` as first-level toolbar actions instead of hiding them inside a viewer-ops submenu.
- The viewport toolbar should wrap to multiple rows when space is tight; do not default back to overflow-first behavior for primary tools.
- Keep toolbar buttons and dropdown menu icons on the same rendered size system. Use the shared size variable in `app/globals.css` rather than tuning menu and toolbar icon sizes independently.
- Two-tone accents should stay dark, restrained, and clinical. Avoid bright consumer-app colors or gray-only accents when a muted steel-blue / teal accent improves readability.
- When touching toolbar iconography or toolbar structure, update the relevant Playwright smoke coverage and run `npm run verify`.

## Testing Guidelines
Every change should pass:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`

Add browser tests under `tests/e2e/` using `*.spec.ts`. Prefer stable selectors such as `data-testid` for viewer state, active series, and viewport readiness.
Current smoke coverage also exercises `/api/settings`, the settings drawer, toolbar tool groups, invert behavior, measurement and ROI drawing flows, and responsive layout constraints. Preserve or extend those checks when touching those areas.

## Commit & Pull Request Guidelines
Git history is not available in this workspace, so use clear, conventional commit subjects such as `feat: add series thumbnail loading` or `fix: validate dicom path traversal`.

For pull requests:
- Explain the user-facing change and affected paths.
- List validation steps you ran.
- Include screenshots or short recordings for UI changes.
- Mention any Playwright failures you fixed or intentionally deferred.
- Note any assumptions about `dicom/` directory structure or browser-only Cornerstone behavior.

## Security & Configuration Tips
- Never trust the `path` query param directly; keep DICOM access inside `dicom/`.
- Do not commit patient data or large new DICOM datasets without approval.
- If you change Cornerstone or webpack config, verify both `npm run dev` and `npm run build`.
- Keep `app/api/settings/route.ts` on the Node runtime because it depends on `better-sqlite3`; do not move it to Edge runtime.
- Keep the React 19 Ant Design compatibility patch import in `app/providers.tsx` unless the UI stack is intentionally changed.
- Keep the split Next.js build directories in `next.config.ts` (`.next-dev` for dev and `.next` for build/start) to avoid dev/prod chunk cache collisions during hot updates.
- Do not hand-edit or commit transient `storage/viewer-settings.sqlite*` artifacts unless the task explicitly requires a persisted fixture change.

## DICOM Data Workflow
When adding sample studies, prefer public, de-identified IDC data and keep the existing `dicom/<study>/<series>/*.dcm` structure.

- Install IDC CLI once: `python3 -m pip install --user idc-index --upgrade`
- Inspect available IDC data at `https://portal.imaging.datacommons.cancer.gov/explore/`
- Use dry-run first to confirm size:
  `idc download-from-selection --dry-run true --download-dir dicom --series-instance-uid '<SERIES_UID>' --dir-template '%collection_id-%StudyInstanceUID/%Modality_%SeriesInstanceUID'`
- Download the selected series:
  `idc download-from-selection --download-dir dicom --series-instance-uid '<SERIES_UID>' --dir-template '%collection_id-%StudyInstanceUID/%Modality_%SeriesInstanceUID'`
- Prefer smaller CT/MR series for local development so `npm run test:e2e` stays fast.

Current IDC-backed examples in this repository include:
- `cmb_crc-.../CT_...`
- `nlst-.../CT_...`
- `prostate_mri_us_biopsy-.../MR_...`
