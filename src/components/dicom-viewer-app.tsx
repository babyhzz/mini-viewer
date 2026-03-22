"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Spin } from "antd";

import { AnnotationListDrawer } from "@/components/annotation-list-drawer";
import { BootstrapIcon } from "@/components/bootstrap-icon";
import type { ViewportAnnotationsState } from "@/components/stack-viewport";
import { StackViewport } from "@/components/stack-viewport";
import { ThumbnailCanvas } from "@/components/thumbnail-canvas";
import { ViewerSettingsDrawer } from "@/components/viewer-settings-drawer";
import { ViewportToolbar } from "@/components/viewport-toolbar";
import {
  createDefaultViewerSettings,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";
import {
  findToolbarShortcutCommandId,
  getToolbarShortcutBindingFromKeyboardEvent,
  isToolbarShortcutToolCommand,
} from "@/lib/settings/shortcuts";
import type { ViewportAnnotationCommand } from "@/lib/tools/cornerstone-tool-adapter";
import {
  createDefaultViewportToolGroupSelections,
  getViewportToolGroupId,
  type ViewportAction,
  type ViewportTool,
  type ViewportToolGroupSelections,
} from "@/lib/tools/registry";
import {
  DEFAULT_VIEWPORT_LAYOUT_ID,
  getViewportLayoutDefinition,
  getViewportLayoutSlotIds,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
import {
  DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
  getViewportImageLayoutDefinition,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import type {
  DicomHierarchyResponse,
  DicomSeriesNode,
  DicomStudyNode,
} from "@/types/dicom";
import type { ViewerSettings } from "@/types/settings";

interface SelectedSeries {
  key: string;
  study: DicomStudyNode;
  series: DicomSeriesNode;
}

type ViewportCellSelection = "all" | number;

type ViewportAnnotationCommandInput =
  | {
      type: "select";
      annotationUID: string;
    }
  | {
      type: "delete";
      annotationUIDs: string[];
    }
  | {
      type: "clearAll";
    };

function buildSeriesKey(studyId: string, seriesId: string) {
  return `${studyId}::${seriesId}`;
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function createEmptyViewportAnnotationsState(): ViewportAnnotationsState {
  return {
    entries: [],
    selectedAnnotationUIDs: [],
  };
}

function getOrderedSeriesEntries(
  hierarchy: DicomHierarchyResponse | null,
): SelectedSeries[] {
  if (!hierarchy) {
    return [];
  }

  return hierarchy.studies.flatMap((study) =>
    study.series.map((series) => ({
      key: buildSeriesKey(study.studyId, series.seriesId),
      study,
      series,
    })),
  );
}

function alignViewportBooleanState(
  viewportIds: string[],
  previousState: Record<string, boolean>,
  fallbackValue: boolean,
) {
  return viewportIds.reduce<Record<string, boolean>>((nextState, viewportId) => {
    nextState[viewportId] = previousState[viewportId] ?? fallbackValue;
    return nextState;
  }, {});
}

function alignViewportAnnotationStateMap(
  viewportIds: string[],
  previousState: Record<string, ViewportAnnotationsState>,
) {
  return viewportIds.reduce<Record<string, ViewportAnnotationsState>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? createEmptyViewportAnnotationsState();
      return nextState;
    },
    {},
  );
}

function alignViewportImageLayoutState(
  viewportIds: string[],
  previousState: Record<string, ViewportImageLayoutId>,
) {
  return viewportIds.reduce<Record<string, ViewportImageLayoutId>>(
    (nextState, viewportId) => {
      nextState[viewportId] =
        previousState[viewportId] ?? DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID;
      return nextState;
    },
    {},
  );
}

function alignViewportCellSelectionState(
  viewportIds: string[],
  previousState: Record<string, ViewportCellSelection>,
) {
  return viewportIds.reduce<Record<string, ViewportCellSelection>>(
    (nextState, viewportId) => {
      nextState[viewportId] = previousState[viewportId] ?? "all";
      return nextState;
    },
    {},
  );
}

function buildViewportSeriesAssignments(
  viewportIds: string[],
  previousAssignments: Record<string, string | null>,
  orderedSeriesKeys: string[],
) {
  const availableSeriesKeys = new Set(orderedSeriesKeys);
  const nextAssignments = viewportIds.reduce<Record<string, string | null>>(
    (assignments, viewportId) => {
      const previousSeriesKey = previousAssignments[viewportId];

      assignments[viewportId] =
        previousSeriesKey && availableSeriesKeys.has(previousSeriesKey)
          ? previousSeriesKey
          : null;

      return assignments;
    },
    {},
  );

  if (!orderedSeriesKeys.length) {
    return nextAssignments;
  }

  const usedSeriesKeys = new Set(
    Object.values(nextAssignments).filter(
      (seriesKey): seriesKey is string => Boolean(seriesKey),
    ),
  );
  const remainingSeriesKeys = orderedSeriesKeys.filter(
    (seriesKey) => !usedSeriesKeys.has(seriesKey),
  );
  let recycleIndex = 0;

  for (const viewportId of viewportIds) {
    if (nextAssignments[viewportId]) {
      continue;
    }

    if (remainingSeriesKeys.length) {
      nextAssignments[viewportId] = remainingSeriesKeys.shift() ?? null;
      continue;
    }

    nextAssignments[viewportId] =
      orderedSeriesKeys[recycleIndex % orderedSeriesKeys.length] ?? null;
    recycleIndex += 1;
  }

  return nextAssignments;
}

export function DicomViewerApp() {
  const annotationCommandIdRef = useRef(0);
  const [hierarchy, setHierarchy] = useState<DicomHierarchyResponse | null>(null);
  const [viewerSettings, setViewerSettings] = useState<ViewerSettings>(
    createDefaultViewerSettings(),
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeViewportTool, setActiveViewportTool] =
    useState<ViewportTool>("select");
  const [viewportLayoutId, setViewportLayoutId] = useState<ViewportLayoutId>(
    DEFAULT_VIEWPORT_LAYOUT_ID,
  );
  const [maximizedViewportId, setMaximizedViewportId] =
    useState<string | null>(null);
  const [selectedViewportId, setSelectedViewportId] =
    useState<string>("viewport-1");
  const [viewportSeriesAssignments, setViewportSeriesAssignments] = useState<
    Record<string, string | null>
  >({});
  const [viewportInvertEnabled, setViewportInvertEnabled] = useState<
    Record<string, boolean>
  >({});
  const [viewportToolGroupSelections, setViewportToolGroupSelections] =
    useState<ViewportToolGroupSelections>(
      createDefaultViewportToolGroupSelections(),
    );
  const [annotationCommand, setAnnotationCommand] =
    useState<ViewportAnnotationCommand | null>(null);
  const [viewportAnnotationsStateById, setViewportAnnotationsStateById] =
    useState<Record<string, ViewportAnnotationsState>>({});
  const [viewportImageLayoutIdById, setViewportImageLayoutIdById] = useState<
    Record<string, ViewportImageLayoutId>
  >({});
  const [viewportCellSelectionById, setViewportCellSelectionById] = useState<
    Record<string, ViewportCellSelection>
  >({});
  const [annotationListOpen, setAnnotationListOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const viewportIds = getViewportLayoutSlotIds(viewportLayoutId);
  const canMaximizeViewport = viewportIds.length > 1;
  const isViewportMaximized =
    canMaximizeViewport &&
    Boolean(maximizedViewportId) &&
    viewportIds.includes(maximizedViewportId ?? "");
  const effectiveViewportLayoutId: ViewportLayoutId = isViewportMaximized
    ? "1x1"
    : viewportLayoutId;
  const effectiveViewportLayout = getViewportLayoutDefinition(
    effectiveViewportLayoutId,
  );
  const visibleViewportIds =
    isViewportMaximized && maximizedViewportId
      ? [maximizedViewportId]
      : viewportIds;
  const orderedSeriesEntries = getOrderedSeriesEntries(hierarchy);
  const seriesEntryMap = new Map(
    orderedSeriesEntries.map((entry) => [entry.key, entry] as const),
  );
  const activeViewportAnnotationsState =
    viewportAnnotationsStateById[selectedViewportId] ??
    createEmptyViewportAnnotationsState();
  const activeViewportInvertEnabled =
    viewportInvertEnabled[selectedViewportId] ?? false;
  const activeViewportImageLayoutId =
    viewportImageLayoutIdById[selectedViewportId] ??
    DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID;
  const activeViewportImageLayout = getViewportImageLayoutDefinition(
    activeViewportImageLayoutId,
  );
  const activeViewportHasMontageLayout = activeViewportImageLayout.cellCount > 1;

  const handleViewportSelect = useCallback((viewportId: string) => {
    setSelectedViewportId(viewportId);
    setViewportCellSelectionById((previous) => ({
      ...previous,
      [viewportId]: "all",
    }));
  }, []);

  const handleViewportCellSelect = useCallback(
    (viewportId: string, cellIndex: number) => {
      setSelectedViewportId(viewportId);
      setViewportCellSelectionById((previous) => ({
        ...previous,
        [viewportId]: cellIndex,
      }));
    },
    [],
  );

  const queueAnnotationCommand = (command: ViewportAnnotationCommandInput) => {
    const targetViewportKey =
      selectedViewportId || viewportIds[0] || "viewport-1";

    annotationCommandIdRef.current += 1;
    setAnnotationCommand({
      id: annotationCommandIdRef.current,
      targetViewportKey,
      ...command,
    } as ViewportAnnotationCommand);
  };

  const handleViewportToolChange = useCallback(
    (tool: ViewportTool) => {
      if (activeViewportHasMontageLayout && tool !== "select") {
        setViewportImageLayoutIdById((previous) => ({
          ...previous,
          [selectedViewportId]: DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID,
        }));
      }

      setActiveViewportTool(tool);

      const toolGroupId = getViewportToolGroupId(tool);

      if (!toolGroupId) {
        return;
      }

      setViewportToolGroupSelections((previous) => ({
        ...previous,
        [toolGroupId]: tool,
      }));
    },
    [activeViewportHasMontageLayout, selectedViewportId],
  );

  const handleViewportLayoutChange = (layoutId: ViewportLayoutId) => {
    setMaximizedViewportId(null);
    setViewportLayoutId(layoutId);
  };

  const handleViewportImageLayoutChange = (layoutId: ViewportImageLayoutId) => {
    setViewportImageLayoutIdById((previous) => ({
      ...previous,
      [selectedViewportId]: layoutId,
    }));
    setViewportCellSelectionById((previous) => ({
      ...previous,
      [selectedViewportId]: "all",
    }));

    if (layoutId !== DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID) {
      setActiveViewportTool("select");
    }
  };

  const handleViewportToggleMaximize = (viewportId: string) => {
    handleViewportSelect(viewportId);
    setMaximizedViewportId((previous) => {
      if (previous === viewportId) {
        return null;
      }

      if (!canMaximizeViewport) {
        return null;
      }

      return viewportId;
    });
  };

  const handleViewportAction = useCallback(
    (action: ViewportAction) => {
      if (action === "invert") {
        setViewportInvertEnabled((previous) => ({
          ...previous,
          [selectedViewportId]: !(previous[selectedViewportId] ?? false),
        }));

        return;
      }

      setAnnotationListOpen(true);
    },
    [selectedViewportId],
  );

  const handleDeleteSelectedAnnotations = () => {
    if (!activeViewportAnnotationsState.selectedAnnotationUIDs.length) {
      return;
    }

    queueAnnotationCommand({
      type: "delete",
      annotationUIDs: activeViewportAnnotationsState.selectedAnnotationUIDs,
    });
  };

  const handleClearAllAnnotations = () => {
    if (!activeViewportAnnotationsState.entries.length) {
      return;
    }

    Modal.confirm({
      title: "清空当前视口全部图元？",
      content: "这会删除当前选中视口里的测量和 ROI，且无法撤销。",
      okText: "清空全部",
      okButtonProps: {
        danger: true,
      },
      cancelText: "取消",
      onOk: () => {
        queueAnnotationCommand({
          type: "clearAll",
        });
      },
    });
  };

  const handleAnnotationManageAction = (
    action: "deleteSelected" | "clearAll",
  ) => {
    if (action === "deleteSelected") {
      handleDeleteSelectedAnnotations();
      return;
    }

    handleClearAllAnnotations();
  };

  const handleSaveViewerSettings = async (nextSettings: ViewerSettings) => {
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextSettings),
    });

    if (!response.ok) {
      throw new Error("保存设置失败，请稍后重试。");
    }

    const payload = (await response.json()) as ViewerSettings;
    setViewerSettings(normalizeViewerSettings(payload));
    setSettingsOpen(false);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadHierarchy() {
      try {
        setLoading(true);
        setErrorMessage(null);

        const [hierarchyResponse, settingsResponse] = await Promise.all([
          fetch("/api/hierarchy", {
            cache: "no-store",
          }),
          fetch("/api/settings", {
            cache: "no-store",
          }),
        ]);

        if (!hierarchyResponse.ok) {
          throw new Error("Hierarchy request failed");
        }

        const [hierarchyPayload, settingsPayload] = await Promise.all([
          hierarchyResponse.json() as Promise<DicomHierarchyResponse>,
          settingsResponse.ok
            ? (settingsResponse.json() as Promise<ViewerSettings>)
            : Promise.resolve(createDefaultViewerSettings()),
        ]);

        if (cancelled) {
          return;
        }

        setHierarchy(hierarchyPayload);
        setViewerSettings(normalizeViewerSettings(settingsPayload));
      } catch (error) {
        console.error("Failed to fetch hierarchy", error);

        if (!cancelled) {
          setErrorMessage("无法加载层级结构接口，请检查本地 DICOM 目录和 API。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHierarchy();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (settingsOpen || annotationListOpen) {
        return;
      }

      if (document.querySelector(".ant-modal-root .ant-modal-wrap")) {
        return;
      }

      if (isEditableKeyboardTarget(event.target)) {
        return;
      }

      const binding = getToolbarShortcutBindingFromKeyboardEvent(event);

      if (!binding) {
        return;
      }

      const commandId = findToolbarShortcutCommandId(
        viewerSettings.toolbarShortcuts.bindings,
        binding,
      );

      if (!commandId) {
        return;
      }

      if (commandId !== "settings" && !orderedSeriesEntries.length) {
        return;
      }

      event.preventDefault();

      if (commandId === "settings") {
        setSettingsOpen(true);
        return;
      }

      if (isToolbarShortcutToolCommand(commandId)) {
        handleViewportToolChange(commandId);
        return;
      }

      handleViewportAction(commandId);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    annotationListOpen,
    handleViewportAction,
    handleViewportToolChange,
    orderedSeriesEntries.length,
    settingsOpen,
    viewerSettings.toolbarShortcuts.bindings,
  ]);

  useEffect(() => {
    const nextViewportIds = getViewportLayoutSlotIds(viewportLayoutId);
    const nextOrderedSeriesKeys = getOrderedSeriesEntries(hierarchy).map(
      (entry) => entry.key,
    );

    setViewportSeriesAssignments((previous) =>
      buildViewportSeriesAssignments(
        nextViewportIds,
        previous,
        nextOrderedSeriesKeys,
      ),
    );
    setViewportInvertEnabled((previous) =>
      alignViewportBooleanState(nextViewportIds, previous, false),
    );
    setViewportAnnotationsStateById((previous) =>
      alignViewportAnnotationStateMap(nextViewportIds, previous),
    );
    setViewportImageLayoutIdById((previous) =>
      alignViewportImageLayoutState(nextViewportIds, previous),
    );
    setViewportCellSelectionById((previous) =>
      alignViewportCellSelectionState(nextViewportIds, previous),
    );
    setSelectedViewportId((previous) =>
      nextViewportIds.includes(previous)
        ? previous
        : (nextViewportIds[0] ?? "viewport-1"),
    );
    setMaximizedViewportId((previous) =>
      previous && nextViewportIds.includes(previous) ? previous : null,
    );
  }, [hierarchy, viewportLayoutId]);

  useEffect(() => {
    if (!activeViewportHasMontageLayout || activeViewportTool === "select") {
      return;
    }

    setActiveViewportTool("select");
  }, [activeViewportHasMontageLayout, activeViewportTool, selectedViewportId]);

  if (loading) {
    return (
      <main className="viewer-page">
        <section className="screen-loader animate-in">
          <div className="screen-loader-card">
            <Spin
              indicator={
                <BootstrapIcon
                  name="arrow-repeat"
                  spin
                  className="app-spin-indicator"
                />
              }
              size="large"
            />
            <div className="screen-loader-copy">
              <h1>正在连接本地 DICOM 数据</h1>
              <p>页面启动后会先读取 `dicom/` 目录树，然后准备缩略图和主视图的初始序列。</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="viewer-page">
        <section className="screen-loader animate-in">
          <div className="screen-loader-card">
            <div className="status-card is-error">
              <strong>加载失败</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="viewer-page">
      <section className="viewer-shell animate-in" data-testid="viewer-shell">
        <aside className="panel sidebar-panel" data-testid="sidebar-panel">
          <div className="thumbnail-panel">
            <header className="section-header">
              <div>
                <h1 className="section-title">Series Navigator</h1>
                <p className="section-subtitle">
                  自动读取 `dicom/检查/序列/图像` 层级并生成序列导航
                </p>
              </div>
            </header>
            <div className="thumbnail-scroll">
              {hierarchy?.studies.length ? (
                hierarchy.studies.map((study) => (
                  <section key={study.studyId} className="study-section">
                    <div className="study-title">{study.title}</div>
                    <div className="thumbnail-grid">
                      {study.series.map((series) => {
                        const seriesKey = buildSeriesKey(study.studyId, series.seriesId);
                        const assignedViewportCount = viewportIds.filter(
                          (viewportId) =>
                            viewportSeriesAssignments[viewportId] === seriesKey,
                        ).length;
                        const isSelected =
                          viewportSeriesAssignments[selectedViewportId] === seriesKey;

                        return (
                          <button
                            key={seriesKey}
                            type="button"
                            className={`series-card${isSelected ? " is-selected" : ""}${assignedViewportCount > 0 && !isSelected ? " is-assigned" : ""}`}
                            data-testid="series-card"
                            data-series-title={series.title}
                            data-image-count={series.imageCount}
                            data-assigned-count={assignedViewportCount}
                            onClick={() => {
                              setViewportSeriesAssignments((previous) => ({
                                ...previous,
                                [selectedViewportId]: seriesKey,
                              }));
                              setViewportCellSelectionById((previous) => ({
                                ...previous,
                                [selectedViewportId]: "all",
                              }));
                              setViewportAnnotationsStateById((previous) => ({
                                ...previous,
                                [selectedViewportId]:
                                  createEmptyViewportAnnotationsState(),
                              }));
                            }}
                          >
                            <ThumbnailCanvas
                              dicomUrl={series.thumbnailPath}
                              alt={`${series.title} thumbnail`}
                            />
                            <div className="series-card-header">
                              <h2 className="series-card-title">{series.title}</h2>
                              <span className="series-card-count">
                                {series.imageCount} 张
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              ) : (
                <div className="status-card">
                  <strong>没有可显示的序列</strong>
                  <p>`dicom/` 目录当前没有可用的 `.dcm` 文件，页面不会创建 viewport。</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="panel viewport-panel" data-testid="viewport-panel">
          <ViewportToolbar
            activeTool={activeViewportTool}
            groupSelections={viewportToolGroupSelections}
            layoutId={effectiveViewportLayoutId}
            imageLayoutId={activeViewportImageLayoutId}
            invertEnabled={activeViewportInvertEnabled}
            annotationCount={activeViewportAnnotationsState.entries.length}
            selectedAnnotationCount={
              activeViewportAnnotationsState.selectedAnnotationUIDs.length
            }
            onToolChange={handleViewportToolChange}
            onLayoutChange={handleViewportLayoutChange}
            onImageLayoutChange={handleViewportImageLayoutChange}
            onAction={handleViewportAction}
            onAnnotationManageAction={handleAnnotationManageAction}
            onOpenSettings={() => setSettingsOpen(true)}
            disabled={!orderedSeriesEntries.length}
          />
          <div
            className="viewport-grid"
            data-testid="viewport-grid"
            data-layout-id={effectiveViewportLayoutId}
            data-layout-count={visibleViewportIds.length}
            data-maximized-viewport-id={maximizedViewportId ?? ""}
            data-base-layout-id={viewportLayoutId}
            style={{
              gridTemplateColumns: `repeat(${effectiveViewportLayout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${effectiveViewportLayout.rows}, minmax(0, 1fr))`,
            }}
          >
            {visibleViewportIds.map((viewportId, index) => {
              const cell = effectiveViewportLayout.cells[index];
              const seriesEntry =
                seriesEntryMap.get(viewportSeriesAssignments[viewportId] ?? "") ?? null;

              return (
                <div
                  key={viewportId}
                  className={`viewport-slot${selectedViewportId === viewportId ? " is-selected" : ""}${maximizedViewportId === viewportId ? " is-maximized" : ""}`}
                  data-testid={`viewport-slot-${viewportId}`}
                  data-viewport-id={viewportId}
                  data-viewport-maximized={String(maximizedViewportId === viewportId)}
                  data-series-title={seriesEntry?.series.title ?? ""}
                  style={{
                    gridColumn: `${cell.column} / span ${cell.columnSpan ?? 1}`,
                    gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
                  }}
                >
                  <StackViewport
                    viewportKey={viewportId}
                    study={seriesEntry?.study ?? null}
                    series={seriesEntry?.series ?? null}
                    activeTool={activeViewportTool}
                    imageLayoutId={
                      viewportImageLayoutIdById[viewportId] ??
                      DEFAULT_VIEWPORT_IMAGE_LAYOUT_ID
                    }
                    invertEnabled={viewportInvertEnabled[viewportId] ?? false}
                    overlaySettings={viewerSettings.viewportOverlay}
                    annotationCommand={annotationCommand}
                    isSelected={selectedViewportId === viewportId}
                    cellSelection={viewportCellSelectionById[viewportId] ?? "all"}
                    onSelect={handleViewportSelect}
                    onCellSelect={handleViewportCellSelect}
                    onToggleMaximize={handleViewportToggleMaximize}
                    onAnnotationsChange={(state) => {
                      setViewportAnnotationsStateById((previous) => ({
                        ...previous,
                        [viewportId]: state,
                      }));
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </section>
      <AnnotationListDrawer
        open={annotationListOpen}
        annotations={activeViewportAnnotationsState.entries}
        onClose={() => setAnnotationListOpen(false)}
        onSelectAnnotation={(annotationUID) => {
          queueAnnotationCommand({
            type: "select",
            annotationUID,
          });
        }}
        onDeleteAnnotation={(annotationUID) => {
          queueAnnotationCommand({
            type: "delete",
            annotationUIDs: [annotationUID],
          });
        }}
        onClearAll={handleClearAllAnnotations}
      />
      <ViewerSettingsDrawer
        open={settingsOpen}
        settings={viewerSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSaveViewerSettings}
      />
    </main>
  );
}
