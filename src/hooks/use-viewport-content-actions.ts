"use client";

import { useCallback } from "react";

import { initializeCornerstone } from "@/lib/cornerstone/init";
import {
  createKeyImageEntry,
  sortKeyImageEntries,
} from "@/lib/viewports/key-images";
import {
  normalizeViewportCineState,
  type ViewportCineFpsPreset,
} from "@/lib/viewports/cine";
import {
  normalizeViewportMprSlabState,
  type ViewportMprSlabMode,
  type ViewportMprSlabState,
} from "@/lib/viewports/mpr-slab";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
} from "@/lib/viewports/image-layouts";
import {
  DEFAULT_VIEWPORT_MODE,
  type ViewportMode,
} from "@/lib/viewports/mpr-layouts";
import {
  DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
  toggleViewportSequenceSyncType,
  type ViewportSequenceSyncType,
} from "@/lib/viewports/sequence-sync";
import type { ViewportAction } from "@/lib/tools/registry";
import type { ViewerSettings } from "@/types/settings";
import type { ViewportWindowPresetId } from "@/lib/viewports/view-commands";

interface UseViewportContentActionsOptions {
  message: {
    warning: (content: string) => unknown;
    info: (content: string) => unknown;
  };
  modal: {
    confirm: (config: {
      title: string;
      content: unknown;
      okText?: string;
      okButtonProps?: Record<string, unknown>;
      cancelText?: string;
      cancelButtonProps?: Record<string, unknown>;
      onOk?: () => Promise<unknown> | void;
    }) => unknown;
  };
  selectedViewportId: string;
  selectedViewportMode: ViewportMode;
  viewportIds: string[];
  activeViewportImageLayoutId: import("@/lib/viewports/image-layouts").ViewportImageLayoutId;
  activeViewportCineEnabled: boolean;
  activeViewportKeyImageEnabled: boolean;
  activeViewportCurrentFrameIndex: number | null;
  activeViewportSeriesEntry: import("@/lib/viewports/series-selection").SelectedSeries | null;
  activeViewportSeriesKey: string | null;
  activeViewportKeyImageEntries: import("@/lib/viewports/key-images").KeyImageEntry[];
  activeViewportAnnotationsState: import("@/types/viewport-annotations").ViewportAnnotationsState;
  activeViewportMprSlabState: ViewportMprSlabState;
  viewerDefaultMprSlabState: ViewportMprSlabState;
  viewportModeById: Record<string, ViewportMode>;
  mprViewportReferenceLineStateById: Record<string, import("@/lib/viewports/reference-lines").StackViewportReferenceLineState | null>;
  setViewportMprSlabStateById: (
    updater: (previous: Record<string, ViewportMprSlabState>) => Record<string, ViewportMprSlabState>,
  ) => void;
  setViewportCineStateById: (
    updater: (previous: Record<string, import("@/lib/viewports/cine").ViewportCineState>) => Record<string, import("@/lib/viewports/cine").ViewportCineState>,
  ) => void;
  setViewportKeyImagesBySeriesKey: (
    updater: (
      previous: Record<string, import("@/lib/viewports/key-images").KeyImageEntry[]>,
    ) => Record<string, import("@/lib/viewports/key-images").KeyImageEntry[]>,
  ) => void;
  setViewportSequenceSyncStateById: (
    updater: (
      previous: Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>,
    ) => Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>,
  ) => void;
  setReferenceLinesEnabled: (
    updater: boolean | ((previous: boolean) => boolean),
  ) => void;
  setViewportInvertEnabled: (
    updater: (previous: Record<string, boolean>) => Record<string, boolean>,
  ) => void;
  setAnnotationListOpen: (open: boolean) => void;
  setDicomTagDialogViewportId: (viewportId: string | null) => void;
  setViewerSettings: (settings: ViewerSettings) => void;
  setSettingsOpen: (open: boolean) => void;
  queueAnnotationCommand: (
    command:
      | { type: "select"; annotationUID: string }
      | { type: "delete"; annotationUIDs: string[] }
      | { type: "clearAll" },
  ) => void;
  queueViewCommand: (
    command:
      | {
          type:
            | "fit"
            | "reset"
            | "rotateRight"
            | "flipHorizontal"
            | "flipVertical";
        }
      | {
          type: "windowPreset";
          presetId: ViewportWindowPresetId;
        },
  ) => void;
  requestManualSequenceSync: (sourceViewportId?: string) => void;
}

