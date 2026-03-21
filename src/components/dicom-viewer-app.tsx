"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingOutlined } from "@ant-design/icons";
import { Modal, Spin } from "antd";

import { AnnotationListDrawer } from "@/components/annotation-list-drawer";
import type { ViewportAnnotationsState } from "@/components/stack-viewport";
import { StackViewport } from "@/components/stack-viewport";
import { ThumbnailCanvas } from "@/components/thumbnail-canvas";
import { ViewerSettingsDrawer } from "@/components/viewer-settings-drawer";
import { ViewportToolbar } from "@/components/viewport-toolbar";
import {
  createDefaultViewerSettings,
  normalizeViewerSettings,
} from "@/lib/settings/overlay";
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
  getViewportSlotLabel,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
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
  const [annotationListOpen, setAnnotationListOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const viewportLayout = getViewportLayoutDefinition(viewportLayoutId);
  const viewportIds = getViewportLayoutSlotIds(viewportLayoutId);
  const orderedSeriesEntries = getOrderedSeriesEntries(hierarchy);
  const seriesEntryMap = new Map(
    orderedSeriesEntries.map((entry) => [entry.key, entry] as const),
  );
  const activeSeriesEntry =
    seriesEntryMap.get(viewportSeriesAssignments[selectedViewportId] ?? "") ?? null;
  const activeViewportAnnotationsState =
    viewportAnnotationsStateById[selectedViewportId] ??
    createEmptyViewportAnnotationsState();
  const activeViewportInvertEnabled =
    viewportInvertEnabled[selectedViewportId] ?? false;
  const activeViewportIndex = Math.max(0, viewportIds.indexOf(selectedViewportId));
  const activeViewportLabel = getViewportSlotLabel(activeViewportIndex);

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

  const handleViewportToolChange = (tool: ViewportTool) => {
    setActiveViewportTool(tool);

    const toolGroupId = getViewportToolGroupId(tool);

    if (!toolGroupId) {
      return;
    }

    setViewportToolGroupSelections((previous) => ({
      ...previous,
      [toolGroupId]: tool,
    }));
  };

  const handleViewportLayoutChange = (layoutId: ViewportLayoutId) => {
    setViewportLayoutId(layoutId);
  };

  const handleViewportAction = (action: ViewportAction) => {
    if (action === "invert") {
      setViewportInvertEnabled((previous) => ({
        ...previous,
        [selectedViewportId]: !(previous[selectedViewportId] ?? false),
      }));

      return;
    }

    setAnnotationListOpen(true);
  };

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
    setSelectedViewportId((previous) =>
      nextViewportIds.includes(previous)
        ? previous
        : (nextViewportIds[0] ?? "viewport-1"),
    );
  }, [hierarchy, viewportLayoutId]);

  if (loading) {
    return (
      <main className="viewer-page">
        <section className="screen-loader animate-in">
          <div className="screen-loader-card">
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 28 }} spin />}
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
            layoutId={viewportLayoutId}
            invertEnabled={activeViewportInvertEnabled}
            annotationCount={activeViewportAnnotationsState.entries.length}
            selectedAnnotationCount={
              activeViewportAnnotationsState.selectedAnnotationUIDs.length
            }
            onToolChange={handleViewportToolChange}
            onLayoutChange={handleViewportLayoutChange}
            onAction={handleViewportAction}
            onAnnotationManageAction={handleAnnotationManageAction}
            onOpenSettings={() => setSettingsOpen(true)}
            disabled={!orderedSeriesEntries.length}
          />
          <header className="viewport-header">
            <div>
              <div className="viewport-kicker">
                Active Viewport · {activeViewportLabel}
              </div>
              <h2 className="viewport-title">
                <span data-testid="viewport-title">
                  {activeSeriesEntry?.series.title ?? "No Active Series"}
                </span>
              </h2>
            </div>
            <div className="viewport-meta">
              <span>{viewportLayout.label}</span>
              <span>•</span>
              <span>{activeSeriesEntry?.study.title ?? "未选中检查"}</span>
              <span>•</span>
              <span>{activeSeriesEntry?.series.imageCount ?? 0} frames</span>
            </div>
          </header>
          <div
            className="viewport-grid"
            data-testid="viewport-grid"
            data-layout-id={viewportLayoutId}
            data-layout-count={viewportIds.length}
            style={{
              gridTemplateColumns: `repeat(${viewportLayout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${viewportLayout.rows}, minmax(0, 1fr))`,
            }}
          >
            {viewportLayout.cells.map((cell, index) => {
              const viewportId = viewportIds[index];
              const seriesEntry =
                seriesEntryMap.get(viewportSeriesAssignments[viewportId] ?? "") ?? null;

              return (
                <div
                  key={viewportId}
                  className={`viewport-slot${selectedViewportId === viewportId ? " is-selected" : ""}`}
                  data-testid={`viewport-slot-${viewportId}`}
                  data-viewport-id={viewportId}
                  data-series-title={seriesEntry?.series.title ?? ""}
                  style={{
                    gridColumn: `${cell.column} / span ${cell.columnSpan ?? 1}`,
                    gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
                  }}
                >
                  <span className="viewport-slot-label">
                    {getViewportSlotLabel(index)}
                  </span>
                  <StackViewport
                    viewportKey={viewportId}
                    study={seriesEntry?.study ?? null}
                    series={seriesEntry?.series ?? null}
                    activeTool={activeViewportTool}
                    invertEnabled={viewportInvertEnabled[viewportId] ?? false}
                    overlaySettings={viewerSettings.viewportOverlay}
                    annotationCommand={annotationCommand}
                    isSelected={selectedViewportId === viewportId}
                    onSelect={setSelectedViewportId}
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
