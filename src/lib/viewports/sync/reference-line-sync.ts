import { clonePoint3, getPoint3QuadCenter } from "@/lib/viewports/reference-lines";
import type { Point3, StackViewportReferenceLineState } from "@/lib/viewports/reference-lines";
import type {
  ViewportMprCrosshairSyncCommand,
} from "@/lib/viewports/mpr-crosshairs";
import type { ViewerSyncSnapshot } from "@/lib/viewports/sync/types";
import { getMprSyncTargetViewportIds, getStackSyncTargetViewportIds } from "@/lib/viewports/sync/targets";
import type { ViewportStackNavigationCommand } from "@/lib/viewports/stack-navigation";
import { DEFAULT_VIEWPORT_MODE } from "@/lib/viewports/mpr-layouts";

function dotPoint3(left: Point3, right: Point3) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function getReferenceLinePlaneCenter(
  state: StackViewportReferenceLineState | null,
) {
  if (!state || state.status !== "ready") {
    return null;
  }

  const corners = state.imageCornersWorld;

  if (!corners || corners.length !== 4) {
    return null;
  }

  return getPoint3QuadCenter(corners);
}

function getReferenceLineSourcePoint(
  state: StackViewportReferenceLineState | null,
) {
  return state?.referencePointWorld ?? getReferenceLinePlaneCenter(state);
}

export function findNearestFrameIndexForReferenceLinePlane(
  sourceState: StackViewportReferenceLineState,
  images: import("@/types/dicom").DicomImageNode[],
) {
  if (sourceState.status !== "ready" || !images.length) {
    return null;
  }

  const sourceCenter = getReferenceLineSourcePoint(sourceState);

  if (!sourceCenter) {
    return null;
  }

  let nearestFrameIndex: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const [imageIndex, image] of images.entries()) {
    if (!image.imagePositionPatient || !image.imageOrientationPatient) {
      continue;
    }

    const targetNormal: Point3 = [
      image.imageOrientationPatient[1] * image.imageOrientationPatient[5] -
        image.imageOrientationPatient[2] * image.imageOrientationPatient[4],
      image.imageOrientationPatient[2] * image.imageOrientationPatient[3] -
        image.imageOrientationPatient[0] * image.imageOrientationPatient[5],
      image.imageOrientationPatient[0] * image.imageOrientationPatient[4] -
        image.imageOrientationPatient[1] * image.imageOrientationPatient[3],
    ];
    const targetScalar = dotPoint3(
      image.imagePositionPatient,
      targetNormal,
    );
    const sourceScalar = dotPoint3(sourceCenter, targetNormal);
    const distance = Math.abs(targetScalar - sourceScalar);

    if (distance >= nearestDistance) {
      continue;
    }

    nearestDistance = distance;
    nearestFrameIndex = imageIndex + 1;
  }

  return nearestFrameIndex;
}

