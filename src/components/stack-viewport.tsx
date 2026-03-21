"use client";

import type { Dispatch, SetStateAction } from "react";
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
  getViewportToolInteractionHint,
  isViewportAnnotationTool,
  type ViewportTool,
} from "@/lib/tools/registry";
import type { DicomSeriesNode, DicomStudyNode } from "@/types/dicom";
import type {
  OverlayTagKey,
  ViewportCorner,
  ViewportOverlaySettings,
} from "@/types/settings";

type ViewportStatus = "idle" | "loading" | "ready" | "error";

interface StackViewportProps {
  viewportKey: string;
  study: DicomStudyNode | null;
  series: DicomSeriesNode | null;
  activeTool: ViewportTool;
  invertEnabled: boolean;
  overlaySettings: ViewportOverlaySettings;
  annotationCommand?: ViewportAnnotationCommand | null;
  isSelected: boolean;
  onSelect: (viewportKey: string) => void;
  onAnnotationsChange?: (state: ViewportAnnotationsState) => void;
}

export interface ViewportAnnotationsState {
  entries: ViewportAnnotationEntry[];
  selectedAnnotationUIDs: string[];
}

const WHEEL_DELTA_THRESHOLD = 72;
const WHEEL_SCROLL_INTERVAL_MS = 90;
const WHEEL_IDLE_RESET_MS = 220;
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
  interactionHint: string;
  imageFileName: string;
  instanceNumber: string;
}

type ViewportAnnotationCounts = Record<ViewportTool, number>;

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

export function StackViewport({
  viewportKey,
  study,
  series,
  activeTool,
  invertEnabled,
  overlaySettings,
  annotationCommand = null,
  isSelected,
  onSelect,
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
  const patientName = formatOverlayValue(study?.patientName, "未标注患者");
  const patientId = formatOverlayValue(study?.patientId);
  const studyDate = formatOverlayValue(study?.studyDate);
  const studyTitle = formatOverlayValue(study?.title, "未选中检查");
  const seriesTitle = formatOverlayValue(series?.title, "未选中序列");
  const interactionHint = getViewportToolInteractionHint(activeTool);
  const currentImage =
    currentImageIndex > 0 ? series?.images[currentImageIndex - 1] : undefined;
  const modalitySummary = [series?.modality, series?.seriesNumber ? `S${series.seriesNumber}` : undefined]
    .filter(Boolean)
    .join(" · ");
  const overlayValueMap: OverlayContextValueMap = {
    patientName,
    patientId,
    studyTitle,
    studyDate,
    seriesTitle,
    modalitySummary: formatOverlayValue(modalitySummary, "未标注模态"),
    frameProgress: `[${currentImageIndex}]/[${totalImages}]`,
    interactionHint,
    imageFileName: formatOverlayValue(currentImage?.fileName),
    instanceNumber: formatOverlayValue(
      currentImage?.instanceNumber?.toString(),
    ),
  };

  const overlayCorners: Array<{
    corner: ViewportCorner;
    className: string;
    testId: string;
  }> = [
    {
      corner: "topLeft",
      className: "viewport-corner-top-left",
      testId: "viewport-overlay-top-left",
    },
    {
      corner: "topRight",
      className: "viewport-corner-top-right",
      testId: "viewport-overlay-top-right",
    },
    {
      corner: "bottomLeft",
      className: "viewport-corner-bottom-left",
      testId: "viewport-overlay-bottom-left",
    },
    {
      corner: "bottomRight",
      className: "viewport-corner-bottom-right",
      testId: "viewport-frame-indicator",
    },
  ];

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

      if (now - lastWheelAtRef.current > WHEEL_IDLE_RESET_MS) {
        wheelDeltaRef.current = 0;
      }

      lastWheelAtRef.current = now;
      wheelDeltaRef.current += event.deltaY;

      if (Math.abs(wheelDeltaRef.current) < WHEEL_DELTA_THRESHOLD) {
        return;
      }

      if (now - lastScrollAtRef.current < WHEEL_SCROLL_INTERVAL_MS) {
        return;
      }

      const scrollDelta = wheelDeltaRef.current > 0 ? 1 : -1;

      core.utilities.scroll(viewport, {
        delta: scrollDelta,
        debounceLoading: true,
        loop: false,
      });

      lastScrollAtRef.current = now;
      wheelDeltaRef.current -= scrollDelta * WHEEL_DELTA_THRESHOLD;
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

      if (cleanupElement) {
        cleanupTools?.utilities.stackContextPrefetch.disable(cleanupElement);
      }
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
        currentTools.utilities.stackContextPrefetch.disable(currentElement);
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

        currentTools.utilities.stackContextPrefetch.disable(currentElement);
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
      currentTools.utilities.stackContextPrefetch.disable(currentElement);
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
      data-viewport-id={viewportKey}
      data-viewport-selected={String(isSelected)}
      data-voi-window-width={voiWindowWidth}
      data-voi-window-center={voiWindowCenter}
      data-active-annotation-count={annotationCounts[activeTool]}
      data-annotation-total={getTotalViewportAnnotationCount(annotationCounts)}
      data-selected-annotation-count={selectedAnnotationCount}
      data-viewport-size={`${viewportSize.width}x${viewportSize.height}`}
      onPointerDownCapture={() => onSelect(viewportKey)}
    >
      <div ref={elementRef} className="viewport-canvas" />
      {overlayCorners.map(({ corner, className, testId }) => {
        const items = overlaySettings.corners[corner];

        if (!items.length) {
          return null;
        }

        return (
          <div
            key={corner}
            className={`viewport-corner ${className}`}
            data-testid={testId}
          >
            {items.map((item) => {
              const value = overlayValueMap[item.tagKey as OverlayTagKey];

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
      })}
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
