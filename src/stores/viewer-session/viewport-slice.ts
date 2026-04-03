import { createStateSetter } from "@/stores/viewer-session/helpers";

import type {
  ViewerSessionActions,
  ViewerSessionSetState,
} from "@/stores/viewer-session/types";

export function createViewportSlice(
  set: ViewerSessionSetState,
): Pick<
  ViewerSessionActions,
  | "setViewportSeriesAssignments"
  | "setViewportInvertEnabled"
  | "setViewportToolGroupSelections"
  | "setAnnotationCommand"
  | "setViewCommand"
  | "setViewportAnnotationsStateById"
  | "setViewportImageLayoutIdById"
  | "setViewportModeById"
  | "setViewportMprLayoutIdById"
  | "setViewportMprSlabStateById"
  | "setViewportCellSelectionById"
  | "setViewportCineStateById"
  | "setViewportKeyImagesBySeriesKey"
  | "setStackViewportRuntimeStateById"
  | "setViewportStackNavigationCommandById"
> {
  return {
    setViewportSeriesAssignments: createStateSetter(
      "viewportSeriesAssignments",
      set,
    ),
    setViewportInvertEnabled: createStateSetter("viewportInvertEnabled", set),
    setViewportToolGroupSelections: createStateSetter(
      "viewportToolGroupSelections",
      set,
    ),
    setAnnotationCommand: createStateSetter("annotationCommand", set),
    setViewCommand: createStateSetter("viewCommand", set),
    setViewportAnnotationsStateById: createStateSetter(
      "viewportAnnotationsStateById",
      set,
    ),
    setViewportImageLayoutIdById: createStateSetter(
      "viewportImageLayoutIdById",
      set,
    ),
    setViewportModeById: createStateSetter("viewportModeById", set),
    setViewportMprLayoutIdById: createStateSetter("viewportMprLayoutIdById", set),
    setViewportMprSlabStateById: createStateSetter("viewportMprSlabStateById", set),
    setViewportCellSelectionById: createStateSetter(
      "viewportCellSelectionById",
      set,
    ),
    setViewportCineStateById: createStateSetter("viewportCineStateById", set),
    setViewportKeyImagesBySeriesKey: createStateSetter(
      "viewportKeyImagesBySeriesKey",
      set,
    ),
    setStackViewportRuntimeStateById: createStateSetter(
      "stackViewportRuntimeStateById",
      set,
    ),
    setViewportStackNavigationCommandById: createStateSetter(
      "viewportStackNavigationCommandById",
      set,
    ),
  };
}
