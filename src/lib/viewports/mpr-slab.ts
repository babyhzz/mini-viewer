export type ViewportMprSlabMode = "none" | "mip" | "minip" | "average";

export interface ViewportMprSlabState {
  mode: ViewportMprSlabMode;
  thickness: number;
}

export interface ViewportMprSlabModeDefinition {
  id: ViewportMprSlabMode;
  label: string;
  description: string;
}

const MIN_MPR_SLAB_THICKNESS = 0.1;

const viewportMprSlabModeDefinitions: ViewportMprSlabModeDefinition[] = [
  {
    id: "none",
    label: "普通",
    description: "单层正交切片",
  },
  {
    id: "mip",
    label: "MIP",
    description: "最大密度投影",
  },
  {
    id: "minip",
    label: "MinIP",
    description: "最小密度投影",
  },
  {
    id: "average",
    label: "平均",
    description: "平均密度投影",
  },
];

export const VIEWPORT_MPR_SLAB_THICKNESS_PRESETS = [
  1,
  3,
  5,
  10,
  20,
  40,
] as const;

export type ViewportMprSlabThicknessPreset =
  (typeof VIEWPORT_MPR_SLAB_THICKNESS_PRESETS)[number];

export const DEFAULT_VIEWPORT_MPR_SLAB_STATE: ViewportMprSlabState = {
  mode: "none",
  thickness: 10,
};

export function getViewportMprSlabModeDefinitions() {
  return viewportMprSlabModeDefinitions;
}

export function getViewportMprSlabModeDefinition(mode: ViewportMprSlabMode) {
  return (
    viewportMprSlabModeDefinitions.find((definition) => definition.id === mode) ??
    viewportMprSlabModeDefinitions[0]
  );
}

export function normalizeViewportMprSlabState(
  state: Partial<ViewportMprSlabState> | null | undefined,
  fallback: ViewportMprSlabState = DEFAULT_VIEWPORT_MPR_SLAB_STATE,
): ViewportMprSlabState {
  const mode = viewportMprSlabModeDefinitions.some(
    (definition) => definition.id === state?.mode,
  )
    ? (state?.mode as ViewportMprSlabMode)
    : fallback.mode;
  const thickness =
    typeof state?.thickness === "number" && Number.isFinite(state.thickness)
      ? Math.max(MIN_MPR_SLAB_THICKNESS, state.thickness)
      : fallback.thickness;

  return {
    mode,
    thickness,
  };
}

export function getEffectiveViewportMprSlabThickness(
  slabState: ViewportMprSlabState,
) {
  return slabState.mode === "none"
    ? MIN_MPR_SLAB_THICKNESS
    : Math.max(MIN_MPR_SLAB_THICKNESS, slabState.thickness);
}

export function getViewportMprSlabBlendMode(
  enums: typeof import("@cornerstonejs/core").Enums,
  mode: ViewportMprSlabMode,
) {
  if (mode === "mip") {
    return enums.BlendModes.MAXIMUM_INTENSITY_BLEND;
  }

  if (mode === "minip") {
    return enums.BlendModes.MINIMUM_INTENSITY_BLEND;
  }

  if (mode === "average") {
    return enums.BlendModes.AVERAGE_INTENSITY_BLEND;
  }

  return enums.BlendModes.COMPOSITE;
}
