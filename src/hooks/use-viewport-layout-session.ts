"use client";

import { useEffect } from "react";

import {
  buildViewportSeriesAssignments,
  alignViewportAnnotationStateMap,
  alignViewportBooleanState,
  alignViewportCellSelectionState,
  alignViewportCineState,
  alignViewportImageLayoutState,
  alignViewportModeState,
  alignViewportMprLayoutState,
  alignViewportNullableStateMap,
  alignViewportSequenceSyncState,
} from "@/lib/viewports/session-alignment";
import { getViewportLayoutSlotIds, type ViewportLayoutId } from "@/lib/viewports/layouts";

interface UseViewportLayoutSessionOptions {
  hierarchySeriesKeys: string[];
  viewportLayoutId: ViewportLayoutId;
  setViewportSeriesAssignments: (
    updater: (previous: Record<string, string | null>) => Record<string, string | null>,
  ) => void;
  setViewportInvertEnabled: (
    updater: (previous: Record<string, boolean>) => Record<string, boolean>,
  ) => void;
  setViewportAnnotationsStateById: (
    updater: (previous: Record<string, import("@/types/viewport-annotations").ViewportAnnotationsState>) => Record<string, import("@/types/viewport-annotations").ViewportAnnotationsState>,
  ) => void;
  setViewportImageLayoutIdById: (
    updater: (previous: Record<string, import("@/lib/viewports/image-layouts").ViewportImageLayoutId>) => Record<string, import("@/lib/viewports/image-layouts").ViewportImageLayoutId>,
  ) => void;
  setViewportModeById: (
    updater: (previous: Record<string, import("@/lib/viewports/mpr-layouts").ViewportMode>) => Record<string, import("@/lib/viewports/mpr-layouts").ViewportMode>,
  ) => void;
  setViewportMprLayoutIdById: (
    updater: (previous: Record<string, import("@/lib/viewports/mpr-layouts").ViewportMprLayoutId>) => Record<string, import("@/lib/viewports/mpr-layouts").ViewportMprLayoutId>,
  ) => void;
  setViewportCellSelectionById: (
    updater: (previous: Record<string, import("@/stores/viewer-session-store").ViewportCellSelection>) => Record<string, import("@/stores/viewer-session-store").ViewportCellSelection>,
  ) => void;
  setViewportCineStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/cine").ViewportCineState>) => Record<string, import("@/lib/viewports/cine").ViewportCineState>,
  ) => void;
  setViewportSequenceSyncStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>) => Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>,
  ) => void;
  setStackViewportRuntimeStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/sequence-sync").StackViewportRuntimeState | null>) => Record<string, import("@/lib/viewports/sequence-sync").StackViewportRuntimeState | null>,
  ) => void;
  setStackViewportReferenceLineStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>) => Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>,
  ) => void;
  setMprViewportReferenceLineStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>) => Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>,
  ) => void;
  setStackViewportPresentationStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/sequence-sync").StackViewportPresentationState | null>) => Record<string, import("@/lib/viewports/sequence-sync").StackViewportPresentationState | null>,
  ) => void;
  setViewportStackNavigationCommandById: (
    updater: (previous: Record<string, import("@/lib/viewports/stack-navigation").ViewportStackNavigationCommand | null>) => Record<string, import("@/lib/viewports/stack-navigation").ViewportStackNavigationCommand | null>,
  ) => void;
  setViewportSequenceSyncCommandById: (
    updater: (previous: Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncCommand | null>) => Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncCommand | null>,
  ) => void;
  setViewportPresentationSyncCommandById: (
    updater: (previous: Record<string, import("@/lib/viewports/sequence-sync").ViewportPresentationSyncCommand | null>) => Record<string, import("@/lib/viewports/sequence-sync").ViewportPresentationSyncCommand | null>,
  ) => void;
  setViewportMprCrosshairSyncCommandById: (
    updater: (previous: Record<string, import("@/lib/viewports/mpr-crosshairs").ViewportMprCrosshairSyncCommand | null>) => Record<string, import("@/lib/viewports/mpr-crosshairs").ViewportMprCrosshairSyncCommand | null>,
  ) => void;
  setDicomTagDialogViewportId: (
    updater: (previous: string | null) => string | null,
  ) => void;
  setSelectedViewportId: (updater: (previous: string) => string) => void;
  setMaximizedViewportId: (
    updater: (previous: string | null) => string | null,
  ) => void;
}

