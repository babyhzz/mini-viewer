import { DEFAULT_VIEWPORT_MODE } from "@/lib/viewports/mpr-layouts";
import {
  areImagesSliceAligned,
  createCrossStudyCalibration,
  findCrossStudySyncedFrameIndex,
  findNearestImageIndexBySlicePosition,
  getImageSliceNormal,
  getImageSliceScalar,
  getSequenceSyncPairKey,
  hasEnabledViewportSliceSync,
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  type CrossStudyCalibration,
  type ViewportSequenceSyncCommand,
  type ViewportSliceSyncType,
} from "@/lib/viewports/sequence-sync";
import type { ViewerSyncSnapshot } from "@/lib/viewports/sync/types";
import { getStackSyncTargetViewportIds } from "@/lib/viewports/sync/targets";

export function buildSequenceSyncCommands(
  snapshot: ViewerSyncSnapshot,
  sourceViewportId: string,
  nextCommandId: () => number,
) {
  const sourceSyncState =
    snapshot.viewportSequenceSyncStateById[sourceViewportId] ??
    DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;

  if (!hasEnabledViewportSliceSync(sourceSyncState)) {
    return {
      calibrationMap: snapshot.crossStudyCalibrationByPairKey,
      commands: {},
    };
  }

  if (
    (snapshot.viewportModeById[sourceViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
    "stack"
  ) {
    return {
      calibrationMap: snapshot.crossStudyCalibrationByPairKey,
      commands: {},
    };
  }

  const sourceRuntimeState = snapshot.stackViewportRuntimeStateById[sourceViewportId];
  const sourceSeriesKey = snapshot.viewportSeriesAssignments[sourceViewportId];
  const sourceSeriesEntry =
    sourceSeriesKey != null
      ? (snapshot.seriesEntryMap.get(sourceSeriesKey) ?? null)
      : null;

  if (
    !sourceRuntimeState ||
    sourceRuntimeState.status !== "ready" ||
    !sourceSeriesEntry
  ) {
    return {
      calibrationMap: snapshot.crossStudyCalibrationByPairKey,
      commands: {},
    };
  }

  const sourceImage =
    sourceSeriesEntry.series.images[sourceRuntimeState.currentFrameIndex - 1] ??
    null;

  if (!sourceImage) {
    return {
      calibrationMap: snapshot.crossStudyCalibrationByPairKey,
      commands: {},
    };
  }

  let nextCalibrationMap: Record<string, CrossStudyCalibration> | null = null;
  const nextSyncCommands: Record<string, ViewportSequenceSyncCommand | null> = {};

  for (const targetViewportId of getStackSyncTargetViewportIds(
    snapshot,
    sourceViewportId,
  )) {
    const targetRuntimeState = snapshot.stackViewportRuntimeStateById[targetViewportId];
    const targetSeriesKey = snapshot.viewportSeriesAssignments[targetViewportId];
    const targetSeriesEntry =
      targetSeriesKey != null
        ? (snapshot.seriesEntryMap.get(targetSeriesKey) ?? null)
        : null;
    const targetSyncState =
      snapshot.viewportSequenceSyncStateById[targetViewportId] ??
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

    if (isSameStudy && sourceSyncState.sameStudy && targetSyncState.sameStudy) {
      const targetReferenceImage =
        targetSeriesEntry.series.images[targetRuntimeState.currentFrameIndex - 1] ??
        targetSeriesEntry.series.images[0] ??
        null;
      const targetNormal = getImageSliceNormal(targetReferenceImage);
      const sourceSliceScalar = getImageSliceScalar(sourceImage, targetNormal);

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
      const pairKey = getSequenceSyncPairKey(sourceViewportId, targetViewportId);
      const existingCalibration = snapshot.crossStudyCalibrationByPairKey[pairKey];
      const canReuseExistingCalibration =
        existingCalibration &&
        existingCalibration.leftSeriesKey ===
          snapshot.viewportSeriesAssignments[existingCalibration.leftViewportId] &&
        existingCalibration.rightSeriesKey ===
          snapshot.viewportSeriesAssignments[existingCalibration.rightViewportId];
      const targetImage =
        targetSeriesEntry.series.images[targetRuntimeState.currentFrameIndex - 1] ??
        null;
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
          ...snapshot.crossStudyCalibrationByPairKey,
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

    nextSyncCommands[targetViewportId] = {
      id: nextCommandId(),
      targetViewportKey: targetViewportId,
      sourceViewportKey: sourceViewportId,
      frameIndex: targetFrameIndex,
      syncType,
      calibrationPairKey,
    };
  }

  return {
    calibrationMap: nextCalibrationMap ?? snapshot.crossStudyCalibrationByPairKey,
    commands: nextSyncCommands,
  };
}
