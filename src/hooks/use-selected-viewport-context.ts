"use client";

import { useMemo } from "react";

import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  getViewportImageLayoutDefinition,
} from "@/lib/viewports/image-layouts";
import { sortKeyImageEntries } from "@/lib/viewports/key-images";
import { DEFAULT_VIEWPORT_MODE, DEFAULT_VIEWPORT_MPR_LAYOUT_ID } from "@/lib/viewports/mpr-layouts";
import { normalizeViewportMprSlabState } from "@/lib/viewports/mpr-slab";
import {
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
} from "@/lib/viewports/sequence-sync";
import {
  buildSeriesKey,
  getOrderedSeriesEntries,
} from "@/lib/viewports/series-selection";
import type { DicomHierarchyResponse } from "@/types/dicom";
import { createEmptyViewportAnnotationsState } from "@/types/viewport-annotations";
import { getViewerSettingsDefaultMprSlabState } from "@/lib/settings/overlay";
import type { ViewerSettings } from "@/types/settings";

interface UseSelectedViewportContextOptions {
  hierarchy: DicomHierarchyResponse | null;
  viewerSettings: ViewerSettings;
  selectedViewportId: string;
  viewportSeriesAssignments: Record<string, string | null>;
  viewportAnnotationsStateById: Record<string, import("@/types/viewport-annotations").ViewportAnnotationsState>;
  viewportImageLayoutIdById: Record<string, import("@/lib/viewports/image-layouts").ViewportImageLayoutId>;
  viewportModeById: Record<string, import("@/lib/viewports/mpr-layouts").ViewportMode>;
  viewportMprLayoutIdById: Record<string, import("@/lib/viewports/mpr-layouts").ViewportMprLayoutId>;
  viewportMprSlabStateById: Record<string, import("@/lib/viewports/mpr-slab").ViewportMprSlabState>;
  viewportCineStateById: Record<string, import("@/lib/viewports/cine").ViewportCineState>;
  viewportInvertEnabled: Record<string, boolean>;
  viewportKeyImagesBySeriesKey: Record<string, import("@/lib/viewports/key-images").KeyImageEntry[]>;
  viewportSequenceSyncStateById: Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>;
  stackViewportRuntimeStateById: Record<string, import("@/lib/viewports/sequence-sync").StackViewportRuntimeState | null>;
  stackViewportReferenceLineStateById: Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>;
  mprViewportReferenceLineStateById: Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>;
  referenceLinesEnabled: boolean;
  crossStudyCalibrationByPairKey: Record<string, import("@/lib/viewports/sequence-sync").CrossStudyCalibration>;
}

