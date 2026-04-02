"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";

import {
  ViewportToolbarIcon,
  type ViewportToolbarIconName,
} from "@/components/viewport-toolbar-icons";
import {
  VIEWPORT_CINE_FPS_PRESETS,
  type ViewportCineFpsPreset,
  type ViewportCineState,
} from "@/lib/viewports/cine";
import {
  getEnabledViewportSequenceSyncTypes,
  getViewportSequenceSyncStateLabel,
  hasEnabledViewportSequenceSync,
  type ViewportSequenceSyncState,
  type ViewportSequenceSyncType,
} from "@/lib/viewports/sequence-sync";
import {
  getViewportImageLayoutDefinition,
  getViewportImageLayoutDefinitions,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  getViewportMprLayoutDefinition,
  getViewportMprLayoutDefinitions,
  type ViewportMode,
  type ViewportMprLayoutId,
} from "@/lib/viewports/mpr-layouts";
import {
  getViewportLayoutDefinition,
  getViewportLayoutDefinitions,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
import {
  getViewportToolDisplayLabel,
  getViewportToolGroupDefinition,
  getViewportToolGroupSelection,
  isViewportToolSupportedInMpr,
  isViewportToolInGroup,
  viewportToolbarItems,
  type ViewportAction,
  type ViewportTool,
  type ViewportToolGroupSelections,
  type ViewportToolbarItemDefinition,
} from "@/lib/tools/registry";
import {
  getViewportWindowPresetDefinitions,
  type ViewportWindowPresetId,
} from "@/lib/viewports/view-commands";

interface ViewportToolbarProps {
  activeTool: ViewportTool;
  groupSelections: ViewportToolGroupSelections;
  viewportMode: ViewportMode;
  layoutId: ViewportLayoutId;
  imageLayoutId: ViewportImageLayoutId;
  mprLayoutId: ViewportMprLayoutId;
  cineState: ViewportCineState;
  cineEnabled: boolean;
  keyImageEnabled: boolean;
  keyImageActive: boolean;
  keyImageCount: number;
  keyImageListEnabled: boolean;
  sequenceSyncState: ViewportSequenceSyncState;
  crossStudyCalibrationCount: number;
  invertEnabled: boolean;
  annotationCount: number;
  selectedAnnotationCount: number;
  viewCommandsEnabled: boolean;
  onToolChange: (tool: ViewportTool) => void;
  onLayoutChange: (layoutId: ViewportLayoutId) => void;
  onImageLayoutChange: (layoutId: ViewportImageLayoutId) => void;
  onMprLayoutChange: (layoutId: ViewportMprLayoutId | "off") => void;
  onCineTogglePlay: () => void;
  onCineSetFps: (fps: ViewportCineFpsPreset) => void;
  onCineToggleLoop: () => void;
  onSequenceSyncToggle: (syncType: ViewportSequenceSyncType) => void;
  onSequenceSyncClear: () => void;
  onWindowPresetSelect: (presetId: ViewportWindowPresetId) => void;
  onViewAction: (
    action: "fit" | "reset" | "rotateRight" | "flipHorizontal" | "flipVertical",
  ) => void;
  onAction: (action: ViewportAction) => void;
  onAnnotationManageAction: (action: "deleteSelected" | "clearAll") => void;
  onOpenKeyImageList: () => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}

interface LayoutPreviewCell {
  column: number;
  row: number;
  columnSpan?: number;
  rowSpan?: number;
  tone?: "neutral" | "axial" | "coronal" | "sagittal" | "inactive";
}

function getToolbarItemIconName(
  item: ViewportToolbarItemDefinition,
  groupSelections: ViewportToolGroupSelections,
): ViewportToolbarIconName {
  if (item.kind === "group") {
    return getViewportToolGroupSelection(item.id, groupSelections);
  }

  return item.id;
}

function createUniformPreviewCells(rows: number, columns: number) {
  const cells: LayoutPreviewCell[] = [];

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      cells.push({
        column,
        row,
        tone: "neutral",
      });
    }
  }

  return cells;
}

function getMprPaneTone(paneId: "axial" | "coronal" | "sagittal") {
  if (paneId === "axial") {
    return "axial";
  }

  if (paneId === "coronal") {
    return "coronal";
  }

  return "sagittal";
}

