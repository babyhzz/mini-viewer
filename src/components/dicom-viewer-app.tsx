"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { App, InputNumber, Spin } from "antd";
import { useShallow } from "zustand/react/shallow";

import { AnnotationListDrawer } from "@/components/annotation-list-drawer";
import { AppIcon } from "@/components/app-icon";
import { KeyImageDrawer } from "@/components/key-image-drawer";
import { MprViewport } from "@/components/mpr-viewport";
import { useSelectedViewportContext } from "@/hooks/use-selected-viewport-context";
import { useViewerBootstrap } from "@/hooks/use-viewer-bootstrap";
import { useViewerKeyboardShortcuts } from "@/hooks/use-viewer-keyboard-shortcuts";
import { useViewportLayoutSession } from "@/hooks/use-viewport-layout-session";
import {
  createEmptyViewportAnnotationsState,
} from "@/types/viewport-annotations";
import { StackViewport } from "@/components/stack-viewport";
import { ThumbnailCanvas } from "@/components/thumbnail-canvas";
import { ViewerSettingsDrawer } from "@/components/viewer-settings-drawer";
import { ViewportToolbar } from "@/components/viewport-toolbar";
import { initializeCornerstone } from "@/lib/cornerstone/init";
import { cn } from "@/lib/utils/classnames";
import {
  getViewerSettingsDefaultMprSlabState,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";
import type { ViewportAnnotationCommand } from "@/lib/tools/cornerstone-tool-adapter";
import {
  getViewportToolGroupId,
  isViewportToolSupportedInMpr,
  type ViewportAction,
  type ViewportTool,
} from "@/lib/tools/registry";
import {
  DEFAULT_VIEWPORT_MODE,
  DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
  type ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import {
  normalizeViewportMprSlabState,
  type ViewportMprSlabState,
  type ViewportMprSlabMode,
} from "@/lib/viewports/mpr-slab";
import {
  getViewportLayoutDefinition,
  getViewportLayoutSlotIds,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  isViewportCineCompatible,
  normalizeViewportCineState,
  type ViewportCineFpsPreset,
  type ViewportCineState,
} from "@/lib/viewports/cine";
import {
  createKeyImageEntry,
  hasKeyImageAtFrame,
  sortKeyImageEntries,
} from "@/lib/viewports/key-images";
import type {
  Point3,
  StackViewportReferenceLineState,
} from "@/lib/viewports/reference-lines";
import {
  clonePoint3,
  getPoint3QuadCenter,
} from "@/lib/viewports/reference-lines";
import type { ViewportMprCrosshairSyncCommand } from "@/lib/viewports/mpr-crosshairs";
import {
  areImagesSliceAligned,
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  createCrossStudyCalibration,
  findCrossStudySyncedFrameIndex,
  findNearestImageIndexBySlicePosition,
  hasEnabledViewportDisplaySync,
  hasEnabledViewportSliceSync,
  getImageSliceNormal,
  getImageSliceScalar,
  getSequenceSyncPairKey,
  type StackViewportPresentationState,
  type ViewportPresentationSyncCommand,
  toggleViewportSequenceSyncType,
  type CrossStudyCalibration,
  type ViewportSliceSyncType,
  type ViewportSequenceSyncCommand,
  type ViewportSequenceSyncType,
} from "@/lib/viewports/sequence-sync";
import type {
  ViewportViewCommand,
  ViewportWindowPresetId,
} from "@/lib/viewports/view-commands";
import type {
  DicomSeriesNode,
} from "@/types/dicom";
import type { ViewerSettings } from "@/types/settings";
import { viewerSessionSelectors } from "@/stores/viewer-session/selectors";
import { useViewerSessionStore } from "@/stores/viewer-session-store";

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

function areViewportCineStatesEqual(
  left: ViewportCineState,
  right: ViewportCineState,
) {
  return (
    left.isPlaying === right.isPlaying &&
    left.fps === right.fps &&
    left.loop === right.loop
  );
}

function areViewportPresentationStatesEqual(
  left: StackViewportPresentationState | null | undefined,
  right: StackViewportPresentationState | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  const leftPan = left.viewPresentation?.pan ?? null;
  const rightPan = right.viewPresentation?.pan ?? null;

  return (
    left.viewPresentation?.zoom === right.viewPresentation?.zoom &&
    leftPan?.[0] === rightPan?.[0] &&
    leftPan?.[1] === rightPan?.[1] &&
    left.voiRange?.lower === right.voiRange?.lower &&
    left.voiRange?.upper === right.voiRange?.upper
  );
}

function areViewportReferenceLineStatesEqual(
  left: StackViewportReferenceLineState | null | undefined,
  right: StackViewportReferenceLineState | null | undefined,
) {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.status === right.status &&
    left.frameOfReferenceUID === right.frameOfReferenceUID &&
    left.lastChangeToken === right.lastChangeToken
  );
}

function areViewportMprSlabStatesEqual(
  left: ViewportMprSlabState,
  right: ViewportMprSlabState,
) {
  return left.mode === right.mode && left.thickness === right.thickness;
}

function dotPoint3(left: Point3, right: Point3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function getReferenceLinePlaneCenter(
  state: StackViewportReferenceLineState | null | undefined,
): Point3 | null {
  const corners = state?.imageCornersWorld;

  if (!corners || corners.length !== 4) {
    return null;
  }

  return getPoint3QuadCenter(corners);
}

function getReferenceLineSourcePoint(
  state: StackViewportReferenceLineState | null | undefined,
) {
  return state?.referencePointWorld ?? getReferenceLinePlaneCenter(state);
}

function findNearestFrameIndexForReferenceLinePlane(
  sourceState: StackViewportReferenceLineState | null | undefined,
  targetImages: DicomSeriesNode["images"],
) {
  if (
    !sourceState ||
    sourceState.status !== "ready" ||
    !sourceState.imageCornersWorld ||
    !targetImages.length
  ) {
    return null;
  }

  const targetReferenceImage = targetImages[0] ?? null;
  const targetNormal = getImageSliceNormal(targetReferenceImage);
  const sourceCenter = getReferenceLineSourcePoint(sourceState);

  if (!targetNormal || !sourceCenter) {
    return null;
  }

  const targetFrameOfReferenceUID =
    targetReferenceImage?.frameOfReferenceUID ?? null;

  if (
    sourceState.frameOfReferenceUID &&
    targetFrameOfReferenceUID &&
    sourceState.frameOfReferenceUID !== targetFrameOfReferenceUID
  ) {
    return null;
  }

  return findNearestImageIndexBySlicePosition(
    targetImages,
    dotPoint3(sourceCenter, targetNormal),
    targetNormal,
  );
}

export function DicomViewerApp() {
  const { message, modal } = App.useApp();
  const annotationCommandIdRef = useRef(0);
  const viewCommandIdRef = useRef(0);
  const stackNavigationCommandIdRef = useRef(0);
  const mprCrosshairSyncCommandIdRef = useRef(0);
  const sequenceSyncCommandIdRef = useRef(0);
  const presentationSyncCommandIdRef = useRef(0);
  const manualSequenceSyncRequestIdRef = useRef(0);
  const processedStackSyncTokenByViewportRef = useRef<Record<string, number>>(
    {},
  );
  const processedPresentationSyncTokenByViewportRef = useRef<
    Record<string, number>
  >({});
  const processedMprReferenceNavigationKeyByViewportRef = useRef<
    Record<string, string>
  >({});
  const processedMprCrosshairSyncKeyByViewportRef = useRef<
    Record<string, string>
  >({});
  const processedManualSequenceSyncRequestIdRef = useRef(0);
  const {
    viewerSettings,
    activeViewportTool,
    viewportLayoutId,
    maximizedViewportId,
    selectedViewportId,
    annotationListOpen,
    keyImageListOpen,
    dicomTagDialogViewportId,
    settingsOpen,
  } = useViewerSessionStore(useShallow(viewerSessionSelectors.uiState));
  const {
    viewportSeriesAssignments,
    viewportInvertEnabled,
    viewportToolGroupSelections,
    annotationCommand,
    viewCommand,
    viewportAnnotationsStateById,
    viewportImageLayoutIdById,
    viewportModeById,
    viewportMprLayoutIdById,
    viewportMprSlabStateById,
    viewportCellSelectionById,
    viewportCineStateById,
    viewportKeyImagesBySeriesKey,
    stackViewportRuntimeStateById,
    viewportStackNavigationCommandById,
  } = useViewerSessionStore(useShallow(viewerSessionSelectors.viewportState));
  const {
    referenceLinesEnabled,
    viewportSequenceSyncStateById,
    stackViewportReferenceLineStateById,
    mprViewportReferenceLineStateById,
    stackViewportPresentationStateById,
    viewportSequenceSyncCommandById,
    viewportPresentationSyncCommandById,
    viewportMprCrosshairSyncCommandById,
    crossStudyCalibrationByPairKey,
    manualSequenceSyncRequest,
  } = useViewerSessionStore(useShallow(viewerSessionSelectors.syncState));
  const {
    setViewerSettings,
    setActiveViewportTool,
    setViewportLayoutId,
    setMaximizedViewportId,
    setSelectedViewportId,
    setReferenceLinesEnabled,
    setViewportSeriesAssignments,
    setViewportInvertEnabled,
    setViewportToolGroupSelections,
    setAnnotationCommand,
    setViewCommand,
    setViewportAnnotationsStateById,
    setViewportImageLayoutIdById,
    setViewportModeById,
    setViewportMprLayoutIdById,
    setViewportMprSlabStateById,
    setViewportCellSelectionById,
    setViewportCineStateById,
    setViewportKeyImagesBySeriesKey,
    setViewportSequenceSyncStateById,
    setStackViewportRuntimeStateById,
    setStackViewportReferenceLineStateById,
    setMprViewportReferenceLineStateById,
    setStackViewportPresentationStateById,
    setViewportStackNavigationCommandById,
    setViewportSequenceSyncCommandById,
    setViewportPresentationSyncCommandById,
    setViewportMprCrosshairSyncCommandById,
    setCrossStudyCalibrationByPairKey,
    setManualSequenceSyncRequest,
    setAnnotationListOpen,
    setKeyImageListOpen,
    setDicomTagDialogViewportId,
    setSettingsOpen,
  } = useViewerSessionStore(useShallow(viewerSessionSelectors.actions));
  const {
    hierarchy,
    loading,
    errorMessage,
  } = useViewerBootstrap({
    onViewerSettingsLoaded: setViewerSettings,
  });

  const viewportIds = useMemo(
    () => getViewportLayoutSlotIds(viewportLayoutId),
    [viewportLayoutId],
  );
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
  const visibleViewportIds = useMemo(
    () =>
      isViewportMaximized && maximizedViewportId
        ? [maximizedViewportId]
        : viewportIds,
    [isViewportMaximized, maximizedViewportId, viewportIds],
  );
  const {
    orderedSeriesEntries,
    seriesEntryMap,
    activeViewportAnnotationsState,
    activeViewportSeriesEntry,
    activeViewportSeriesKey,
    activeViewportCurrentFrameIndex,
    activeViewportInvertEnabled,
    selectedViewportMode,
    activeViewportImageLayoutId,
    activeViewportMprLayoutId,
    viewerDefaultMprSlabState,
    activeViewportMprSlabState,
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
  } = useSelectedViewportContext({
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
  });
  const orderedSeriesKeys = useMemo(
    () => orderedSeriesEntries.map((entry) => entry.key),
    [orderedSeriesEntries],
  );
  const activeViewportKeyImageEnabled =
    selectedViewportMode === "stack" &&
    activeViewportImageLayoutId === DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID &&
    Boolean(activeViewportSeriesEntry) &&
    activeViewportCurrentFrameIndex != null;
  const activeViewportHasCurrentKeyImage =
    activeViewportCurrentFrameIndex != null &&
    hasKeyImageAtFrame(
      activeViewportKeyImageEntries,
      activeViewportCurrentFrameIndex,
    );

  const dispatchSequenceSyncFromViewport = useCallback(
    (sourceViewportId: string) => {
      const sourceSyncState =
        viewportSequenceSyncStateById[sourceViewportId] ??
        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;

      if (!hasEnabledViewportSliceSync(sourceSyncState)) {
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
          !hasEnabledViewportSliceSync(targetSyncState)
        ) {
          continue;
        }

        let targetFrameIndex: number | null = null;
        let calibrationPairKey: string | undefined;
        let syncType: ViewportSliceSyncType | null = null;
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
      setCrossStudyCalibrationByPairKey,
      setViewportSequenceSyncCommandById,
      stackViewportRuntimeStateById,
      viewportIds,
      viewportModeById,
      viewportSequenceSyncStateById,
      viewportSeriesAssignments,
    ],
  );

  const dispatchPresentationSyncFromViewport = useCallback(
    (sourceViewportId: string) => {
      const sourceSyncState =
        viewportSequenceSyncStateById[sourceViewportId] ??
        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;

      if (!hasEnabledViewportDisplaySync(sourceSyncState)) {
        return;
      }

      if (
        (viewportModeById[sourceViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
        "stack"
      ) {
        return;
      }

      const sourcePresentationState =
        stackViewportPresentationStateById[sourceViewportId];

      if (
        !sourcePresentationState ||
        sourcePresentationState.status !== "ready" ||
        !sourcePresentationState.viewPresentation
      ) {
        return;
      }

      const nextSyncCommands: Record<
        string,
        ViewportPresentationSyncCommand | null
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

        const targetSyncState =
          viewportSequenceSyncStateById[targetViewportId] ??
          DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
        const targetPresentationState =
          stackViewportPresentationStateById[targetViewportId];

        if (
          !hasEnabledViewportDisplaySync(targetSyncState) ||
          !targetPresentationState ||
          targetPresentationState.status !== "ready" ||
          areViewportPresentationStatesEqual(
            sourcePresentationState,
            targetPresentationState,
          )
        ) {
          continue;
        }

        presentationSyncCommandIdRef.current += 1;
        nextSyncCommands[targetViewportId] = {
          id: presentationSyncCommandIdRef.current,
          targetViewportKey: targetViewportId,
          sourceViewportKey: sourceViewportId,
          viewPresentation: sourcePresentationState.viewPresentation,
          voiRange: sourcePresentationState.voiRange,
        };
      }

      if (!Object.keys(nextSyncCommands).length) {
        return;
      }

      setViewportPresentationSyncCommandById((previous) => ({
        ...previous,
        ...nextSyncCommands,
      }));
    },
    [
      setViewportPresentationSyncCommandById,
      stackViewportPresentationStateById,
      viewportIds,
      viewportModeById,
      viewportSequenceSyncStateById,
    ],
  );

  const handleViewportSelect = useCallback((viewportId: string) => {
    setSelectedViewportId(viewportId);
    setViewportCellSelectionById((previous) => ({
      ...previous,
      [viewportId]: "all",
    }));
  }, [setSelectedViewportId, setViewportCellSelectionById]);

  const handleViewportCellSelect = useCallback(
    (viewportId: string, cellIndex: number) => {
      setSelectedViewportId(viewportId);
      setViewportCellSelectionById((previous) => ({
        ...previous,
        [viewportId]: cellIndex,
      }));
    },
    [setSelectedViewportId, setViewportCellSelectionById],
  );

  const stopViewportCine = useCallback(
    (viewportId: string) => {
      setViewportCineStateById((previous) => {
        const currentState = normalizeViewportCineState(previous[viewportId]);

        if (!currentState.isPlaying) {
          return previous;
        }

        return {
          ...previous,
          [viewportId]: {
            ...currentState,
            isPlaying: false,
          },
        };
      });
    },
    [setViewportCineStateById],
  );

  const queueStackNavigationCommand = useCallback(
    (frameIndex: number, targetViewportKey = selectedViewportId) => {
      stackNavigationCommandIdRef.current += 1;
      setViewportStackNavigationCommandById((previous) => ({
        ...previous,
        [targetViewportKey]: {
          id: stackNavigationCommandIdRef.current,
          targetViewportKey,
          frameIndex,
        },
      }));
    },
    [selectedViewportId, setViewportStackNavigationCommandById],
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
    [
      activeViewportViewCommandsEnabled,
      selectedViewportId,
      setViewCommand,
      viewportIds,
    ],
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
    [
      activeViewportHasMontageLayout,
      selectedViewportId,
      selectedViewportMode,
      setActiveViewportTool,
      setViewportImageLayoutIdById,
      setViewportToolGroupSelections,
    ],
  );

  const handleViewportLayoutChange = (layoutId: ViewportLayoutId) => {
    setMaximizedViewportId(null);
    setViewportLayoutId(layoutId);
  };

  const handleViewportImageLayoutChange = (layoutId: ViewportImageLayoutId) => {
    if (selectedViewportMode !== "stack") {
      return;
    }

    if (layoutId !== DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID) {
      stopViewportCine(selectedViewportId);
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
      stopViewportCine(selectedViewportId);

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
    [
      activeViewportTool,
      selectedViewportId,
      setActiveViewportTool,
      setViewportCellSelectionById,
      setViewportModeById,
      setViewportMprLayoutIdById,
      setViewportSequenceSyncStateById,
      stopViewportCine,
    ],
  );

  const handleViewportMprSlabModeChange = useCallback(
    (mode: ViewportMprSlabMode) => {
      setViewportMprSlabStateById((previous) => {
        const currentState = normalizeViewportMprSlabState(
          previous[selectedViewportId],
          viewerDefaultMprSlabState,
        );

        if (currentState.mode === mode) {
          return previous;
        }

        return {
          ...previous,
          [selectedViewportId]: {
            ...currentState,
            mode,
          },
        };
      });
    },
    [
      selectedViewportId,
      setViewportMprSlabStateById,
      viewerDefaultMprSlabState,
    ],
  );

  const handleViewportMprSlabThicknessChange = useCallback(
    (thickness: number) => {
      setViewportMprSlabStateById((previous) => {
        const currentState = normalizeViewportMprSlabState(
          previous[selectedViewportId],
          viewerDefaultMprSlabState,
        );

        if (currentState.thickness === thickness) {
          return previous;
        }

        return {
          ...previous,
          [selectedViewportId]: {
            ...currentState,
            thickness,
          },
        };
      });
    },
    [
      selectedViewportId,
      setViewportMprSlabStateById,
      viewerDefaultMprSlabState,
    ],
  );

  const handleViewportMprSlabOpenCustomThickness = useCallback(() => {
    let draftThickness = activeViewportMprSlabState.thickness;

    modal.confirm({
      title: "自定义投影厚度",
      content: (
        <div
          data-testid="mpr-slab-custom-thickness-dialog"
          style={{
            display: "grid",
            gap: 12,
            paddingTop: 4,
          }}
        >
          <p
            style={{
              margin: 0,
              color: "rgba(216, 223, 232, 0.9)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            输入当前 MPR 视口的投影厚度，单位为 mm。
          </p>
          <InputNumber
            autoFocus
            min={0.1}
            max={200}
            step={0.5}
            precision={1}
            defaultValue={activeViewportMprSlabState.thickness}
            addonAfter="mm"
            data-testid="mpr-slab-custom-thickness-input"
            style={{ width: "100%" }}
            onChange={(value) => {
              if (typeof value === "number" && Number.isFinite(value)) {
                draftThickness = value;
              }
            }}
          />
        </div>
      ),
      okText: "应用",
      okButtonProps: {
        "data-testid": "mpr-slab-custom-thickness-submit",
      },
      cancelText: "取消",
      cancelButtonProps: {
        "data-testid": "mpr-slab-custom-thickness-cancel",
      },
      onOk: () => {
        if (!Number.isFinite(draftThickness) || draftThickness < 0.1) {
          message.warning("请输入大于 0 的投影厚度。");
          return Promise.reject(new Error("Invalid MPR slab thickness"));
        }

        handleViewportMprSlabThicknessChange(draftThickness);
        return Promise.resolve();
      },
    });
  }, [
    activeViewportMprSlabState.thickness,
    handleViewportMprSlabThicknessChange,
    message,
    modal,
  ]);

  const handleViewportMprSlabReset = useCallback(() => {
    setViewportMprSlabStateById((previous) => {
      const currentState = normalizeViewportMprSlabState(
        previous[selectedViewportId],
        viewerDefaultMprSlabState,
      );

      if (
        currentState.mode === viewerDefaultMprSlabState.mode &&
        currentState.thickness === viewerDefaultMprSlabState.thickness
      ) {
        return previous;
      }

      return {
        ...previous,
        [selectedViewportId]: {
          ...viewerDefaultMprSlabState,
        },
      };
    });
  }, [
    selectedViewportId,
    setViewportMprSlabStateById,
    viewerDefaultMprSlabState,
  ]);

  const handleViewportMprSlabApplyToAll = useCallback(() => {
    setViewportMprSlabStateById((previous) => {
      const sourceState = normalizeViewportMprSlabState(
        previous[selectedViewportId],
        viewerDefaultMprSlabState,
      );
      let hasChanges = false;
      const nextState = { ...previous };

      for (const viewportId of viewportIds) {
        if ((viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) !== "mpr") {
          continue;
        }

        const targetState = normalizeViewportMprSlabState(
          previous[viewportId],
          viewerDefaultMprSlabState,
        );

        if (
          targetState.mode === sourceState.mode &&
          targetState.thickness === sourceState.thickness
        ) {
          continue;
        }

        nextState[viewportId] = {
          ...sourceState,
        };
        hasChanges = true;
      }

      return hasChanges ? nextState : previous;
    });
  }, [
    selectedViewportId,
    setViewportMprSlabStateById,
    viewerDefaultMprSlabState,
    viewportIds,
    viewportModeById,
  ]);

  const handleViewportMprSlabApplyToLinked = useCallback(() => {
    if (selectedViewportMode !== "mpr") {
      return;
    }

    const sourceReferenceState =
      mprViewportReferenceLineStateById[selectedViewportId] ?? null;

    if (
      !sourceReferenceState ||
      sourceReferenceState.status !== "ready" ||
      !sourceReferenceState.frameOfReferenceUID
    ) {
      message.info("当前 MPR 视口尚未建立联动参考，暂时无法同步。");
      return;
    }

    let appliedTargetCount = 0;

    setViewportMprSlabStateById((previous) => {
      const sourceState = normalizeViewportMprSlabState(
        previous[selectedViewportId],
        viewerDefaultMprSlabState,
      );
      const nextState = { ...previous };

      for (const viewportId of viewportIds) {
        if (viewportId === selectedViewportId) {
          continue;
        }

        if ((viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) !== "mpr") {
          continue;
        }

        const targetReferenceState =
          mprViewportReferenceLineStateById[viewportId] ?? null;

        if (
          !targetReferenceState ||
          targetReferenceState.status !== "ready" ||
          targetReferenceState.frameOfReferenceUID !==
            sourceReferenceState.frameOfReferenceUID
        ) {
          continue;
        }

        const targetState = normalizeViewportMprSlabState(
          previous[viewportId],
          viewerDefaultMprSlabState,
        );

        if (
          targetState.mode === sourceState.mode &&
          targetState.thickness === sourceState.thickness
        ) {
          continue;
        }

        nextState[viewportId] = {
          ...sourceState,
        };
        appliedTargetCount += 1;
      }

      return appliedTargetCount > 0 ? nextState : previous;
    });

    if (appliedTargetCount === 0) {
      message.info("当前没有可同步的联动 MPR 视口。");
    }
  }, [
    message,
    mprViewportReferenceLineStateById,
    selectedViewportId,
    selectedViewportMode,
    setViewportMprSlabStateById,
    viewerDefaultMprSlabState,
    viewportIds,
    viewportModeById,
  ]);

  const handleViewportCineTogglePlay = useCallback(() => {
    if (!activeViewportCineEnabled) {
      return;
    }

    setViewportCineStateById((previous) => {
      const currentState = normalizeViewportCineState(previous[selectedViewportId]);

      return {
        ...previous,
        [selectedViewportId]: {
          ...currentState,
          isPlaying: !currentState.isPlaying,
        },
      };
    });
  }, [
    activeViewportCineEnabled,
    selectedViewportId,
    setViewportCineStateById,
  ]);

  const handleViewportCineSetFps = useCallback(
    (fps: ViewportCineFpsPreset) => {
      setViewportCineStateById((previous) => {
        const currentState = normalizeViewportCineState(
          previous[selectedViewportId],
        );

        if (currentState.fps === fps) {
          return previous;
        }

        return {
          ...previous,
          [selectedViewportId]: {
            ...currentState,
            fps,
          },
        };
      });
    },
    [selectedViewportId, setViewportCineStateById],
  );

  const handleViewportCineToggleLoop = useCallback(() => {
    setViewportCineStateById((previous) => {
      const currentState = normalizeViewportCineState(previous[selectedViewportId]);

      return {
        ...previous,
        [selectedViewportId]: {
          ...currentState,
          loop: !currentState.loop,
        },
      };
    });
  }, [selectedViewportId, setViewportCineStateById]);

  const handleToggleCurrentKeyImage = useCallback(() => {
    if (
      !activeViewportKeyImageEnabled ||
      !activeViewportSeriesKey ||
      activeViewportCurrentFrameIndex == null
    ) {
      return;
    }

    const currentImage =
      activeViewportSeriesEntry?.series.images[activeViewportCurrentFrameIndex - 1] ??
      null;

    setViewportKeyImagesBySeriesKey((previous) => {
      const currentEntries = previous[activeViewportSeriesKey] ?? [];
      const hasExistingEntry = currentEntries.some(
        (entry) => entry.frameIndex === activeViewportCurrentFrameIndex,
      );
      const nextEntries = hasExistingEntry
        ? currentEntries.filter(
            (entry) => entry.frameIndex !== activeViewportCurrentFrameIndex,
          )
        : sortKeyImageEntries([
            ...currentEntries,
            createKeyImageEntry({
              frameIndex: activeViewportCurrentFrameIndex,
              image: currentImage,
            }),
          ]);

      if (nextEntries.length) {
        return {
          ...previous,
          [activeViewportSeriesKey]: nextEntries,
        };
      }

      const nextState = {
        ...previous,
      };

      delete nextState[activeViewportSeriesKey];
      return nextState;
    });
  }, [
    activeViewportCurrentFrameIndex,
    activeViewportKeyImageEnabled,
    activeViewportSeriesEntry,
    activeViewportSeriesKey,
    setViewportKeyImagesBySeriesKey,
  ]);

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
    [
      selectedViewportId,
      selectedViewportMode,
      setManualSequenceSyncRequest,
      setViewportSequenceSyncStateById,
    ],
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
  }, [
    selectedViewportId,
    selectedViewportMode,
    setManualSequenceSyncRequest,
    setViewportSequenceSyncStateById,
  ]);

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

  const handleViewportHistoryAction = useCallback(
    (action: "undo" | "redo") => {
      if (selectedViewportMode === "mpr") {
        return;
      }

      void initializeCornerstone()
        .then(({ core }) => {
          const historyMemo = core.utilities.HistoryMemo.DefaultHistoryMemo;

          if (action === "undo") {
            historyMemo.undo();
            return;
          }

          historyMemo.redo();
        })
        .catch((error) => {
          console.error(`Failed to ${action} viewport history`, error);
        });
    },
    [selectedViewportMode],
  );

  const handleViewportAction = useCallback(
    (action: ViewportAction) => {
      if (action === "undo" || action === "redo") {
        handleViewportHistoryAction(action);
        return;
      }

      if (action === "referenceLines") {
        const canToggleReferenceLines =
          selectedViewportMode === "mpr" ||
          (selectedViewportMode === "stack" &&
            activeViewportImageLayoutId === DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID);

        if (!canToggleReferenceLines) {
          return;
        }

        setReferenceLinesEnabled((previous) => !previous);
        return;
      }

      if (action === "invert") {
        setViewportInvertEnabled((previous) => ({
          ...previous,
          [selectedViewportId]: !(previous[selectedViewportId] ?? false),
        }));

        return;
      }

      if (action === "keyImage") {
        handleToggleCurrentKeyImage();
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
    [
      handleViewportHistoryAction,
      activeViewportImageLayoutId,
      handleToggleCurrentKeyImage,
      selectedViewportId,
      selectedViewportMode,
      setReferenceLinesEnabled,
      setAnnotationListOpen,
      setDicomTagDialogViewportId,
      setViewportInvertEnabled,
    ],
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

  const handleDeleteKeyImage = useCallback(
    (frameIndex: number) => {
      if (!activeViewportSeriesKey) {
        return;
      }

      setViewportKeyImagesBySeriesKey((previous) => {
        const currentEntries = previous[activeViewportSeriesKey] ?? [];
        const nextEntries = currentEntries.filter(
          (entry) => entry.frameIndex !== frameIndex,
        );

        if (nextEntries.length === currentEntries.length) {
          return previous;
        }

        if (nextEntries.length) {
          return {
            ...previous,
            [activeViewportSeriesKey]: nextEntries,
          };
        }

        const nextState = {
          ...previous,
        };

        delete nextState[activeViewportSeriesKey];
        return nextState;
      });
    },
    [activeViewportSeriesKey, setViewportKeyImagesBySeriesKey],
  );

  const handleClearAllKeyImages = useCallback(() => {
    if (!activeViewportSeriesKey || !activeViewportKeyImageEntries.length) {
      return;
    }

    modal.confirm({
      title: "清空当前序列全部关键图像？",
      content: "这会移除当前序列中已标记的关键图像，且无法撤销。",
      okText: "清空全部",
      okButtonProps: {
        danger: true,
      },
      cancelText: "取消",
      onOk: () => {
        setViewportKeyImagesBySeriesKey((previous) => {
          const nextState = {
            ...previous,
          };

          delete nextState[activeViewportSeriesKey];
          return nextState;
        });
      },
    });
  }, [
    activeViewportKeyImageEntries.length,
    activeViewportSeriesKey,
    modal,
    setViewportKeyImagesBySeriesKey,
  ]);

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
    const normalizedSettings = normalizeViewerSettings(payload);
    const previousDefaultMprSlabState =
      getViewerSettingsDefaultMprSlabState(viewerSettings);
    const nextDefaultMprSlabState =
      getViewerSettingsDefaultMprSlabState(normalizedSettings);

    if (
      !areViewportMprSlabStatesEqual(
        previousDefaultMprSlabState,
        nextDefaultMprSlabState,
      )
    ) {
      setViewportMprSlabStateById((previous) => {
        let nextState: Record<string, ViewportMprSlabState> | null = null;

        for (const viewportId of viewportIds) {
          const currentState = normalizeViewportMprSlabState(
            previous[viewportId],
            previousDefaultMprSlabState,
          );

          if (
            !areViewportMprSlabStatesEqual(
              currentState,
              previousDefaultMprSlabState,
            )
          ) {
            continue;
          }

          if (
            areViewportMprSlabStatesEqual(currentState, nextDefaultMprSlabState)
          ) {
            continue;
          }

          if (!nextState) {
            nextState = { ...previous };
          }

          nextState[viewportId] = {
            ...nextDefaultMprSlabState,
          };
        }

        return nextState ?? previous;
      });
    }

    setViewerSettings(normalizedSettings);
    setSettingsOpen(false);
  };

  useViewerKeyboardShortcuts({
    viewerSettings,
    settingsOpen,
    annotationListOpen,
    keyImageListOpen,
    dicomTagDialogViewportId,
    orderedSeriesEntryCount: orderedSeriesEntries.length,
    onOpenSettings: () => setSettingsOpen(true),
    onViewportToolChange: handleViewportToolChange,
    onViewportAction: handleViewportAction,
  });

  useViewportLayoutSession({
    hierarchySeriesKeys: orderedSeriesKeys,
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
  });

  useEffect(() => {
    setViewportCineStateById((previous) => {
      let nextState: Record<string, ViewportCineState> | null = null;

      for (const viewportId of viewportIds) {
        const currentState = normalizeViewportCineState(previous[viewportId]);
        const currentSeriesEntry =
          seriesEntryMap.get(viewportSeriesAssignments[viewportId] ?? "") ??
          null;
        const compatible = isViewportCineCompatible({
          viewportMode: viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE,
          imageLayoutId:
            viewportImageLayoutIdById[viewportId] ??
            DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
          frameCount: currentSeriesEntry?.series.images.length ?? 0,
        });
        const nextViewportState = compatible
          ? currentState
          : {
              ...currentState,
              isPlaying: false,
            };

        if (areViewportCineStatesEqual(currentState, nextViewportState)) {
          continue;
        }

        if (!nextState) {
          nextState = { ...previous };
        }

        nextState[viewportId] = nextViewportState;
      }

      return nextState ?? previous;
    });
  }, [
    seriesEntryMap,
    setViewportCineStateById,
    viewportIds,
    viewportImageLayoutIdById,
    viewportModeById,
    viewportSeriesAssignments,
  ]);

  useEffect(() => {
    if (!keyImageListOpen || activeViewportKeyImageListEnabled) {
      return;
    }

    setKeyImageListOpen(false);
  }, [
    activeViewportKeyImageListEnabled,
    keyImageListOpen,
    setKeyImageListOpen,
  ]);

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
    setCrossStudyCalibrationByPairKey,
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
    setActiveViewportTool,
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
    for (const [viewportId, presentationState] of Object.entries(
      stackViewportPresentationStateById,
    )) {
      if (!presentationState) {
        delete processedPresentationSyncTokenByViewportRef.current[viewportId];
      }
    }
  }, [stackViewportPresentationStateById]);

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
    for (const viewportId of viewportIds) {
      const presentationState = stackViewportPresentationStateById[viewportId];

      if (
        !presentationState ||
        presentationState.lastChangeSource === "sync" ||
        presentationState.lastChangeSource === "load"
      ) {
        continue;
      }

      const lastProcessedToken =
        processedPresentationSyncTokenByViewportRef.current[viewportId] ?? 0;

      if (presentationState.lastChangeToken <= lastProcessedToken) {
        continue;
      }

      processedPresentationSyncTokenByViewportRef.current[viewportId] =
        presentationState.lastChangeToken;
      dispatchPresentationSyncFromViewport(viewportId);
    }
  }, [
    dispatchPresentationSyncFromViewport,
    stackViewportPresentationStateById,
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
    dispatchPresentationSyncFromViewport(
      manualSequenceSyncRequest.sourceViewportId,
    );
  }, [
    dispatchPresentationSyncFromViewport,
    dispatchSequenceSyncFromViewport,
    manualSequenceSyncRequest,
  ]);

  useEffect(() => {
    if (
      !referenceLinesEnabled ||
      selectedViewportMode !== "mpr" ||
      !referenceLineSourceViewportId ||
      !referenceLineSourceState ||
      referenceLineSourceState.status !== "ready" ||
      !referenceLineSourceState.referencePointWorld
    ) {
      return;
    }

    const sourceSyncKey = `${referenceLineSourceViewportId}:${referenceLineSourceState.frameOfReferenceUID ?? "unknown"}:${referenceLineSourceState.lastChangeToken}`;
    const nextSyncCommands: Record<
      string,
      ViewportMprCrosshairSyncCommand | null
    > = {};

    for (const targetViewportId of viewportIds) {
      if (targetViewportId === referenceLineSourceViewportId) {
        continue;
      }

      if (
        (viewportModeById[targetViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
        "mpr"
      ) {
        continue;
      }

      const targetReferenceState =
        mprViewportReferenceLineStateById[targetViewportId] ?? null;

      if (!targetReferenceState || targetReferenceState.status !== "ready") {
        continue;
      }

      if (
        referenceLineSourceState.frameOfReferenceUID &&
        targetReferenceState.frameOfReferenceUID &&
        referenceLineSourceState.frameOfReferenceUID !==
          targetReferenceState.frameOfReferenceUID
      ) {
        continue;
      }

      const processedSyncKey =
        processedMprCrosshairSyncKeyByViewportRef.current[targetViewportId];
      const nextProcessedSyncKey = `${sourceSyncKey}:${targetViewportId}`;

      if (processedSyncKey === nextProcessedSyncKey) {
        continue;
      }

      processedMprCrosshairSyncKeyByViewportRef.current[targetViewportId] =
        nextProcessedSyncKey;
      mprCrosshairSyncCommandIdRef.current += 1;
      nextSyncCommands[targetViewportId] = {
        id: mprCrosshairSyncCommandIdRef.current,
        targetViewportKey: targetViewportId,
        sourceViewportKey: referenceLineSourceViewportId,
        frameOfReferenceUID: referenceLineSourceState.frameOfReferenceUID,
        referencePointWorld: clonePoint3(
          referenceLineSourceState.referencePointWorld,
        ),
      };
    }

    if (!Object.keys(nextSyncCommands).length) {
      return;
    }

    setViewportMprCrosshairSyncCommandById((previous) => ({
      ...previous,
      ...nextSyncCommands,
    }));
  }, [
    mprViewportReferenceLineStateById,
    referenceLineSourceState,
    referenceLineSourceViewportId,
    referenceLinesEnabled,
    selectedViewportMode,
    setViewportMprCrosshairSyncCommandById,
    viewportIds,
    viewportModeById,
  ]);

  useEffect(() => {
    if (
      !referenceLinesEnabled ||
      selectedViewportMode !== "mpr" ||
      !referenceLineSourceViewportId ||
      !referenceLineSourceState ||
      referenceLineSourceState.status !== "ready"
    ) {
      return;
    }

    const sourceNavigationKey = `${referenceLineSourceViewportId}:${referenceLineSourceState.frameOfReferenceUID ?? "unknown"}:${referenceLineSourceState.lastChangeToken}`;
    const nextNavigationCommands: Record<string, { id: number; targetViewportKey: string; frameIndex: number }> =
      {};

    for (const targetViewportId of viewportIds) {
      if (targetViewportId === referenceLineSourceViewportId) {
        continue;
      }

      if (
        (viewportModeById[targetViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
        "stack"
      ) {
        continue;
      }

      const targetRuntimeState = stackViewportRuntimeStateById[targetViewportId];
      const targetSeriesKey = viewportSeriesAssignments[targetViewportId];
      const targetSeriesEntry =
        targetSeriesKey != null
          ? (seriesEntryMap.get(targetSeriesKey) ?? null)
          : null;

      if (
        !targetRuntimeState ||
        targetRuntimeState.status !== "ready" ||
        !targetSeriesEntry
      ) {
        continue;
      }

      const targetFrameIndex = findNearestFrameIndexForReferenceLinePlane(
        referenceLineSourceState,
        targetSeriesEntry.series.images,
      );

      if (!targetFrameIndex) {
        continue;
      }

      const processedNavigationKey =
        processedMprReferenceNavigationKeyByViewportRef.current[
          targetViewportId
        ];
      const nextProcessedNavigationKey = `${sourceNavigationKey}:${targetSeriesKey ?? "unknown"}:${targetFrameIndex}`;

      if (processedNavigationKey === nextProcessedNavigationKey) {
        continue;
      }

      processedMprReferenceNavigationKeyByViewportRef.current[targetViewportId] =
        nextProcessedNavigationKey;

      if (targetRuntimeState.currentFrameIndex === targetFrameIndex) {
        continue;
      }

      stackNavigationCommandIdRef.current += 1;
      nextNavigationCommands[targetViewportId] = {
        id: stackNavigationCommandIdRef.current,
        targetViewportKey: targetViewportId,
        frameIndex: targetFrameIndex,
      };
    }

    if (!Object.keys(nextNavigationCommands).length) {
      return;
    }

    setViewportStackNavigationCommandById((previous) => ({
      ...previous,
      ...nextNavigationCommands,
    }));
  }, [
    referenceLineSourceState,
    referenceLineSourceViewportId,
    referenceLinesEnabled,
    selectedViewportMode,
    seriesEntryMap,
    setViewportStackNavigationCommandById,
    stackViewportRuntimeStateById,
    viewportIds,
    viewportModeById,
    viewportSeriesAssignments,
  ]);

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
                            className={cn(
                              "series-card",
                              isSelected && "is-selected",
                              assignedViewportCount > 0 &&
                                !isSelected &&
                                "is-assigned",
                            )}
                            data-testid="series-card"
                            data-series-title={series.title}
                            data-image-count={series.imageCount}
                            data-assigned-count={assignedViewportCount}
                            onClick={() => {
                              stopViewportCine(selectedViewportId);
                              setViewportSeriesAssignments((previous) => ({
                                ...previous,
                                [selectedViewportId]: seriesKey,
                              }));
                              setViewportCellSelectionById((previous) => ({
                                ...previous,
                                [selectedViewportId]: "all",
                              }));
                              setViewportStackNavigationCommandById(
                                (previous) => ({
                                  ...previous,
                                  [selectedViewportId]: null,
                                }),
                              );
                              setViewportSequenceSyncCommandById(
                                (previous) => ({
                                  ...previous,
                                  [selectedViewportId]: null,
                                }),
                              );
                              setViewportPresentationSyncCommandById(
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
            mprSlabState={activeViewportMprSlabState}
            cineState={activeViewportCineState}
            cineEnabled={activeViewportCineEnabled}
            keyImageEnabled={activeViewportKeyImageEnabled}
            keyImageActive={activeViewportHasCurrentKeyImage}
            keyImageCount={activeViewportKeyImageEntries.length}
            keyImageListEnabled={activeViewportKeyImageListEnabled}
            sequenceSyncState={activeViewportSequenceSyncState}
            crossStudyCalibrationCount={
              activeViewportCrossStudyCalibrationCount
            }
            referenceLinesEnabled={referenceLinesEnabled}
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
            onMprSlabModeChange={handleViewportMprSlabModeChange}
            onMprSlabThicknessChange={handleViewportMprSlabThicknessChange}
            onMprSlabOpenCustomThickness={
              handleViewportMprSlabOpenCustomThickness
            }
            onMprSlabReset={handleViewportMprSlabReset}
            onMprSlabApplyToAll={handleViewportMprSlabApplyToAll}
            onMprSlabApplyToLinked={handleViewportMprSlabApplyToLinked}
            onCineTogglePlay={handleViewportCineTogglePlay}
            onCineSetFps={handleViewportCineSetFps}
            onCineToggleLoop={handleViewportCineToggleLoop}
            onSequenceSyncToggle={handleViewportSequenceSyncToggle}
            onSequenceSyncClear={handleViewportSequenceSyncClear}
            onWindowPresetSelect={handleWindowPresetSelect}
            onViewAction={handleViewportViewAction}
            onAction={handleViewportAction}
            onHistoryAction={handleViewportHistoryAction}
            onAnnotationManageAction={handleAnnotationManageAction}
            onOpenKeyImageList={() => setKeyImageListOpen(true)}
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
                  className={cn(
                    "viewport-slot",
                    selectedViewportId === viewportId && "is-selected",
                    maximizedViewportId === viewportId && "is-maximized",
                  )}
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
                      mprSlabState={normalizeViewportMprSlabState(
                        viewportMprSlabStateById[viewportId],
                        viewerDefaultMprSlabState,
                      )}
                      invertEnabled={viewportInvertEnabled[viewportId] ?? false}
                      overlaySettings={viewerSettings.viewportOverlay}
                      referenceLinesEnabled={referenceLinesEnabled}
                      isReferenceLineSource={
                        referenceLinesEnabled &&
                        referenceLineSourceViewportId === viewportId
                      }
                      crosshairSyncCommand={
                        viewportMprCrosshairSyncCommandById[viewportId] ?? null
                      }
                      referenceLineSourceViewportId={referenceLineSourceViewportId}
                      referenceLineSourceState={referenceLineSourceState}
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
                      onReferenceLineStateChange={(state) => {
                        setMprViewportReferenceLineStateById((previous) => {
                          if (
                            areViewportReferenceLineStatesEqual(
                              previous[viewportId],
                              state,
                            )
                          ) {
                            return previous;
                          }

                          return {
                            ...previous,
                            [viewportId]: state,
                          };
                        });
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
                      referenceLinesEnabled={referenceLinesEnabled}
                      isReferenceLineSource={
                        referenceLinesEnabled &&
                        referenceLineSourceViewportId === viewportId
                      }
                      referenceLineSourceViewportId={referenceLineSourceViewportId}
                      referenceLineSourceState={referenceLineSourceState}
                      annotationCommand={annotationCommand}
                      viewCommand={viewCommand}
                      cineState={normalizeViewportCineState(
                        viewportCineStateById[viewportId],
                      )}
                      navigationCommand={
                        viewportStackNavigationCommandById[viewportId] ?? null
                      }
                      sequenceSyncState={
                        viewportSequenceSyncStateById[viewportId] ??
                        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE
                      }
                      sequenceSyncCommand={
                        viewportSequenceSyncCommandById[viewportId] ?? null
                      }
                      presentationSyncCommand={
                        viewportPresentationSyncCommandById[viewportId] ?? null
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
                      onCinePlaybackStop={stopViewportCine}
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
                      onReferenceLineStateChange={(state) => {
                        setStackViewportReferenceLineStateById((previous) => {
                          if (
                            areViewportReferenceLineStatesEqual(
                              previous[viewportId],
                              state,
                            )
                          ) {
                            return previous;
                          }

                          return {
                            ...previous,
                            [viewportId]: state,
                          };
                        });
                      }}
                      onPresentationStateChange={(state) => {
                        setStackViewportPresentationStateById((previous) => {
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
      <KeyImageDrawer
        open={keyImageListOpen}
        entries={activeViewportKeyImageEntries}
        currentFrameIndex={activeViewportCurrentFrameIndex}
        totalFrames={activeViewportSeriesEntry?.series.images.length ?? 0}
        studyTitle={activeViewportSeriesEntry?.study.title ?? ""}
        seriesTitle={activeViewportSeriesEntry?.series.title ?? ""}
        onClose={() => setKeyImageListOpen(false)}
        onSelectFrame={(frameIndex) => {
          queueStackNavigationCommand(frameIndex);
        }}
        onDeleteFrame={handleDeleteKeyImage}
        onClearAll={handleClearAllKeyImages}
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