export function useSelectedViewportContext({
  hierarchy,
  viewerSettings,
  selectedViewportId,
  viewportSeriesAssignments,
  viewportAnnotationsStateById,
  viewportImageLayoutIdById,
  viewportModeById,
  viewportMprLayoutIdById,
  viewportMprSlabStateById,
  viewportCineStateById,
  viewportInvertEnabled,
  viewportKeyImagesBySeriesKey,
  viewportSequenceSyncStateById,
  stackViewportRuntimeStateById,
  stackViewportReferenceLineStateById,
  mprViewportReferenceLineStateById,
  referenceLinesEnabled,
  crossStudyCalibrationByPairKey,
}: UseSelectedViewportContextOptions) {
  const orderedSeriesEntries = useMemo(
    () => getOrderedSeriesEntries(hierarchy),
    [hierarchy],
  );
  const seriesEntryMap = useMemo(
    () =>
      new Map(orderedSeriesEntries.map((entry) => [entry.key, entry] as const)),
    [orderedSeriesEntries],
  );
  const activeViewportAnnotationsState =
    viewportAnnotationsStateById[selectedViewportId] ??
    createEmptyViewportAnnotationsState();
  const activeViewportSeriesEntry =
    seriesEntryMap.get(viewportSeriesAssignments[selectedViewportId] ?? "") ??
    null;
  const activeViewportSeriesKey =
    viewportSeriesAssignments[selectedViewportId] ?? null;
  const activeViewportRuntimeState =
    stackViewportRuntimeStateById[selectedViewportId] ?? null;
  const activeViewportCurrentFrameIndex =
    activeViewportRuntimeState?.status === "ready"
      ? activeViewportRuntimeState.currentFrameIndex
      : null;
  const activeViewportInvertEnabled =
    viewportInvertEnabled[selectedViewportId] ?? false;
  const selectedViewportMode =
    viewportModeById[selectedViewportId] ?? DEFAULT_VIEWPORT_MODE;
  const activeViewportImageLayoutId =
    viewportImageLayoutIdById[selectedViewportId] ??
    DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID;
  const activeViewportMprLayoutId =
    viewportMprLayoutIdById[selectedViewportId] ??
    DEFAULT_VIEWPORT_MPR_LAYOUT_ID;
  const viewerDefaultMprSlabState = useMemo(
    () => getViewerSettingsDefaultMprSlabState(viewerSettings),
    [viewerSettings],
  );
  const activeViewportMprSlabState = normalizeViewportMprSlabState(
    viewportMprSlabStateById[selectedViewportId],
    viewerDefaultMprSlabState,
  );
  const activeViewportImageLayout = getViewportImageLayoutDefinition(
    activeViewportImageLayoutId,
  );
  const activeViewportHasMontageLayout =
    selectedViewportMode === "stack" && activeViewportImageLayout.cellCount > 1;
  const activeViewportCineState = viewportCineStateById[selectedViewportId];
  const activeViewportCineEnabled =
    selectedViewportMode === "stack" &&
    !activeViewportHasMontageLayout &&
    ((activeViewportSeriesEntry?.series.images.length ?? 0) > 1);
  const activeViewportViewCommandsEnabled =
    selectedViewportMode === "stack" && !activeViewportHasMontageLayout;
  const activeViewportSequenceSyncState =
    viewportSequenceSyncStateById[selectedViewportId] ??
    DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
  const activeViewportCrossStudyCalibrationCount = Object.values(
    crossStudyCalibrationByPairKey,
  ).filter(
    (calibration) =>
      calibration.leftViewportId === selectedViewportId ||
      calibration.rightViewportId === selectedViewportId,
  ).length;
  const hasReferenceLineSource =
    referenceLinesEnabled &&
    ((selectedViewportMode === "stack" &&
      activeViewportImageLayoutId === DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID) ||
      selectedViewportMode === "mpr");
  const referenceLineStateByViewportId =
    selectedViewportMode === "mpr"
      ? mprViewportReferenceLineStateById
      : stackViewportReferenceLineStateById;
  const referenceLineSourceViewportId = hasReferenceLineSource
    ? selectedViewportId
    : null;
  const referenceLineSourceState =
    referenceLineSourceViewportId != null
      ? (referenceLineStateByViewportId[referenceLineSourceViewportId] ?? null)
      : null;
  const activeViewportKeyImageEntries = useMemo(
    () =>
      activeViewportSeriesKey
        ? sortKeyImageEntries(
            viewportKeyImagesBySeriesKey[activeViewportSeriesKey] ?? [],
          )
        : [],
    [activeViewportSeriesKey, viewportKeyImagesBySeriesKey],
  );
  const activeViewportKeyImageListEnabled =
    selectedViewportMode === "stack" && Boolean(activeViewportSeriesKey);

  return {
    orderedSeriesEntries,
    seriesEntryMap,
    buildSeriesKey,
    activeViewportAnnotationsState,
    activeViewportSeriesEntry,
    activeViewportSeriesKey,
    activeViewportRuntimeState,
    activeViewportCurrentFrameIndex,
    activeViewportInvertEnabled,
    selectedViewportMode,
    activeViewportImageLayoutId,
    activeViewportMprLayoutId,
    viewerDefaultMprSlabState,
    activeViewportMprSlabState,
    activeViewportImageLayout,
    activeViewportHasMontageLayout,
    activeViewportCineState,
    activeViewportCineEnabled,
    activeViewportViewCommandsEnabled,
    activeViewportSequenceSyncState,
    activeViewportCrossStudyCalibrationCount,
    referenceLineSourceViewportId,
    referenceLineSourceState,
    activeViewportKeyImageEntries,
    activeViewportKeyImageListEnabled,
  };
}
