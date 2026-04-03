import { createDefaultViewerSettings } from "@/lib/settings/overlay";
import {
  createDefaultViewportToolGroupSelections,
} from "@/lib/tools/registry";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
} from "@/lib/viewports/image-layouts";
import {
  DEFAULT_VIEWPORT_LAYOUT_ID,
} from "@/lib/viewports/layouts";
import {
  DEFAULT_VIEWPORT_MODE,
  DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
} from "@/lib/viewports/mpr-layouts";
import {
  DEFAULT_VIEWPORT_MPR_SLAB_STATE,
} from "@/lib/viewports/mpr-slab";
import {
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
} from "@/lib/viewports/sequence-sync";

import type { ViewerSessionState } from "@/stores/viewer-session/types";

export function createInitialViewerSessionState(): ViewerSessionState {
  return {
    viewerSettings: createDefaultViewerSettings(),
    activeViewportTool: "select",
    viewportLayoutId: DEFAULT_VIEWPORT_LAYOUT_ID,
    maximizedViewportId: null,
    selectedViewportId: "viewport-1",
    referenceLinesEnabled: false,
    viewportSeriesAssignments: {},
    viewportInvertEnabled: {},
    viewportToolGroupSelections: createDefaultViewportToolGroupSelections(),
    annotationCommand: null,
    viewCommand: null,
    viewportAnnotationsStateById: {},
    viewportImageLayoutIdById: {},
    viewportModeById: {},
    viewportMprLayoutIdById: {},
    viewportMprSlabStateById: {},
    viewportCellSelectionById: {},
    viewportCineStateById: {},
    viewportKeyImagesBySeriesKey: {},
    viewportSequenceSyncStateById: {},
    stackViewportRuntimeStateById: {},
    stackViewportReferenceLineStateById: {},
    mprViewportReferenceLineStateById: {},
    stackViewportPresentationStateById: {},
    viewportStackNavigationCommandById: {},
    viewportSequenceSyncCommandById: {},
    viewportPresentationSyncCommandById: {},
    viewportMprCrosshairSyncCommandById: {},
    crossStudyCalibrationByPairKey: {},
    manualSequenceSyncRequest: null,
    annotationListOpen: false,
    keyImageListOpen: false,
    dicomTagDialogViewportId: null,
    settingsOpen: false,
  };
}

export const VIEWER_SESSION_DEFAULTS = {
  imageLayoutId: DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  mode: DEFAULT_VIEWPORT_MODE,
  mprLayoutId: DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
  mprSlabState: DEFAULT_VIEWPORT_MPR_SLAB_STATE,
  sequenceSyncState: DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
};
