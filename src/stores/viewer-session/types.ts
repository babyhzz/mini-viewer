import type { ViewportAnnotationsState } from "@/types/viewport-annotations";
import type { ViewerSettings } from "@/types/settings";
import type { ViewportAnnotationCommand } from "@/lib/tools/cornerstone-tool-adapter";
import type {
  ViewportTool,
  ViewportToolGroupSelections,
} from "@/lib/tools/registry";
import type { ViewportCineState } from "@/lib/viewports/cine";
import type { ViewportImageLayoutId } from "@/lib/viewports/image-layouts";
import type { ViewportLayoutId } from "@/lib/viewports/layouts";
import type {
  ViewportMode,
  ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import type { ViewportMprSlabState } from "@/lib/viewports/mpr-slab";
import type {
  CrossStudyCalibration,
  StackViewportPresentationState,
  StackViewportRuntimeState,
  ViewportPresentationSyncCommand,
  ViewportSequenceSyncCommand,
  ViewportSequenceSyncState,
} from "@/lib/viewports/sequence-sync";
import type { StackViewportReferenceLineState } from "@/lib/viewports/reference-lines";
import type { ViewportMprCrosshairSyncCommand } from "@/lib/viewports/mpr-crosshairs";
import type { KeyImageEntry } from "@/lib/viewports/key-images";
import type { ViewportStackNavigationCommand } from "@/lib/viewports/stack-navigation";
import type { ViewportViewCommand } from "@/lib/viewports/view-commands";

export type ViewportCellSelection = "all" | number;

export type StateUpdater<T> = T | ((previous: T) => T);

export interface ManualSequenceSyncRequest {
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

export interface ViewerSessionActions {
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

export type ViewerSessionSetState = (
  partial:
    | Partial<ViewerSessionStore>
    | ((state: ViewerSessionStore) => Partial<ViewerSessionStore>),
) => void;
