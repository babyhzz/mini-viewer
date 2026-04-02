import { create } from "zustand";

import {
  createEmptyViewportAnnotationsState,
  type ViewportAnnotationsState,
} from "@/components/viewport-annotations";
import { createDefaultViewerSettings } from "@/lib/settings/overlay";
import type { ViewportAnnotationCommand } from "@/lib/tools/cornerstone-tool-adapter";
import {
  createDefaultViewportToolGroupSelections,
  type ViewportTool,
  type ViewportToolGroupSelections,
} from "@/lib/tools/registry";
import {
  type ViewportCineState,
} from "@/lib/viewports/cine";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  DEFAULT_VIEWPORT_LAYOUT_ID,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
import {
  DEFAULT_VIEWPORT_MODE,
  DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
  type ViewportMode,
  type ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import {
  DEFAULT_VIEWPORT_MPR_SLAB_STATE,
  type ViewportMprSlabState,
} from "@/lib/viewports/mpr-slab";
import {
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  type CrossStudyCalibration,
  type StackViewportPresentationState,
  type StackViewportRuntimeState,
  type ViewportPresentationSyncCommand,
  type ViewportSequenceSyncCommand,
  type ViewportSequenceSyncState,
} from "@/lib/viewports/sequence-sync";
import type { StackViewportReferenceLineState } from "@/lib/viewports/reference-lines";
import type { ViewportMprCrosshairSyncCommand } from "@/lib/viewports/mpr-crosshairs";
import type { KeyImageEntry } from "@/lib/viewports/key-images";
import type { ViewportStackNavigationCommand } from "@/lib/viewports/stack-navigation";
import type { ViewportViewCommand } from "@/lib/viewports/view-commands";
import type { ViewerSettings } from "@/types/settings";

type ViewportCellSelection = "all" | number;

type StateUpdater<T> = T | ((previous: T) => T);

interface ManualSequenceSyncRequest {
  id: number;
  sourceViewportId: string;
}

export interface ViewerSessionState {
  viewerSettings: ViewerSettings;
  activeViewportTool: ViewportTool;
  viewportLayoutId: ViewportLayoutId;
  maximizedViewportId: string | null;
  selectedViewportId: string;
  referenceLinesEnabled: boolean;
  viewportSeriesAssignments: Record<string, string | null>;
  viewportInvertEnabled: Record<string, boolean>;
  viewportToolGroupSelections: ViewportToolGroupSelections;
  annotationCommand: ViewportAnnotationCommand | null;
  viewCommand: ViewportViewCommand | null;
  viewportAnnotationsStateById: Record<string, ViewportAnnotationsState>;
  viewportImageLayoutIdById: Record<string, ViewportImageLayoutId>;
  viewportModeById: Record<string, ViewportMode>;
  viewportMprLayoutIdById: Record<string, ViewportMprLayoutId>;
  viewportMprSlabStateById: Record<string, ViewportMprSlabState>;
  viewportCellSelectionById: Record<string, ViewportCellSelection>;
  viewportCineStateById: Record<string, ViewportCineState>;
  viewportKeyImagesBySeriesKey: Record<string, KeyImageEntry[]>;
  viewportSequenceSyncStateById: Record<string, ViewportSequenceSyncState>;
  stackViewportRuntimeStateById: Record<string, StackViewportRuntimeState | null>;
  stackViewportReferenceLineStateById: Record<
    string,
    StackViewportReferenceLineState | null
  >;
  mprViewportReferenceLineStateById: Record<
    string,
    StackViewportReferenceLineState | null
  >;
  stackViewportPresentationStateById: Record<
    string,
    StackViewportPresentationState | null
  >;
  viewportStackNavigationCommandById: Record<
    string,
    ViewportStackNavigationCommand | null
  >;
  viewportSequenceSyncCommandById: Record<
    string,
    ViewportSequenceSyncCommand | null
  >;
  viewportPresentationSyncCommandById: Record<
    string,
    ViewportPresentationSyncCommand | null
  >;
  viewportMprCrosshairSyncCommandById: Record<
    string,
    ViewportMprCrosshairSyncCommand | null
  >;
  crossStudyCalibrationByPairKey: Record<string, CrossStudyCalibration>;
  manualSequenceSyncRequest: ManualSequenceSyncRequest | null;
  annotationListOpen: boolean;
  keyImageListOpen: boolean;
  dicomTagDialogViewportId: string | null;
  settingsOpen: boolean;
}

interface ViewerSessionActions {
  setViewerSettings: (updater: StateUpdater<ViewerSettings>) => void;
  setActiveViewportTool: (updater: StateUpdater<ViewportTool>) => void;
  setViewportLayoutId: (updater: StateUpdater<ViewportLayoutId>) => void;
  setMaximizedViewportId: (updater: StateUpdater<string | null>) => void;
  setSelectedViewportId: (updater: StateUpdater<string>) => void;
  setReferenceLinesEnabled: (updater: StateUpdater<boolean>) => void;
  setViewportSeriesAssignments: (
    updater: StateUpdater<Record<string, string | null>>,
  ) => void;
  setViewportInvertEnabled: (
    updater: StateUpdater<Record<string, boolean>>,
  ) => void;
  setViewportToolGroupSelections: (
    updater: StateUpdater<ViewportToolGroupSelections>,
  ) => void;
  setAnnotationCommand: (
    updater: StateUpdater<ViewportAnnotationCommand | null>,
  ) => void;
  setViewCommand: (updater: StateUpdater<ViewportViewCommand | null>) => void;
  setViewportAnnotationsStateById: (
    updater: StateUpdater<Record<string, ViewportAnnotationsState>>,
  ) => void;
  setViewportImageLayoutIdById: (
    updater: StateUpdater<Record<string, ViewportImageLayoutId>>,
  ) => void;
  setViewportModeById: (
    updater: StateUpdater<Record<string, ViewportMode>>,
  ) => void;
  setViewportMprLayoutIdById: (
    updater: StateUpdater<Record<string, ViewportMprLayoutId>>,
  ) => void;
  setViewportMprSlabStateById: (
    updater: StateUpdater<Record<string, ViewportMprSlabState>>,
  ) => void;
  setViewportCellSelectionById: (
    updater: StateUpdater<Record<string, ViewportCellSelection>>,
  ) => void;
  setViewportCineStateById: (
    updater: StateUpdater<Record<string, ViewportCineState>>,
  ) => void;
  setViewportKeyImagesBySeriesKey: (
    updater: StateUpdater<Record<string, KeyImageEntry[]>>,
  ) => void;
  setViewportSequenceSyncStateById: (
    updater: StateUpdater<Record<string, ViewportSequenceSyncState>>,
  ) => void;
  setStackViewportRuntimeStateById: (
    updater: StateUpdater<Record<string, StackViewportRuntimeState | null>>,
  ) => void;
  setStackViewportReferenceLineStateById: (
    updater: StateUpdater<Record<string, StackViewportReferenceLineState | null>>,
  ) => void;
  setMprViewportReferenceLineStateById: (
    updater: StateUpdater<Record<string, StackViewportReferenceLineState | null>>,
  ) => void;
  setStackViewportPresentationStateById: (
    updater: StateUpdater<Record<string, StackViewportPresentationState | null>>,
  ) => void;
  setViewportStackNavigationCommandById: (
    updater: StateUpdater<Record<string, ViewportStackNavigationCommand | null>>,
  ) => void;
  setViewportSequenceSyncCommandById: (
    updater: StateUpdater<Record<string, ViewportSequenceSyncCommand | null>>,
  ) => void;
  setViewportPresentationSyncCommandById: (
    updater: StateUpdater<Record<string, ViewportPresentationSyncCommand | null>>,
  ) => void;
  setViewportMprCrosshairSyncCommandById: (
    updater: StateUpdater<Record<string, ViewportMprCrosshairSyncCommand | null>>,
  ) => void;
  setCrossStudyCalibrationByPairKey: (
    updater: StateUpdater<Record<string, CrossStudyCalibration>>,
  ) => void;
  setManualSequenceSyncRequest: (
    updater: StateUpdater<ManualSequenceSyncRequest | null>,
  ) => void;
  setAnnotationListOpen: (updater: StateUpdater<boolean>) => void;
  setKeyImageListOpen: (updater: StateUpdater<boolean>) => void;
  setDicomTagDialogViewportId: (
    updater: StateUpdater<string | null>,
  ) => void;
  setSettingsOpen: (updater: StateUpdater<boolean>) => void;
  resetViewerSession: () => void;
}

export type ViewerSessionStore = ViewerSessionState & ViewerSessionActions;

function resolveStateUpdater<T>(updater: StateUpdater<T>, previous: T) {
  if (typeof updater === "function") {
    return (updater as (previous: T) => T)(previous);
  }

  return updater;
}

function createInitialViewerSessionState(): ViewerSessionState {
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

function createStateSetter<TState extends keyof ViewerSessionState>(
  key: TState,
  set: (
    partial:
      | Partial<ViewerSessionStore>
      | ((state: ViewerSessionStore) => Partial<ViewerSessionStore>),
  ) => void,
) {
  return (updater: StateUpdater<ViewerSessionState[TState]>) => {
    set((state) => ({
      [key]: resolveStateUpdater(updater, state[key]),
    }));
  };
}

export const useViewerSessionStore = create<ViewerSessionStore>((set) => ({
  ...createInitialViewerSessionState(),
  setViewerSettings: createStateSetter("viewerSettings", set),
  setActiveViewportTool: createStateSetter("activeViewportTool", set),
  setViewportLayoutId: createStateSetter("viewportLayoutId", set),
  setMaximizedViewportId: createStateSetter("maximizedViewportId", set),
  setSelectedViewportId: createStateSetter("selectedViewportId", set),
  setReferenceLinesEnabled: createStateSetter("referenceLinesEnabled", set),
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
  setViewportSequenceSyncStateById: createStateSetter(
    "viewportSequenceSyncStateById",
    set,
  ),
  setStackViewportRuntimeStateById: createStateSetter(
    "stackViewportRuntimeStateById",
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
  setViewportStackNavigationCommandById: createStateSetter(
    "viewportStackNavigationCommandById",
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
  setAnnotationListOpen: createStateSetter("annotationListOpen", set),
  setKeyImageListOpen: createStateSetter("keyImageListOpen", set),
  setDicomTagDialogViewportId: createStateSetter(
    "dicomTagDialogViewportId",
    set,
  ),
  setSettingsOpen: createStateSetter("settingsOpen", set),
  resetViewerSession: () => {
    set(createInitialViewerSessionState());
  },
}));

export function createEmptyViewerAnnotationStateMap(
  viewportIds: string[],
) {
  return viewportIds.reduce<Record<string, ViewportAnnotationsState>>(
    (nextState, viewportId) => {
      nextState[viewportId] = createEmptyViewportAnnotationsState();
      return nextState;
    },
    {},
  );
}

export const VIEWER_SESSION_DEFAULTS = {
  imageLayoutId: DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  mode: DEFAULT_VIEWPORT_MODE,
  mprLayoutId: DEFAULT_VIEWPORT_MPR_LAYOUT_ID,
  mprSlabState: DEFAULT_VIEWPORT_MPR_SLAB_STATE,
  sequenceSyncState: DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
};
