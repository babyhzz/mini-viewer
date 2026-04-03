import { createStateSetter } from "@/stores/viewer-session/helpers";

import type {
  ViewerSessionActions,
  ViewerSessionSetState,
} from "@/stores/viewer-session/types";

export function createUiSlice(
  set: ViewerSessionSetState,
): Pick<
  ViewerSessionActions,
  | "setViewerSettings"
  | "setActiveViewportTool"
  | "setViewportLayoutId"
  | "setMaximizedViewportId"
  | "setSelectedViewportId"
  | "setAnnotationListOpen"
  | "setKeyImageListOpen"
  | "setDicomTagDialogViewportId"
  | "setSettingsOpen"
> {
  return {
    setViewerSettings: createStateSetter("viewerSettings", set),
    setActiveViewportTool: createStateSetter("activeViewportTool", set),
    setViewportLayoutId: createStateSetter("viewportLayoutId", set),
    setMaximizedViewportId: createStateSetter("maximizedViewportId", set),
    setSelectedViewportId: createStateSetter("selectedViewportId", set),
    setAnnotationListOpen: createStateSetter("annotationListOpen", set),
    setKeyImageListOpen: createStateSetter("keyImageListOpen", set),
    setDicomTagDialogViewportId: createStateSetter(
      "dicomTagDialogViewportId",
      set,
    ),
    setSettingsOpen: createStateSetter("settingsOpen", set),
  };
}