export function useViewportContentActions({
  message,
  modal,
  selectedViewportId,
  selectedViewportMode,
  viewportIds,
  activeViewportImageLayoutId,
  activeViewportCineEnabled,
  activeViewportKeyImageEnabled,
  activeViewportCurrentFrameIndex,
  activeViewportSeriesEntry,
  activeViewportSeriesKey,
  activeViewportKeyImageEntries,
  activeViewportAnnotationsState,
  activeViewportMprSlabState,
  viewerDefaultMprSlabState,
  viewportModeById,
  mprViewportReferenceLineStateById,
  setViewportMprSlabStateById,
  setViewportCineStateById,
  setViewportKeyImagesBySeriesKey,
  setViewportSequenceSyncStateById,
  setReferenceLinesEnabled,
  setViewportInvertEnabled,
  setAnnotationListOpen,
  setDicomTagDialogViewportId,
  setViewerSettings,
  setSettingsOpen,
  queueAnnotationCommand,
  queueViewCommand,
  requestManualSequenceSync,
}: UseViewportContentActionsOptions) {
  const handleViewportMprSlabModeChange = useCallback(
    (mode: ViewportMprSlabMode) => {
      setViewportMprSlabStateById((previous) => {
        const currentState = normalizeViewportMprSlabState(
          previous[selectedViewportId],
          viewerDefaultMprSlabState,
        );

        if (currentState.mode === mode) {
          return previous;
        }

        return {
          ...previous,
          [selectedViewportId]: {
            ...currentState,
            mode,
          },
        };
      });
    },
    [
      selectedViewportId,
      setViewportMprSlabStateById,
      viewerDefaultMprSlabState,
    ],
  );

  const handleViewportMprSlabThicknessChange = useCallback(
    (thickness: number) => {
      setViewportMprSlabStateById((previous) => {
        const currentState = normalizeViewportMprSlabState(
          previous[selectedViewportId],
          viewerDefaultMprSlabState,
        );

        if (currentState.thickness === thickness) {
          return previous;
        }

        return {
          ...previous,
          [selectedViewportId]: {
            ...currentState,
            thickness,
          },
        };
      });
    },
    [
      selectedViewportId,
      setViewportMprSlabStateById,
      viewerDefaultMprSlabState,
    ],
  );

  const handleViewportMprSlabOpenCustomThickness = useCallback(() => {
    const draftThickness = activeViewportMprSlabState.thickness;

    modal.confirm({
      title: "自定义投影厚度",
      content: null,
      okText: "应用",
      okButtonProps: {
        "data-testid": "mpr-slab-custom-thickness-submit",
      },
      cancelText: "取消",
      cancelButtonProps: {
        "data-testid": "mpr-slab-custom-thickness-cancel",
      },
      onOk: () => {
        if (!Number.isFinite(draftThickness) || draftThickness < 0.1) {
          message.warning("请输入大于 0 的投影厚度。");
          return Promise.reject(new Error("Invalid MPR slab thickness"));
        }

        handleViewportMprSlabThicknessChange(draftThickness);
        return Promise.resolve();
      },
    });
  }, [
    activeViewportMprSlabState.thickness,
    handleViewportMprSlabThicknessChange,
    message,
    modal,
  ]);

  const handleViewportMprSlabReset = useCallback(() => {
    setViewportMprSlabStateById((previous) => {
      const currentState = normalizeViewportMprSlabState(
        previous[selectedViewportId],
        viewerDefaultMprSlabState,
      );

      if (
        currentState.mode === viewerDefaultMprSlabState.mode &&
        currentState.thickness === viewerDefaultMprSlabState.thickness
      ) {
        return previous;
      }

      return {
        ...previous,
        [selectedViewportId]: {
          ...viewerDefaultMprSlabState,
        },
      };
    });
  }, [
    selectedViewportId,
    setViewportMprSlabStateById,
    viewerDefaultMprSlabState,
  ]);

  const handleViewportMprSlabApplyToAll = useCallback(() => {
    setViewportMprSlabStateById((previous) => {
      const sourceState = normalizeViewportMprSlabState(
        previous[selectedViewportId],
        viewerDefaultMprSlabState,
      );
      let hasChanges = false;
      const nextState = { ...previous };

      for (const viewportId of viewportIds) {
        if ((viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) !== "mpr") {
          continue;
        }

        const targetState = normalizeViewportMprSlabState(
          previous[viewportId],
          viewerDefaultMprSlabState,
        );

        if (
          targetState.mode === sourceState.mode &&
          targetState.thickness === sourceState.thickness
        ) {
          continue;
        }

        nextState[viewportId] = {
          ...sourceState,
        };
        hasChanges = true;
      }

      return hasChanges ? nextState : previous;
    });
  }, [
    selectedViewportId,
    setViewportMprSlabStateById,
    viewerDefaultMprSlabState,
    viewportIds,
    viewportModeById,
  ]);

  const handleViewportMprSlabApplyToLinked = useCallback(() => {
    if (selectedViewportMode !== "mpr") {
      return;
    }

    const sourceReferenceState =
      mprViewportReferenceLineStateById[selectedViewportId] ?? null;

    if (
      !sourceReferenceState ||
      sourceReferenceState.status !== "ready" ||
      !sourceReferenceState.frameOfReferenceUID
    ) {
      message.info("当前 MPR 视口尚未建立联动参考，暂时无法同步。");
      return;
    }

    let appliedTargetCount = 0;

    setViewportMprSlabStateById((previous) => {
      const sourceState = normalizeViewportMprSlabState(
        previous[selectedViewportId],
        viewerDefaultMprSlabState,
      );
      const nextState = { ...previous };

      for (const viewportId of viewportIds) {
        if (viewportId === selectedViewportId) {
          continue;
        }

        if ((viewportModeById[viewportId] ?? DEFAULT_VIEWPORT_MODE) !== "mpr") {
          continue;
        }

        const targetReferenceState =
          mprViewportReferenceLineStateById[viewportId] ?? null;

        if (
          !targetReferenceState ||
          targetReferenceState.status !== "ready" ||
          targetReferenceState.frameOfReferenceUID !==
            sourceReferenceState.frameOfReferenceUID
        ) {
          continue;
        }

        const targetState = normalizeViewportMprSlabState(
          previous[viewportId],
          viewerDefaultMprSlabState,
        );

        if (
          targetState.mode === sourceState.mode &&
          targetState.thickness === sourceState.thickness
        ) {
          continue;
        }

        nextState[viewportId] = {
          ...sourceState,
        };
        appliedTargetCount += 1;
      }

      return appliedTargetCount > 0 ? nextState : previous;
    });

    if (appliedTargetCount === 0) {
      message.info("当前没有可同步的联动 MPR 视口。");
    }
  }, [
    message,
    mprViewportReferenceLineStateById,
    selectedViewportId,
    selectedViewportMode,
    setViewportMprSlabStateById,
    viewerDefaultMprSlabState,
    viewportIds,
    viewportModeById,
  ]);

  const handleViewportCineTogglePlay = useCallback(() => {
    if (!activeViewportCineEnabled) {
      return;
    }

    setViewportCineStateById((previous) => {
      const currentState = normalizeViewportCineState(previous[selectedViewportId]);

      return {
        ...previous,
        [selectedViewportId]: {
          ...currentState,
          isPlaying: !currentState.isPlaying,
        },
      };
    });
  }, [
    activeViewportCineEnabled,
    selectedViewportId,
    setViewportCineStateById,
  ]);

  const handleViewportCineSetFps = useCallback(
    (fps: ViewportCineFpsPreset) => {
      setViewportCineStateById((previous) => {
        const currentState = normalizeViewportCineState(
          previous[selectedViewportId],
        );

        if (currentState.fps === fps) {
          return previous;
        }

        return {
          ...previous,
          [selectedViewportId]: {
            ...currentState,
            fps,
          },
        };
      });
    },
    [selectedViewportId, setViewportCineStateById],
  );

  const handleViewportCineToggleLoop = useCallback(() => {
    setViewportCineStateById((previous) => {
      const currentState = normalizeViewportCineState(previous[selectedViewportId]);

      return {
        ...previous,
        [selectedViewportId]: {
          ...currentState,
          loop: !currentState.loop,
        },
      };
    });
  }, [selectedViewportId, setViewportCineStateById]);

  const handleToggleCurrentKeyImage = useCallback(() => {
    if (
      !activeViewportKeyImageEnabled ||
      !activeViewportSeriesKey ||
      activeViewportCurrentFrameIndex == null
    ) {
      return;
    }

    const currentImage =
      activeViewportSeriesEntry?.series.images[activeViewportCurrentFrameIndex - 1] ??
      null;

    setViewportKeyImagesBySeriesKey((previous) => {
      const currentEntries = previous[activeViewportSeriesKey] ?? [];
      const hasExistingEntry = currentEntries.some(
        (entry) => entry.frameIndex === activeViewportCurrentFrameIndex,
      );
      const nextEntries = hasExistingEntry
        ? currentEntries.filter(
            (entry) => entry.frameIndex !== activeViewportCurrentFrameIndex,
          )
        : sortKeyImageEntries([
            ...currentEntries,
            createKeyImageEntry({
              frameIndex: activeViewportCurrentFrameIndex,
              image: currentImage,
            }),
          ]);

      if (nextEntries.length) {
        return {
          ...previous,
          [activeViewportSeriesKey]: nextEntries,
        };
      }

      const nextState = {
        ...previous,
      };

      delete nextState[activeViewportSeriesKey];
      return nextState;
    });
  }, [
    activeViewportCurrentFrameIndex,
    activeViewportKeyImageEnabled,
    activeViewportSeriesEntry,
    activeViewportSeriesKey,
    setViewportKeyImagesBySeriesKey,
  ]);

  const handleViewportSequenceSyncToggle = useCallback(
    (syncType: ViewportSequenceSyncType) => {
      if (selectedViewportMode !== "stack") {
        return;
      }

      setViewportSequenceSyncStateById((previous) => ({
        ...previous,
        [selectedViewportId]: toggleViewportSequenceSyncType(
          previous[selectedViewportId],
          syncType,
        ),
      }));
      requestManualSequenceSync(selectedViewportId);
    },
    [
      requestManualSequenceSync,
      selectedViewportId,
      selectedViewportMode,
      setViewportSequenceSyncStateById,
    ],
  );

  const handleViewportSequenceSyncClear = useCallback(() => {
    if (selectedViewportMode !== "stack") {
      return;
    }

    setViewportSequenceSyncStateById((previous) => ({
      ...previous,
      [selectedViewportId]: DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
    }));
    requestManualSequenceSync(selectedViewportId);
  }, [
    requestManualSequenceSync,
    selectedViewportId,
    selectedViewportMode,
    setViewportSequenceSyncStateById,
  ]);

  const handleViewportHistoryAction = useCallback(
    (action: "undo" | "redo") => {
      if (selectedViewportMode === "mpr") {
        return;
      }

      void initializeCornerstone()
        .then(({ core }) => {
          const historyMemo = core.utilities.HistoryMemo.DefaultHistoryMemo;

          if (action === "undo") {
            historyMemo.undo();
            return;
          }

          historyMemo.redo();
        })
        .catch((error) => {
          console.error(`Failed to ${action} viewport history`, error);
        });
    },
    [selectedViewportMode],
  );

  const handleViewportAction = useCallback(
    (action: ViewportAction) => {
      if (action === "undo" || action === "redo") {
        handleViewportHistoryAction(action);
        return;
      }

      if (action === "referenceLines") {
        const canToggleReferenceLines =
          selectedViewportMode === "mpr" ||
          (selectedViewportMode === "stack" &&
            activeViewportImageLayoutId === DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID);

        if (!canToggleReferenceLines) {
          return;
        }

        setReferenceLinesEnabled((previous) => !previous);
        return;
      }

      if (action === "invert") {
        setViewportInvertEnabled((previous) => ({
          ...previous,
          [selectedViewportId]: !(previous[selectedViewportId] ?? false),
        }));

        return;
      }

      if (action === "keyImage") {
        handleToggleCurrentKeyImage();
        return;
      }

      if (action === "dicomTag") {
        setDicomTagDialogViewportId(selectedViewportId);
        return;
      }

      if (selectedViewportMode === "mpr") {
        return;
      }

      setAnnotationListOpen(true);
    },
    [
      handleToggleCurrentKeyImage,
      handleViewportHistoryAction,
      activeViewportImageLayoutId,
      selectedViewportId,
      selectedViewportMode,
      setReferenceLinesEnabled,
      setAnnotationListOpen,
      setDicomTagDialogViewportId,
      setViewportInvertEnabled,
    ],
  );

  const handleWindowPresetSelect = useCallback(
    (presetId: ViewportWindowPresetId) => {
      queueViewCommand({
        type: "windowPreset",
        presetId,
      });
    },
    [queueViewCommand],
  );

  const handleViewportViewAction = useCallback(
    (
      action:
        | "fit"
        | "reset"
        | "rotateRight"
        | "flipHorizontal"
        | "flipVertical",
    ) => {
      queueViewCommand({
        type: action,
      });
    },
    [queueViewCommand],
  );

  const handleDeleteSelectedAnnotations = useCallback(() => {
    if (!activeViewportAnnotationsState.selectedAnnotationUIDs.length) {
      return;
    }

    queueAnnotationCommand({
      type: "delete",
      annotationUIDs: activeViewportAnnotationsState.selectedAnnotationUIDs,
    });
  }, [
    activeViewportAnnotationsState.selectedAnnotationUIDs,
    queueAnnotationCommand,
  ]);

  const handleClearAllAnnotations = useCallback(() => {
    if (!activeViewportAnnotationsState.entries.length) {
      return;
    }

    modal.confirm({
      title: "清空当前视口全部图元？",
      content: "这会删除当前选中视口里的测量和 ROI，且无法撤销。",
      okText: "清空全部",
      okButtonProps: {
        danger: true,
      },
      cancelText: "取消",
      onOk: () => {
        queueAnnotationCommand({
          type: "clearAll",
        });
      },
    });
  }, [activeViewportAnnotationsState.entries.length, modal, queueAnnotationCommand]);

  const handleAnnotationManageAction = useCallback(
    (action: "deleteSelected" | "clearAll") => {
      if (action === "deleteSelected") {
        handleDeleteSelectedAnnotations();
        return;
      }

      handleClearAllAnnotations();
    },
    [handleClearAllAnnotations, handleDeleteSelectedAnnotations],
  );

  const handleDeleteKeyImage = useCallback(
    (frameIndex: number) => {
      if (!activeViewportSeriesKey) {
        return;
      }

      setViewportKeyImagesBySeriesKey((previous) => {
        const currentEntries = previous[activeViewportSeriesKey] ?? [];
        const nextEntries = currentEntries.filter(
          (entry) => entry.frameIndex !== frameIndex,
        );

        if (nextEntries.length === currentEntries.length) {
          return previous;
        }

        if (nextEntries.length) {
          return {
            ...previous,
            [activeViewportSeriesKey]: nextEntries,
          };
        }

        const nextState = {
          ...previous,
        };

        delete nextState[activeViewportSeriesKey];
        return nextState;
      });
    },
    [activeViewportSeriesKey, setViewportKeyImagesBySeriesKey],
  );

  const handleClearAllKeyImages = useCallback(() => {
    if (!activeViewportSeriesKey || !activeViewportKeyImageEntries.length) {
      return;
    }

    modal.confirm({
      title: "清空当前序列全部关键图像？",
      content: "这会移除当前序列中已标记的关键图像，且无法撤销。",
      okText: "清空全部",
      okButtonProps: {
        danger: true,
      },
      cancelText: "取消",
      onOk: () => {
        setViewportKeyImagesBySeriesKey((previous) => {
          const nextState = {
            ...previous,
          };

          delete nextState[activeViewportSeriesKey];
          return nextState;
        });
      },
    });
  }, [
    activeViewportKeyImageEntries.length,
    activeViewportSeriesKey,
    modal,
    setViewportKeyImagesBySeriesKey,
  ]);

  const handleSaveViewerSettings = useCallback(
    async (nextSettings: ViewerSettings) => {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to save viewer settings");
      }

      const persistedSettings = (await response.json()) as ViewerSettings;
      setViewerSettings(persistedSettings);
      setSettingsOpen(false);
    },
    [setSettingsOpen, setViewerSettings],
  );

  return {
    handleViewportMprSlabModeChange,
    handleViewportMprSlabThicknessChange,
    handleViewportMprSlabOpenCustomThickness,
    handleViewportMprSlabReset,
    handleViewportMprSlabApplyToAll,
    handleViewportMprSlabApplyToLinked,
    handleViewportCineTogglePlay,
    handleViewportCineSetFps,
    handleViewportCineToggleLoop,
    handleToggleCurrentKeyImage,
    handleViewportSequenceSyncToggle,
    handleViewportSequenceSyncClear,
    handleViewportHistoryAction,
    handleViewportAction,
    handleWindowPresetSelect,
    handleViewportViewAction,
    handleAnnotationManageAction,
    handleDeleteKeyImage,
    handleClearAllKeyImages,
    handleSaveViewerSettings,
  };
}
