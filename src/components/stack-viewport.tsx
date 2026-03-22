"use client";

import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from "react";
import { useEffect, useRef, useState } from "react";
import { Spin } from "antd";

import { initializeCornerstone } from "@/lib/cornerstone/init";
import { toCornerstoneImageId } from "@/lib/cornerstone/image-id";
import {
  getSharedCornerstoneRenderingEngine,
  getSharedCornerstoneRenderingEngineId,
  scheduleSharedCornerstoneRenderingEngineDestroy,
} from "@/lib/cornerstone/rendering-engine";
import {
  applyActiveViewportTool,
  configureViewportToolGroup,
  deleteViewportAnnotations,
  getViewportAnnotationEntries,
  selectViewportAnnotation,
  type ViewportAnnotationCommand,
  type ViewportAnnotationEntry,
} from "@/lib/tools/cornerstone-tool-adapter";
import {
  isViewportAnnotationTool,
  type ViewportTool,
} from "@/lib/tools/registry";
import {
  getViewportImageLayoutDefinition,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import type {
  DicomImageNode,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";
import type {
  ViewportCorner,
  ViewportOverlaySettings,
} from "@/types/settings";

type ViewportStatus = "idle" | "loading" | "ready" | "error";

interface StackViewportProps {
  viewportKey: string;
  study: DicomStudyNode | null;
  series: DicomSeriesNode | null;
  activeTool: ViewportTool;
  imageLayoutId: ViewportImageLayoutId;
  invertEnabled: boolean;
  overlaySettings: ViewportOverlaySettings;
  annotationCommand?: ViewportAnnotationCommand | null;
  isSelected: boolean;
  cellSelection: "all" | number;
  onSelect: (viewportKey: string) => void;
  onCellSelect?: (viewportKey: string, cellIndex: number) => void;
  onToggleMaximize?: (viewportKey: string) => void;
  onAnnotationsChange?: (state: ViewportAnnotationsState) => void;
}

export interface ViewportAnnotationsState {
  entries: ViewportAnnotationEntry[];
  selectedAnnotationUIDs: string[];
}

const WHEEL_DELTA_THRESHOLD = 48;
const WHEEL_SCROLL_INTERVAL_MS = 36;
const WHEEL_IDLE_RESET_MS = 220;
const WHEEL_LINE_HEIGHT_PX = 18;
const MAX_WHEEL_SCROLL_STEPS_PER_EVENT = 3;
const STACK_CONTEXT_PREFETCH_PRIORITY = 0;
const STACK_CONTEXT_PREFETCH_CONFIG = {
  maxImagesToPrefetch: 24,
  minBefore: 2,
  maxAfter: 6,
  directionExtraImages: 12,
  preserveExistingPool: false,
};
const DEFAULT_PAN_OFFSET = "0.00,0.00,0.00";
const DEFAULT_VOI_WINDOW_WIDTH = "na";
const DEFAULT_VOI_WINDOW_CENTER = "na";
const MAX_TRANSIENT_RENDER_RECOVERY_ATTEMPTS = 1;

interface CameraSnapshot {
  focalPoint: number[];
  position: number[];
}

interface OverlayContextValueMap {
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

type ViewportAnnotationCounts = Record<ViewportTool, number>;
type ViewportCellSelectionState = "none" | "all" | "single";

const EMPTY_ANNOTATION_COUNTS: ViewportAnnotationCounts = {
  select: 0,
  pan: 0,
  windowLevel: 0,
  length: 0,
  polyline: 0,
  freehand: 0,
  angle: 0,
  rectangleRoi: 0,
  ellipseRoi: 0,
  circleRoi: 0,
};

function formatOverlayValue(value: string | undefined, fallback = "--") {
  return value?.trim() ? value : fallback;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isTransientRenderPipelineError(error: unknown) {
  const message = getErrorMessage(error);

  return (
    message.includes("isAttributeUsed") ||
    message.includes("Error compiling shader") ||
    message.includes("shader")
  );
}

function getCameraSnapshot(
  viewport: import("@cornerstonejs/core").Types.IStackViewport,
): CameraSnapshot {
  const camera = viewport.getCamera();

  return {
    focalPoint: Array.from(camera.focalPoint ?? []),
    position: Array.from(camera.position ?? []),
  };
}

function formatPanOffset(
  viewport: import("@cornerstonejs/core").Types.IStackViewport,
  initialCamera: CameraSnapshot | null,
) {
  if (!initialCamera) {
    return DEFAULT_PAN_OFFSET;
  }

  const currentCamera = getCameraSnapshot(viewport);

  return currentCamera.focalPoint
    .map((value, index) => value - (initialCamera.focalPoint[index] ?? 0))
    .map((value) => value.toFixed(2))
    .join(",");
}

function getTotalViewportAnnotationCount(
  annotationCounts: ViewportAnnotationCounts,
) {
  return Object.entries(annotationCounts).reduce((sum, [toolId, count]) => {
    if (!isViewportAnnotationTool(toolId as ViewportTool)) {
      return sum;
    }

    return sum + count;
  }, 0);
}

function getViewportVoiSnapshot(
  core: typeof import("@cornerstonejs/core"),
  viewport: import("@cornerstonejs/core").Types.IStackViewport,
) {
  const voiRange = viewport.getProperties().voiRange;

  if (
    !voiRange ||
    !Number.isFinite(voiRange.lower) ||
    !Number.isFinite(voiRange.upper)
  ) {
    return {
      windowWidth: DEFAULT_VOI_WINDOW_WIDTH,
      windowCenter: DEFAULT_VOI_WINDOW_CENTER,
    };
  }

  const { windowWidth, windowCenter } = core.utilities.windowLevel.toWindowLevel(
    voiRange.lower,
    voiRange.upper,
  );

  return {
    windowWidth: windowWidth.toFixed(2),
    windowCenter: windowCenter.toFixed(2),
  };
}

function buildViewportAnnotationCounts(
  entries: ViewportAnnotationEntry[],
): ViewportAnnotationCounts {
  const nextCounts = {
    ...EMPTY_ANNOTATION_COUNTS,
  };

  for (const entry of entries) {
    nextCounts[entry.toolId] += 1;
  }

  return nextCounts;
}

function getSelectedViewportAnnotationUIDs(entries: ViewportAnnotationEntry[]) {
  return entries
    .filter((entry) => entry.isSelected)
    .map((entry) => entry.annotationUID);
}

function syncViewportAnnotationState(
  tools: typeof import("@cornerstonejs/tools"),
  element: HTMLDivElement,
  series: DicomSeriesNode | null,
  onAnnotationsChange:
    | ((state: ViewportAnnotationsState) => void)
    | undefined,
  setAnnotationCounts: Dispatch<SetStateAction<ViewportAnnotationCounts>>,
  setSelectedAnnotationCount: Dispatch<SetStateAction<number>>,
) {
  const imageIds =
    series?.images.map((image) => toCornerstoneImageId(image.dicomUrl)) ?? [];
  const entries = getViewportAnnotationEntries(tools, element, imageIds);
  const selectedAnnotationUIDs = getSelectedViewportAnnotationUIDs(entries);

  setAnnotationCounts(buildViewportAnnotationCounts(entries));
  setSelectedAnnotationCount(selectedAnnotationUIDs.length);
  onAnnotationsChange?.({
    entries,
    selectedAnnotationUIDs,
  });
}

function disableStackContextPrefetchSafely(
  tools: typeof import("@cornerstonejs/tools") | null | undefined,
  element: HTMLDivElement | null | undefined,
) {
  if (!tools || !element) {
    return;
  }

  try {
    tools.utilities.stackContextPrefetch.disable(element);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to disable stack prefetch for viewport cleanup", error);
    }
  }
}

function normalizeWheelDelta(
  event: WheelEvent,
  viewportHeight: number,
) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * WHEEL_LINE_HEIGHT_PX;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * Math.max(viewportHeight, 1);
  }

  return event.deltaY;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const VIEWPORT_OVERLAY_CLASS_NAMES: Record<ViewportCorner, string> = {
  topLeft: "viewport-corner-top-left",
  topRight: "viewport-corner-top-right",
  bottomLeft: "viewport-corner-bottom-left",
  bottomRight: "viewport-corner-bottom-right",
};

const VIEWPORT_OVERLAY_TEST_IDS: Record<ViewportCorner, string> = {
  topLeft: "viewport-overlay-top-left",
  topRight: "viewport-overlay-top-right",
  bottomLeft: "viewport-overlay-bottom-left",
  bottomRight: "viewport-frame-indicator",
};

const VIEWPORT_IMAGE_LAYOUT_CELL_OVERLAY_TEST_IDS: Record<
  ViewportCorner,
  string
> = {
  topLeft: "viewport-image-layout-cell-overlay-top-left",
  topRight: "viewport-image-layout-cell-overlay-top-right",
  bottomLeft: "viewport-image-layout-cell-overlay-bottom-left",
  bottomRight: "viewport-image-layout-cell-frame-indicator",
};

function buildOverlayContextValueMap(
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

function getOverlayValue(
  tagKey: keyof OverlayContextValueMap | "interactionHint",
  overlayValueMap: OverlayContextValueMap,
) {
  if (tagKey === "interactionHint") {
    return "";
  }

  return overlayValueMap[tagKey];
}

function getViewportImageLayoutCellIndex(
  event: ReactMouseEvent<HTMLDivElement>,
  rows: number,
  columns: number,
) {
  const stageRect = event.currentTarget.getBoundingClientRect();
  const relativeX = event.clientX - stageRect.left;
  const relativeY = event.clientY - stageRect.top;

  if (
    stageRect.width <= 0 ||
    stageRect.height <= 0 ||
    relativeX < 0 ||
    relativeY < 0 ||
    relativeX > stageRect.width ||
    relativeY > stageRect.height
  ) {
    return null;
  }

  const columnIndex = clampNumber(
    Math.floor((relativeX / stageRect.width) * columns),
    0,
    columns - 1,
  );
  const rowIndex = clampNumber(
    Math.floor((relativeY / stageRect.height) * rows),
    0,
    rows - 1,
  );

  return rowIndex * columns + columnIndex;
}

interface ViewportOverlayLayerProps {
  overlaySettings: ViewportOverlaySettings;
  overlayValueMap: OverlayContextValueMap;
  testIds: Record<ViewportCorner, string>;
}

function ViewportOverlayLayer({
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
          data-testid={testIds[corner]}
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

interface ViewportImageLayoutCanvasProps {
  viewportKey: string;
  cellIndex: number;
  image: DicomImageNode | null;
  frameIndex: number | null;
  invertEnabled: boolean;
  overlaySettings: ViewportOverlaySettings;
  overlayValueMap: OverlayContextValueMap | null;
  selectionState: ViewportCellSelectionState;
}

function ViewportImageLayoutCanvas({
  viewportKey,
  cellIndex,
  image,
  frameIndex,
  invertEnabled,
  overlaySettings,
  overlayValueMap,
  selectionState,
}: ViewportImageLayoutCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderImage() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      if (!image) {
        const context = canvas.getContext("2d");

        context?.clearRect(0, 0, canvas.width, canvas.height);
        setHasError(false);
        return;
      }

      try {
        const { core } = await initializeCornerstone();

        if (cancelled || !canvasRef.current) {
          return;
        }

        await core.utilities.loadImageToCanvas({
          canvas: canvasRef.current,
          imageId: toCornerstoneImageId(image.dicomUrl),
          renderingEngineId: `viewport-image-layout-${viewportKey}-${cellIndex}`,
          thumbnail: true,
        });

        canvasRef.current.style.width = "100%";
        canvasRef.current.style.height = "100%";

        if (!cancelled) {
          setHasError(false);
        }
      } catch (error) {
        console.error("Failed to render viewport image layout cell", error);

        if (!cancelled) {
          setHasError(true);
        }
      }
    }

    renderImage();

    return () => {
      cancelled = true;
    };
  }, [cellIndex, image, viewportKey]);

  const statusLabel = hasError ? "ERR" : null;

  return (
    <div
      className={`viewport-image-layout-cell${!image ? " is-empty" : ""}${hasError ? " is-error" : ""}${selectionState !== "none" ? " is-selected" : ""}`}
      data-testid="viewport-image-layout-cell"
      data-cell-index={cellIndex}
      data-cell-selected={String(selectionState !== "none")}
      data-cell-selection-state={selectionState}
      data-cell-empty={String(!image)}
      data-frame-index={frameIndex == null ? "" : String(frameIndex)}
    >
      <canvas
        ref={canvasRef}
        className={`viewport-image-layout-canvas${invertEnabled ? " is-inverted" : ""}`}
        width={512}
        height={512}
      />
      {overlayValueMap ? (
        <ViewportOverlayLayer
          overlaySettings={overlaySettings}
          overlayValueMap={overlayValueMap}
          testIds={VIEWPORT_IMAGE_LAYOUT_CELL_OVERLAY_TEST_IDS}
        />
      ) : null}
      {statusLabel ? (
        <div className="viewport-image-layout-cell-status">{statusLabel}</div>
      ) : null}
    </div>
  );
}

export function StackViewport({
  viewportKey,
  study,
  series,
  activeTool,
  imageLayoutId,
  invertEnabled,
  overlaySettings,
  annotationCommand = null,
  isSelected,
  cellSelection,
  onSelect,
  onCellSelect,
  onToggleMaximize,
  onAnnotationsChange,
}: StackViewportProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const activeToolRef = useRef<ViewportTool>(activeTool);
  const invertEnabledRef = useRef(invertEnabled);
  const onAnnotationsChangeRef = useRef(onAnnotationsChange);
  const coreRef = useRef<typeof import("@cornerstonejs/core") | null>(null);
  const viewportRef =
    useRef<import("@cornerstonejs/core").Types.IStackViewport | null>(null);
  const toolsRef = useRef<typeof import("@cornerstonejs/tools") | null>(null);
  const renderingEngineIdRef = useRef<string | null>(null);
  const viewportIdRef = useRef<string | null>(null);
  const toolGroupIdRef = useRef<string | null>(null);
  const initialCameraRef = useRef<CameraSnapshot | null>(null);
  const lastHandledAnnotationCommandIdRef = useRef<number | null>(null);
  const transientRecoveryAttemptsRef = useRef(0);
  const [status, setStatus] = useState<ViewportStatus>("idle");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [panOffset, setPanOffset] = useState(DEFAULT_PAN_OFFSET);
  const [annotationCounts, setAnnotationCounts] =
    useState<ViewportAnnotationCounts>(EMPTY_ANNOTATION_COUNTS);
  const [selectedAnnotationCount, setSelectedAnnotationCount] = useState(0);
  const [voiWindowWidth, setVoiWindowWidth] = useState(DEFAULT_VOI_WINDOW_WIDTH);
  const [voiWindowCenter, setVoiWindowCenter] = useState(
    DEFAULT_VOI_WINDOW_CENTER,
  );
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewportRuntimeReady, setViewportRuntimeReady] = useState(false);
  const [viewportRuntimeSeed, setViewportRuntimeSeed] = useState(0);
  const wheelDeltaRef = useRef(0);
  const lastWheelAtRef = useRef(0);
  const lastScrollAtRef = useRef(0);
  const containerReady = viewportSize.width > 0 && viewportSize.height > 0;

  useEffect(() => {
    onAnnotationsChangeRef.current = onAnnotationsChange;
  }, [onAnnotationsChange]);

  const renderingEngineId = getSharedCornerstoneRenderingEngineId();
  const viewportId = `dicom-viewport-${viewportKey}`;
  const toolGroupId = `dicom-tools-${viewportKey}`;

  const totalImages = series?.imageCount ?? 0;
  const imageLayoutDefinition = getViewportImageLayoutDefinition(imageLayoutId);
  const hasMontageImageLayout = imageLayoutDefinition.cellCount > 1;
  const isMontageDriverInteractive =
    hasMontageImageLayout && isSelected && activeTool === "select";
  const visibleImageCount = totalImages
    ? Math.min(imageLayoutDefinition.cellCount, totalImages)
    : 0;
  const maxImageLayoutStartFrameIndex = totalImages
    ? Math.max(1, totalImages - visibleImageCount + 1)
    : 0;
  const imageLayoutStartFrameIndex = totalImages
    ? clampNumber(currentImageIndex || 1, 1, maxImageLayoutStartFrameIndex)
    : 0;
  const imageLayoutEndFrameIndex = imageLayoutStartFrameIndex
    ? Math.min(
        totalImages,
        imageLayoutStartFrameIndex + visibleImageCount - 1,
      )
    : 0;
  const imageLayoutFrameLabel =
    visibleImageCount > 1 && imageLayoutStartFrameIndex && imageLayoutEndFrameIndex
      ? `[${imageLayoutStartFrameIndex}-${imageLayoutEndFrameIndex}]/[${totalImages}]`
      : `[${imageLayoutStartFrameIndex || currentImageIndex}]/[${totalImages}]`;
  const imageLayoutCells = Array.from(
    { length: imageLayoutDefinition.cellCount },
    (_, cellIndex) => {
      const frameIndex = imageLayoutStartFrameIndex + cellIndex;

      if (
        !series ||
        !imageLayoutStartFrameIndex ||
        frameIndex > imageLayoutEndFrameIndex
      ) {
        return {
          cellIndex,
          frameIndex: null,
          image: null,
        };
      }

      return {
        cellIndex,
        frameIndex,
        image: series.images[frameIndex - 1] ?? null,
      };
    },
  );
  const hasViewportScrollIndicator = totalImages > 0;
  const isSingleFrameSeries = totalImages === 1;
  const scrollThumbSizePercent =
    totalImages > 0
      ? Math.min(100, Math.max(12, (visibleImageCount / totalImages) * 100))
      : 0;
  const scrollProgressRatio =
    totalImages > visibleImageCount && imageLayoutStartFrameIndex > 0
      ? (imageLayoutStartFrameIndex - 1) / (totalImages - visibleImageCount)
      : 0;
  const scrollThumbOffsetPercent =
    totalImages > visibleImageCount
      ? scrollProgressRatio * (100 - scrollThumbSizePercent)
      : 0;
  const currentImage =
    imageLayoutStartFrameIndex > 0
      ? series?.images[imageLayoutStartFrameIndex - 1]
      : null;
  const overlayValueMap = buildOverlayContextValueMap(
    study,
    series,
    currentImage,
    imageLayoutFrameLabel,
  );
  const imageLayoutCellSelectionStateByIndex = imageLayoutCells.map((cell) => {
    if (!cell.image || !isSelected) {
      return "none";
    }

    if (cellSelection === "all") {
      return "all";
    }

    return cellSelection === cell.cellIndex ? "single" : "none";
  });

  const handleViewportPointerDownCapture = () => {
    if (isSelected) {
      return;
    }

    onSelect(viewportKey);
  };

  const handleViewportClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!hasMontageImageLayout || !isSelected || activeTool !== "select") {
      return;
    }

    const cellIndex = getViewportImageLayoutCellIndex(
      event,
      imageLayoutDefinition.rows,
      imageLayoutDefinition.columns,
    );

    if (
      cellIndex == null ||
      !imageLayoutCells[cellIndex]?.image ||
      cellSelection === cellIndex
    ) {
      return;
    }

    onCellSelect?.(viewportKey, cellIndex);
  };

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const updateViewportSize = () => {
      const nextWidth = Math.round(element.clientWidth);
      const nextHeight = Math.round(element.clientHeight);

      setViewportSize((previous) =>
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : { width: nextWidth, height: nextHeight },
      );
    };

    updateViewportSize();

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(element);
    window.addEventListener("resize", updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [viewportKey]);

  useEffect(() => {
    activeToolRef.current = activeTool;

    if (!toolsRef.current || !toolGroupIdRef.current) {
      return;
    }

    applyActiveViewportTool(toolsRef.current, toolGroupIdRef.current, activeTool);
  }, [activeTool]);

  useEffect(() => {
    invertEnabledRef.current = invertEnabled;

    if (!viewportRef.current || !coreRef.current) {
      return;
    }

    viewportRef.current.setProperties({ invert: invertEnabled });
    const nextVoi = getViewportVoiSnapshot(coreRef.current, viewportRef.current);
    setVoiWindowWidth(nextVoi.windowWidth);
    setVoiWindowCenter(nextVoi.windowCenter);
    viewportRef.current.render();
  }, [invertEnabled]);

  useEffect(() => {
    if (!containerReady) {
      return;
    }

    const element = elementRef.current;

    if (!element) {
      return;
    }

    let cancelled = false;
    let cleanupElement: HTMLDivElement | null = null;
    let cleanupTools:
      | typeof import("@cornerstonejs/tools")
      | undefined;
    let cleanupCore:
      | typeof import("@cornerstonejs/core")
      | undefined;
    let currentRenderingEngineId = "";
    let currentViewportId = "";
    let currentToolGroupId = "";

    const handleStackNewImage = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageIdIndex: number }>;
      setCurrentImageIndex(customEvent.detail.imageIdIndex + 1);
    };
    const handleCameraModified = () => {
      if (!viewportRef.current) {
        return;
      }

      setPanOffset(
        formatPanOffset(viewportRef.current, initialCameraRef.current),
      );
    };
    const handleVoiModified = () => {
      const core = coreRef.current;
      const viewport = viewportRef.current;

      if (!core || !viewport) {
        return;
      }

      const nextVoi = getViewportVoiSnapshot(core, viewport);
      setVoiWindowWidth(nextVoi.windowWidth);
      setVoiWindowCenter(nextVoi.windowCenter);
    };
    const handleWheel = (event: WheelEvent) => {
      const core = coreRef.current;
      const viewport = viewportRef.current;

      if (!core || !viewport) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const now = performance.now();
      const normalizedDelta = normalizeWheelDelta(
        event,
        elementRef.current?.clientHeight ?? 0,
      );

      if (now - lastWheelAtRef.current > WHEEL_IDLE_RESET_MS) {
        wheelDeltaRef.current = 0;
      }

      lastWheelAtRef.current = now;
      wheelDeltaRef.current += normalizedDelta;

      if (Math.abs(wheelDeltaRef.current) < WHEEL_DELTA_THRESHOLD) {
        return;
      }

      if (now - lastScrollAtRef.current < WHEEL_SCROLL_INTERVAL_MS) {
        return;
      }

      const nextScrollSteps = Math.min(
        MAX_WHEEL_SCROLL_STEPS_PER_EVENT,
        Math.floor(Math.abs(wheelDeltaRef.current) / WHEEL_DELTA_THRESHOLD),
      );

      if (nextScrollSteps < 1) {
        return;
      }

      const scrollDelta = wheelDeltaRef.current > 0
        ? nextScrollSteps
        : -nextScrollSteps;

      core.utilities.scroll(viewport, {
        delta: scrollDelta,
        debounceLoading: true,
        loop: false,
      });

      lastScrollAtRef.current = now;
      wheelDeltaRef.current -=
        Math.sign(scrollDelta) * nextScrollSteps * WHEEL_DELTA_THRESHOLD;
    };

    async function initializeViewportRuntime() {
      try {
        const { core, tools } = await initializeCornerstone();

        if (cancelled || !elementRef.current) {
          return;
        }

        cleanupCore = core;
        cleanupTools = tools;
        cleanupElement = elementRef.current;
        currentRenderingEngineId = renderingEngineId;
        currentViewportId = viewportId;
        currentToolGroupId = toolGroupId;

        tools.ToolGroupManager.destroyToolGroup(toolGroupId);
        const renderingEngine = getSharedCornerstoneRenderingEngine(core);

        renderingEngine.enableElement({
          element: cleanupElement,
          viewportId,
          type: core.Enums.ViewportType.STACK,
        });

        const toolGroup = tools.ToolGroupManager.createToolGroup(toolGroupId);

        if (!toolGroup) {
          throw new Error("Failed to create Cornerstone tool group");
        }

        configureViewportToolGroup(tools, toolGroup, toolGroupId);
        toolGroup.addViewport(viewportId, renderingEngineId);

        const viewport = renderingEngine.getViewport(viewportId);

        if (!viewport) {
          throw new Error("Failed to acquire stack viewport");
        }

        coreRef.current = core;
        toolsRef.current = tools;
        renderingEngineIdRef.current = renderingEngineId;
        viewportIdRef.current = viewportId;
        toolGroupIdRef.current = toolGroupId;
        viewportRef.current =
          viewport as import("@cornerstonejs/core").Types.IStackViewport;
        applyActiveViewportTool(tools, toolGroupId, activeToolRef.current);

        cleanupElement.addEventListener(
          core.Enums.Events.CAMERA_MODIFIED,
          handleCameraModified as EventListener,
        );
        cleanupElement.addEventListener(
          core.Enums.Events.STACK_NEW_IMAGE,
          handleStackNewImage as EventListener,
        );
        cleanupElement.addEventListener(
          core.Enums.Events.VOI_MODIFIED,
          handleVoiModified as EventListener,
        );
        cleanupElement.addEventListener("wheel", handleWheel, {
          passive: false,
        });

        if (!cancelled) {
          setViewportRuntimeReady(true);
        }
      } catch (error) {
        console.error("Failed to initialize DICOM viewport", error);

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    initializeViewportRuntime();

    return () => {
      cancelled = true;

      disableStackContextPrefetchSafely(cleanupTools, cleanupElement);
      cleanupElement?.removeEventListener(
        cleanupCore?.Enums.Events.CAMERA_MODIFIED ?? "",
        handleCameraModified as EventListener,
      );
      cleanupElement?.removeEventListener(
        cleanupCore?.Enums.Events.STACK_NEW_IMAGE ?? "",
        handleStackNewImage as EventListener,
      );
      cleanupElement?.removeEventListener(
        cleanupCore?.Enums.Events.VOI_MODIFIED ?? "",
        handleVoiModified as EventListener,
      );
      cleanupElement?.removeEventListener("wheel", handleWheel);

      if (cleanupTools && currentToolGroupId) {
        cleanupTools.ToolGroupManager.destroyToolGroup(currentToolGroupId);
      }

      if (cleanupCore && currentRenderingEngineId) {
        const renderingEngine = cleanupCore.getRenderingEngine(
          currentRenderingEngineId,
        );

        if (renderingEngine && currentViewportId) {
          renderingEngine.disableElement(currentViewportId);
          scheduleSharedCornerstoneRenderingEngineDestroy(cleanupCore);
        }
      }

      coreRef.current = null;
      viewportRef.current = null;
      toolsRef.current = null;
      renderingEngineIdRef.current = null;
      viewportIdRef.current = null;
      toolGroupIdRef.current = null;
      initialCameraRef.current = null;
      lastHandledAnnotationCommandIdRef.current = null;
      setAnnotationCounts(EMPTY_ANNOTATION_COUNTS);
      setSelectedAnnotationCount(0);
      setVoiWindowWidth(DEFAULT_VOI_WINDOW_WIDTH);
      setVoiWindowCenter(DEFAULT_VOI_WINDOW_CENTER);
      onAnnotationsChangeRef.current?.({
        entries: [],
        selectedAnnotationUIDs: [],
      });
      setViewportRuntimeReady(false);
    };
  }, [
    containerReady,
    renderingEngineId,
    toolGroupId,
    viewportId,
    viewportRuntimeSeed,
  ]);

  useEffect(() => {
    if (!viewportRuntimeReady || !containerReady) {
      return;
    }

    const core = coreRef.current;
    const renderingEngineId = renderingEngineIdRef.current;

    if (!core || !renderingEngineId) {
      return;
    }

    let frameId = 0;

    frameId = window.requestAnimationFrame(() => {
      const renderingEngine = core.getRenderingEngine(renderingEngineId);

      renderingEngine?.resize(true, true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [containerReady, viewportRuntimeReady, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const core = coreRef.current;
    const tools = toolsRef.current;
    const element = elementRef.current;

    if (!viewportRuntimeReady || !core || !tools || !element) {
      return;
    }

    const refreshAnnotations = () => {
      syncViewportAnnotationState(
        tools,
        element,
        series,
        onAnnotationsChangeRef.current,
        setAnnotationCounts,
        setSelectedAnnotationCount,
      );
    };

    refreshAnnotations();

    const annotationEvents = [
      tools.Enums.Events.ANNOTATION_ADDED,
      tools.Enums.Events.ANNOTATION_COMPLETED,
      tools.Enums.Events.ANNOTATION_MODIFIED,
      tools.Enums.Events.ANNOTATION_REMOVED,
      tools.Enums.Events.ANNOTATION_SELECTION_CHANGE,
    ];

    for (const eventName of annotationEvents) {
      core.eventTarget.addEventListener(eventName, refreshAnnotations);
    }

    return () => {
      for (const eventName of annotationEvents) {
        core.eventTarget.removeEventListener(eventName, refreshAnnotations);
      }
    };
  }, [series, viewportRuntimeReady, viewportRuntimeSeed]);

  useEffect(() => {
    if (!annotationCommand) {
      return;
    }

    if (annotationCommand.targetViewportKey !== viewportKey) {
      return;
    }

    if (lastHandledAnnotationCommandIdRef.current === annotationCommand.id) {
      return;
    }

    const tools = toolsRef.current;
    const element = elementRef.current;
    const viewportId = viewportIdRef.current;

    if (!viewportRuntimeReady || !tools || !element || !viewportId) {
      return;
    }

    const imageIds =
      series?.images.map((image) => toCornerstoneImageId(image.dicomUrl)) ?? [];
    const viewportAnnotations = getViewportAnnotationEntries(
      tools,
      element,
      imageIds,
    );
    const viewportAnnotationUIDs = new Set(
      viewportAnnotations.map((entry) => entry.annotationUID),
    );

    lastHandledAnnotationCommandIdRef.current = annotationCommand.id;

    if (annotationCommand.type === "select") {
      if (!viewportAnnotationUIDs.has(annotationCommand.annotationUID)) {
        return;
      }

      selectViewportAnnotation(tools, viewportId, annotationCommand.annotationUID);
      return;
    }

    if (annotationCommand.type === "delete") {
      const removableAnnotationUIDs = annotationCommand.annotationUIDs.filter(
        (annotationUID) => viewportAnnotationUIDs.has(annotationUID),
      );

      deleteViewportAnnotations(tools, viewportId, removableAnnotationUIDs);
      return;
    }

    deleteViewportAnnotations(
      tools,
      viewportId,
      viewportAnnotations.map((entry) => entry.annotationUID),
    );
  }, [
    annotationCommand,
    series,
    viewportKey,
    viewportRuntimeReady,
    viewportRuntimeSeed,
  ]);

  useEffect(() => {
    const core = coreRef.current;
    const element = elementRef.current;
    const viewport = viewportRef.current;
    const tools = toolsRef.current;

    if (
      !viewportRuntimeReady ||
      !containerReady ||
      !core ||
      !element ||
      !viewport ||
      !tools
    ) {
      return;
    }

    const currentCore = core;
    const currentElement = element;
    const currentViewport = viewport;
    const currentTools = tools;
    let cancelled = false;

    async function loadSeries() {
      if (!series || series.images.length === 0) {
        disableStackContextPrefetchSafely(currentTools, currentElement);
        setStatus("idle");
        setCurrentImageIndex(0);
        setPanOffset(DEFAULT_PAN_OFFSET);
        setAnnotationCounts(EMPTY_ANNOTATION_COUNTS);
        setSelectedAnnotationCount(0);
        setVoiWindowWidth(DEFAULT_VOI_WINDOW_WIDTH);
        setVoiWindowCenter(DEFAULT_VOI_WINDOW_CENTER);
        onAnnotationsChangeRef.current?.({
          entries: [],
          selectedAnnotationUIDs: [],
        });
        initialCameraRef.current = null;
        transientRecoveryAttemptsRef.current = 0;
        return;
      }

      setStatus("loading");
      setCurrentImageIndex(1);
      setPanOffset(DEFAULT_PAN_OFFSET);
      initialCameraRef.current = null;
      wheelDeltaRef.current = 0;
      lastWheelAtRef.current = 0;
      lastScrollAtRef.current = 0;

      try {
        const imageIds = series.images.map((image) =>
          toCornerstoneImageId(image.dicomUrl),
        );

        disableStackContextPrefetchSafely(currentTools, currentElement);
        await currentViewport.setStack(imageIds);

        if (cancelled) {
          return;
        }

        currentViewport.setProperties({ invert: invertEnabledRef.current });
        currentTools.utilities.stackContextPrefetch.setConfiguration(
          STACK_CONTEXT_PREFETCH_CONFIG,
        );
        currentTools.utilities.stackContextPrefetch.enable(
          currentElement,
          STACK_CONTEXT_PREFETCH_PRIORITY,
        );
        currentViewport.render();
        const nextVoi = getViewportVoiSnapshot(currentCore, currentViewport);
        setVoiWindowWidth(nextVoi.windowWidth);
        setVoiWindowCenter(nextVoi.windowCenter);
        syncViewportAnnotationState(
          currentTools,
          currentElement,
          series,
          onAnnotationsChangeRef.current,
          setAnnotationCounts,
          setSelectedAnnotationCount,
        );
        initialCameraRef.current = getCameraSnapshot(currentViewport);
        transientRecoveryAttemptsRef.current = 0;

        if (!cancelled) {
          setCurrentImageIndex(currentViewport.getCurrentImageIdIndex() + 1);
          setStatus("ready");
        }
      } catch (error) {
        console.error("Failed to render DICOM series", error);

        if (cancelled) {
          return;
        }

        if (
          isTransientRenderPipelineError(error) &&
          transientRecoveryAttemptsRef.current <
            MAX_TRANSIENT_RENDER_RECOVERY_ATTEMPTS
        ) {
          transientRecoveryAttemptsRef.current += 1;
          setStatus("loading");
          setViewportRuntimeReady(false);
          setViewportRuntimeSeed((previous) => previous + 1);
          return;
        }

        setStatus("error");
      }
    }

    loadSeries();

    return () => {
      cancelled = true;
      disableStackContextPrefetchSafely(currentTools, currentElement);
    };
  }, [
    containerReady,
    series,
    viewportKey,
    viewportRuntimeReady,
    viewportRuntimeSeed,
  ]);

  return (
    <div
      className={`viewport-stage${isSelected ? " is-selected" : ""}`}
      data-testid="viewport-stage"
      data-active-tool={activeTool}
      data-invert-enabled={String(invertEnabled)}
      data-pan-offset={panOffset}
      data-status={status}
      data-frame-index={currentImageIndex}
      data-frame-count={totalImages}
      data-image-layout-id={imageLayoutId}
      data-image-layout-count={imageLayoutDefinition.cellCount}
      data-image-layout-start-frame={imageLayoutStartFrameIndex}
      data-image-layout-end-frame={imageLayoutEndFrameIndex}
      data-viewport-id={viewportKey}
      data-viewport-selected={String(isSelected)}
      data-cell-selection={String(cellSelection)}
      data-voi-window-width={voiWindowWidth}
      data-voi-window-center={voiWindowCenter}
      data-active-annotation-count={annotationCounts[activeTool]}
      data-annotation-total={getTotalViewportAnnotationCount(annotationCounts)}
      data-selected-annotation-count={selectedAnnotationCount}
      data-viewport-size={`${viewportSize.width}x${viewportSize.height}`}
      onPointerDownCapture={handleViewportPointerDownCapture}
      onClick={handleViewportClick}
      onDoubleClick={() => {
        if (!onToggleMaximize || isViewportAnnotationTool(activeTool)) {
          return;
        }

        onToggleMaximize(viewportKey);
      }}
    >
      {hasMontageImageLayout ? (
        <div
          className="viewport-image-layout-grid"
          data-testid="viewport-image-layout-grid"
          data-image-layout-id={imageLayoutId}
          style={{
            gridTemplateColumns: `repeat(${imageLayoutDefinition.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${imageLayoutDefinition.rows}, minmax(0, 1fr))`,
          }}
        >
          {imageLayoutCells.map((cell) => (
            <ViewportImageLayoutCanvas
              key={`${viewportKey}-${cell.cellIndex}`}
              viewportKey={viewportKey}
              cellIndex={cell.cellIndex}
              image={cell.image}
              frameIndex={cell.frameIndex}
              invertEnabled={invertEnabled}
              overlaySettings={overlaySettings}
              overlayValueMap={
                cell.image
                  ? buildOverlayContextValueMap(
                      study,
                      series,
                      cell.image,
                      `[${cell.frameIndex ?? 0}]/[${totalImages}]`,
                    )
                  : null
              }
              selectionState={imageLayoutCellSelectionStateByIndex[cell.cellIndex]}
            />
          ))}
        </div>
      ) : null}
      <div
        ref={elementRef}
        className={`viewport-canvas${hasMontageImageLayout ? " is-driver-hidden" : ""}${isMontageDriverInteractive ? " is-driver-interactive" : ""}`}
      />
      {hasViewportScrollIndicator ? (
        <div
          className="viewport-stack-scrollbar"
          data-testid="viewport-scrollbar"
          data-single-frame={String(isSingleFrameSeries)}
          data-frame-index={imageLayoutStartFrameIndex || currentImageIndex}
          data-frame-count={totalImages}
          aria-hidden="true"
        >
          <div
            className="viewport-stack-scrollbar-thumb"
            data-testid="viewport-scrollbar-thumb"
            style={{
              height: `${scrollThumbSizePercent}%`,
              top: `${scrollThumbOffsetPercent}%`,
            }}
          />
        </div>
      ) : null}
      {!hasMontageImageLayout ? (
        <ViewportOverlayLayer
          overlaySettings={overlaySettings}
          overlayValueMap={overlayValueMap}
          testIds={VIEWPORT_OVERLAY_TEST_IDS}
        />
      ) : null}
      {status === "loading" ? (
        <div className="status-layer">
          <Spin size="large" />
        </div>
      ) : null}
      {status === "idle" ? (
        <div className="status-layer">
          <div className="status-card">
            <strong>等待序列</strong>
            <p>左侧选择一个序列后，这里会自动完成堆栈渲染。</p>
          </div>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="status-layer">
          <div className="status-card is-error">
            <strong>主视图加载失败</strong>
            <p>请检查 DICOM 文件是否可读，或刷新页面重新初始化 Cornerstone。</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
