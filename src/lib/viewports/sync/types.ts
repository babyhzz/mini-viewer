import type { SelectedSeries } from "@/lib/viewports/series-selection";
import type { ViewportTool } from "@/lib/tools/registry";
import type { ViewportMode } from "@/lib/viewports/mpr-layouts";
import type { ViewportMprCrosshairSyncCommand } from "@/lib/viewports/mpr-crosshairs";
import type { StackViewportReferenceLineState } from "@/lib/viewports/reference-lines";
import type {
  CrossStudyCalibration,
  StackViewportPresentationState,
  StackViewportRuntimeState,
  ViewportPresentationSyncCommand,
  ViewportSequenceSyncCommand,
  ViewportSequenceSyncState,
} from "@/lib/viewports/sequence-sync";
import type { ViewportStackNavigationCommand } from "@/lib/viewports/stack-navigation";

export interface ViewerSyncSnapshot {
  viewportIds: string[];
  selectedViewportId: string;
  selectedViewportMode: ViewportMode;
  referenceLinesEnabled: boolean;
  referenceLineSourceViewportId: string | null;
  referenceLineSourceState: StackViewportReferenceLineState | null;
  viewportModeById: Record<string, ViewportMode>;
  viewportSeriesAssignments: Record<string, string | null>;
  viewportSequenceSyncStateById: Record<string, ViewportSequenceSyncState>;
  stackViewportRuntimeStateById: Record<string, StackViewportRuntimeState | null>;
  stackViewportPresentationStateById: Record<
    string,
    StackViewportPresentationState | null
  >;
  stackViewportReferenceLineStateById: Record<
    string,
    StackViewportReferenceLineState | null
  >;
  mprViewportReferenceLineStateById: Record<
    string,
    StackViewportReferenceLineState | null
  >;
  crossStudyCalibrationByPairKey: Record<string, CrossStudyCalibration>;
  seriesEntryMap: Map<string, SelectedSeries>;
}

export interface ViewerSyncCoordinatorOptions {
  snapshot: ViewerSyncSnapshot;
  activeViewportTool: ViewportTool;
  activeViewportHasMontageLayout: boolean;
  manualSequenceSyncRequest: { id: number; sourceViewportId: string } | null;
  setActiveViewportTool: (tool: ViewportTool) => void;
  setCrossStudyCalibrationByPairKey: (
    updater:
      | Record<string, CrossStudyCalibration>
      | ((
          previous: Record<string, CrossStudyCalibration>,
        ) => Record<string, CrossStudyCalibration>),
  ) => void;
  setViewportSequenceSyncCommandById: (
    updater: (
      previous: Record<string, ViewportSequenceSyncCommand | null>,
    ) => Record<string, ViewportSequenceSyncCommand | null>,
  ) => void;
  setViewportPresentationSyncCommandById: (
    updater: (
      previous: Record<string, ViewportPresentationSyncCommand | null>,
    ) => Record<string, ViewportPresentationSyncCommand | null>,
  ) => void;
  setViewportMprCrosshairSyncCommandById: (
    updater: (
      previous: Record<string, ViewportMprCrosshairSyncCommand | null>,
    ) => Record<string, ViewportMprCrosshairSyncCommand | null>,
  ) => void;
  setViewportStackNavigationCommandById: (
    updater: (
      previous: Record<string, ViewportStackNavigationCommand | null>,
    ) => Record<string, ViewportStackNavigationCommand | null>,
  ) => void;
  nextMprCrosshairSyncCommandId: () => number;
  nextSequenceSyncCommandId: () => number;
  nextPresentationSyncCommandId: () => number;
  nextStackNavigationCommandId: () => number;
}
