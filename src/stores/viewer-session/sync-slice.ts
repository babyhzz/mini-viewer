import { createStateSetter } from "@/stores/viewer-session/helpers";

import type {
  ViewerSessionActions,
  ViewerSessionSetState,
} from "@/stores/viewer-session/types";

export function createSyncSlice(
  set: ViewerSessionSetState,
): Pick<
  ViewerSessionActions,
  | "setReferenceLinesEnabled"
  | "setViewportSequenceSyncStateById"
  | "setStackViewportReferenceLineStateById"
  | "setMprViewportReferenceLineStateById"
  | "setStackViewportPresentationStateById"
  | "setViewportSequenceSyncCommandById"
  | "setViewportPresentationSyncCommandById"
  | "setViewportMprCrosshairSyncCommandById"
  | "setCrossStudyCalibrationByPairKey"
  | "setManualSequenceSyncRequest"
> {
  return {
    setReferenceLinesEnabled: createStateSetter("referenceLinesEnabled", set),
    setViewportSequenceSyncStateById: createStateSetter(
      "viewportSequenceSyncStateById",
      set,
    ),
    setStackViewportReferenceLineStateById: createStateSetter(
      "stackViewportReferenceLineStateById",
      set,
    ),
    setMprViewportReferenceLineStateById: createStateSetter(
      "mprViewportReferenceLineStateById",
      set,
    ),
    setStackViewportPresentationStateById: createStateSetter(
      "stackViewportPresentationStateById",
      set,
    ),
    setViewportSequenceSyncCommandById: createStateSetter(
      "viewportSequenceSyncCommandById",
      set,
    ),
    setViewportPresentationSyncCommandById: createStateSetter(
      "viewportPresentationSyncCommandById",
      set,
    ),
    setViewportMprCrosshairSyncCommandById: createStateSetter(
      "viewportMprCrosshairSyncCommandById",
      set,
    ),
    setCrossStudyCalibrationByPairKey: createStateSetter(
      "crossStudyCalibrationByPairKey",
      set,
    ),
    setManualSequenceSyncRequest: createStateSetter(
      "manualSequenceSyncRequest",
      set,
    ),
  };
}
