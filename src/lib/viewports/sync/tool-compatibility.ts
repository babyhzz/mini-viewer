import {
  isViewportToolSupportedInMpr,
  type ViewportTool,
} from "@/lib/tools/registry";
import type { ViewportMode } from "@/lib/viewports/mpr-layouts";

interface ResolveCompatibleActiveViewportToolOptions {
  activeViewportTool: ViewportTool;
  selectedViewportMode: ViewportMode;
  activeViewportHasMontageLayout: boolean;
}

export function resolveCompatibleActiveViewportTool({
  activeViewportTool,
  selectedViewportMode,
  activeViewportHasMontageLayout,
}: ResolveCompatibleActiveViewportToolOptions) {
  if (
    selectedViewportMode === "mpr" &&
    !isViewportToolSupportedInMpr(activeViewportTool)
  ) {
    return "select" as const;
  }

  if (
    selectedViewportMode === "stack" &&
    activeViewportHasMontageLayout &&
    activeViewportTool !== "select"
  ) {
    return "select" as const;
  }

  return null;
}
