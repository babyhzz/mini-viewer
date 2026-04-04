import {
  FREEHAND_MEASURE_TOOL_NAME,
  getViewportToolCornerstoneName,
  getViewportToolDisplayLabel,
  getViewportToolDefinitions,
  getViewportToolFromCornerstoneName,
  getViewportToolShortLabel,
  isViewportAnnotationTool,
  MPR_COMPATIBLE_VIEWPORT_TOOLS,
  POLYLINE_MEASURE_TOOL_NAME,
  type ViewportTool,
} from "@/lib/tools/registry";
import {
  createPolylineMeasureTool,
  type PolylineMeasureToolClass,
} from "@/lib/tools/polyline-measure-tool";
import {
  DIAMETER_CIRCLE_ROI_TOOL_NAME,
  DIAMETER_ELLIPTICAL_ROI_TOOL_NAME,
  createDiameterCircleRoiTool,
  createDiameterEllipticalRoiTool,
} from "@/lib/tools/diameter-roi-tools";

const VIEWPORT_ANNOTATION_TOOL_STYLES = {
  global: {
    color: "#00ff00",
    colorHighlighted: "#FF00FF",
    colorSelected: "#FF00FF",
    lineWidth: "1.25",
    lineWidthHighlighted: "2",
    lineWidthSelected: "2",
    markerSize: "6",
    markerSizeHighlighted: "8",
    markerSizeSelected: "8",
    showHandlesAlwaysHighlighted: false,
    showHandlesAlwaysSelected: true,
    textBoxColor: "#00ff00",
    textBoxColorHighlighted: "#FF00FF",
    textBoxColorSelected: "#FF00FF",
    textBoxBackground: "rgba(10, 14, 20, 0.84)",
    textBoxBackgroundHighlighted: "rgba(48, 8, 48, 0.9)",
    textBoxBackgroundSelected: "rgba(48, 8, 48, 0.9)",
    textBoxLinkLineWidth: "1",
    textBoxLinkLineWidthHighlighted: "1.75",
    textBoxLinkLineWidthSelected: "1.75",
    textBoxLinkLineColor: "#00ff00",
    textBoxLinkLineColorHighlighted: "#FF00FF",
    textBoxLinkLineColorSelected: "#FF00FF",
  },
} satisfies Parameters<
  typeof import("@cornerstonejs/tools").annotation.config.style.setToolGroupToolStyles
>[1];

export const MPR_CROSSHAIRS_TOOL_NAME = "Crosshairs";

interface CornerstoneAnnotationLike {
  annotationUID?: string;
  isSelected?: boolean;
  metadata?: {
    toolName?: string;
    referencedImageId?: string;
    sliceIndex?: number;
  };
  data?: {
    label?: string;
    cachedStats?: Record<string, unknown>;
    handles?: {
      points?: unknown[];
    };
    contour?: {
      polyline?: unknown[];
      closed?: boolean;
    };
  };
}

interface CachedMeasurementLike {
  length?: unknown;
  unit?: unknown;
  angle?: unknown;
  area?: unknown;
  areaUnit?: unknown;
  radius?: unknown;
  radiusUnit?: unknown;
  perimeter?: unknown;
  statsArray?: Array<{
    name?: unknown;
    value?: unknown;
    unit?: unknown;
  }>;
}

export interface ViewportAnnotationEntry {
  annotationUID: string;
  toolId: ViewportTool;
  toolLabel: string;
  toolShortLabel: string;
  frameIndex: number | null;
  frameLabel: string;
  description: string;
  isSelected: boolean;
}

export type ViewportAnnotationCommand =
  | {
      id: number;
      targetViewportKey: string;
      type: "select";
      annotationUID: string;
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "delete";
      annotationUIDs: string[];
    }
  | {
      id: number;
      targetViewportKey: string;
      type: "clearAll";
    };

function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
  }).format(value);
}

function formatMeasurementValue(value: unknown, unit?: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const suffix = typeof unit === "string" && unit.trim() ? ` ${unit}` : "";
  return `${formatNumber(value)}${suffix}`;
}

