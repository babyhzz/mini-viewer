import { create } from "zustand";

import {
  VIEWER_SESSION_DEFAULTS,
  createInitialViewerSessionState,
} from "@/stores/viewer-session/defaults";
import { createEmptyViewerAnnotationStateMap } from "@/stores/viewer-session/helpers";
import { createSyncSlice } from "@/stores/viewer-session/sync-slice";
import type { ViewerSessionStore } from "@/stores/viewer-session/types";
import { createUiSlice } from "@/stores/viewer-session/ui-slice";
import { createViewportSlice } from "@/stores/viewer-session/viewport-slice";

export const useViewerSessionStore = create<ViewerSessionStore>((set) => ({
  ...createInitialViewerSessionState(),
  ...createUiSlice(set),
  ...createViewportSlice(set),
  ...createSyncSlice(set),
  resetViewerSession: () => {
    set(createInitialViewerSessionState());
  },
}));

export { createEmptyViewerAnnotationStateMap, VIEWER_SESSION_DEFAULTS };
export type {
  ManualSequenceSyncRequest,
  StateUpdater,
  ViewerSessionActions,
  ViewerSessionState,
  ViewerSessionStore,
  ViewportCellSelection,
} from "@/stores/viewer-session/types";
