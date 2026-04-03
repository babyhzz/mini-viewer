import { DEFAULT_VIEWPORT_MODE } from "@/lib/viewports/mpr-layouts";
import { DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE } from "@/lib/viewports/sequence-sync";
import type { ViewerSyncSnapshot } from "@/lib/viewports/sync/types";
import type { CrossStudyCalibration } from "@/lib/viewports/sequence-sync";

export function pruneCrossStudyCalibrations(snapshot: ViewerSyncSnapshot) {
  const nextEntries = Object.values(snapshot.crossStudyCalibrationByPairKey).filter(
    (calibration) => {
      const leftViewportMode =
        snapshot.viewportModeById[calibration.leftViewportId] ??
        DEFAULT_VIEWPORT_MODE;
      const rightViewportMode =
        snapshot.viewportModeById[calibration.rightViewportId] ??
        DEFAULT_VIEWPORT_MODE;
      const leftSyncState =
        snapshot.viewportSequenceSyncStateById[calibration.leftViewportId] ??
        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
      const rightSyncState =
        snapshot.viewportSequenceSyncStateById[calibration.rightViewportId] ??
        DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE;
      const leftSeriesKey =
        snapshot.viewportSeriesAssignments[calibration.leftViewportId];
      const rightSeriesKey =
        snapshot.viewportSeriesAssignments[calibration.rightViewportId];

      return (
        leftViewportMode === "stack" &&
        rightViewportMode === "stack" &&
        leftSyncState.crossStudy &&
        rightSyncState.crossStudy &&
        leftSeriesKey === calibration.leftSeriesKey &&
        rightSeriesKey === calibration.rightSeriesKey
      );
    },
  );

  if (
    nextEntries.length ===
    Object.keys(snapshot.crossStudyCalibrationByPairKey).length
  ) {
    return snapshot.crossStudyCalibrationByPairKey;
  }

  return nextEntries.reduce<Record<string, CrossStudyCalibration>>(
    (nextMap, calibration) => {
      nextMap[calibration.pairKey] = calibration;
      return nextMap;
    },
    {},
  );
}