function getCachedMeasurementSummary(annotation: CornerstoneAnnotationLike) {
  const cachedStats = annotation.data?.cachedStats;

  if (!cachedStats) {
    return null;
  }

  const firstEntry = Object.values(cachedStats)[0] as
    | CachedMeasurementLike
    | undefined;

  if (!firstEntry || typeof firstEntry !== "object") {
    return null;
  }

  const lengthSummary = formatMeasurementValue(
    firstEntry.length,
    firstEntry.unit,
  );

  if (lengthSummary) {
    return lengthSummary;
  }

  if (
    typeof firstEntry.angle === "number" &&
    Number.isFinite(firstEntry.angle)
  ) {
    return `${formatNumber(firstEntry.angle)}°`;
  }

  const areaSummary = formatMeasurementValue(
    firstEntry.area,
    firstEntry.areaUnit,
  );

  if (areaSummary) {
    return `面积 ${areaSummary}`;
  }

  const radiusSummary = formatMeasurementValue(
    firstEntry.radius,
    firstEntry.radiusUnit,
  );

  if (radiusSummary) {
    return `半径 ${radiusSummary}`;
  }

  const perimeterSummary = formatMeasurementValue(
    firstEntry.perimeter,
    firstEntry.unit,
  );

  if (perimeterSummary) {
    return `周长 ${perimeterSummary}`;
  }

  const firstStat = firstEntry.statsArray?.find(
    (stat) => typeof stat?.value === "number" && Number.isFinite(stat.value),
  );

  if (firstStat) {
    const valueSummary = formatMeasurementValue(
      firstStat.value,
      firstStat.unit,
    );

    if (valueSummary) {
      return valueSummary;
    }
  }

  return null;
}

function getAnnotationGeometrySummary(annotation: CornerstoneAnnotationLike) {
  const contourPointCount = annotation.data?.contour?.polyline?.length ?? 0;

  if (contourPointCount > 0) {
    return `${contourPointCount} 点路径`;
  }

  const handlePointCount = annotation.data?.handles?.points?.length ?? 0;

  if (handlePointCount > 0) {
    return `${handlePointCount} 个控制点`;
  }

  return null;
}

function getAnnotationDescription(annotation: CornerstoneAnnotationLike) {
  const label = annotation.data?.label?.trim();

  if (label) {
    return label;
  }

  return (
    getCachedMeasurementSummary(annotation) ??
    getAnnotationGeometrySummary(annotation) ??
    "图元已创建"
  );
}

function getAnnotationFrameIndex(
  annotation: CornerstoneAnnotationLike,
  imageIdToFrameIndex: Map<string, number>,
) {
  const referencedImageId = annotation.metadata?.referencedImageId;

  if (referencedImageId) {
    return imageIdToFrameIndex.get(referencedImageId) ?? null;
  }

  const sliceIndex = annotation.metadata?.sliceIndex;

  if (typeof sliceIndex === "number" && Number.isFinite(sliceIndex)) {
    return sliceIndex + 1;
  }

  return null;
}

export function registerCornerstoneViewportTools(
  core: typeof import("@cornerstonejs/core"),
  tools: typeof import("@cornerstonejs/tools"),
  registrationState: Set<string>,
) {
  const PolylineMeasureTool = createPolylineMeasureTool(
    core,
    tools,
  ) as PolylineMeasureToolClass;
  const DiameterEllipticalRoiTool = createDiameterEllipticalRoiTool(
    core,
    tools,
  );
  const DiameterCircleRoiTool = createDiameterCircleRoiTool(core, tools);
  const toolClasses = [
    tools.StackScrollTool,
    tools.PanTool,
    tools.ZoomTool,
    tools.WindowLevelTool,
    tools.CrosshairsTool,
    tools.LengthTool,
    tools.AngleTool,
    tools.PlanarFreehandROITool,
    PolylineMeasureTool,
    tools.RectangleROITool,
    DiameterEllipticalRoiTool,
    DiameterCircleRoiTool,
  ];

  for (const ToolClass of toolClasses) {
    if (registrationState.has(ToolClass.toolName)) {
      continue;
    }

    tools.addTool(ToolClass);
    registrationState.add(ToolClass.toolName);
  }
}

