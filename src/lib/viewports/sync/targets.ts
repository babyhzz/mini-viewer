import { DEFAULT_VIEWPORT_MODE } from "@/lib/viewports/mpr-layouts";
import type { ViewerSyncSnapshot } from "@/lib/viewports/sync/types";

export function getStackSyncTargetViewportIds(
  snapshot: ViewerSyncSnapshot,
  sourceViewportId: string,
) {
  return snapshot.viewportIds.filter(
    (viewportId) =>
      viewportId !== sourceViewportId &&
      (snapshot.viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) ===
        "stack",
  );
}

export function getMprSyncTargetViewportIds(
  snapshot: ViewerSyncSnapshot,
  sourceViewportId: string,
) {
  return snapshot.viewportIds.filter(
    (viewportId) =>
      viewportId !== sourceViewportId &&
      (snapshot.viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) === "mpr",
  );
}
