import { describe, expect, it } from "vitest";

import { getStackSyncTargetViewportIds } from "@/lib/viewports/sync/targets";
import type { ViewerSyncSnapshot } from "@/lib/viewports/sync/types";

function createSnapshot(): ViewerSyncSnapshot {
  return {
    viewportIds: ["viewport-1", "viewport-2", "viewport-3"],
    selectedViewportId: "viewport-1",
    selectedViewportMode: "stack",
    referenceLinesEnabled: false,
    referenceLineSourceViewportId: null,
    referenceLineSourceState: null,
    viewportModeById: {
      "viewport-1": "stack",
      "viewport-2": "mpr",
      "viewport-3": "stack",
    },
    viewportSeriesAssignments: {},
    viewportSequenceSyncStateById: {},
    stackViewportRuntimeStateById: {},
    stackViewportPresentationStateById: {},
    stackViewportReferenceLineStateById: {},
    mprViewportReferenceLineStateById: {},
    crossStudyCalibrationByPairKey: {},
    seriesEntryMap: new Map(),
  };
}

describe("sync targets", () => {
  it("selects only stack targets other than the source viewport", () => {
    expect(getStackSyncTargetViewportIds(createSnapshot(), "viewport-1")).toEqual([
      "viewport-3",
    ]);
  });
});