export function configureViewportToolGroup(
  tools: typeof import("@cornerstonejs/tools"),
  toolGroup: NonNullable<
    ReturnType<typeof tools.ToolGroupManager.createToolGroup>
  >,
  toolGroupId: string,
) {
  toolGroup.addTool(tools.StackScrollTool.toolName);
  toolGroup.addTool(tools.PanTool.toolName);
  toolGroup.addTool(tools.ZoomTool.toolName);
  toolGroup.addTool(tools.WindowLevelTool.toolName);
  toolGroup.addTool(tools.LengthTool.toolName);
  toolGroup.addTool(tools.AngleTool.toolName);
  toolGroup.addTool(POLYLINE_MEASURE_TOOL_NAME);
  toolGroup.addTool(tools.RectangleROITool.toolName);
  toolGroup.addTool(DIAMETER_ELLIPTICAL_ROI_TOOL_NAME);
  toolGroup.addTool(DIAMETER_CIRCLE_ROI_TOOL_NAME);
  toolGroup.addToolInstance(
    FREEHAND_MEASURE_TOOL_NAME,
    tools.PlanarFreehandROITool.toolName,
    {
      allowOpenContours: true,
      calculateStats: true,
      displayOnePointAsCrosshairs: true,
    },
  );
  tools.annotation.config.style.setToolGroupToolStyles(
    toolGroupId,
    VIEWPORT_ANNOTATION_TOOL_STYLES,
  );
}

export function configureMprViewportToolGroup(
  tools: typeof import("@cornerstonejs/tools"),
  toolGroup: NonNullable<
    ReturnType<typeof tools.ToolGroupManager.createToolGroup>
  >,
  crosshairsConfiguration: Record<string, unknown>,
) {
  toolGroup.addTool(tools.PanTool.toolName);
  toolGroup.addTool(tools.ZoomTool.toolName);
  toolGroup.addTool(tools.WindowLevelTool.toolName);
  toolGroup.addTool(MPR_CROSSHAIRS_TOOL_NAME, crosshairsConfiguration);
}

export function applyActiveViewportTool(
  tools: typeof import("@cornerstonejs/tools"),
  toolGroupId: string,
  activeTool: ViewportTool,
  supportedToolIds = getViewportToolDefinitions().map(
    (toolDefinition) => toolDefinition.id,
  ),
) {
  const toolGroup = tools.ToolGroupManager.getToolGroup(toolGroupId);

  if (!toolGroup) {
    return;
  }

  for (const toolId of supportedToolIds) {
    toolGroup.setToolPassive(getViewportToolCornerstoneName(toolId), {
      removeAllBindings: true,
    });
  }

  const nextActiveTool = supportedToolIds.includes(activeTool)
    ? activeTool
    : MPR_COMPATIBLE_VIEWPORT_TOOLS[0];

  toolGroup.setToolActive(getViewportToolCornerstoneName(nextActiveTool), {
    bindings: [
      {
        mouseButton: tools.Enums.MouseBindings.Primary,
      },
    ],
  });
}

export function applyActiveMprViewportTool(
  tools: typeof import("@cornerstonejs/tools"),
  toolGroupId: string,
  activeTool: ViewportTool,
) {
  const toolGroup = tools.ToolGroupManager.getToolGroup(toolGroupId);

  if (!toolGroup) {
    return;
  }

  for (const toolName of [
    MPR_CROSSHAIRS_TOOL_NAME,
    tools.PanTool.toolName,
    tools.ZoomTool.toolName,
    tools.WindowLevelTool.toolName,
  ]) {
    toolGroup.setToolPassive(toolName, {
      removeAllBindings: true,
    });
  }

  let nextActiveToolName = MPR_CROSSHAIRS_TOOL_NAME;

  if (activeTool === "pan") {
    nextActiveToolName = tools.PanTool.toolName;
  } else if (activeTool === "zoom") {
    nextActiveToolName = tools.ZoomTool.toolName;
  } else if (activeTool === "windowLevel") {
    nextActiveToolName = tools.WindowLevelTool.toolName;
  }

  toolGroup.setToolActive(nextActiveToolName, {
    bindings: [
      {
        mouseButton: tools.Enums.MouseBindings.Primary,
      },
    ],
  });
}

