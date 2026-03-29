"use client";

import { useEffect, useRef, useState } from "react";
import { Spin } from "antd";

import { AppIcon } from "@/components/app-icon";
import { DicomTagModal } from "@/components/dicom-tag-modal";
import type { ViewportAnnotationsState } from "@/components/viewport-annotations";
import {
  buildOverlayContextValueMap,
  ViewportOverlayLayer,
} from "@/components/viewport-overlay-layer";
import { initializeCornerstone } from "@/lib/cornerstone/init";
import { toCornerstoneImageId } from "@/lib/cornerstone/image-id";
import {
  getSharedCornerstoneRenderingEngine,
  getSharedCornerstoneRenderingEngineId,
  scheduleSharedCornerstoneRenderingEngineDestroy,
} from "@/lib/cornerstone/rendering-engine";
import {
  acquireSeriesVolume,
  releaseSeriesVolume,
} from "@/lib/cornerstone/volume-cache";
import {
  applyActiveMprViewportTool,
  configureMprViewportToolGroup,
  MPR_CROSSHAIRS_TOOL_NAME,
  type ViewportAnnotationCommand,
} from "@/lib/tools/cornerstone-tool-adapter";
import {
  isViewportToolSupportedInMpr,
  type ViewportTool,
} from "@/lib/tools/registry";
import {
  getViewportMprLayoutDefinition,
  type ViewportMprLayoutId,
  type ViewportMprPaneId,
} from "@/lib/viewports/mpr-layouts";
import type { DicomImageNode, DicomSeriesNode, DicomStudyNode } from "@/types/dicom";
import type { ViewportOverlaySettings } from "@/types/settings";

type ViewportStatus = "idle" | "loading" | "ready" | "error";

interface MprViewportProps {
  viewportKey: string;
  seriesKey: string | null;
  study: DicomStudyNode | null;
  series: DicomSeriesNode | null;
  activeTool: ViewportTool;
  mprLayoutId: ViewportMprLayoutId;
  invertEnabled: boolean;
  overlaySettings: ViewportOverlaySettings;
  annotationCommand?: ViewportAnnotationCommand | null;
  dicomTagDialogOpen?: boolean;
  isSelected: boolean;
  onCloseDicomTagDialog?: () => void;
  onSelect: (viewportKey: string) => void;
  onToggleMaximize?: (viewportKey: string) => void;
  onAnnotationsChange?: (state: ViewportAnnotationsState) => void;
}

interface MprPaneSnapshot {
  frameIndex: number;
  frameCount: number;
  image: DicomImageNode | null;
}

interface WheelScrollState {
  delta: number;
  lastWheelAt: number;
  lastScrollAt: number;
}

interface CornerstoneCrosshairsToolLike {
  computeToolCenter?: () => void;
}

const WHEEL_DELTA_THRESHOLD = 48;
const WHEEL_SCROLL_INTERVAL_MS = 36;
const WHEEL_IDLE_RESET_MS = 220;
const WHEEL_LINE_HEIGHT_PX = 18;
const MAX_WHEEL_SCROLL_STEPS_PER_EVENT = 3;
const MAX_TRANSIENT_RENDER_RECOVERY_ATTEMPTS = 1;
const MPR_REFERENCE_LINE_COLORS: Record<ViewportMprPaneId, string> = {
  axial: "rgb(103, 196, 255)",
  coronal: "rgb(119, 221, 119)",
  sagittal: "rgb(255, 171, 92)",
};
const EMPTY_MPR_PANE_SNAPSHOT: MprPaneSnapshot = {
  frameIndex: 0,
  frameCount: 0,
  image: null,
};

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

function normalizeWheelDelta(event: WheelEvent, viewportHeight: number) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * WHEEL_LINE_HEIGHT_PX;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * Math.max(viewportHeight, 1);
  }

  return event.deltaY;
}

function createWheelScrollState(): WheelScrollState {
  return {
    delta: 0,
    lastWheelAt: 0,
    lastScrollAt: 0,
  };
}

