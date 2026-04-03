"use client";

import { useCallback } from "react";

import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
} from "@/lib/viewports/image-layouts";
import {
  getViewportToolGroupId,
  isViewportToolSupportedInMpr,
  type ViewportTool,
} from "@/lib/tools/registry";
import type { ViewportMode } from "@/lib/viewports/mpr-layouts";

interface UseViewportToolActionsOptions {
  selectedViewportId: string;
  selectedViewportMode: ViewportMode;
  activeViewportHasMontageLayout: boolean;
  setActiveViewportTool: (tool: ViewportTool) => void;
  setViewportImageLayoutIdById: (
    updater: (
      previous: Record<string, import("@/lib/viewports/image-layouts").ViewportImageLayoutId>,
    ) => Record<string, import("@/lib/viewports/image-layouts").ViewportImageLayoutId>,
  ) => void;
  setViewportToolGroupSelections: (
    updater: (
      previous: import("@/lib/tools/registry").ViewportToolGroupSelections,
    ) => import("@/lib/tools/registry").ViewportToolGroupSelections,
  ) => void;
}

export function useViewportToolActions({
  selectedViewportId,
  selectedViewportMode,
  activeViewportHasMontageLayout,
  setActiveViewportTool,
  setViewportImageLayoutIdById,
  setViewportToolGroupSelections,
}: UseViewportToolActionsOptions) {
  return useCallback(
    (tool: ViewportTool) => {
      if (
        selectedViewportMode === "mpr" &&
        !isViewportToolSupportedInMpr(tool)
      ) {
        setActiveViewportTool("select");
        return;
      }

      if (
        selectedViewportMode === "stack" &&
        activeViewportHasMontageLayout &&
        tool !== "select"
      ) {
        setViewportImageLayoutIdById((previous) => ({
          ...previous,
          [selectedViewportId]: DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
        }));
      }

      setActiveViewportTool(tool);

      const toolGroupId = getViewportToolGroupId(tool);

      if (!toolGroupId) {
        return;
      }

      setViewportToolGroupSelections((previous) => ({
        ...previous,
        [toolGroupId]: tool,
      }));
    },
    [
      activeViewportHasMontageLayout,
      selectedViewportId,
      selectedViewportMode,
      setActiveViewportTool,
      setViewportImageLayoutIdById,
      setViewportToolGroupSelections,
    ],
  );
}
