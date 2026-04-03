import { DEFAULT_VIEWPORT_MODE } from "@/lib/viewports/mpr-layouts";
import {
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  hasEnabledViewportDisplaySync,
} from "@/lib/viewports/sequence-sync";
import type {
  ViewportPresentationSyncCommand,
} from "@/lib/viewports/sequence-sync";
import type { ViewerSyncSnapshot } from "@/lib/viewports/sync/types";
import { getStackSyncTargetViewportIds } from "@/lib/viewports/sync/targets";

function areViewportPresentationStatesEqual(
  left: import("@/lib/viewports/sequence-sync").StackViewportPresentationState,
  right: import("@/lib/viewports/sequence-sync").StackViewportPresentationState,
) {
  return (
    left.status === right.status &&
    JSON.stringify(left.viewPresentation) ===
      JSON.stringify(right.viewPresentation) &&
    JSON.stringify(left.voiRange) === JSON.stringify(right.voiRange)
  );
}

export function buildDisplaySyncCommands(
  snapshot: ViewerSyncSnapshot,
  sourceViewportId: string,
  nextCommandId: () => number,
) {
  const sourceSyncState =
    snapshot.viewportSequenceSyncStateById[sourceViewportId] ??
    DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;

  if (!hasEnabledViewportDisplaySync(sourceSyncState)) {
    return {};
  }

  if (
    (snapshot.viewportModeById[sourceViewportId] ?? DEFAULT_VIEWPORT_MODE) !==
    "stack"
  ) {
    return {};
  }

  const sourcePresentationState =
    snapshot.stackViewportPresentationStateById[sourceViewportId];

  if (
    !sourcePresentationState ||
    sourcePresentationState.status !== "ready" ||
    !sourcePresentationState.viewPresentation
  ) {
    return {};
  }

  return getStackSyncTargetViewportIds(snapshot, sourceViewportId).reduce<
    Record<string, ViewportPresentationSyncCommand | null>
  >((nextCommands, targetViewportId) => {
    const targetSyncState =
      snapshot.viewportSequenceSyncStateById[targetViewportId] ??
      DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
    const targetPresentationState =
      snapshot.stackViewportPresentationStateById[targetViewportId];

    if (
      !hasEnabledViewportDisplaySync(targetSyncState) ||
      !targetPresentationState ||
      targetPresentationState.status !== "ready" ||
      areViewportPresentationStatesEqual(
        sourcePresentationState,
        targetPresentationState,
      )
    ) {
      return nextCommands;
    }

    nextCommands[targetViewportId] = {
      id: nextCommandId(),
      targetViewportKey: targetViewportId,
      sourceViewportKey: sourceViewportId,
      viewPresentation: sourcePresentationState.viewPresentation,
      voiRange: sourcePresentationState.voiRange,
    };
    return nextCommands;
  }, {});
}
