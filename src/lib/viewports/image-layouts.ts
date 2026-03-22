export type ViewportImageLayoutId = "1x1" | "1x2" | "2x1" | "2x2";

export interface ViewportImageLayoutDefinition {
  id: ViewportImageLayoutId;
  label: string;
  description: string;
  rows: number;
  columns: number;
  cellCount: number;
}

const viewportImageLayoutDefinitions: ViewportImageLayoutDefinition[] = [
  {
    id: "1x1",
    label: "1 x 1",
    description: "单图",
    rows: 1,
    columns: 1,
    cellCount: 1,
  },
  {
    id: "1x2",
    label: "1 x 2",
    description: "上下双图",
    rows: 2,
    columns: 1,
    cellCount: 2,
  },
  {
    id: "2x1",
    label: "2 x 1",
    description: "左右双图",
    rows: 1,
    columns: 2,
    cellCount: 2,
  },
  {
    id: "2x2",
    label: "2 x 2",
    description: "四图拼接",
    rows: 2,
    columns: 2,
    cellCount: 4,
  },
];

export const DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID: ViewportImageLayoutId = "1x1";

export function getViewportImageLayoutDefinitions() {
  return viewportImageLayoutDefinitions;
}

export function getViewportImageLayoutDefinition(
  layoutId: ViewportImageLayoutId,
) {
  return (
    viewportImageLayoutDefinitions.find((definition) => definition.id === layoutId) ??
    viewportImageLayoutDefinitions[0]
  );
}
