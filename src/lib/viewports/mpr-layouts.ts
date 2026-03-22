export type ViewportMode = "stack" | "mpr";

export type ViewportMprLayoutId = "left1Right2" | "top1Bottom2";

export type ViewportMprPaneId = "axial" | "coronal" | "sagittal";

export interface ViewportMprLayoutPaneDefinition {
  id: ViewportMprPaneId;
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
  label: string;
  shortLabel: string;
  orientation: import("@cornerstonejs/core").Enums.OrientationAxis;
}

const AXIAL_ORIENTATION =
  "axial" as import("@cornerstonejs/core").Enums.OrientationAxis;
const CORONAL_ORIENTATION =
  "coronal" as import("@cornerstonejs/core").Enums.OrientationAxis;
const SAGITTAL_ORIENTATION =
  "sagittal" as import("@cornerstonejs/core").Enums.OrientationAxis;

export interface ViewportMprLayoutDefinition {
  id: ViewportMprLayoutId;
  label: string;
  description: string;
  rows: number;
  columns: number;
  panes: ViewportMprLayoutPaneDefinition[];
}

const basePaneDefinitions: Record<
  ViewportMprPaneId,
  Omit<
    ViewportMprLayoutPaneDefinition,
    "column" | "row" | "columnSpan" | "rowSpan"
  >
> = {
  axial: {
    id: "axial",
    label: "Axial",
    shortLabel: "AX",
    orientation: AXIAL_ORIENTATION,
  },
  coronal: {
    id: "coronal",
    label: "Coronal",
    shortLabel: "CO",
    orientation: CORONAL_ORIENTATION,
  },
  sagittal: {
    id: "sagittal",
    label: "Sagittal",
    shortLabel: "SA",
    orientation: SAGITTAL_ORIENTATION,
  },
};

const viewportMprLayoutDefinitions: ViewportMprLayoutDefinition[] = [
  {
    id: "left1Right2",
    label: "左 1 右 2",
    description: "左侧主视图，右侧上下双视图",
    rows: 2,
    columns: 2,
    panes: [
      {
        ...basePaneDefinitions.axial,
        column: 1,
        row: 1,
        rowSpan: 2,
      },
      {
        ...basePaneDefinitions.sagittal,
        column: 2,
        row: 1,
      },
      {
        ...basePaneDefinitions.coronal,
        column: 2,
        row: 2,
      },
    ],
  },
  {
    id: "top1Bottom2",
    label: "上 1 下 2",
    description: "上方主视图，下方左右双视图",
    rows: 2,
    columns: 2,
    panes: [
      {
        ...basePaneDefinitions.axial,
        column: 1,
        row: 1,
        columnSpan: 2,
      },
      {
        ...basePaneDefinitions.sagittal,
        column: 1,
        row: 2,
      },
      {
        ...basePaneDefinitions.coronal,
        column: 2,
        row: 2,
      },
    ],
  },
];

export const DEFAULT_VIEWPORT_MODE: ViewportMode = "stack";
export const DEFAULT_VIEWPORT_MPR_LAYOUT_ID: ViewportMprLayoutId =
  "left1Right2";

export function getViewportMprLayoutDefinitions() {
  return viewportMprLayoutDefinitions;
}

export function getViewportMprLayoutDefinition(layoutId: ViewportMprLayoutId) {
  return (
    viewportMprLayoutDefinitions.find((definition) => definition.id === layoutId) ??
    viewportMprLayoutDefinitions[0]
  );
}
