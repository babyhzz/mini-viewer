export type ViewportCorner =
  | "topLeft"
  | "topRight"
  | "bottomLeft"
  | "bottomRight";

export type OverlayTagKey =
  | "patientName"
  | "patientId"
  | "studyTitle"
  | "studyDate"
  | "seriesTitle"
  | "modalitySummary"
  | "frameProgress"
  | "interactionHint"
  | "imageFileName"
  | "instanceNumber";

export type ToolbarShortcutCommandId =
  | "select"
  | "pan"
  | "zoom"
  | "windowLevel"
  | "length"
  | "polyline"
  | "freehand"
  | "angle"
  | "rectangleRoi"
  | "ellipseRoi"
  | "circleRoi"
  | "undo"
  | "redo"
  | "referenceLines"
  | "invert"
  | "keyImage"
  | "dicomTag"
  | "annotationList"
  | "settings";

export type OverlayFontWeight = "400" | "500" | "600" | "700";

export interface OverlayTextStyle {
  color: string;
  fontSize: number;
  fontWeight: OverlayFontWeight;
  italic: boolean;
}

export interface OverlayCornerItemConfig {
  id: string;
  tagKey: OverlayTagKey;
  prefix: string;
  style: OverlayTextStyle;
}

export interface ViewportOverlaySettings {
  schemaVersion: 1;
  corners: Record<ViewportCorner, OverlayCornerItemConfig[]>;
}

export interface ToolbarShortcutBinding {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

export interface ToolbarShortcutSettings {
  schemaVersion: 1;
  bindings: Record<ToolbarShortcutCommandId, ToolbarShortcutBinding | null>;
}

export type ViewerMprSlabMode = "none" | "mip" | "minip" | "average";

export interface ViewerMprProjectionSettings {
  schemaVersion: 1;
  defaultSlabMode: ViewerMprSlabMode;
  defaultSlabThickness: number;
}

export interface ViewerSettings {
  schemaVersion: 1;
  viewportOverlay: ViewportOverlaySettings;
  toolbarShortcuts: ToolbarShortcutSettings;
  mprProjection: ViewerMprProjectionSettings;
}
