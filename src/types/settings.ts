export type ViewportCorner = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";

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

export interface ViewerSettings {
  schemaVersion: 1;
  viewportOverlay: ViewportOverlaySettings;
}
