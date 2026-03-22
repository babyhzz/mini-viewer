"use client";

import type {
  DicomImageNode,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";
import type {
  ViewportCorner,
  ViewportOverlaySettings,
} from "@/types/settings";

export interface OverlayContextValueMap {
  patientName: string;
  patientId: string;
  studyTitle: string;
  studyDate: string;
  seriesTitle: string;
  modalitySummary: string;
  frameProgress: string;
  imageFileName: string;
  instanceNumber: string;
}

const VIEWPORT_OVERLAY_CLASS_NAMES: Record<ViewportCorner, string> = {
  topLeft: "viewport-corner-top-left",
  topRight: "viewport-corner-top-right",
  bottomLeft: "viewport-corner-bottom-left",
  bottomRight: "viewport-corner-bottom-right",
};

export const VIEWPORT_OVERLAY_TEST_IDS: Record<ViewportCorner, string> = {
  topLeft: "viewport-overlay-top-left",
  topRight: "viewport-overlay-top-right",
  bottomLeft: "viewport-overlay-bottom-left",
  bottomRight: "viewport-frame-indicator",
};

export const VIEWPORT_IMAGE_LAYOUT_CELL_OVERLAY_TEST_IDS: Record<
  ViewportCorner,
  string
> = {
  topLeft: "viewport-image-layout-cell-overlay-top-left",
  topRight: "viewport-image-layout-cell-overlay-top-right",
  bottomLeft: "viewport-image-layout-cell-overlay-bottom-left",
  bottomRight: "viewport-image-layout-cell-frame-indicator",
};

function formatOverlayValue(value: string | undefined, fallback = "--") {
  return value?.trim() ? value : fallback;
}

function getOverlayValue(
  tagKey: keyof OverlayContextValueMap | "interactionHint",
  overlayValueMap: OverlayContextValueMap,
) {
  if (tagKey === "interactionHint") {
    return "";
  }

  return overlayValueMap[tagKey];
}

export function buildOverlayContextValueMap(
  study: DicomStudyNode | null,
  series: DicomSeriesNode | null,
  image: DicomImageNode | null | undefined,
  frameProgress: string,
): OverlayContextValueMap {
  const modalitySummary = [
    series?.modality,
    series?.seriesNumber ? `S${series.seriesNumber}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    patientName: formatOverlayValue(study?.patientName, "未标注患者"),
    patientId: formatOverlayValue(study?.patientId),
    studyTitle: formatOverlayValue(study?.title, "未选中检查"),
    studyDate: formatOverlayValue(study?.studyDate),
    seriesTitle: formatOverlayValue(series?.title, "未选中序列"),
    modalitySummary: formatOverlayValue(modalitySummary, "未标注模态"),
    frameProgress,
    imageFileName: formatOverlayValue(image?.fileName),
    instanceNumber: formatOverlayValue(image?.instanceNumber?.toString()),
  };
}

interface ViewportOverlayLayerProps {
  overlaySettings: ViewportOverlaySettings;
  overlayValueMap: OverlayContextValueMap;
  testIds?: Partial<Record<ViewportCorner, string>>;
}

export function ViewportOverlayLayer({
  overlaySettings,
  overlayValueMap,
  testIds,
}: ViewportOverlayLayerProps) {
  return (Object.keys(VIEWPORT_OVERLAY_CLASS_NAMES) as ViewportCorner[]).map(
    (corner) => {
      const items = overlaySettings.corners[corner];

      if (!items.length) {
        return null;
      }

      return (
        <div
          key={corner}
          className={`viewport-corner ${VIEWPORT_OVERLAY_CLASS_NAMES[corner]}`}
          data-testid={testIds?.[corner]}
        >
          {items.map((item) => {
            const value = getOverlayValue(item.tagKey, overlayValueMap);

            if (!value) {
              return null;
            }

            return (
              <div
                key={item.id}
                className="viewport-corner-line"
                style={{
                  color: item.style.color,
                  fontSize: `${item.style.fontSize}px`,
                  fontWeight: item.style.fontWeight,
                  fontStyle: item.style.italic ? "italic" : "normal",
                }}
              >
                {item.prefix}
                {value}
              </div>
            );
          })}
        </div>
      );
    },
  );
}
