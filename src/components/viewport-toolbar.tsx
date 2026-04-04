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
  getViewportMprSlabModeDefinition,
  getViewportMprSlabModeDefinitions,
  VIEWPORT_MPR_SLAB_THICKNESS_PRESETS,
  type ViewportMprSlabMode,
  type ViewportMprSlabState,
} from "@/lib/viewports/mpr-slab";
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
  type ViewportToolbarMenu,
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
  mprSlabState: ViewportMprSlabState;
  cineState: ViewportCineState;
  cineEnabled: boolean;
  keyImageEnabled: boolean;
  keyImageActive: boolean;
  keyImageCount: number;
  keyImageListEnabled: boolean;
  sequenceSyncState: ViewportSequenceSyncState;
  crossStudyCalibrationCount: number;
  referenceLinesEnabled: boolean;
  invertEnabled: boolean;
  annotationCount: number;
  selectedAnnotationCount: number;
  viewCommandsEnabled: boolean;
  onToolChange: (tool: ViewportTool) => void;
  onLayoutChange: (layoutId: ViewportLayoutId) => void;
  onImageLayoutChange: (layoutId: ViewportImageLayoutId) => void;
  onMprLayoutChange: (layoutId: ViewportMprLayoutId | "off") => void;
  onMprSlabModeChange: (mode: ViewportMprSlabMode) => void;
  onMprSlabThicknessChange: (thickness: number) => void;
  onMprSlabOpenCustomThickness: () => void;
  onMprSlabReset: () => void;
  onMprSlabApplyToAll: () => void;
  onMprSlabApplyToLinked: () => void;
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
  onHistoryAction: (action: "undo" | "redo") => void;
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

interface ViewportToolbarMenuRenderState {
  viewportMode: ViewportMode;
  currentImageLayout: ReturnType<typeof getViewportImageLayoutDefinition>;
  currentLayout: ReturnType<typeof getViewportLayoutDefinition>;
  currentMprLayout: ReturnType<typeof getViewportMprLayoutDefinition>;
  currentMprSlabMode: ReturnType<typeof getViewportMprSlabModeDefinition>;
  cineState: ViewportCineState;
  mprSlabState: ViewportMprSlabState;
  sequenceSyncState: ViewportSequenceSyncState;
  crossStudyCalibrationCount: number;
  selectedAnnotationCount: number;
}

const TOOL_MENU_OVERLAY_CLASS_NAME =
  "viewport-toolbar-dropdown viewport-toolbar-dropdown-tool-menu";

const MENU_CONFIG_BY_ID: Record<
  ViewportToolbarMenu,
  {
    buttonTestId: string;
    overlayClassName?: string;
  }
> = {
  windowPreset: {
    buttonTestId: "viewport-window-preset-button",
    overlayClassName: TOOL_MENU_OVERLAY_CLASS_NAME,
  },
  cine: {
    buttonTestId: "viewport-cine-button",
    overlayClassName: TOOL_MENU_OVERLAY_CLASS_NAME,
  },
  layout: {
    buttonTestId: "viewport-layout-button",
    overlayClassName: "viewport-toolbar-dropdown viewport-toolbar-dropdown-layout",
  },
  imageLayout: {
    buttonTestId: "viewport-image-layout-button",
    overlayClassName:
      "viewport-toolbar-dropdown viewport-toolbar-dropdown-image-layout",
  },
  mprLayout: {
    buttonTestId: "viewport-mpr-layout-button",
    overlayClassName:
      "viewport-toolbar-dropdown viewport-toolbar-dropdown-mpr-layout",
  },
  mprSlab: {
    buttonTestId: "viewport-mpr-slab-button",
    overlayClassName: TOOL_MENU_OVERLAY_CLASS_NAME,
  },
  sequenceSync: {
    buttonTestId: "viewport-sequence-sync-button",
    overlayClassName: TOOL_MENU_OVERLAY_CLASS_NAME,
  },
  annotationManage: {
    buttonTestId: "viewport-annotation-manage-button",
  },
};

const MPR_DISABLED_MENU_IDS = new Set<ViewportToolbarMenu>([
  "windowPreset",
  "cine",
  "imageLayout",
  "sequenceSync",
  "annotationManage",
]);