function renderLayoutMenuOption({
  label,
  description,
  rows,
  columns,
  cells,
  testId,
  inactive = false,
}: {
  label: string;
  description: string;
  rows: number;
  columns: number;
  cells: LayoutPreviewCell[];
  testId: string;
  inactive?: boolean;
}) {
  return (
    <div
      className="viewport-layout-menu-option"
      data-testid={testId}
      title={`${label} · ${description}`}
      aria-label={`${label} · ${description}`}
    >
      <div
        className={`viewport-layout-preview${inactive ? " is-inactive" : ""}`}
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((cell, index) => (
          <div
            key={`${testId}-${index}`}
            className={`viewport-layout-preview-cell is-${cell.tone ?? "neutral"}`}
            style={{
              gridColumn: `${cell.column} / span ${cell.columnSpan ?? 1}`,
              gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
            }}
          />
        ))}
        {inactive ? <div className="viewport-layout-preview-slash" /> : null}
      </div>
      <span className="viewport-sr-only">
        {label} · {description}
      </span>
    </div>
  );
}

function renderToolMenuOption({
  label,
  iconName,
  testId,
}: {
  label: string;
  iconName?: ViewportToolbarIconName;
  testId?: string;
}) {
  return (
    <span className="viewport-tool-menu-option" data-testid={testId}>
      {iconName ? (
        <ViewportToolbarIcon
          className="viewport-tool-menu-option-icon"
          name={iconName}
        />
      ) : null}
      <span className="viewport-tool-menu-option-label">{label}</span>
    </span>
  );
}

function isToolbarItemModeDisabled(
  item: ViewportToolbarItemDefinition,
  viewportMode: ViewportMode,
  viewCommandsEnabled: boolean,
  cineEnabled: boolean,
  keyImageEnabled: boolean,
) {
  if (item.kind === "menu" && item.id === "cine" && !cineEnabled) {
    return true;
  }

  if (item.kind === "action" && item.id === "keyImage" && !keyImageEnabled) {
    return true;
  }

  if (viewportMode !== "mpr") {
    if (
      !viewCommandsEnabled &&
      ((item.kind === "menu" && item.id === "windowPreset") ||
        item.kind === "viewAction")
    ) {
      return true;
    }

    return false;
  }

  if (item.kind === "group") {
    return item.id === "measure" || item.id === "roi";
  }

  if (item.kind === "tool") {
    return !isViewportToolSupportedInMpr(item.id);
  }

  if (item.kind === "action") {
    return false;
  }

  if (item.kind === "viewAction") {
    return true;
  }

  if (item.kind === "menu") {
    return (
      item.id === "windowPreset" ||
      item.id === "cine" ||
      item.id === "imageLayout" ||
      item.id === "sequenceSync" ||
      item.id === "annotationManage"
    );
  }

  return false;
}

