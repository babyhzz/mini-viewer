"use client";

import { useCallback } from "react";

import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  type ViewportMode,
  type ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import { DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE } from "@/lib/viewports/sequence-sync";
import { isViewportToolSupportedInMpr, type ViewportTool } from "@/lib/tools/registry";
import type { ViewportLayoutId } from "@/lib/viewports/layouts";

interface UseViewportLayoutActionsOptions {
  canMaximizeViewport: boolean;
  selectedViewportId: string;
  selectedViewportMode: ViewportMode;
  activeViewportTool: ViewportTool;
  setViewportLayoutId: (layoutId: ViewportLayoutId) => void;
  setMaximizedViewportId: (
    updater: string | null | ((previous: string | null) => string | null),
  ) => void;
  setViewportImageLayoutIdById: (
    updater: (
      previous: Record<string, ViewportImageLayoutId>,
    ) => Record<string, ViewportImageLayoutId>,
  ) => void;
  setViewportCellSelectionById: (
    updater: (
      previous: Record<string, import("@/stores/viewer-session-store").ViewportCellSelection>,
    ) => Record<string, import("@/stores/viewer-session-store").ViewportCellSelection>,
  ) => void;
  setViewportModeById: (
    updater: (
      previous: Record<string, ViewportMode>,
    ) => Record<string, ViewportMode>,
  ) => void;
  setViewportSequenceSyncStateById: (
    updater: (
      previous: Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>,
    ) => Record<string, import("@/lib/viewports/sequence-sync").ViewportSequenceSyncState>,
  ) => void;
  setViewportMprLayoutIdById: (
    updater: (
      previous: Record<string, ViewportMprLayoutId>,
    ) => Record<string, ViewportMprLayoutId>,
  ) => void;
  setActiveViewportTool: (tool: ViewportTool) => void;
  stopViewportCine: (viewportId: string) => void;
  onViewportSelect: (viewportId: string) => void;
}

export function useViewportLayoutActions({
  canMaximizeViewport,
  selectedViewportId,
  selectedViewportMode,
  activeViewportTool,
  setViewportLayoutId,
  setMaximizedViewportId,
  setViewportImageLayoutIdById,
  setViewportCellSelectionById,
  setViewportModeById,
  setViewportSequenceSyncStateById,
  setViewportMprLayoutIdById,
  setActiveViewportTool,
  stopViewportCine,
  onViewportSelect,
}: UseViewportLayoutActionsOptions) {
  const handleViewportLayoutChange = useCallback(
    (layoutId: ViewportLayoutId) => {
      setMaximizedViewportId(null);
      setViewportLayoutId(layoutId);
    },
    [setMaximizedViewportId, setViewportLayoutId],
  );

  const handleViewportImageLayoutChange = useCallback(
    (layoutId: ViewportImageLayoutId) => {
      if (selectedViewportMode !== "stack") {
        return;
      }

      if (layoutId !== DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID) {
        stopViewportCine(selectedViewportId);
      }

      setViewportImageLayoutIdById((previous) => ({
        ...previous,
        [selectedViewportId]: layoutId,
      }));
      setViewportCellSelectionById((previous) => ({
        ...previous,
        [selectedViewportId]: "all",
      }));

      if (layoutId !== DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID) {
        setActiveViewportTool("select");
      }
    },
    [
      selectedViewportId,
      selectedViewportMode,
      setActiveViewportTool,
      setViewportCellSelectionById,
      setViewportImageLayoutIdById,
      stopViewportCine,
    ],
  );

  const handleViewportMprLayoutChange = useCallback(
    (layoutId: ViewportMprLayoutId | "off") => {
      stopViewportCine(selectedViewportId);

      if (layoutId === "off") {
        setViewportModeById((previous) => ({
          ...previous,
          [selectedViewportId]: "stack",
        }));
        return;
      }

      setViewportModeById((previous) => ({
        ...previous,
        [selectedViewportId]: "mpr",
      }));
      setViewportSequenceSyncStateById((previous) => ({
        ...previous,
        [selectedViewportId]: DEFAULT_VIEWPORT_SEQUENCE_SYNC_STATE,
      }));
      setViewportMprLayoutIdById((previous) => ({
        ...previous,
        [selectedViewportId]: layoutId,
      }));
      setViewportCellSelectionById((previous) => ({
        ...previous,
        [selectedViewportId]: "all",
      }));

      if (!isViewportToolSupportedInMpr(activeViewportTool)) {
        setActiveViewportTool("select");
      }
    },
    [
      activeViewportTool,
      selectedViewportId,
      setActiveViewportTool,
      setViewportCellSelectionById,
      setViewportModeById,
      setViewportMprLayoutIdById,
      setViewportSequenceSyncStateById,
      stopViewportCine,
    ],
  );

  const handleViewportToggleMaximize = useCallback(
    (viewportId: string) => {
      onViewportSelect(viewportId);
      setMaximizedViewportId((previous) => {
        if (previous === viewportId) {
          return null;
        }

        if (!canMaximizeViewport) {
          return null;
        }

        return viewportId;
      });
    },
    [canMaximizeViewport, onViewportSelect, setMaximizedViewportId],
  );

  return {
    handleViewportLayoutChange,
    handleViewportImageLayoutChange,
    handleViewportMprLayoutChange,
    handleViewportToggleMaximize,
  };
}
