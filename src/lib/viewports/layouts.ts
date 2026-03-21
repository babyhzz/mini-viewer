export type ViewportLayoutId =
  | "1x1"
  | "1x2"
  | "2x1"
  | "2x2"
  | "1x3"
  | "3x1"
  | "2x3"
  | "3x2"
  | "3x3"
  | "1p2"
  | "2p1";

export interface ViewportLayoutCellDefinition {
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
}

export interface ViewportLayoutDefinition {
  id: ViewportLayoutId;
  label: string;
  description: string;
  rows: number;
  columns: number;
  cells: ViewportLayoutCellDefinition[];
}

function createUniformGridCells(rows: number, columns: number) {
  const cells: ViewportLayoutCellDefinition[] = [];

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      cells.push({
        column,
        row,
      });
    }
  }

  return cells;
}

const viewportLayoutDefinitions: ViewportLayoutDefinition[] = [
  {
    id: "1x1",
    label: "1 x 1",
    description: "单视图",
    rows: 1,
    columns: 1,
    cells: createUniformGridCells(1, 1),
  },
  {
    id: "1x2",
    label: "1 x 2",
    description: "上下双视图",
    rows: 2,
    columns: 1,
    cells: createUniformGridCells(2, 1),
  },
  {
    id: "2x1",
    label: "2 x 1",
    description: "左右双视图",
    rows: 1,
    columns: 2,
    cells: createUniformGridCells(1, 2),
  },
  {
    id: "2x2",
    label: "2 x 2",
    description: "四宫格",
    rows: 2,
    columns: 2,
    cells: createUniformGridCells(2, 2),
  },
  {
    id: "1x3",
    label: "1 x 3",
    description: "纵向三联",
    rows: 3,
    columns: 1,
    cells: createUniformGridCells(3, 1),
  },
  {
    id: "3x1",
    label: "3 x 1",
    description: "横向三联",
    rows: 1,
    columns: 3,
    cells: createUniformGridCells(1, 3),
  },
  {
    id: "2x3",
    label: "2 x 3",
    description: "六宫格横向",
    rows: 3,
    columns: 2,
    cells: createUniformGridCells(3, 2),
  },
  {
    id: "3x2",
    label: "3 x 2",
    description: "六宫格纵向",
    rows: 2,
    columns: 3,
    cells: createUniformGridCells(2, 3),
  },
  {
    id: "3x3",
    label: "3 x 3",
    description: "九宫格",
    rows: 3,
    columns: 3,
    cells: createUniformGridCells(3, 3),
  },
  {
    id: "1p2",
    label: "1 + 2",
    description: "左大右双联",
    rows: 2,
    columns: 2,
    cells: [
      {
        column: 1,
        row: 1,
        rowSpan: 2,
      },
      {
        column: 2,
        row: 1,
      },
      {
        column: 2,
        row: 2,
      },
    ],
  },
  {
    id: "2p1",
    label: "2 + 1",
    description: "左双联右大",
    rows: 2,
    columns: 2,
    cells: [
      {
        column: 1,
        row: 1,
      },
      {
        column: 1,
        row: 2,
      },
      {
        column: 2,
        row: 1,
        rowSpan: 2,
      },
    ],
  },
];

export const DEFAULT_VIEWPORT_LAYOUT_ID: ViewportLayoutId = "1x1";

export function getViewportLayoutDefinitions() {
  return viewportLayoutDefinitions;
}

export function getViewportLayoutDefinition(layoutId: ViewportLayoutId) {
  return (
    viewportLayoutDefinitions.find((definition) => definition.id === layoutId) ??
    viewportLayoutDefinitions[0]
  );
}

export function getViewportLayoutSlotIds(layoutId: ViewportLayoutId) {
  const layout = getViewportLayoutDefinition(layoutId);

  return layout.cells.map((_, index) => `viewport-${index + 1}`);
}

export function getViewportSlotLabel(index: number) {
  return String.fromCharCode("A".charCodeAt(0) + index);
}