function createEmptyMprPaneSnapshots() {
  return {
    axial: EMPTY_MPR_PANE_SNAPSHOT,
    coronal: EMPTY_MPR_PANE_SNAPSHOT,
    sagittal: EMPTY_MPR_PANE_SNAPSHOT,
  } satisfies Record<ViewportMprPaneId, MprPaneSnapshot>;
}

function areMprPaneSnapshotsEqual(
  left: MprPaneSnapshot,
  right: MprPaneSnapshot,
) {
  return (
    left.frameIndex === right.frameIndex &&
    left.frameCount === right.frameCount &&
    left.image?.dicomUrl === right.image?.dicomUrl
  );
}

function updateSingleMprPaneSnapshotState(
  previous: Record<ViewportMprPaneId, MprPaneSnapshot>,
  paneId: ViewportMprPaneId,
  nextSnapshot: MprPaneSnapshot,
) {
  if (areMprPaneSnapshotsEqual(previous[paneId], nextSnapshot)) {
    return previous;
  }

  return {
    ...previous,
    [paneId]: nextSnapshot,
  };
}

function updateAllMprPaneSnapshotsState(
  previous: Record<ViewportMprPaneId, MprPaneSnapshot>,
  nextSnapshots: Partial<Record<ViewportMprPaneId, MprPaneSnapshot>>,
) {
  let hasChanges = false;
  const mergedSnapshots = {
    ...previous,
  };

  for (const paneId of Object.keys(nextSnapshots) as ViewportMprPaneId[]) {
    const nextSnapshot = nextSnapshots[paneId];

    if (!nextSnapshot || areMprPaneSnapshotsEqual(previous[paneId], nextSnapshot)) {
      continue;
    }

    mergedSnapshots[paneId] = nextSnapshot;
    hasChanges = true;
  }

  return hasChanges ? mergedSnapshots : previous;
}

function getScrollThumbSizePercent(frameCount: number, visibleFrameCount = 1) {
  if (frameCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(12, (visibleFrameCount / frameCount) * 100));
}

function getScrollThumbOffsetPercent(
  frameIndex: number,
  frameCount: number,
  scrollThumbSizePercent: number,
  visibleFrameCount = 1,
) {
  if (frameCount <= visibleFrameCount || frameIndex <= 0) {
    return 0;
  }

  const scrollProgressRatio = (frameIndex - 1) / (frameCount - visibleFrameCount);

  return scrollProgressRatio * (100 - scrollThumbSizePercent);
}

function getMprPaneViewport(
  core: typeof import("@cornerstonejs/core"),
  renderingEngineId: string,
  paneViewportId: string,
) {
  const renderingEngine = core.getRenderingEngine(renderingEngineId);

  if (!renderingEngine) {
    return null;
  }

  return renderingEngine.getViewport(
    paneViewportId,
  ) as import("@cornerstonejs/core").Types.IVolumeViewport | null;
}

function buildMprPaneSnapshot(
  core: typeof import("@cornerstonejs/core"),
  renderingEngineId: string,
  paneViewportId: string,
  volumeId: string | null | undefined,
  series: DicomSeriesNode | null,
): MprPaneSnapshot {
  if (!volumeId) {
    return EMPTY_MPR_PANE_SNAPSHOT;
  }

  const viewport = getMprPaneViewport(core, renderingEngineId, paneViewportId);

  if (!viewport) {
    return EMPTY_MPR_PANE_SNAPSHOT;
  }

  const frameCount = Math.max(0, viewport.getNumberOfSlices());
  const frameIndex =
    frameCount > 0 ? viewport.getCurrentImageIdIndex(volumeId) + 1 : 0;
  const currentImageId = viewport.getCurrentImageId();
  const image =
    currentImageId && series
      ? series.images.find(
          (seriesImage) =>
            toCornerstoneImageId(seriesImage.dicomUrl) === currentImageId,
        ) ?? null
      : null;

  return {
    frameIndex,
    frameCount,
    image,
  };
}

