import type { ViewportImageLayoutId } from "@/lib/viewports/image-layouts";
import type { ViewportMode } from "@/lib/viewports/mpr-layouts";

export const VIEWPORT_CINE_FPS_PRESETS = [8, 12, 16, 24] as const;

export type ViewportCineFpsPreset = (typeof VIEWPORT_CINE_FPS_PRESETS)[number];

export interface ViewportCineState {
  isPlaying: boolean;
  fps: ViewportCineFpsPreset;
  loop: boolean;
}

export const DEFAULT_VIEWPORT_CINE_STATE: ViewportCineState = {
  isPlaying: false,
  fps: 12,
  loop: true,
};

export function createDefaultViewportCineState(): ViewportCineState {
  return { ...DEFAULT_VIEWPORT_CINE_STATE };
}

export function normalizeViewportCineState(
  state: Partial<ViewportCineState> | null | undefined,
): ViewportCineState {
  const nextFps = VIEWPORT_CINE_FPS_PRESETS.includes(
    state?.fps as ViewportCineFpsPreset,
  )
    ? (state?.fps as ViewportCineFpsPreset)
    : DEFAULT_VIEWPORT_CINE_STATE.fps;

  return {
    isPlaying:
      typeof state?.isPlaying === "boolean"
        ? state.isPlaying
        : DEFAULT_VIEWPORT_CINE_STATE.isPlaying,
    fps: nextFps,
    loop: typeof state?.loop === "boolean" ? state.loop : true,
  };
}

export function isViewportCineCompatible({
  viewportMode,
  imageLayoutId,
  frameCount,
}: {
  viewportMode: ViewportMode;
  imageLayoutId: ViewportImageLayoutId;
  frameCount: number;
}) {
  return viewportMode === "stack" && imageLayoutId === "1x1" && frameCount > 1;
}