function getToolbarItemIconName(
  item: ViewportToolbarItemDefinition,
  groupSelections: ViewportToolGroupSelections,
): ViewportToolbarIconName {
  if (item.kind === "group") {
    return getViewportToolGroupSelection(item.id, groupSelections);
  }

  return item.id;
}

function getViewportToolbarMenuCount(
  menuId: ViewportToolbarMenu,
  {
    selectedAnnotationCount,
    sequenceSyncState,
    crossStudyCalibrationCount,
  }: Pick<
    ViewportToolbarMenuRenderState,
    | "selectedAnnotationCount"
    | "sequenceSyncState"
    | "crossStudyCalibrationCount"
  >,
) {
  if (menuId === "annotationManage" && selectedAnnotationCount > 0) {
    return selectedAnnotationCount;
  }

  if (
    menuId === "sequenceSync" &&
    sequenceSyncState.crossStudy &&
    crossStudyCalibrationCount > 0
  ) {
    return crossStudyCalibrationCount;
  }

  return null;
}

function getViewportToolbarMenuTitle(
  menuId: ViewportToolbarMenu,
  {
    viewportMode,
    currentImageLayout,
    currentLayout,
    currentMprLayout,
    currentMprSlabMode,
    cineState,
    mprSlabState,
    sequenceSyncState,
    crossStudyCalibrationCount,
  }: Omit<ViewportToolbarMenuRenderState, "selectedAnnotationCount">,
) {
  switch (menuId) {
    case "windowPreset":
      return "窗宽预设";
    case "cine":
      return `${
        cineState.isPlaying ? "Cine 播放中" : "Cine 已暂停"
      } · ${cineState.fps} FPS · ${cineState.loop ? "循环" : "单次"}`;
    case "imageLayout":
      return `图像布局 ${currentImageLayout.label} · ${currentImageLayout.description}`;
    case "mprLayout":
      return viewportMode === "mpr"
        ? `MPR ${currentMprLayout.label} · ${currentMprLayout.description}`
        : "MPR 已关闭";
    case "mprSlab":
      return viewportMode === "mpr"
        ? `投影 ${currentMprSlabMode.label} · ${mprSlabState.thickness} mm`
        : "仅在 MPR 视图可用";
    case "sequenceSync":
      return sequenceSyncState.crossStudy && crossStudyCalibrationCount > 0
        ? `${getViewportSequenceSyncStateLabel(sequenceSyncState)} · 已校准 ${crossStudyCalibrationCount} 对`
        : getViewportSequenceSyncStateLabel(sequenceSyncState);
    case "layout":
      return `布局 ${currentLayout.label} · ${currentLayout.description}`;
    case "annotationManage":
      return "删除图元";
  }
}