export function ViewportToolbar({
  activeTool,
  groupSelections,
  viewportMode,
  layoutId,
  imageLayoutId,
  mprLayoutId,
  cineState,
  cineEnabled,
  keyImageEnabled,
  keyImageActive,
  keyImageCount,
  keyImageListEnabled,
  sequenceSyncState,
  crossStudyCalibrationCount,
  invertEnabled,
  annotationCount,
  selectedAnnotationCount,
  viewCommandsEnabled,
  onToolChange,
  onLayoutChange,
  onImageLayoutChange,
  onMprLayoutChange,
  onCineTogglePlay,
  onCineSetFps,
  onCineToggleLoop,
  onSequenceSyncToggle,
  onSequenceSyncClear,
  onWindowPresetSelect,
  onViewAction,
  onAction,
  onAnnotationManageAction,
  onOpenKeyImageList,
  onOpenSettings,
  disabled = false,
}: ViewportToolbarProps) {
  const [sequenceSyncMenuOpen, setSequenceSyncMenuOpen] = useState(false);
  const currentImageLayout = getViewportImageLayoutDefinition(imageLayoutId);
  const currentLayout = getViewportLayoutDefinition(layoutId);
  const currentMprLayout = getViewportMprLayoutDefinition(mprLayoutId);
  const enabledSequenceSyncTypes =
    getEnabledViewportSequenceSyncTypes(sequenceSyncState);
  const mprLayoutMenuValue = viewportMode === "mpr" ? mprLayoutId : "off";
  const windowPresetMenu: MenuProps = {
    items: getViewportWindowPresetDefinitions().map((preset) => ({
      key: preset.id,
      label: renderToolMenuOption({
        label:
          preset.windowWidth != null && preset.windowCenter != null
            ? `${preset.label} · WW ${preset.windowWidth} / WL ${preset.windowCenter}`
            : preset.label,
        iconName: "windowPreset",
        testId: `viewport-window-preset-option-${preset.id}`,
      }),
      title: `${preset.label} · ${preset.description}`,
    })),
    onClick: ({ key }) => {
      onWindowPresetSelect(key as ViewportWindowPresetId);
    },
  };
  const imageLayoutMenu: MenuProps = {
    selectable: true,
    selectedKeys: [imageLayoutId],
    items: getViewportImageLayoutDefinitions().map((layout) => ({
      key: layout.id,
      className: "viewport-layout-menu-item",
      label: renderLayoutMenuOption({
        label: layout.label,
        description: layout.description,
        rows: layout.rows,
        columns: layout.columns,
        cells: createUniformPreviewCells(layout.rows, layout.columns),
        testId: `viewport-image-layout-option-${layout.id}`,
      }),
    })),
    onClick: ({ key }) => {
      onImageLayoutChange(key as ViewportImageLayoutId);
    },
  };
  const layoutMenu: MenuProps = {
    selectable: true,
    selectedKeys: [layoutId],
    items: getViewportLayoutDefinitions().map((layout) => ({
      key: layout.id,
      className: "viewport-layout-menu-item",
      label: renderLayoutMenuOption({
        label: layout.label,
        description: layout.description,
        rows: layout.rows,
        columns: layout.columns,
        cells: layout.cells.map((cell) => ({
          ...cell,
          tone: "neutral",
        })),
        testId: `viewport-layout-option-${layout.id}`,
      }),
    })),
    onClick: ({ key }) => {
      onLayoutChange(key as ViewportLayoutId);
    },
  };
  const mprLayoutMenu: MenuProps = {
    selectable: true,
    selectedKeys: [mprLayoutMenuValue],
    items: [
      {
        key: "off",
        className: "viewport-layout-menu-item",
        label: renderLayoutMenuOption({
          label: "关闭 MPR",
          description: "返回普通堆栈视图",
          rows: 1,
          columns: 1,
          cells: [
            {
              column: 1,
              row: 1,
              tone: "inactive",
            },
          ],
          testId: "viewport-mpr-layout-option-off",
          inactive: true,
        }),
      },
      ...getViewportMprLayoutDefinitions().map((layout) => ({
        key: layout.id,
        className: "viewport-layout-menu-item",
        label: renderLayoutMenuOption({
          label: layout.label,
          description: layout.description,
          rows: layout.rows,
          columns: layout.columns,
          cells: layout.panes.map((pane) => ({
            column: pane.column,
            row: pane.row,
            columnSpan: pane.columnSpan,
            rowSpan: pane.rowSpan,
            tone: getMprPaneTone(pane.id),
          })),
          testId: `viewport-mpr-layout-option-${layout.id}`,
        }),
      })),
    ],
    onClick: ({ key }) => {
      onMprLayoutChange(key as ViewportMprLayoutId | "off");
    },
  };
  const cineMenu: MenuProps = {
    selectable: true,
    selectedKeys: [`fps:${cineState.fps}`],
    items: [
      {
        key: "toggle",
        label: renderToolMenuOption({
          label: cineState.isPlaying ? "暂停播放" : "开始播放",
          iconName: "cine",
          testId: "viewport-cine-option-toggle",
        }),
      },
      {
        key: "loop",
        label: renderToolMenuOption({
          label: cineState.loop ? "循环播放 · 开" : "循环播放 · 关",
          iconName: "cine",
          testId: "viewport-cine-option-loop",
        }),
      },
      {
        type: "divider",
      },
      ...VIEWPORT_CINE_FPS_PRESETS.map((fps) => ({
        key: `fps:${fps}`,
        label: renderToolMenuOption({
          label: `${fps} FPS`,
          iconName: "cine",
          testId: `viewport-cine-option-fps-${fps}`,
        }),
      })),
    ],
    onClick: ({ key }) => {
      if (key === "toggle") {
        onCineTogglePlay();
        return;
      }

      if (key === "loop") {
        onCineToggleLoop();
        return;
      }

      if (String(key).startsWith("fps:")) {
        onCineSetFps(Number(String(key).slice(4)) as ViewportCineFpsPreset);
      }
    },
  };
  const sequenceSyncMenu: MenuProps = {
    selectable: true,
    multiple: true,
    selectedKeys: enabledSequenceSyncTypes,
    items: [
      {
        key: "sameStudy",
        label: renderToolMenuOption({
          label: "同检查同步",
          iconName: "sequenceSync",
          testId: "viewport-sequence-sync-option-sameStudy",
        }),
      },
      {
        key: "crossStudy",
        label: renderToolMenuOption({
          label: "跨检查同步",
          iconName: "sequenceSync",
          testId: "viewport-sequence-sync-option-crossStudy",
        }),
      },
      {
        key: "display",
        label: renderToolMenuOption({
          label: "显示同步",
          iconName: "sequenceSync",
          testId: "viewport-sequence-sync-option-display",
        }),
      },
      {
        type: "divider",
      },
      {
        key: "clear",
        label: renderToolMenuOption({
          label: "全部关闭",
          iconName: "sequenceSync",
          testId: "viewport-sequence-sync-option-clear",
        }),
      },
    ],
    onSelect: ({ key }) => {
      if (key === "clear") {
        return;
      }

      onSequenceSyncToggle(key as ViewportSequenceSyncType);
      setSequenceSyncMenuOpen(false);
    },
    onDeselect: ({ key }) => {
      onSequenceSyncToggle(key as ViewportSequenceSyncType);
      setSequenceSyncMenuOpen(false);
    },
    onClick: ({ key }) => {
      if (key === "clear") {
        onSequenceSyncClear();
        setSequenceSyncMenuOpen(false);
      }
    },
  };
  const annotationManageMenu: MenuProps = {
    items: [
      {
        key: "deleteSelected",
        label: (
          <span data-testid="viewport-annotation-delete-selected">
            {selectedAnnotationCount > 0
              ? `删除选中 (${selectedAnnotationCount})`
              : "删除选中"}
          </span>
        ),
        disabled: selectedAnnotationCount === 0,
      },
      {
        key: "clearAll",
        label: (
          <span data-testid="viewport-annotation-clear-all">
            {annotationCount > 0 ? `清空全部 (${annotationCount})` : "清空全部"}
          </span>
        ),
        disabled: annotationCount === 0,
        danger: true,
      },
    ],
    onClick: ({ key }) => {
      onAnnotationManageAction(key as "deleteSelected" | "clearAll");
    },
  };
  const annotationListDisabled = disabled || viewportMode === "mpr";

  return (
    <div className="viewport-toolbar" data-testid="viewport-toolbar">
      <div className="viewport-toolbar-main">
        <div className="viewport-toolbar-tools">
          {viewportToolbarItems.map((item) => {
            const itemDisabled =
              disabled ||
              isToolbarItemModeDisabled(
                item,
                viewportMode,
                viewCommandsEnabled,
                cineEnabled,
                keyImageEnabled,
              );

            if (item.kind === "group") {
              const groupDefinition = getViewportToolGroupDefinition(item.id);
              const selectedTool = getViewportToolGroupSelection(
                item.id,
                groupSelections,
              );
              const isActiveGroup = isViewportToolInGroup(activeTool, item.id);
              const selectedToolLabel =
                getViewportToolDisplayLabel(selectedTool);
              const groupMenu: MenuProps = {
                selectable: true,
                selectedKeys: [selectedTool],
                items: groupDefinition.toolIds.map((toolId) => ({
                  key: toolId,
                  label: renderToolMenuOption({
                    label: getViewportToolDisplayLabel(toolId),
                    iconName: toolId,
                    testId: `viewport-tool-group-${item.id}-option-${toolId}`,
                  }),
                })),
                onClick: ({ key }) => {
                  onToolChange(key as ViewportTool);
                },
              };

              return (
                <div
                  key={item.id}
                  className={`viewport-tool-group${isActiveGroup ? " is-active" : ""}${itemDisabled ? " is-disabled" : ""}`}
                  data-testid={`viewport-tool-group-${item.id}`}
                >
                  <button
                    type="button"
                    className="viewport-tool-group-trigger"
                    data-testid={`viewport-tool-group-${item.id}-trigger`}
                    aria-pressed={isActiveGroup}
                    aria-label={selectedToolLabel}
                    title={selectedToolLabel}
                    disabled={itemDisabled}
                    onClick={() => onToolChange(selectedTool)}
                  >
                    <ViewportToolbarIcon
                      className="viewport-toolbar-icon"
                      name={getToolbarItemIconName(item, groupSelections)}
                    />
                  </button>
                  <Dropdown
                    menu={groupMenu}
                    trigger={["click"]}
                    overlayClassName="viewport-toolbar-dropdown viewport-toolbar-dropdown-tool-menu"
                    disabled={itemDisabled}
                  >
                    <button
                      type="button"
                      className="viewport-tool-group-picker"
                      aria-label={`${groupDefinition.label}工具选择`}
                      data-testid={`viewport-tool-group-${item.id}-select`}
                      title={`${groupDefinition.label}工具选择`}
                      disabled={itemDisabled}
                    >
                      <span
                        className="viewport-tool-group-picker-indicator"
                        aria-hidden="true"
                      />
                    </button>
                  </Dropdown>
                </div>
              );
            }

            if (item.kind === "menu") {
              const menu =
                item.id === "windowPreset"
                  ? windowPresetMenu
                  : item.id === "cine"
                    ? cineMenu
                  : item.id === "imageLayout"
                      ? imageLayoutMenu
                      : item.id === "mprLayout"
                        ? mprLayoutMenu
                        : item.id === "sequenceSync"
                          ? sequenceSyncMenu
                          : item.id === "layout"
                            ? layoutMenu
                            : annotationManageMenu;
              const dataTestId =
                item.id === "windowPreset"
                  ? "viewport-window-preset-button"
                  : item.id === "cine"
                    ? "viewport-cine-button"
                  : item.id === "imageLayout"
                      ? "viewport-image-layout-button"
                      : item.id === "mprLayout"
                        ? "viewport-mpr-layout-button"
                        : item.id === "sequenceSync"
                          ? "viewport-sequence-sync-button"
                          : item.id === "layout"
                            ? "viewport-layout-button"
                            : "viewport-annotation-manage-button";
              const count =
                item.id === "annotationManage" && selectedAnnotationCount > 0
                  ? selectedAnnotationCount
                  : item.id === "sequenceSync" &&
                      sequenceSyncState.crossStudy &&
                      crossStudyCalibrationCount > 0
                    ? crossStudyCalibrationCount
                    : null;
              const title =
                item.id === "windowPreset"
                  ? "窗宽预设"
                  : item.id === "cine"
                    ? `${
                        cineState.isPlaying ? "Cine 播放中" : "Cine 已暂停"
                      } · ${cineState.fps} FPS · ${
                        cineState.loop ? "循环" : "单次"
                      }`
                  : item.id === "imageLayout"
                      ? `图像布局 ${currentImageLayout.label} · ${currentImageLayout.description}`
                      : item.id === "mprLayout"
                        ? viewportMode === "mpr"
                          ? `MPR ${currentMprLayout.label} · ${currentMprLayout.description}`
                          : "MPR 已关闭"
                        : item.id === "sequenceSync"
                          ? sequenceSyncState.crossStudy &&
                            crossStudyCalibrationCount > 0
                            ? `${getViewportSequenceSyncStateLabel(sequenceSyncState)} · 已校准 ${crossStudyCalibrationCount} 对`
                            : getViewportSequenceSyncStateLabel(
                                sequenceSyncState,
                              )
                          : item.id === "layout"
                            ? `布局 ${currentLayout.label} · ${currentLayout.description}`
                            : "删除图元";
              const isToggled =
                (item.id === "cine" && cineState.isPlaying) ||
                (item.id === "sequenceSync" &&
                  hasEnabledViewportSequenceSync(sequenceSyncState));

              return (
                <Dropdown
                  key={item.id}
                  menu={menu}
                  trigger={["click"]}
                  open={
                    item.id === "sequenceSync"
                      ? sequenceSyncMenuOpen
                      : undefined
                  }
                  onOpenChange={
                    item.id === "sequenceSync"
                      ? setSequenceSyncMenuOpen
                      : undefined
                  }
                  overlayClassName={
                    item.id === "windowPreset"
                      ? "viewport-toolbar-dropdown viewport-toolbar-dropdown-tool-menu"
                      : item.id === "cine"
                        ? "viewport-toolbar-dropdown viewport-toolbar-dropdown-tool-menu"
                      : item.id === "imageLayout"
                          ? "viewport-toolbar-dropdown viewport-toolbar-dropdown-image-layout"
                          : item.id === "mprLayout"
                            ? "viewport-toolbar-dropdown viewport-toolbar-dropdown-mpr-layout"
                            : item.id === "sequenceSync"
                              ? "viewport-toolbar-dropdown viewport-toolbar-dropdown-tool-menu"
                              : item.id === "layout"
                                ? "viewport-toolbar-dropdown viewport-toolbar-dropdown-layout"
                                : undefined
                  }
                  disabled={itemDisabled}
                >
                  <button
                    type="button"
                    className={`viewport-tool-button has-menu${isToggled ? " is-toggled" : ""}`}
                    data-testid={dataTestId}
                    data-tool-id={item.id}
                    data-tool-kind={item.kind}
                    data-sequence-sync-state={
                      item.id === "sequenceSync"
                        ? enabledSequenceSyncTypes.join(",") || "off"
                        : undefined
                    }
                    aria-label={item.label}
                    title={title}
                    disabled={itemDisabled}
                  >
                    <ViewportToolbarIcon
                      className="viewport-toolbar-icon"
                      name={getToolbarItemIconName(item, groupSelections)}
                    />
                    {count ? (
                      <span className="viewport-utility-count">{count}</span>
                    ) : null}
                    <span
                      className="viewport-menu-indicator"
                      aria-hidden="true"
                    />
                  </button>
                </Dropdown>
              );
            }

            if (item.kind === "viewAction") {
              return (
                <button
                  key={item.id}
                  type="button"
                  className="viewport-tool-button"
                  data-testid={`viewport-view-action-${item.id}`}
                  data-tool-id={item.id}
                  data-tool-kind={item.kind}
                  aria-label={item.label}
                  title={item.label}
                  disabled={itemDisabled}
                  onClick={() => onViewAction(item.id)}
                >
                  <ViewportToolbarIcon
                    className="viewport-toolbar-icon"
                    name={getToolbarItemIconName(item, groupSelections)}
                  />
                </button>
              );
            }

            const isCurrentTool =
              item.kind === "tool" && activeTool === item.id;
            const isToggledAction =
              item.kind === "action" &&
              ((item.id === "invert" && invertEnabled) ||
                (item.id === "keyImage" && keyImageActive));
            const dataTestId = `viewport-tool-${item.id}`;

            return (
              <button
                key={item.id}
                type="button"
                className={`viewport-tool-button${isCurrentTool ? " is-active" : ""}${isToggledAction ? " is-toggled" : ""}`}
                data-testid={dataTestId}
                data-tool-id={item.id}
                data-tool-kind={item.kind}
                aria-pressed={
                  item.kind === "tool" ? isCurrentTool : isToggledAction
                }
                aria-label={item.label}
                title={item.label}
                disabled={itemDisabled}
                onClick={() => {
                  if (item.kind === "tool") {
                    onToolChange(item.id);
                    return;
                  }

                  onAction(item.id);
                }}
              >
                <ViewportToolbarIcon
                  className="viewport-toolbar-icon"
                  name={getToolbarItemIconName(item, groupSelections)}
                />
              </button>
            );
          })}
        </div>
        <div className="viewport-toolbar-utilities">
          <button
            type="button"
            className="viewport-settings-button"
            data-testid="viewport-key-image-list-button"
            aria-label="关键图像列表"
            title="关键图像列表"
            disabled={disabled || !keyImageListEnabled}
            onClick={onOpenKeyImageList}
          >
            <ViewportToolbarIcon
              className="viewport-toolbar-icon"
              name="keyImageList"
            />
            {keyImageCount > 0 ? (
              <span className="viewport-utility-count">{keyImageCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className="viewport-settings-button"
            data-testid="viewport-annotation-list-button"
            aria-label="图元列表"
            title="图元列表"
            disabled={annotationListDisabled}
            onClick={() => onAction("annotationList")}
          >
            <ViewportToolbarIcon
              className="viewport-toolbar-icon"
              name="annotationList"
            />
            {annotationCount > 0 ? (
              <span className="viewport-utility-count">{annotationCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className="viewport-settings-button"
            data-testid="viewport-settings-button"
            aria-label="设置"
            title="设置"
            disabled={disabled}
            onClick={onOpenSettings}
          >
            <ViewportToolbarIcon
              className="viewport-toolbar-icon"
              name="settings"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