export function useViewportLayoutSession({
  hierarchySeriesKeys,
  viewportLayoutId,
  setViewportSeriesAssignments,
  setViewportInvertEnabled,
  setViewportAnnotationsStateById,
  setViewportImageLayoutIdById,
  setViewportModeById,
  setViewportMprLayoutIdById,
  setViewportCellSelectionById,
  setViewportCineStateById,
  setViewportSequenceSyncStateById,
  setStackViewportRuntimeStateById,
  setStackViewportReferenceLineStateById,
  setMprViewportReferenceLineStateById,
  setStackViewportPresentationStateById,
  setViewportStackNavigationCommandById,
  setViewportSequenceSyncCommandById,
  setViewportPresentationSyncCommandById,
  setViewportMprCrosshairSyncCommandById,
  setDicomTagDialogViewportId,
  setSelectedViewportId,
  setMaximizedViewportId,
}: UseViewportLayoutSessionOptions) {
  useEffect(() => {
    const nextViewportIds = getViewportLayoutSlotIds(viewportLayoutId);

    setViewportSeriesAssignments((previous) =>
      buildViewportSeriesAssignments(
        nextViewportIds,
        previous,
        hierarchySeriesKeys,
      ),
    );
    setViewportInvertEnabled((previous) =>
      alignViewportBooleanState(nextViewportIds, previous, false),
    );
    setViewportAnnotationsStateById((previous) =>
      alignViewportAnnotationStateMap(nextViewportIds, previous),
    );
    setViewportImageLayoutIdById((previous) =>
      alignViewportImageLayoutState(nextViewportIds, previous),
    );
    setViewportModeById((previous) =>
      alignViewportModeState(nextViewportIds, previous),
    );
    setViewportMprLayoutIdById((previous) =>
      alignViewportMprLayoutState(nextViewportIds, previous),
    );
    setViewportCellSelectionById((previous) =>
      alignViewportCellSelectionState(nextViewportIds, previous),
    );
    setViewportCineStateById((previous) =>
      alignViewportCineState(nextViewportIds, previous),
    );
    setViewportSequenceSyncStateById((previous) =>
      alignViewportSequenceSyncState(nextViewportIds, previous),
    );
    setStackViewportRuntimeStateById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setStackViewportReferenceLineStateById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setMprViewportReferenceLineStateById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setStackViewportPresentationStateById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setViewportStackNavigationCommandById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setViewportSequenceSyncCommandById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setViewportPresentationSyncCommandById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setViewportMprCrosshairSyncCommandById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setDicomTagDialogViewportId((previous) =>
      previous && nextViewportIds.includes(previous) ? previous : null,
    );
    setSelectedViewportId((previous) =>
      nextViewportIds.includes(previous)
        ? previous
        : (nextViewportIds[0] ?? "viewport-1"),
    );
    setMaximizedViewportId((previous) =>
      previous && nextViewportIds.includes(previous) ? previous : null,
    );
  }, [
    hierarchySeriesKeys,
    setDicomTagDialogViewportId,
    setMaximizedViewportId,
    setMprViewportReferenceLineStateById,
    setSelectedViewportId,
    setStackViewportReferenceLineStateById,
    setStackViewportPresentationStateById,
    setStackViewportRuntimeStateById,
    setViewportAnnotationsStateById,
    setViewportCellSelectionById,
    setViewportCineStateById,
    setViewportImageLayoutIdById,
    setViewportInvertEnabled,
    setViewportModeById,
    setViewportMprLayoutIdById,
    setViewportMprCrosshairSyncCommandById,
    setViewportPresentationSyncCommandById,
    setViewportSequenceSyncCommandById,
    setViewportSequenceSyncStateById,
    setViewportSeriesAssignments,
    setViewportStackNavigationCommandById,
    viewportLayoutId,
  ]);
}