function isViewportToolbarMenuToggled(
  menuId: ViewportToolbarMenu,
  {
    cineState,
    mprSlabState,
    sequenceSyncState,
  }: Pick<
    ViewportToolbarMenuRenderState,
    "cineState" | "mprSlabState" | "sequenceSyncState"
  >,
) {
  switch (menuId) {
    case "cine":
      return cineState.isPlaying;
    case "mprSlab":
      return mprSlabState.mode !== "none";
    case "sequenceSync":
      return hasEnabledViewportSequenceSync(sequenceSyncState);
    default:
      return false;
  }
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
    if (item.kind === "menu" && item.id === "mprSlab") {
      return true;
    }

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
    return MPR_DISABLED_MENU_IDS.has(item.id);
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
  mprSlabState,
  cineState,
  cineEnabled,
  keyImageEnabled,
  keyImageActive,
  keyImageCount,
  keyImageListEnabled,
  sequenceSyncState,
  crossStudyCalibrationCount,
  referenceLinesEnabled,
  invertEnabled,
  annotationCount,
  selectedAnnotationCount,
  viewCommandsEnabled,
  onToolChange,
  onLayoutChange,
  onImageLayoutChange,
  onMprLayoutChange,
  onMprSlabModeChange,
  onMprSlabThicknessChange,
  onMprSlabOpenCustomThickness,
  onMprSlabReset,
  onMprSlabApplyToAll,
  onMprSlabApplyToLinked,
  onCineTogglePlay,
  onCineSetFps,
  onCineToggleLoop,
  onSequenceSyncToggle,
  onSequenceSyncClear,
  onWindowPresetSelect,
  onViewAction,
  onAction,
  onHistoryAction,
  onAnnotationManageAction,
  onOpenKeyImageList,
  onOpenSettings,
  disabled = false,
}: ViewportToolbarProps) {
  const [sequenceSyncMenuOpen, setSequenceSyncMenuOpen] = useState(false);
  const currentImageLayout = getViewportImageLayoutDefinition(imageLayoutId);
  const currentLayout = getViewportLayoutDefinition(layoutId);
  const currentMprLayout = getViewportMprLayoutDefinition(mprLayoutId);
  const currentMprSlabMode = getViewportMprSlabModeDefinition(mprSlabState.mode);
  const hasPresetMprSlabThickness = VIEWPORT_MPR_SLAB_THICKNESS_PRESETS.includes(
    mprSlabState.thickness as (typeof VIEWPORT_MPR_SLAB_THICKNESS_PRESETS)[number],
  );
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
  const mprSlabMenu: MenuProps = {
    selectable: true,
    selectedKeys: [
      `mode:${mprSlabState.mode}`,
      `thickness:${mprSlabState.thickness}`,
    ],
    items: [
      {
        key: "mode-group",
        type: "group",
        label: "投影模式",
        children: getViewportMprSlabModeDefinitions().map((mode) => ({
          key: `mode:${mode.id}`,
          label: renderToolMenuOption({
            label: `${mode.label} · ${mode.description}`,
            iconName: "mprSlab",
            testId: `viewport-mpr-slab-mode-option-${mode.id}`,
          }),
          title: `${mode.label} · ${mode.description}`,
        })),
      },
      {
        type: "divider",
      },
      {
        key: "thickness-group",
        type: "group",
        label: "厚度",
        children: [
          ...VIEWPORT_MPR_SLAB_THICKNESS_PRESETS.map((thickness) => ({
            key: `thickness:${thickness}`,
            label: renderToolMenuOption({
              label: `${thickness} mm`,
              iconName: "mprSlab",
              testId: `viewport-mpr-slab-thickness-option-${thickness}`,
            }),
            title: `${thickness} mm`,
          })),
          ...(!hasPresetMprSlabThickness
            ? [
                {
                  key: `thickness:${mprSlabState.thickness}`,
                  label: renderToolMenuOption({
                    label: `自定义 · ${mprSlabState.thickness} mm`,
                    iconName: "mprSlab",
                    testId: "viewport-mpr-slab-thickness-option-custom-current",
                  }),
                  title: `自定义 · ${mprSlabState.thickness} mm`,
                },
              ]
            : []),
          {
            key: "action:customThickness",
            label: renderToolMenuOption({
              label: "自定义厚度…",
              iconName: "mprSlab",
              testId: "viewport-mpr-slab-action-custom-thickness",
            }),
            title: "输入自定义投影厚度",
          },
        ],
      },
      {
        type: "divider",
      },
      {
        key: "action-group",
        type: "group",
        label: "操作",
        children: [
          {
            key: "action:reset",
            label: renderToolMenuOption({
              label: "重置投影",
              iconName: "mprSlab",
              testId: "viewport-mpr-slab-action-reset",
            }),
            title: "恢复默认投影模式和厚度",
          },
          {
            key: "action:applyAll",
            label: renderToolMenuOption({
              label: "同步到所有 MPR",
              iconName: "mprSlab",
              testId: "viewport-mpr-slab-action-apply-all",
            }),
            title: "将当前投影模式和厚度同步到所有 MPR 视口",
          },
          {
            key: "action:applyLinked",
            label: renderToolMenuOption({
              label: "同步到联动 MPR",
              iconName: "mprSlab",
              testId: "viewport-mpr-slab-action-apply-linked",
            }),
            title: "将当前投影模式和厚度同步到同组联动 MPR 视口",
          },
        ],
      },
    ],
    onClick: ({ key }) => {
      const keyValue = String(key);

      if (keyValue.startsWith("mode:")) {
        onMprSlabModeChange(keyValue.slice(5) as ViewportMprSlabMode);
        return;
      }

      if (keyValue.startsWith("thickness:")) {
        const thickness = Number(keyValue.slice(10));

        if (Number.isFinite(thickness)) {
          onMprSlabThicknessChange(thickness);
        }

        return;
      }

      if (keyValue === "action:reset") {
        onMprSlabReset();
        return;
      }

      if (keyValue === "action:customThickness") {
        onMprSlabOpenCustomThickness();
        return;
      }

      if (keyValue === "action:applyAll") {
        onMprSlabApplyToAll();
        return;
      }

      if (keyValue === "action:applyLinked") {
        onMprSlabApplyToLinked();
      }
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
  const menuById: Record<ViewportToolbarMenu, MenuProps> = {
    windowPreset: windowPresetMenu,
    cine: cineMenu,
    layout: layoutMenu,
    imageLayout: imageLayoutMenu,
    mprLayout: mprLayoutMenu,
    mprSlab: mprSlabMenu,
    sequenceSync: sequenceSyncMenu,
    annotationManage: annotationManageMenu,
  };
  const menuRenderState: ViewportToolbarMenuRenderState = {
    viewportMode,
    currentImageLayout,
    currentLayout,
    currentMprLayout,
    currentMprSlabMode,
    cineState,
    mprSlabState,
    sequenceSyncState,
    crossStudyCalibrationCount,
    selectedAnnotationCount,
  };
  const annotationListDisabled = disabled || viewportMode === "mpr";
  const historyActionsDisabled = disabled || viewportMode === "mpr";

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
              const menu = menuById[item.id];
              const menuConfig = MENU_CONFIG_BY_ID[item.id];
              const count = getViewportToolbarMenuCount(
                item.id,
                menuRenderState,
              );
              const title = getViewportToolbarMenuTitle(
                item.id,
                menuRenderState,
              );
              const isToggled = isViewportToolbarMenuToggled(
                item.id,
                menuRenderState,
              );
              const controlledMenuProps =
                item.id === "sequenceSync"
                  ? {
                      open: sequenceSyncMenuOpen,
                      onOpenChange: setSequenceSyncMenuOpen,
                    }
                  : {};

              return (
                <Dropdown
                  key={item.id}
                  menu={menu}
                  trigger={["click"]}
                  overlayClassName={menuConfig.overlayClassName}
                  disabled={itemDisabled}
                  {...controlledMenuProps}
                >
                  <button
                    type="button"
                    className={`viewport-tool-button has-menu${isToggled ? " is-toggled" : ""}`}
                    data-testid={menuConfig.buttonTestId}
                    data-tool-id={item.id}
                    data-tool-kind={item.kind}
                    data-sequence-sync-state={
                      item.id === "sequenceSync"
                        ? enabledSequenceSyncTypes.join(",") || "off"
                        : undefined
                    }
                    data-mpr-slab-mode={
                      item.id === "mprSlab" ? mprSlabState.mode : undefined
                    }
                    data-mpr-slab-thickness={
                      item.id === "mprSlab"
                        ? String(mprSlabState.thickness)
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
              ((item.id === "referenceLines" && referenceLinesEnabled) ||
              ((item.id === "invert" && invertEnabled) ||
                (item.id === "keyImage" && keyImageActive)));
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
            data-testid="viewport-undo-button"
            aria-label="撤销"
            title="撤销"
            disabled={historyActionsDisabled}
            onClick={() => onHistoryAction("undo")}
          >
            <ViewportToolbarIcon
              className="viewport-toolbar-icon"
              name="undo"
            />
          </button>
          <button
            type="button"
            className="viewport-settings-button"
            data-testid="viewport-redo-button"
            aria-label="重做"
            title="重做"
            disabled={historyActionsDisabled}
            onClick={() => onHistoryAction("redo")}
          >
            <ViewportToolbarIcon
              className="viewport-toolbar-icon"
              name="redo"
            />
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
