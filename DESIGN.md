# Mini Viewer Design

## Goals

- Keep the DICOM viewer modular enough that stack, MPR, sync, settings, and storage can evolve independently.
- Preserve a one-way dependency flow: `components -> hooks -> lib/types/stores`, never `stores/lib -> components`.
- Keep high-value viewer behavior testable at two layers:
  - pure logic in unit tests
  - end-to-end behavior in Playwright smoke coverage

## Subsystems

### App Shell

- [src/components/dicom-viewer-app.tsx](/Users/hucheng/my/github/mini-viewer/src/components/dicom-viewer-app.tsx) is the orchestration surface for viewer state, toolbar actions, panel visibility, and viewport rendering.
- The app shell should prefer small hooks for lifecycle-heavy concerns:
  - bootstrap
  - keyboard shortcuts
  - selected viewport derived context
  - viewport layout session alignment
  - sync coordination

### Session Store

- Viewer session state is centralized in Zustand under [src/stores/viewer-session-store.ts](/Users/hucheng/my/github/mini-viewer/src/stores/viewer-session-store.ts).
- The store is intentionally thin; state contracts and construction live in:
  - [src/stores/viewer-session/types.ts](/Users/hucheng/my/github/mini-viewer/src/stores/viewer-session/types.ts)
  - [src/stores/viewer-session/defaults.ts](/Users/hucheng/my/github/mini-viewer/src/stores/viewer-session/defaults.ts)
  - [src/stores/viewer-session/helpers.ts](/Users/hucheng/my/github/mini-viewer/src/stores/viewer-session/helpers.ts)
  - slice files in [src/stores/viewer-session](/Users/hucheng/my/github/mini-viewer/src/stores/viewer-session)
- Components should prefer selectors from [src/stores/viewer-session/selectors.ts](/Users/hucheng/my/github/mini-viewer/src/stores/viewer-session/selectors.ts) over whole-store destructuring.

### Viewports

- Stack and MPR viewports remain separate React components because their Cornerstone runtime models differ materially.
- Shared runtime concerns should live under [src/lib/cornerstone/viewport-runtime](/Users/hucheng/my/github/mini-viewer/src/lib/cornerstone/viewport-runtime):
  - container sizing
  - wheel navigation normalization
  - future recovery / initialization helpers

### Sync Command Flow

1. A viewport emits runtime or presentation state into the session store.
2. The app shell derives a sync snapshot from store state.
3. Pure sync modules under [src/lib/viewports/sync](/Users/hucheng/my/github/mini-viewer/src/lib/viewports/sync) compute target commands.
4. The React coordinator hook writes command maps back into the store.
5. Target viewport components consume command objects and apply them locally.

This keeps coordination rules pure and deterministic while leaving only subscription and dispatch mechanics inside React.

## Dependency Direction

- `src/components` may import from `src/hooks`, `src/lib`, `src/stores`, and `src/types`.
- `src/hooks` may import from `src/lib`, `src/stores`, and `src/types`.
- `src/stores` may import from `src/lib` and `src/types`.
- `src/lib` may import from `src/types`.
- `src/types` should not import from UI or stores.

The annotation domain state now follows that rule through [src/types/viewport-annotations.ts](/Users/hucheng/my/github/mini-viewer/src/types/viewport-annotations.ts).

## Data Access

### DICOM

- Public filesystem entrypoints stay in [src/lib/dicom/filesystem.ts](/Users/hucheng/my/github/mini-viewer/src/lib/dicom/filesystem.ts) as a thin facade.
- Responsibility is split into:
  - [src/lib/dicom/dicom-path.ts](/Users/hucheng/my/github/mini-viewer/src/lib/dicom/dicom-path.ts)
  - [src/lib/dicom/dicom-metadata.ts](/Users/hucheng/my/github/mini-viewer/src/lib/dicom/dicom-metadata.ts)
  - [src/lib/dicom/dicom-hierarchy-repository.ts](/Users/hucheng/my/github/mini-viewer/src/lib/dicom/dicom-hierarchy-repository.ts)
  - [src/lib/dicom/dicom-file-repository.ts](/Users/hucheng/my/github/mini-viewer/src/lib/dicom/dicom-file-repository.ts)

### Viewer Settings

- API routes should talk to the service layer, not raw SQLite details.
- The settings stack is:
  - [src/lib/settings/settings-db.ts](/Users/hucheng/my/github/mini-viewer/src/lib/settings/settings-db.ts)
  - [src/lib/settings/settings-repository.ts](/Users/hucheng/my/github/mini-viewer/src/lib/settings/settings-repository.ts)
  - [src/lib/settings/viewer-settings-service.ts](/Users/hucheng/my/github/mini-viewer/src/lib/settings/viewer-settings-service.ts)

## Test Layers

### Unit

- Pure settings, layout, shortcut, slab, and sync target logic belongs in `tests/unit`.
- Unit tests should not depend on React, DOM rendering, or Playwright.

### E2E

- Playwright specs are split by domain under [tests/e2e](/Users/hucheng/my/github/mini-viewer/tests/e2e):
  - API
  - layout
  - stack tools
  - MPR
  - sync
  - settings
  - responsive
- Shared actions and expectations live in `tests/e2e/support`.

## Maintenance Rules

- When adding viewer state, first decide whether it is:
  - persisted settings
  - session state
  - transient viewport-local runtime
- When adding a sync rule, prefer a new pure function under `src/lib/viewports/sync` and keep React hooks as adapters only.
- When touching toolbar or viewport behavior, update the relevant Playwright domain spec and unit tests if pure logic changed.