export function buildMprCrosshairSyncCommands(
  snapshot: ViewerSyncSnapshot,
  processedSyncKeyByViewport: Record<string, string>,
  nextCommandId: () => number,
) {
  if (
    !snapshot.referenceLinesEnabled ||
    snapshot.selectedViewportMode !== "mpr" ||
    !snapshot.referenceLineSourceViewportId ||
    !snapshot.referenceLineSourceState ||
    snapshot.referenceLineSourceState.status !== "ready" ||
    !snapshot.referenceLineSourceState.referencePointWorld
  ) {
    return {
      processedSyncKeyByViewport,
      commands: {},
    };
  }

  const sourceSyncKey = `${snapshot.referenceLineSourceViewportId}:${snapshot.referenceLineSourceState.frameOfReferenceUID ?? "unknown"}:${snapshot.referenceLineSourceState.lastChangeToken}`;
  const nextProcessed = { ...processedSyncKeyByViewport };
  const nextCommands: Record<string, ViewportMprCrosshairSyncCommand | null> = {};

  for (const targetViewportId of getMprSyncTargetViewportIds(
    snapshot,
    snapshot.referenceLineSourceViewportId,
  )) {
    const targetReferenceState =
      snapshot.mprViewportReferenceLineStateById[targetViewportId] ?? null;

    if (!targetReferenceState || targetReferenceState.status !== "ready") {
      continue;
    }

    if (
      snapshot.referenceLineSourceState.frameOfReferenceUID &&
      targetReferenceState.frameOfReferenceUID &&
      snapshot.referenceLineSourceState.frameOfReferenceUID !==
        targetReferenceState.frameOfReferenceUID
    ) {
      continue;
    }

    const nextProcessedSyncKey = `${sourceSyncKey}:${targetViewportId}`;

    if (nextProcessed[targetViewportId] === nextProcessedSyncKey) {
      continue;
    }

    nextProcessed[targetViewportId] = nextProcessedSyncKey;
    nextCommands[targetViewportId] = {
      id: nextCommandId(),
      targetViewportKey: targetViewportId,
      sourceViewportKey: snapshot.referenceLineSourceViewportId,
      frameOfReferenceUID: snapshot.referenceLineSourceState.frameOfReferenceUID,
      referencePointWorld: clonePoint3(
        snapshot.referenceLineSourceState.referencePointWorld,
      ),
    };
  }

  return {
    processedSyncKeyByViewport: nextProcessed,
    commands: nextCommands,
  };
}

export function buildReferenceLineNavigationCommands(
  snapshot: ViewerSyncSnapshot,
  processedNavigationKeyByViewport: Record<string, string>,
  nextCommandId: () => number,
) {
  if (
    !snapshot.referenceLinesEnabled ||
    snapshot.selectedViewportMode !== "mpr" ||
    !snapshot.referenceLineSourceViewportId ||
    !snapshot.referenceLineSourceState ||
    snapshot.referenceLineSourceState.status !== "ready"
  ) {
    return {
      processedNavigationKeyByViewport,
      commands: {},
    };
  }

  const sourceNavigationKey = `${snapshot.referenceLineSourceViewportId}:${snapshot.referenceLineSourceState.frameOfReferenceUID ?? "unknown"}:${snapshot.referenceLineSourceState.lastChangeToken}`;
  const nextProcessed = { ...processedNavigationKeyByViewport };
  const nextCommands: Record<string, ViewportStackNavigationCommand | null> = {};

  for (const targetViewportId of getStackSyncTargetViewportIds(
    snapshot,
    snapshot.referenceLineSourceViewportId,
  )) {
    if (
      (snapshot.viewportModeById[targetViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
      "stack"
    ) {
      continue;
    }

    const targetRuntimeState =
      snapshot.stackViewportRuntimeStateById[targetViewportId];
    const targetSeriesKey = snapshot.viewportSeriesAssignments[targetViewportId];
    const targetSeriesEntry =
      targetSeriesKey != null
        ? (snapshot.seriesEntryMap.get(targetSeriesKey) ?? null)
        : null;

    if (
      !targetRuntimeState ||
      targetRuntimeState.status !== "ready" ||
      !targetSeriesEntry
    ) {
      continue;
    }

    const targetFrameIndex = findNearestFrameIndexForReferenceLinePlane(
      snapshot.referenceLineSourceState,
      targetSeriesEntry.series.images,
    );

    if (!targetFrameIndex) {
      continue;
    }

    const nextProcessedNavigationKey = `${sourceNavigationKey}:${targetSeriesKey ?? "unknown"}:${targetFrameIndex}`;

    if (nextProcessed[targetViewportId] === nextProcessedNavigationKey) {
      continue;
    }

    nextProcessed[targetViewportId] = nextProcessedNavigationKey;

    if (targetRuntimeState.currentFrameIndex === targetFrameIndex) {
      continue;
    }

    nextCommands[targetViewportId] = {
      id: nextCommandId(),
      targetViewportKey: targetViewportId,
      frameIndex: targetFrameIndex,
    };
  }

  return {
    processedNavigationKeyByViewport: nextProcessed,
    commands: nextCommands,
  };
}
