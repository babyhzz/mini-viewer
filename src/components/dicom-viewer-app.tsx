"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Spin } from "antd";

import { AnnotationListDrawer } from "@/components/annotation-list-drawer";
import { AppIcon } from "@/components/app-icon";
import { MprViewport } from "@/components/mpr-viewport";
import {
  createEmptyViewportAnnotationsState,
  type ViewportAnnotationsState,
} from "@/components/viewport-annotations";
import { StackViewport } from "@/components/stack-viewport";
import { ThumbnailCanvas } from "@/components/thumbnail-canvas";
import { ViewerSettingsDrawer } from "@/components/viewer-settings-drawer";
import { ViewportToolbar } from "@/components/viewport-toolbar";
import {
  createDefaultViewerSettings,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";
import {
  findToolbarShortcutCommandId,
  getToolbarShortcutBindingFromKeyboardEvent,
  isToolbarShortcutToolCommand,
} from "@/lib/settings/shortcuts";
import type { ViewportAnnotationCommand } from "@/lib/tools/cornerstone-tool-adapter";
import {
  createDefaultViewportToolGroupSelections,
  getViewportToolGroupId,
  isViewportToolSupportedInMpr,
  type ViewportAction,
  type ViewportTool,
  type ViewportToolGroupSelections,
} from "@/lib/tools/registry";
import {
  DEFAULT_VIEWPORT_MODE,
  DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
  type ViewportMode,
  type ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import {
  DEFAULT_VIEWPORT_LAYOUT_ID,
  getViewportLayoutDefinition,
  getViewportLayoutSlotIds,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  getViewportImageLayoutDefinition,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  areImagesSliceAligned,
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  createCrossStudyCalibration,
  findCrossStudySyncedFrameIndex,
  findNearestImageIndexBySlicePosition,
  getImageSliceNormal,
  getImageSliceScalar,
  getSequenceSyncPairKey,
  hasEnabledViewportSequenceSync,
  toggleViewportSequenceSyncType,
  type CrossStudyCalibration,
  type StackViewportRuntimeState,
  type ViewportSequenceSyncCommand,
  type ViewportSequenceSyncState,
  type ViewportSequenceSyncType,
} from "@/lib/viewports/sequence-sync";
import type {
  ViewportViewCommand,
  ViewportWindowPresetId,
} from "@/lib/viewports/view-commands";
import type {
  DicomHierarchyResponse,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";
import type { ViewerSettings } from "@/types/settings";

interface SelectedSeries {
  key: string;
  study: DicomStudyNode;
  series: DicomSeriesNode;
}

type ViewportCellSelection = "all" | number;

type ViewportAnnotationCommandInput =
  | {
      type: "select";
      annotationUID: string;
    }
  | {
      type: "delete";
      annotationUIDs: string[];
    }
  | {
      type: "clearAll";
    };

function buildSeriesKey(studyId: string, seriesId: string) {
  return `${studyId}::${seriesId}`;
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function getOrderedSeriesEntries(
  hierarchy: DicomHierarchyResponse | null,
): SelectedSeries[] {
  if (!hierarchy) {
    return [];
  }

  return hierarchy.studies.flatMap((study) =>
    study.series.map((series) => ({
      key: buildSeriesKey(study.studyId, series.seriesId),
      study,
      series,
    })),
  );
}

function alignViewportBooleanState(
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

function alignViewportAnnotationStateMap(
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

function alignViewportImageLayoutState(
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

function alignViewportModeState(
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

function alignViewportMprLayoutState(
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

function alignViewportCellSelectionState(
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

function alignViewportSequenceSyncState(
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

function alignViewportNullableStateMap<T>(
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

function buildViewportSeriesAssignments(
  viewportIds: string[],
  previousAssignments: Record<string, string | null>,
  orderedSeriesKeys: string[],
) {
  const availableSeriesKeys = new Set(orderedSeriesKeys);
  const nextAssignments = viewportIds.reduce<Record<string, string | null>>(
    (assignments, viewportId) => {
      const previousSeriesKey = previousAssignments[viewportId];

      assignments[viewportId] =
        previousSeriesKey && availableSeriesKeys.has(previousSeriesKey)
          ? previousSeriesKey
          : null;

      return assignments;
    },
    {},
  );

  if (!orderedSeriesKeys.length) {
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

export function DicomViewerApp() {
  const { modal } = App.useApp();
  const annotationCommandIdRef = useRef(0);
  const viewCommandIdRef = useRef(0);
  const sequenceSyncCommandIdRef = useRef(0);
  const manualSequenceSyncRequestIdRef = useRef(0);
  const processedStackSyncTokenByViewportRef = useRef<Record<string, number>>(
    {},
  );
  const processedManualSequenceSyncRequestIdRef = useRef(0);
  const [hierarchy, setHierarchy] = useState<DicomHierarchyResponse | null>(
    null,
  );
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>(
    createDefaultViewerSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeViewportTool, setActiveViewportTool] =
    useState<ViewportTool>("select");
  const [viewportLayoutId, setViewportLayoutId] = useState<ViewportLayoutId>(
    DEFAULT_VIEWPORT_LAYOUT_ID,
  );
  const [maximizedViewportId, setMaximizedViewportId] = useState<string | null>(
    null,
  );
  const [selectedViewportId, setSelectedViewportId] =
    useState<string>("viewport-1");
  const [viewportSeriesAssignments, setViewportSeriesAssignments] = useState<
    Record<string, string | null>
  >({});
  const [viewportInvertEnabled, setViewportInvertEnabled] = useState<
    Record<string, boolean>
  >({});
  const [viewportToolGroupSelections, setViewportToolGroupSelections] =
    useState<ViewportToolGroupSelections>(
      createDefaultViewportToolGroupSelections(),
    );
  const [annotationCommand, setAnnotationCommand] =
    useState<ViewportAnnotationCommand | null>(null);
  const [viewCommand, setViewCommand] = useState<ViewportViewCommand | null>(
    null,
  );
  const [viewportAnnotationsStateById, setViewportAnnotationsStateById] =
    useState<Record<string, ViewportAnnotationsState>>({});
  const [viewportImageLayoutIdById, setViewportImageLayoutIdById] = useState<
    Record<string, ViewportImageLayoutId>
  >({});
  const [viewportModeById, setViewportModeById] = useState<
    Record<string, ViewportMode>
  >({});
  const [viewportMprLayoutIdById, setViewportMprLayoutIdById] = useState<
    Record<string, ViewportMprLayoutId>
  >({});
  const [viewportCellSelectionById, setViewportCellSelectionById] = useState<
    Record<string, ViewportCellSelection>
  >({});
  const [viewportSequenceSyncStateById, setViewportSequenceSyncStateById] =
    useState<Record<string, ViewportSequenceSyncState>>({});
  const [stackViewportRuntimeStateById, setStackViewportRuntimeStateById] =
    useState<Record<string, StackViewportRuntimeState | null>>({});
  const [viewportSequenceSyncCommandById, setViewportSequenceSyncCommandById] =
    useState<Record<string, ViewportSequenceSyncCommand | null>>({});
  const [crossStudyCalibrationByPairKey, setCrossStudyCalibrationByPairKey] =
    useState<Record<string, CrossStudyCalibration>>({});
  const [manualSequenceSyncRequest, setManualSequenceSyncRequest] = useState<{
    id: number;
    sourceViewportId: string;
  } | null>(null);
  const [annotationListOpen, setAnnotationListOpen] = useState(false);
  const [dicomTagDialogViewportId, setDicomTagDialogViewportId] = useState<
    string | null
  >(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const viewportIds = getViewportLayoutSlotIds(viewportLayoutId);
  const canMaximizeViewport = viewportIds.length > 1;
  const isViewportMaximized =
    canMaximizeViewport &&
    Boolean(maximizedViewportId) &&
    viewportIds.includes(maximizedViewportId ?? "");
  const effectiveViewportLayoutId: ViewportLayoutId = isViewportMaximized
    ? "1x1"
    : viewportLayoutId;
  const effectiveViewportLayout = getViewportLayoutDefinition(
    effectiveViewportLayoutId,
  );
  const visibleViewportIds =
    isViewportMaximized && maximizedViewportId
      ? [maximizedViewportId]
      : viewportIds;
  const orderedSeriesEntries = getOrderedSeriesEntries(hierarchy);
  const seriesEntryMap = useMemo(
    () =>
      new Map(orderedSeriesEntries.map((entry) => [entry.key, entry] as const)),
    [orderedSeriesEntries],
  );
  const activeViewportAnnotationsState =
    viewportAnnotationsStateById[selectedViewportId] ??
    createEmptyViewportAnnotationsState();
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
  const activeViewportImageLayout = getViewportImageLayoutDefinition(
    activeViewportImageLayoutId,
  );
  const activeViewportHasMontageLayout =
    selectedViewportMode === "stack" && activeViewportImageLayout.cellCount > 1;
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

  const dispatchSequenceSyncFromViewport = useCallback(
    (sourceViewportId: string) => {
      const sourceSyncState =
        viewportSequenceSyncStateById[sourceViewportId] ??
        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;

      if (!hasEnabledViewportSequenceSync(sourceSyncState)) {
        return;
      }

      if (
        (viewportModeById[sourceViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
        "stack"
      ) {
        return;
      }

      const sourceRuntimeState =
        stackViewportRuntimeStateById[sourceViewportId];
      const sourceSeriesKey = viewportSeriesAssignments[sourceViewportId];
      const sourceSeriesEntry =
        sourceSeriesKey != null
          ? (seriesEntryMap.get(sourceSeriesKey) ?? null)
          : null;

      if (
        !sourceRuntimeState ||
        sourceRuntimeState.status !== "ready" ||
        !sourceSeriesEntry
      ) {
        return;
      }

      const sourceImage =
        sourceSeriesEntry.series.images[
          sourceRuntimeState.currentFrameIndex - 1
        ] ?? null;

      if (!sourceImage) {
        return;
      }

      let nextCalibrationMap: Record<string, CrossStudyCalibration> | null =
        null;
      const nextSyncCommands: Record<
        string,
        ViewportSequenceSyncCommand | null
      > = {};

      for (const targetViewportId of viewportIds) {
        if (targetViewportId === sourceViewportId) {
          continue;
        }

        if (
          (viewportModeById[targetViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
          "stack"
        ) {
          continue;
        }

        const targetRuntimeState =
          stackViewportRuntimeStateById[targetViewportId];
        const targetSeriesKey = viewportSeriesAssignments[targetViewportId];
        const targetSeriesEntry =
          targetSeriesKey != null
            ? (seriesEntryMap.get(targetSeriesKey) ?? null)
            : null;
        const targetSyncState =
          viewportSequenceSyncStateById[targetViewportId] ??
          DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;

        if (
          !targetRuntimeState ||
          targetRuntimeState.status !== "ready" ||
          !targetSeriesEntry ||
          !hasEnabledViewportSequenceSync(targetSyncState)
        ) {
          continue;
        }

        let targetFrameIndex: number | null = null;
        let calibrationPairKey: string | undefined;
        let syncType: ViewportSequenceSyncType | null = null;
        const isSameStudy =
          sourceSeriesEntry.study.studyId === targetSeriesEntry.study.studyId;

        if (
          isSameStudy &&
          sourceSyncState.sameStudy &&
          targetSyncState.sameStudy
        ) {
          const targetReferenceImage =
            targetSeriesEntry.series.images[
              targetRuntimeState.currentFrameIndex - 1
            ] ??
            targetSeriesEntry.series.images[0] ??
            null;
          const targetNormal = getImageSliceNormal(targetReferenceImage);
          const sourceSliceScalar = getImageSliceScalar(
            sourceImage,
            targetNormal,
          );

          if (
            sourceSliceScalar == null ||
            !areImagesSliceAligned(sourceImage, targetReferenceImage)
          ) {
            continue;
          }

          targetFrameIndex = findNearestImageIndexBySlicePosition(
            targetSeriesEntry.series.images,
            sourceSliceScalar,
            targetNormal,
          );
          syncType = "sameStudy";
        } else if (
          !isSameStudy &&
          sourceSyncState.crossStudy &&
          targetSyncState.crossStudy
        ) {
          const pairKey = getSequenceSyncPairKey(
            sourceViewportId,
            targetViewportId,
          );
          const existingCalibration = crossStudyCalibrationByPairKey[pairKey];
          const canReuseExistingCalibration =
            existingCalibration &&
            existingCalibration.leftSeriesKey ===
              viewportSeriesAssignments[existingCalibration.leftViewportId] &&
            existingCalibration.rightSeriesKey ===
              viewportSeriesAssignments[existingCalibration.rightViewportId];
          const targetImage =
            targetSeriesEntry.series.images[
              targetRuntimeState.currentFrameIndex - 1
            ] ?? null;
          const calibration =
            canReuseExistingCalibration && existingCalibration
              ? existingCalibration
              : createCrossStudyCalibration({
                  leftViewportId: sourceViewportId,
                  rightViewportId: targetViewportId,
                  leftStudyId: sourceSeriesEntry.study.studyId,
                  rightStudyId: targetSeriesEntry.study.studyId,
                  leftSeriesKey: sourceSeriesKey ?? "",
                  rightSeriesKey: targetSeriesKey ?? "",
                  leftFrameIndex: sourceRuntimeState.currentFrameIndex,
                  rightFrameIndex: targetRuntimeState.currentFrameIndex,
                  leftImage: sourceImage,
                  rightImage: targetImage,
                });

          if (!calibration) {
            continue;
          }

          if (!canReuseExistingCalibration || !existingCalibration) {
            nextCalibrationMap = nextCalibrationMap ?? {
              ...crossStudyCalibrationByPairKey,
            };
            nextCalibrationMap[pairKey] = calibration;
          }

          calibrationPairKey = calibration.pairKey;
          targetFrameIndex = findCrossStudySyncedFrameIndex({
            sourceViewportId,
            sourceImage,
            targetImages: targetSeriesEntry.series.images,
            calibration,
          });
          syncType = "crossStudy";
        }

        if (
          !syncType ||
          !targetFrameIndex ||
          targetFrameIndex === targetRuntimeState.currentFrameIndex
        ) {
          continue;
        }

        sequenceSyncCommandIdRef.current += 1;
        nextSyncCommands[targetViewportId] = {
          id: sequenceSyncCommandIdRef.current,
          targetViewportKey: targetViewportId,
          sourceViewportKey: sourceViewportId,
          frameIndex: targetFrameIndex,
          syncType,
          calibrationPairKey,
        };
      }

      if (nextCalibrationMap) {
        setCrossStudyCalibrationByPairKey(nextCalibrationMap);
      }

      if (!Object.keys(nextSyncCommands).length) {
        return;
      }

      setViewportSequenceSyncCommandById((previous) => ({
        ...previous,
        ...nextSyncCommands,
      }));
    },
    [
      crossStudyCalibrationByPairKey,
      seriesEntryMap,
      stackViewportRuntimeStateById,
      viewportIds,
      viewportModeById,
      viewportSequenceSyncStateById,
      viewportSeriesAssignments,
    ],
  );

  const handleViewportSelect = useCallback((viewportId: string) => {
    setSelectedViewportId(viewportId);
    setViewportCellSelectionById((previous) => ({
      ...previous,
      [viewportId]: "all",
    }));
  }, []);

  const handleViewportCellSelect = useCallback(
    (viewportId: string, cellIndex: number) => {
      setSelectedViewportId(viewportId);
      setViewportCellSelectionById((previous) => ({
        ...previous,
        [viewportId]: cellIndex,
      }));
    },
    [],
  );

  const queueAnnotationCommand = (command: ViewportAnnotationCommandInput) => {
    const targetViewportKey =
      selectedViewportId || viewportIds[0] || "viewport-1";

    annotationCommandIdRef.current += 1;
    setAnnotationCommand({
      id: annotationCommandIdRef.current,
      targetViewportKey,
      ...command,
    } as ViewportAnnotationCommand);
  };

  const queueViewCommand = useCallback(
    (
      command:
        | {
            type:
              | "fit"
              | "reset"
              | "rotateRight"
              | "flipHorizontal"
              | "flipVertical";
          }
        | {
            type: "windowPreset";
            presetId: ViewportWindowPresetId;
          },
    ) => {
      if (!activeViewportViewCommandsEnabled) {
        return;
      }

      const targetViewportKey =
        selectedViewportId || viewportIds[0] || "viewport-1";

      viewCommandIdRef.current += 1;
      setViewCommand({
        id: viewCommandIdRef.current,
        targetViewportKey,
        ...command,
      } as ViewportViewCommand);
    },
    [activeViewportViewCommandsEnabled, selectedViewportId, viewportIds],
  );

  const handleViewportToolChange = useCallback(
    (tool: ViewportTool) => {
      if (
        selectedViewportMode === "mpr" &&
        !isViewportToolSupportedInMpr(tool)
      ) {
        setActiveViewportTool("select");
        return;
      }

      if (
        selectedViewportMode === "stack" &&
        activeViewportHasMontageLayout &&
        tool !== "select"
      ) {
        setViewportImageLayoutIdById((previous) => ({
          ...previous,
          [selectedViewportId]: DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
        }));
      }

      setActiveViewportTool(tool);

      const toolGroupId = getViewportToolGroupId(tool);

      if (!toolGroupId) {
        return;
      }

      setViewportToolGroupSelections((previous) => ({
        ...previous,
        [toolGroupId]: tool,
      }));
    },
    [activeViewportHasMontageLayout, selectedViewportId, selectedViewportMode],
  );

  const handleViewportLayoutChange = (layoutId: ViewportLayoutId) => {
    setMaximizedViewportId(null);
    setViewportLayoutId(layoutId);
  };

  const handleViewportImageLayoutChange = (layoutId: ViewportImageLayoutId) => {
    if (selectedViewportMode !== "stack") {
      return;
    }

    setViewportImageLayoutIdById((previous) => ({
      ...previous,
      [selectedViewportId]: layoutId,
    }));
    setViewportCellSelectionById((previous) => ({
      ...previous,
      [selectedViewportId]: "all",
    }));

    if (layoutId !== DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID) {
      setActiveViewportTool("select");
    }
  };

  const handleViewportMprLayoutChange = useCallback(
    (layoutId: ViewportMprLayoutId | "off") => {
      if (layoutId === "off") {
        setViewportModeById((previous) => ({
          ...previous,
          [selectedViewportId]: "stack",
        }));
        return;
      }

      setViewportModeById((previous) => ({
        ...previous,
        [selectedViewportId]: "mpr",
      }));
      setViewportSequenceSyncStateById((previous) => ({
        ...previous,
        [selectedViewportId]: DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
      }));
      setViewportMprLayoutIdById((previous) => ({
        ...previous,
        [selectedViewportId]: layoutId,
      }));
      setViewportCellSelectionById((previous) => ({
        ...previous,
        [selectedViewportId]: "all",
      }));

      if (!isViewportToolSupportedInMpr(activeViewportTool)) {
        setActiveViewportTool("select");
      }
    },
    [activeViewportTool, selectedViewportId],
  );

  const handleViewportSequenceSyncToggle = useCallback(
    (syncType: ViewportSequenceSyncType) => {
      if (selectedViewportMode !== "stack") {
        return;
      }

      setViewportSequenceSyncStateById((previous) => ({
        ...previous,
        [selectedViewportId]: toggleViewportSequenceSyncType(
          previous[selectedViewportId],
          syncType,
        ),
      }));
      manualSequenceSyncRequestIdRef.current += 1;
      setManualSequenceSyncRequest({
        id: manualSequenceSyncRequestIdRef.current,
        sourceViewportId: selectedViewportId,
      });
    },
    [selectedViewportId, selectedViewportMode],
  );

  const handleViewportSequenceSyncClear = useCallback(() => {
    if (selectedViewportMode !== "stack") {
      return;
    }

    setViewportSequenceSyncStateById((previous) => ({
      ...previous,
      [selectedViewportId]: DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
    }));
    manualSequenceSyncRequestIdRef.current += 1;
    setManualSequenceSyncRequest({
      id: manualSequenceSyncRequestIdRef.current,
      sourceViewportId: selectedViewportId,
    });
  }, [selectedViewportId, selectedViewportMode]);

  const handleViewportToggleMaximize = (viewportId: string) => {
    handleViewportSelect(viewportId);
    setMaximizedViewportId((previous) => {
      if (previous === viewportId) {
        return null;
      }

      if (!canMaximizeViewport) {
        return null;
      }

      return viewportId;
    });
  };

  const handleViewportAction = useCallback(
    (action: ViewportAction) => {
      if (action === "invert") {
        setViewportInvertEnabled((previous) => ({
          ...previous,
          [selectedViewportId]: !(previous[selectedViewportId] ?? false),
        }));

        return;
      }

      if (action === "dicomTag") {
        setDicomTagDialogViewportId(selectedViewportId);
        return;
      }

      if (selectedViewportMode === "mpr") {
        return;
      }

      setAnnotationListOpen(true);
    },
    [selectedViewportId, selectedViewportMode],
  );

  const handleWindowPresetSelect = useCallback(
    (presetId: ViewportWindowPresetId) => {
      queueViewCommand({
        type: "windowPreset",
        presetId,
      });
    },
    [queueViewCommand],
  );

  const handleViewportViewAction = useCallback(
    (
      action:
        | "fit"
        | "reset"
        | "rotateRight"
        | "flipHorizontal"
        | "flipVertical",
    ) => {
      queueViewCommand({
        type: action,
      });
    },
    [queueViewCommand],
  );

  const handleDeleteSelectedAnnotations = () => {
    if (!activeViewportAnnotationsState.selectedAnnotationUIDs.length) {
      return;
    }

    queueAnnotationCommand({
      type: "delete",
      annotationUIDs: activeViewportAnnotationsState.selectedAnnotationUIDs,
    });
  };

  const handleClearAllAnnotations = () => {
    if (!activeViewportAnnotationsState.entries.length) {
      return;
    }

    modal.confirm({
      title: "清空当前视口全部图元？",
      content: "这会删除当前选中视口里的测量和 ROI，且无法撤销。",
      okText: "清空全部",
      okButtonProps: {
        danger: true,
      },
      cancelText: "取消",
      onOk: () => {
        queueAnnotationCommand({
          type: "clearAll",
        });
      },
    });
  };

  const handleAnnotationManageAction = (
    action: "deleteSelected" | "clearAll",
  ) => {
    if (action === "deleteSelected") {
      handleDeleteSelectedAnnotations();
      return;
    }

    handleClearAllAnnotations();
  };

  const handleSaveViewerSettings = async (nextSettings: ViewerSettings) => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextSettings),
    });

    if (!response.ok) {
      throw new Error("保存设置失败，请稍后重试。");
    }

    const payload = (await response.json()) as ViewerSettings;
    setViewerSettings(normalizeViewerSettings(payload));
    setSettingsOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadHierarchy() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const [hierarchyResponse, settingsResponse] = await Promise.all([
          fetch("/api/hierarchy", {
            cache: "no-store",
          }),
          fetch("/api/settings", {
            cache: "no-store",
          }),
        ]);

        if (!hierarchyResponse.ok) {
          throw new Error("Hierarchy request failed");
        }

        const [hierarchyPayload, settingsPayload] = await Promise.all([
          hierarchyResponse.json() as Promise<DicomHierarchyResponse>,
          settingsResponse.ok
            ? (settingsResponse.json() as Promise<ViewerSettings>)
            : Promise.resolve(createDefaultViewerSettings()),
        ]);

        if (cancelled) {
          return;
        }

        setHierarchy(hierarchyPayload);
        setViewerSettings(normalizeViewerSettings(settingsPayload));
      } catch (error) {
        console.error("Failed to fetch hierarchy", error);

        if (!cancelled) {
          setErrorMessage(
            "无法加载层级结构接口，请检查本地 DICOM 目录和 API。",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (settingsOpen || annotationListOpen || dicomTagDialogViewportId) {
        return;
      }

      if (document.querySelector(".ant-modal-root .ant-modal-wrap")) {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const binding = getToolbarShortcutBindingFromKeyboardEvent(event);

      if (!binding) {
        return;
      }

      const commandId = findToolbarShortcutCommandId(
        viewerSettings.toolbarShortcuts.bindings,
        binding,
      );

      if (!commandId) {
        return;
      }

      if (commandId !== "settings" && !orderedSeriesEntries.length) {
        return;
      }

      event.preventDefault();

      if (commandId === "settings") {
        setSettingsOpen(true);
        return;
      }

      if (isToolbarShortcutToolCommand(commandId)) {
        handleViewportToolChange(commandId);
        return;
      }

      handleViewportAction(commandId);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    annotationListOpen,
    dicomTagDialogViewportId,
    handleViewportAction,
    handleViewportToolChange,
    orderedSeriesEntries.length,
    settingsOpen,
    viewerSettings.toolbarShortcuts.bindings,
  ]);

  useEffect(() => {
    const nextViewportIds = getViewportLayoutSlotIds(viewportLayoutId);
    const nextOrderedSeriesKeys = getOrderedSeriesEntries(hierarchy).map(
      (entry) => entry.key,
    );

    setViewportSeriesAssignments((previous) =>
      buildViewportSeriesAssignments(
        nextViewportIds,
        previous,
        nextOrderedSeriesKeys,
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
    setViewportSequenceSyncStateById((previous) =>
      alignViewportSequenceSyncState(nextViewportIds, previous),
    );
    setStackViewportRuntimeStateById((previous) =>
      alignViewportNullableStateMap(nextViewportIds, previous),
    );
    setViewportSequenceSyncCommandById((previous) =>
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
  }, [hierarchy, viewportLayoutId]);

  useEffect(() => {
    setCrossStudyCalibrationByPairKey((previous) => {
      const nextEntries = Object.values(previous).filter((calibration) => {
        const leftViewportMode =
          viewportModeById[calibration.leftViewportId] ?? DEFAULT_VIEWPORT_MODE;
        const rightViewportMode =
          viewportModeById[calibration.rightViewportId] ??
          DEFAULT_VIEWPORT_MODE;
        const leftSyncState =
          viewportSequenceSyncStateById[calibration.leftViewportId] ??
          DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
        const rightSyncState =
          viewportSequenceSyncStateById[calibration.rightViewportId] ??
          DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
        const leftSeriesKey =
          viewportSeriesAssignments[calibration.leftViewportId];
        const rightSeriesKey =
          viewportSeriesAssignments[calibration.rightViewportId];

        return (
          leftViewportMode === "stack" &&
          rightViewportMode === "stack" &&
          leftSyncState.crossStudy &&
          rightSyncState.crossStudy &&
          leftSeriesKey === calibration.leftSeriesKey &&
          rightSeriesKey === calibration.rightSeriesKey
        );
      });

      if (nextEntries.length === Object.keys(previous).length) {
        return previous;
      }

      return nextEntries.reduce<Record<string, CrossStudyCalibration>>(
        (nextMap, calibration) => {
          nextMap[calibration.pairKey] = calibration;
          return nextMap;
        },
        {},
      );
    });
  }, [
    viewportModeById,
    viewportSequenceSyncStateById,
    viewportSeriesAssignments,
  ]);

  useEffect(() => {
    if (
      selectedViewportMode === "mpr" &&
      !isViewportToolSupportedInMpr(activeViewportTool)
    ) {
      setActiveViewportTool("select");
      return;
    }

    if (
      selectedViewportMode !== "stack" ||
      !activeViewportHasMontageLayout ||
      activeViewportTool === "select"
    ) {
      return;
    }

    setActiveViewportTool("select");
  }, [
    activeViewportHasMontageLayout,
    activeViewportTool,
    selectedViewportId,
    selectedViewportMode,
  ]);

  useEffect(() => {
    for (const [viewportId, runtimeState] of Object.entries(
      stackViewportRuntimeStateById,
    )) {
      if (!runtimeState) {
        delete processedStackSyncTokenByViewportRef.current[viewportId];
      }
    }
  }, [stackViewportRuntimeStateById]);

  useEffect(() => {
    for (const viewportId of viewportIds) {
      const runtimeState = stackViewportRuntimeStateById[viewportId];

      if (!runtimeState || runtimeState.lastChangeSource === "sync") {
        continue;
      }

      const lastProcessedToken =
        processedStackSyncTokenByViewportRef.current[viewportId] ?? 0;

      if (runtimeState.lastChangeToken <= lastProcessedToken) {
        continue;
      }

      processedStackSyncTokenByViewportRef.current[viewportId] =
        runtimeState.lastChangeToken;
      dispatchSequenceSyncFromViewport(viewportId);
    }
  }, [
    dispatchSequenceSyncFromViewport,
    stackViewportRuntimeStateById,
    viewportIds,
  ]);

  useEffect(() => {
    if (!manualSequenceSyncRequest) {
      return;
    }

    if (
      manualSequenceSyncRequest.id <=
      processedManualSequenceSyncRequestIdRef.current
    ) {
      return;
    }

    processedManualSequenceSyncRequestIdRef.current =
      manualSequenceSyncRequest.id;
    dispatchSequenceSyncFromViewport(
      manualSequenceSyncRequest.sourceViewportId,
    );
  }, [dispatchSequenceSyncFromViewport, manualSequenceSyncRequest]);

  if (loading) {
    return (
      <main className="viewer-page">
        <section className="screen-loader animate-in">
          <div className="screen-loader-card">
            <Spin
              indicator={
                <AppIcon
                  name="arrow-repeat"
                  className="app-icon app-spin-indicator is-spin"
                />
              }
              size="large"
            />
            <div className="screen-loader-copy">
              <h1>正在连接本地 DICOM 数据</h1>
              <p>
                页面启动后会先读取 `dicom/`
                目录树，然后准备缩略图和主视图的初始序列。
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="viewer-page">
        <section className="screen-loader animate-in">
          <div className="screen-loader-card">
            <div className="status-card is-error">
              <strong>加载失败</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="viewer-page">
      <section className="viewer-shell animate-in" data-testid="viewer-shell">
        <aside className="panel sidebar-panel" data-testid="sidebar-panel">
          <div className="thumbnail-panel">
            <header className="section-header">
              <div>
                <h1 className="section-title">Series Navigator</h1>
                <p className="section-subtitle">
                  自动读取 `dicom/检查/序列/图像` 层级并生成序列导航
                </p>
              </div>
            </header>
            <div className="thumbnail-scroll">
              {hierarchy?.studies.length ? (
                hierarchy.studies.map((study) => (
                  <section key={study.studyId} className="study-section">
                    <div className="study-title">{study.title}</div>
                    <div className="thumbnail-grid">
                      {study.series.map((series) => {
                        const seriesKey = buildSeriesKey(
                          study.studyId,
                          series.seriesId,
                        );
                        const assignedViewportCount = viewportIds.filter(
                          (viewportId) =>
                            viewportSeriesAssignments[viewportId] === seriesKey,
                        ).length;
                        const isSelected =
                          viewportSeriesAssignments[selectedViewportId] ===
                          seriesKey;

                        return (
                          <button
                            key={seriesKey}
                            type="button"
                            className={`series-card${isSelected ? " is-selected" : ""}${assignedViewportCount > 0 && !isSelected ? " is-assigned" : ""}`}
                            data-testid="series-card"
                            data-series-title={series.title}
                            data-image-count={series.imageCount}
                            data-assigned-count={assignedViewportCount}
                            onClick={() => {
                              setViewportSeriesAssignments((previous) => ({
                                ...previous,
                                [selectedViewportId]: seriesKey,
                              }));
                              setViewportCellSelectionById((previous) => ({
                                ...previous,
                                [selectedViewportId]: "all",
                              }));
                              setViewportSequenceSyncCommandById(
                                (previous) => ({
                                  ...previous,
                                  [selectedViewportId]: null,
                                }),
                              );
                              setViewportAnnotationsStateById((previous) => ({
                                ...previous,
                                [selectedViewportId]:
                                  createEmptyViewportAnnotationsState(),
                              }));
                            }}
                          >
                            <ThumbnailCanvas
                              dicomUrl={series.thumbnailPath}
                              alt={`${series.title} thumbnail`}
                            />
                            <div className="series-card-header">
                              <h2 className="series-card-title">
                                {series.title}
                              </h2>
                              <span className="series-card-count">
                                {series.imageCount} 张
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="status-card">
                  <strong>没有可显示的序列</strong>
                  <p>
                    `dicom/` 目录当前没有可用的 `.dcm` 文件，页面不会创建
                    viewport。
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="panel viewport-panel" data-testid="viewport-panel">
          <ViewportToolbar
            activeTool={activeViewportTool}
            groupSelections={viewportToolGroupSelections}
            viewportMode={selectedViewportMode}
            layoutId={effectiveViewportLayoutId}
            imageLayoutId={activeViewportImageLayoutId}
            mprLayoutId={activeViewportMprLayoutId}
            sequenceSyncState={activeViewportSequenceSyncState}
            crossStudyCalibrationCount={
              activeViewportCrossStudyCalibrationCount
            }
            invertEnabled={activeViewportInvertEnabled}
            annotationCount={activeViewportAnnotationsState.entries.length}
            selectedAnnotationCount={
              activeViewportAnnotationsState.selectedAnnotationUIDs.length
            }
            viewCommandsEnabled={activeViewportViewCommandsEnabled}
            onToolChange={handleViewportToolChange}
            onLayoutChange={handleViewportLayoutChange}
            onImageLayoutChange={handleViewportImageLayoutChange}
            onMprLayoutChange={handleViewportMprLayoutChange}
            onSequenceSyncToggle={handleViewportSequenceSyncToggle}
            onSequenceSyncClear={handleViewportSequenceSyncClear}
            onWindowPresetSelect={handleWindowPresetSelect}
            onViewAction={handleViewportViewAction}
            onAction={handleViewportAction}
            onAnnotationManageAction={handleAnnotationManageAction}
            onOpenSettings={() => setSettingsOpen(true)}
            disabled={!orderedSeriesEntries.length}
          />
          <div
            className="viewport-grid"
            data-testid="viewport-grid"
            data-layout-id={effectiveViewportLayoutId}
            data-layout-count={visibleViewportIds.length}
            data-maximized-viewport-id={maximizedViewportId ?? ""}
            data-base-layout-id={viewportLayoutId}
            style={{
              gridTemplateColumns: `repeat(${effectiveViewportLayout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${effectiveViewportLayout.rows}, minmax(0, 1fr))`,
            }}
          >
            {visibleViewportIds.map((viewportId, index) => {
              const cell = effectiveViewportLayout.cells[index];
              const seriesEntry =
                seriesEntryMap.get(
                  viewportSeriesAssignments[viewportId] ?? "",
                ) ?? null;

              return (
                <div
                  key={viewportId}
                  className={`viewport-slot${selectedViewportId === viewportId ? " is-selected" : ""}${maximizedViewportId === viewportId ? " is-maximized" : ""}`}
                  data-testid={`viewport-slot-${viewportId}`}
                  data-viewport-id={viewportId}
                  data-viewport-mode={
                    viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE
                  }
                  data-viewport-maximized={String(
                    maximizedViewportId === viewportId,
                  )}
                  data-series-title={seriesEntry?.series.title ?? ""}
                  style={{
                    gridColumn: `${cell.column} / span ${cell.columnSpan ?? 1}`,
                    gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
                  }}
                >
                  {(viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) ===
                  "mpr" ? (
                    <MprViewport
                      viewportKey={viewportId}
                      seriesKey={viewportSeriesAssignments[viewportId] ?? null}
                      study={seriesEntry?.study ?? null}
                      series={seriesEntry?.series ?? null}
                      activeTool={activeViewportTool}
                      mprLayoutId={
                        viewportMprLayoutIdById[viewportId] ??
                        DEFAULT_VIEWPORT_MPR_LAYOUT_ID
                      }
                      invertEnabled={viewportInvertEnabled[viewportId] ?? false}
                      overlaySettings={viewerSettings.viewportOverlay}
                      annotationCommand={annotationCommand}
                      dicomTagDialogOpen={
                        dicomTagDialogViewportId === viewportId
                      }
                      isSelected={selectedViewportId === viewportId}
                      onCloseDicomTagDialog={() =>
                        setDicomTagDialogViewportId(null)
                      }
                      onSelect={handleViewportSelect}
                      onToggleMaximize={handleViewportToggleMaximize}
                      onAnnotationsChange={(state) => {
                        setViewportAnnotationsStateById((previous) => ({
                          ...previous,
                          [viewportId]: state,
                        }));
                      }}
                    />
                  ) : (
                    <StackViewport
                      viewportKey={viewportId}
                      seriesKey={viewportSeriesAssignments[viewportId] ?? null}
                      study={seriesEntry?.study ?? null}
                      series={seriesEntry?.series ?? null}
                      activeTool={activeViewportTool}
                      imageLayoutId={
                        viewportImageLayoutIdById[viewportId] ??
                        DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID
                      }
                      invertEnabled={viewportInvertEnabled[viewportId] ?? false}
                      overlaySettings={viewerSettings.viewportOverlay}
                      annotationCommand={annotationCommand}
                      viewCommand={viewCommand}
                      sequenceSyncState={
                        viewportSequenceSyncStateById[viewportId] ??
                        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE
                      }
                      sequenceSyncCommand={
                        viewportSequenceSyncCommandById[viewportId] ?? null
                      }
                      crossStudyCalibrationCount={
                        Object.values(crossStudyCalibrationByPairKey).filter(
                          (calibration) =>
                            calibration.leftViewportId === viewportId ||
                            calibration.rightViewportId === viewportId,
                        ).length
                      }
                      dicomTagDialogOpen={
                        dicomTagDialogViewportId === viewportId
                      }
                      isSelected={selectedViewportId === viewportId}
                      cellSelection={
                        viewportCellSelectionById[viewportId] ?? "all"
                      }
                      onCloseDicomTagDialog={() =>
                        setDicomTagDialogViewportId(null)
                      }
                      onSelect={handleViewportSelect}
                      onCellSelect={handleViewportCellSelect}
                      onToggleMaximize={handleViewportToggleMaximize}
                      onAnnotationsChange={(state) => {
                        setViewportAnnotationsStateById((previous) => ({
                          ...previous,
                          [viewportId]: state,
                        }));
                      }}
                      onRuntimeStateChange={(state) => {
                        setStackViewportRuntimeStateById((previous) => {
                          if (previous[viewportId] === state) {
                            return previous;
                          }

                          return {
                            ...previous,
                            [viewportId]: state,
                          };
                        });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </section>
      <AnnotationListDrawer
        open={annotationListOpen}
        annotations={activeViewportAnnotationsState.entries}
        onClose={() => setAnnotationListOpen(false)}
        onSelectAnnotation={(annotationUID) => {
          queueAnnotationCommand({
            type: "select",
            annotationUID,
          });
        }}
        onDeleteAnnotation={(annotationUID) => {
          queueAnnotationCommand({
            type: "delete",
            annotationUIDs: [annotationUID],
          });
        }}
        onClearAll={handleClearAllAnnotations}
      />
      <ViewerSettingsDrawer
        open={settingsOpen}
        settings={viewerSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveViewerSettings}
      />
    </main>
  );
}