export function getViewportToolAnnotationCount(
  tools: typeof import("@cornerstonejs/tools"),
  toolId: ViewportTool,
  element: HTMLDivElement,
) {
  const annotations =
    tools.annotation.state.getAnnotations(
      getViewportToolCornerstoneName(toolId),
      element,
    ) ?? [];

  return annotations.length;
}

export function getViewportAnnotationEntries(
  tools: typeof import("@cornerstonejs/tools"),
  element: HTMLDivElement,
  imageIds: string[],
) {
  const imageIdToFrameIndex = new Map(
    imageIds.map((imageId, index) => [imageId, index + 1]),
  );
  const selectedAnnotationUIDs = new Set(
    tools.annotation.selection.getAnnotationsSelected(),
  );
  const entries: ViewportAnnotationEntry[] = [];

  for (const toolDefinition of getViewportToolDefinitions()) {
    if (!isViewportAnnotationTool(toolDefinition.id)) {
      continue;
    }

    const annotations =
      tools.annotation.state.getAnnotations(
        getViewportToolCornerstoneName(toolDefinition.id),
        element,
      ) ?? [];

    for (const rawAnnotation of annotations) {
      const annotation = rawAnnotation as CornerstoneAnnotationLike;
      const annotationUID = annotation.annotationUID;
      const toolId = getViewportToolFromCornerstoneName(
        annotation.metadata?.toolName ?? toolDefinition.cornerstoneToolName,
      );

      if (!annotationUID || !toolId) {
        continue;
      }

      const frameIndex = getAnnotationFrameIndex(
        annotation,
        imageIdToFrameIndex,
      );

      entries.push({
        annotationUID,
        toolId,
        toolLabel: getViewportToolDisplayLabel(toolId),
        toolShortLabel: getViewportToolShortLabel(toolId),
        frameIndex,
        frameLabel: frameIndex ? `第 ${frameIndex} 张` : "未绑定切片",
        description: getAnnotationDescription(annotation),
        isSelected:
          annotation.isSelected === true ||
          selectedAnnotationUIDs.has(annotationUID),
      });
    }
  }

  return entries.sort((left, right) => {
    const leftFrame = left.frameIndex ?? Number.MAX_SAFE_INTEGER;
    const rightFrame = right.frameIndex ?? Number.MAX_SAFE_INTEGER;

    if (leftFrame !== rightFrame) {
      return leftFrame - rightFrame;
    }

    const toolLabelComparison = left.toolLabel.localeCompare(
      right.toolLabel,
      "zh-CN",
    );

    if (toolLabelComparison !== 0) {
      return toolLabelComparison;
    }

    return left.annotationUID.localeCompare(right.annotationUID);
  });
}

export function selectViewportAnnotation(
  tools: typeof import("@cornerstonejs/tools"),
  viewportId: string,
  annotationUID: string,
) {
  tools.annotation.selection.setAnnotationSelected(annotationUID, true);
  tools.utilities.triggerAnnotationRenderForViewportIds([viewportId]);
}

export function deleteViewportAnnotations(
  tools: typeof import("@cornerstonejs/tools"),
  viewportId: string,
  annotationUIDs: string[],
) {
  const nextAnnotationUIDs = Array.from(
    new Set(annotationUIDs.filter((annotationUID) => annotationUID.trim())),
  );

  if (!nextAnnotationUIDs.length) {
    return;
  }

  for (const annotationUID of nextAnnotationUIDs) {
    tools.annotation.selection.deselectAnnotation(annotationUID);
    tools.annotation.state.removeAnnotation(annotationUID);
  }

  tools.utilities.triggerAnnotationRenderForViewportIds([viewportId]);
}
