import {
  createDefaultViewportCineState,
  normalizeViewportCineState,
  type ViewportCineState,
} from "@/lib/viewports/cine";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  DEFAULT_VIEWPORT_MODE,
  DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
  type ViewportMode,
  type ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import {
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  type ViewportSequenceSyncState,
} from "@/lib/viewports/sequence-sync";
import type {
  ViewportAnnotationsState,
} from "@/types/viewport-annotations";
import {
  createEmptyViewportAnnotationsState,
} from "@/types/viewport-annotations";
import type { ViewportCellSelection } from "@/stores/viewer-session-store";

export function alignViewportBooleanState(
  viewportIds: string[],
  previousState: Record<string, boolean>,
  fallbackValue: boolean,
) {
  return viewportIds.reduce<Record<string, boolean>>(
    (nextState, viewportId) => {
      nextState[viewportId] = previousState[viewportId] ?? fallbackValue;
      return nextState;
    },
    {},
  );
}

export function alignViewportAnnotationStateMap(
  viewportIds: string[],
  previousState: Record<string, ViewportAnnotationsState>,
) {
  return viewportIds.reduce<Record<string, ViewportAnnotationsState>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? createEmptyViewportAnnotationsState();
      return nextState;
    },
    {},
  );
}

export function alignViewportImageLayoutState(
  viewportIds: string[],
  previousState: Record<string, ViewportImageLayoutId>,
) {
  return viewportIds.reduce<Record<string, ViewportImageLayoutId>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID;
      return nextState;
    },
    {},
  );
}

export function alignViewportModeState(
  viewportIds: string[],
  previousState: Record<string, ViewportMode>,
) {
  return viewportIds.reduce<Record<string, ViewportMode>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? DEFAULT_VIEWPORT_MODE;
      return nextState;
    },
    {},
  );
}

export function alignViewportMprLayoutState(
  viewportIds: string[],
  previousState: Record<string, ViewportMprLayoutId>,
) {
  return viewportIds.reduce<Record<string, ViewportMprLayoutId>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? DEFAULT_VIEWPORT_MPR_LAYOUT_ID;
      return nextState;
    },
    {},
  );
}

export function alignViewportCellSelectionState(
  viewportIds: string[],
  previousState: Record<string, ViewportCellSelection>,
) {
  return viewportIds.reduce<Record<string, ViewportCellSelection>>(
    (nextState, viewportId) => {
      nextState[viewportId] = previousState[viewportId] ?? "all";
      return nextState;
    },
    {},
  );
}

export function alignViewportCineState(
  viewportIds: string[],
  previousState: Record<string, ViewportCineState>,
) {
  return viewportIds.reduce<Record<string, ViewportCineState>>(
    (nextState, viewportId) => {
      nextState[viewportId] = previousState[viewportId]
        ? normalizeViewportCineState(previousState[viewportId])
        : createDefaultViewportCineState();
      return nextState;
    },
    {},
  );
}

export function alignViewportSequenceSyncState(
  viewportIds: string[],
  previousState: Record<string, ViewportSequenceSyncState>,
) {
  return viewportIds.reduce<Record<string, ViewportSequenceSyncState>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
      return nextState;
    },
    {},
  );
}

export function alignViewportNullableStateMap<T>(
  viewportIds: string[],
  previousState: Record<string, T | null>,
) {
  return viewportIds.reduce<Record<string, T | null>>(
    (nextState, viewportId) => {
      nextState[viewportId] = previousState[viewportId] ?? null;
      return nextState;
    },
    {},
  );
}

export function buildViewportSeriesAssignments(
  viewportIds: string[],
  previousAssignments: Record<string, string | null>,
  orderedSeriesKeys: string[],
) {
  const nextAssignments = viewportIds.reduce<Record<string, string | null>>(
    (assignments, viewportId) => {
      const previousSeriesKey = previousAssignments[viewportId];
      assignments[viewportId] =
        previousSeriesKey && orderedSeriesKeys.includes(previousSeriesKey)
          ? previousSeriesKey
          : null;
      return assignments;
    },
    {},
  );

  if (orderedSeriesKeys.length === 0) {
    return nextAssignments;
  }

  const usedSeriesKeys = new Set(
    Object.values(nextAssignments).filter((seriesKey): seriesKey is string =>
      Boolean(seriesKey),
    ),
  );
  const remainingSeriesKeys = orderedSeriesKeys.filter(
    (seriesKey) => !usedSeriesKeys.has(seriesKey),
  );
  let recycleIndex = 0;

  for (const viewportId of viewportIds) {
    if (nextAssignments[viewportId]) {
      continue;
    }

    if (remainingSeriesKeys.length) {
      nextAssignments[viewportId] = remainingSeriesKeys.shift() ?? null;
      continue;
    }

    nextAssignments[viewportId] =
      orderedSeriesKeys[recycleIndex % orderedSeriesKeys.length] ?? null;
    recycleIndex += 1;
  }

  return nextAssignments;
}