export function MprViewport({
  viewportKey,
  seriesKey,
  study,
  series,
  activeTool,
  mprLayoutId,
  invertEnabled,
  overlaySettings,
  annotationCommand,
  dicomTagDialogOpen = false,
  isSelected,
  onCloseDicomTagDialog,
  onSelect,
  onToggleMaximize,
  onAnnotationsChange,
}: MprViewportProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const paneElementRefs = useRef<Record<ViewportMprPaneId, HTMLDivElement | null>>({
    axial: null,
    coronal: null,
    sagittal: null,
  });
  const coreRef = useRef<typeof import("@cornerstonejs/core") | null>(null);
  const toolsRef = useRef<typeof import("@cornerstonejs/tools") | null>(null);
  const toolGroupIdRef = useRef<string | null>(null);
  const volumeIdRef = useRef<string | null>(null);
  const paneViewportIdsRef = useRef<Record<ViewportMprPaneId, string>>({
    axial: `dicom-mpr-${viewportKey}-axial`,
    coronal: `dicom-mpr-${viewportKey}-coronal`,
    sagittal: `dicom-mpr-${viewportKey}-sagittal`,
  });
  const wheelStateByPaneRef = useRef<Record<ViewportMprPaneId, WheelScrollState>>({
    axial: createWheelScrollState(),
    coronal: createWheelScrollState(),
    sagittal: createWheelScrollState(),
  });
  const onAnnotationsChangeRef = useRef(onAnnotationsChange);
  const activeToolRef = useRef<ViewportTool>(activeTool);
  const invertEnabledRef = useRef(invertEnabled);
  const transientRecoveryAttemptsRef = useRef(0);
  const [status, setStatus] = useState<ViewportStatus>("idle");
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [viewportRuntimeReady, setViewportRuntimeReady] = useState(false);
  const [viewportRuntimeSeed, setViewportRuntimeSeed] = useState(0);
  const [paneSnapshots, setPaneSnapshots] = useState(createEmptyMprPaneSnapshots);

  const renderingEngineId = getSharedCornerstoneRenderingEngineId();
  const toolGroupId = `dicom-mpr-tools-${viewportKey}`;
  const mprLayoutDefinition = getViewportMprLayoutDefinition(mprLayoutId);
  const effectiveTool = isViewportToolSupportedInMpr(activeTool)
    ? activeTool
    : "select";
  const primaryPaneSnapshot = paneSnapshots[mprLayoutDefinition.panes[0].id];
  const paneElementsReady = mprLayoutDefinition.panes.every(
    (pane) => paneElementRefs.current[pane.id],
  );
  const containerReady =
    viewportSize.width > 0 && viewportSize.height > 0 && paneElementsReady;
  const dicomTagSources = mprLayoutDefinition.panes.map((pane) => {
    const paneSnapshot = paneSnapshots[pane.id];

    return {
      id: pane.id,
      label: `${pane.label} · [${paneSnapshot.frameIndex}]/[${paneSnapshot.frameCount}]`,
      image: paneSnapshot.image,
    };
  });

  useEffect(() => {
    onAnnotationsChangeRef.current = onAnnotationsChange;
  }, [onAnnotationsChange]);

  useEffect(() => {
    activeToolRef.current = activeTool;

    if (!toolsRef.current || !toolGroupIdRef.current) {
      return;
    }

    applyActiveMprViewportTool(
      toolsRef.current,
      toolGroupIdRef.current,
      activeTool,
    );
  }, [activeTool]);

  useEffect(() => {
    invertEnabledRef.current = invertEnabled;

    const core = coreRef.current;

    if (!core || !viewportRuntimeReady) {
      return;
    }

    const renderingEngine = core.getRenderingEngine(renderingEngineId);

    if (!renderingEngine) {
      return;
    }

    for (const pane of mprLayoutDefinition.panes) {
      const viewport = renderingEngine.getViewport(
        paneViewportIdsRef.current[pane.id],
      ) as import("@cornerstonejs/core").Types.IVolumeViewport | undefined;

      if (!viewport) {
        continue;
      }

      viewport.setProperties({ invert: invertEnabled });
      viewport.render();
    }
  }, [invertEnabled, mprLayoutDefinition.panes, renderingEngineId, viewportRuntimeReady]);

  useEffect(() => {
    const stageElement = stageRef.current;

    if (!stageElement) {
      return;
    }

    const updateViewportSize = () => {
      const nextWidth = Math.round(stageElement.clientWidth);
      const nextHeight = Math.round(stageElement.clientHeight);

      setViewportSize((previous) =>
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : {
              width: nextWidth,
              height: nextHeight,
            },
      );
    };

    updateViewportSize();

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(stageElement);
    window.addEventListener("resize", updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [viewportKey]);

  useEffect(() => {
    if (!containerReady) {
      return;
    }

    let cancelled = false;
    let cleanupCore: typeof import("@cornerstonejs/core") | undefined;
    let cleanupTools: typeof import("@cornerstonejs/tools") | undefined;
    const paneViewportIds = {
      ...paneViewportIdsRef.current,
    };
    const paneIdByViewportId = mprLayoutDefinition.panes.reduce<
      Record<string, ViewportMprPaneId>
    >((map, pane) => {
      map[paneViewportIds[pane.id]] = pane.id;
      return map;
    }, {});

    async function initializeViewportRuntime() {
      try {
        const { core, tools } = await initializeCornerstone();

        if (cancelled) {
          return;
        }

        cleanupCore = core;
        cleanupTools = tools;

        tools.ToolGroupManager.destroyToolGroup(toolGroupId);

        const renderingEngine = getSharedCornerstoneRenderingEngine(core);

        for (const pane of mprLayoutDefinition.panes) {
          const element = paneElementRefs.current[pane.id];
          const viewportId = paneViewportIds[pane.id];

          if (!element) {
            throw new Error(`Missing MPR pane element for ${pane.id}`);
          }

          if (renderingEngine.getViewport(viewportId)) {
            renderingEngine.disableElement(viewportId);
          }

          renderingEngine.enableElement({
            element,
            viewportId,
            type: core.Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: {
              orientation: pane.orientation,
            },
          });
        }

        const toolGroup = tools.ToolGroupManager.createToolGroup(toolGroupId);

        if (!toolGroup) {
          throw new Error("Failed to create Cornerstone MPR tool group");
        }

        configureMprViewportToolGroup(tools, toolGroup, {
          getReferenceLineColor: (viewportId: string) =>
            MPR_REFERENCE_LINE_COLORS[paneIdByViewportId[viewportId] ?? "axial"],
          getReferenceLineControllable: () => true,
          getReferenceLineDraggableRotatable: () => true,
          getReferenceLineSlabThicknessControlsOn: () => false,
          referenceLinesCenterGapRadius: 14,
          handleRadius: 5,
          centerPoint: {
            enabled: true,
            color: "rgba(255, 248, 191, 0.9)",
            size: 4,
          },
          autoPan: {
            enabled: true,
            panSize: 12,
          },
        });

        for (const pane of mprLayoutDefinition.panes) {
          toolGroup.addViewport(paneViewportIds[pane.id], renderingEngineId);
        }

        coreRef.current = core;
        toolsRef.current = tools;
        toolGroupIdRef.current = toolGroupId;
        applyActiveMprViewportTool(tools, toolGroupId, activeToolRef.current);

        if (!cancelled) {
          setViewportRuntimeReady(true);
        }
      } catch (error) {
        console.error("Failed to initialize MPR viewport", error);

        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    initializeViewportRuntime();

    return () => {
      cancelled = true;

      if (cleanupCore) {
        for (const pane of mprLayoutDefinition.panes) {
          const viewportId = paneViewportIds[pane.id];
          const renderingEngine = cleanupCore.getRenderingEngine(renderingEngineId);

          if (renderingEngine?.getViewport(viewportId)) {
            renderingEngine.disableElement(viewportId);
          }
        }

        scheduleSharedCornerstoneRenderingEngineDestroy(cleanupCore);
      }

      if (cleanupTools) {
        cleanupTools.ToolGroupManager.destroyToolGroup(toolGroupId);
      }

      coreRef.current = null;
      toolsRef.current = null;
      toolGroupIdRef.current = null;
      volumeIdRef.current = null;
      transientRecoveryAttemptsRef.current = 0;
      setViewportRuntimeReady(false);
      setPaneSnapshots(createEmptyMprPaneSnapshots());
      onAnnotationsChangeRef.current?.({
        entries: [],
        selectedAnnotationUIDs: [],
      });
    };
  }, [
    containerReady,
    mprLayoutDefinition.panes,
    renderingEngineId,
    toolGroupId,
    viewportRuntimeSeed,
  ]);

  useEffect(() => {
    const core = coreRef.current;

    if (!viewportRuntimeReady || !containerReady || !core) {
      return;
    }

    const currentCore = core;

    const wheelListeners: Array<{
      element: HTMLDivElement;
      listener: (event: WheelEvent) => void;
    }> = [];
    const cameraListeners: Array<{
      element: HTMLDivElement;
      listener: EventListener;
    }> = [];
    const volumeScrollListeners: Array<{
      eventName: string;
      listener: (event: Event) => void;
    }> = [];

    const refreshPaneSnapshot = (paneId: ViewportMprPaneId, viewportId: string) => {
      setPaneSnapshots((previous) =>
        updateSingleMprPaneSnapshotState(
          previous,
          paneId,
          buildMprPaneSnapshot(
            currentCore,
            renderingEngineId,
            viewportId,
            volumeIdRef.current,
            series,
          ),
        ),
      );
    };

    const refreshAllPaneSnapshots = () => {
      setPaneSnapshots((previous) =>
        updateAllMprPaneSnapshotsState(
          previous,
          mprLayoutDefinition.panes.reduce<
            Partial<Record<ViewportMprPaneId, MprPaneSnapshot>>
          >((nextSnapshots, pane) => {
            nextSnapshots[pane.id] = buildMprPaneSnapshot(
              currentCore,
              renderingEngineId,
              paneViewportIdsRef.current[pane.id],
              volumeIdRef.current,
              series,
            );
            return nextSnapshots;
          }, {}),
        ),
      );
    };

    for (const pane of mprLayoutDefinition.panes) {
      const paneElement = paneElementRefs.current[pane.id];
      const viewportId = paneViewportIdsRef.current[pane.id];

      if (!paneElement) {
        continue;
      }

      const wheelListener = (event: WheelEvent) => {
        const volumeId = volumeIdRef.current;
        const viewport = getMprPaneViewport(
          currentCore,
          renderingEngineId,
          paneViewportIdsRef.current[pane.id],
        );

        if (!volumeId || !viewport) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        const wheelState = wheelStateByPaneRef.current[pane.id];
        const now = performance.now();
        const normalizedDelta = normalizeWheelDelta(
          event,
          paneElement.clientHeight,
        );

        if (now - wheelState.lastWheelAt > WHEEL_IDLE_RESET_MS) {
          wheelState.delta = 0;
        }

        wheelState.lastWheelAt = now;
        wheelState.delta += normalizedDelta;

        if (Math.abs(wheelState.delta) < WHEEL_DELTA_THRESHOLD) {
          return;
        }

        if (now - wheelState.lastScrollAt < WHEEL_SCROLL_INTERVAL_MS) {
          return;
        }

        const nextScrollSteps = Math.min(
          MAX_WHEEL_SCROLL_STEPS_PER_EVENT,
          Math.floor(Math.abs(wheelState.delta) / WHEEL_DELTA_THRESHOLD),
        );

        if (nextScrollSteps < 1) {
          return;
        }

        const scrollDelta = wheelState.delta > 0
          ? nextScrollSteps
          : -nextScrollSteps;

        currentCore.utilities.scroll(viewport, {
          delta: scrollDelta,
          volumeId,
          scrollSlabs: false,
        });

        wheelState.lastScrollAt = now;
        wheelState.delta -=
          Math.sign(scrollDelta) * nextScrollSteps * WHEEL_DELTA_THRESHOLD;
      };

      paneElement.addEventListener("wheel", wheelListener, {
        passive: false,
      });
      wheelListeners.push({
        element: paneElement,
        listener: wheelListener,
      });

      const cameraListener: EventListener = () => {
        refreshAllPaneSnapshots();
      };

      paneElement.addEventListener(
        currentCore.Enums.Events.CAMERA_MODIFIED,
        cameraListener,
      );
      cameraListeners.push({
        element: paneElement,
        listener: cameraListener,
      });

      const volumeScrollListener = (event: Event) => {
        const customEvent = event as CustomEvent<{
          viewport?: {
            id?: string;
          };
        }>;

        if (customEvent.detail.viewport?.id !== viewportId) {
          return;
        }

        refreshPaneSnapshot(pane.id, viewportId);
      };

      for (const eventName of [
        currentCore.Enums.Events.VOLUME_VIEWPORT_SCROLL,
        currentCore.Enums.Events.VOLUME_VIEWPORT_SCROLL_OUT_OF_BOUNDS,
      ]) {
        currentCore.eventTarget.addEventListener(eventName, volumeScrollListener);
        volumeScrollListeners.push({
          eventName,
          listener: volumeScrollListener,
        });
      }
    }

    return () => {
      for (const entry of wheelListeners) {
        entry.element.removeEventListener("wheel", entry.listener);
      }

      for (const entry of cameraListeners) {
        entry.element.removeEventListener(
          currentCore.Enums.Events.CAMERA_MODIFIED,
          entry.listener,
        );
      }

      for (const entry of volumeScrollListeners) {
        currentCore.eventTarget.removeEventListener(
          entry.eventName,
          entry.listener,
        );
      }
    };
  }, [
    containerReady,
    mprLayoutDefinition.panes,
    renderingEngineId,
    series,
    viewportRuntimeReady,
  ]);

  useEffect(() => {
    if (!viewportRuntimeReady || !containerReady) {
      return;
    }

    const core = coreRef.current;

    if (!core) {
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
  }, [containerReady, renderingEngineId, viewportRuntimeReady, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    const core = coreRef.current;

    if (!viewportRuntimeReady || !containerReady || !core) {
      return;
    }

    const currentCore = core;

    let cancelled = false;
    let acquiredVolumeId: string | null = null;

    async function loadSeries() {
      const renderingEngine = currentCore.getRenderingEngine(renderingEngineId);

      if (!renderingEngine) {
        return;
      }

      if (!series || !seriesKey || !series.images.length) {
        for (const pane of mprLayoutDefinition.panes) {
          const viewport = renderingEngine.getViewport(
            paneViewportIdsRef.current[pane.id],
          ) as import("@cornerstonejs/core").Types.IVolumeViewport | undefined;

          if (!viewport) {
            continue;
          }

          const actorUIDs = viewport.getActorUIDs();

          if (actorUIDs.length) {
            viewport.removeVolumeActors(actorUIDs, true);
            viewport.render();
          }
        }

        volumeIdRef.current = null;
        transientRecoveryAttemptsRef.current = 0;
        setPaneSnapshots(createEmptyMprPaneSnapshots());
        setStatus("idle");
        return;
      }

      setStatus("loading");

      try {
        const imageIds = series.images.map((image) =>
          toCornerstoneImageId(image.dicomUrl),
        );

        acquiredVolumeId = await acquireSeriesVolume(
          currentCore,
          seriesKey,
          imageIds,
        );

        if (cancelled) {
          releaseSeriesVolume(currentCore, acquiredVolumeId);
          acquiredVolumeId = null;
          return;
        }

        volumeIdRef.current = acquiredVolumeId;
        await currentCore.setVolumesForViewports(
          renderingEngine,
          [
            {
              volumeId: acquiredVolumeId,
            },
          ],
          mprLayoutDefinition.panes.map(
            (pane) => paneViewportIdsRef.current[pane.id],
          ),
        );

        for (const pane of mprLayoutDefinition.panes) {
          const viewport = renderingEngine.getViewport(
            paneViewportIdsRef.current[pane.id],
          ) as import("@cornerstonejs/core").Types.IVolumeViewport | undefined;

          if (!viewport) {
            continue;
          }

          viewport.setProperties({ invert: invertEnabledRef.current });
          viewport.resetCamera();
          viewport.render();
        }

        const currentTools = toolsRef.current;
        const currentToolGroupId = toolGroupIdRef.current;

        if (currentTools && currentToolGroupId) {
          const toolGroup = currentTools.ToolGroupManager.getToolGroup(
            currentToolGroupId,
          );
          const crosshairsTool = toolGroup?.getToolInstance(
            MPR_CROSSHAIRS_TOOL_NAME,
          ) as CornerstoneCrosshairsToolLike | undefined;

          crosshairsTool?.computeToolCenter?.();
          currentTools.utilities.triggerAnnotationRenderForViewportIds(
            mprLayoutDefinition.panes.map(
              (pane) => paneViewportIdsRef.current[pane.id],
            ),
          );
        }

        setPaneSnapshots(() => {
          return mprLayoutDefinition.panes.reduce(
            (nextSnapshots, pane) => {
              nextSnapshots[pane.id] = buildMprPaneSnapshot(
                currentCore,
                renderingEngineId,
                paneViewportIdsRef.current[pane.id],
                acquiredVolumeId,
                series,
              );
              return nextSnapshots;
            },
            createEmptyMprPaneSnapshots(),
          );
        });

        transientRecoveryAttemptsRef.current = 0;
        setStatus("ready");
      } catch (error) {
        console.error("Failed to render MPR volume", error);

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

      if (acquiredVolumeId) {
        releaseSeriesVolume(currentCore, acquiredVolumeId);

        if (volumeIdRef.current === acquiredVolumeId) {
          volumeIdRef.current = null;
        }
      }
    };
  }, [
    containerReady,
    mprLayoutDefinition.panes,
    renderingEngineId,
    series,
    seriesKey,
    viewportRuntimeReady,
  ]);

  useEffect(() => {
    onAnnotationsChangeRef.current?.({
      entries: [],
      selectedAnnotationUIDs: [],
    });
  }, [annotationCommand, viewportKey]);

  const handleViewportPointerDownCapture = () => {
    if (isSelected) {
      return;
    }

    onSelect(viewportKey);
  };

  return (
    <div
      ref={stageRef}
      className={`viewport-stage viewport-stage-mpr${isSelected ? " is-selected" : ""}`}
      data-testid="viewport-stage"
      data-active-tool={effectiveTool}
      data-invert-enabled={String(invertEnabled)}
      data-status={status}
      data-frame-index={primaryPaneSnapshot.frameIndex}
      data-frame-count={primaryPaneSnapshot.frameCount}
      data-mpr-layout-id={mprLayoutId}
      data-mpr-pane-count={mprLayoutDefinition.panes.length}
      data-mpr-primary-tool={
        effectiveTool === "select" ? "crosshairs" : effectiveTool
      }
      data-view-mode="mpr"
      data-viewport-id={viewportKey}
      data-viewport-selected={String(isSelected)}
      data-active-annotation-count="0"
      data-annotation-total="0"
      data-selected-annotation-count="0"
      data-viewport-size={`${viewportSize.width}x${viewportSize.height}`}
      onPointerDownCapture={handleViewportPointerDownCapture}
      onDoubleClick={() => {
        if (!onToggleMaximize) {
          return;
        }

        onToggleMaximize(viewportKey);
      }}
    >
      <div
        className={`mpr-pane-grid mpr-pane-grid-${mprLayoutId}`}
        data-testid="mpr-pane-grid"
        style={{
          gridTemplateColumns: `repeat(${mprLayoutDefinition.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${mprLayoutDefinition.rows}, minmax(0, 1fr))`,
        }}
      >
        {mprLayoutDefinition.panes.map((pane) => {
          const paneSnapshot = paneSnapshots[pane.id];
          const hasPaneScrollIndicator = paneSnapshot.frameCount > 0;
          const isSingleFramePane = paneSnapshot.frameCount === 1;
          const scrollThumbSizePercent = getScrollThumbSizePercent(
            paneSnapshot.frameCount,
          );
          const scrollThumbOffsetPercent = getScrollThumbOffsetPercent(
            paneSnapshot.frameIndex,
            paneSnapshot.frameCount,
            scrollThumbSizePercent,
          );
          const frameProgress =
            paneSnapshot.frameCount > 0
              ? `[${paneSnapshot.frameIndex}]/[${paneSnapshot.frameCount}]`
              : "[0]/[0]";

          return (
            <div
              key={pane.id}
              className="mpr-pane-shell"
              data-testid="mpr-pane"
              data-pane-id={pane.id}
              data-pane-label={pane.label}
              data-pane-frame-index={paneSnapshot.frameIndex}
              data-pane-frame-count={paneSnapshot.frameCount}
              style={{
                gridColumn: `${pane.column} / span ${pane.columnSpan ?? 1}`,
                gridRow: `${pane.row} / span ${pane.rowSpan ?? 1}`,
              }}
            >
              <div
                ref={(element) => {
                  if (paneElementRefs.current[pane.id] === element) {
                    return;
                  }

                  paneElementRefs.current[pane.id] = element;
                }}
                className="mpr-pane-canvas"
              />
              {paneSnapshot.frameCount > 0 ? (
                <ViewportOverlayLayer
                  overlaySettings={overlaySettings}
                  overlayValueMap={buildOverlayContextValueMap(
                    study,
                    series,
                    paneSnapshot.image,
                    frameProgress,
                  )}
                />
              ) : null}
              {hasPaneScrollIndicator ? (
                <div
                  className="viewport-stack-scrollbar mpr-pane-scrollbar"
                  data-testid="mpr-pane-scrollbar"
                  data-pane-id={pane.id}
                  data-single-frame={String(isSingleFramePane)}
                  data-frame-index={paneSnapshot.frameIndex}
                  data-frame-count={paneSnapshot.frameCount}
                  aria-hidden="true"
                >
                  <div
                    className="viewport-stack-scrollbar-thumb"
                    data-testid="mpr-pane-scrollbar-thumb"
                    style={{
                      height: `${scrollThumbSizePercent}%`,
                      top: `${scrollThumbOffsetPercent}%`,
                    }}
                  />
                </div>
              ) : null}
              <div className="mpr-pane-badge" aria-hidden="true">
                {pane.shortLabel}
              </div>
            </div>
          );
        })}
      </div>
      {status === "loading" ? (
        <div className="status-layer">
          <Spin
            size="large"
            indicator={
              <AppIcon
                name="arrow-repeat"
                className="app-icon app-spin-indicator is-spin"
              />
            }
          />
        </div>
      ) : null}
      {status === "idle" ? (
        <div className="status-layer">
          <div className="status-card">
            <strong>等待序列</strong>
            <p>为当前视口分配序列后，这里会切换为 MPR 三视图。</p>
          </div>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="status-layer">
          <div className="status-card is-error">
            <strong>MPR 视图加载失败</strong>
            <p>请检查当前序列是否适合重建，或刷新页面重新初始化 Cornerstone。</p>
          </div>
        </div>
      ) : null}
      <DicomTagModal
        open={dicomTagDialogOpen}
        title="DICOM Tag"
        sources={dicomTagSources}
        defaultSourceId={mprLayoutDefinition.panes[0]?.id ?? null}
        onClose={onCloseDicomTagDialog ?? (() => undefined)}
      />
    </div>
  );
}
