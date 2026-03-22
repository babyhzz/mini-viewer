"use client";

import { Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useRef, useState } from "react";

import {
  ViewportToolbarIcon,
  type ViewportToolbarIconName,
} from "@/components/viewport-toolbar-icons";
import {
  getViewportImageLayoutDefinition,
  getViewportImageLayoutDefinitions,
  type ViewportImageLayoutId,
} from "@/lib/viewports/image-layouts";
import {
  getViewportLayoutDefinition,
  getViewportLayoutDefinitions,
  type ViewportLayoutId,
} from "@/lib/viewports/layouts";
import {
  getViewportToolDisplayLabel,
  getViewportToolGroupDefinition,
  getViewportToolGroupSelection,
  getViewportToolShortLabel,
  isViewportToolInGroup,
  viewportToolbarItems,
  type ViewportAction,
  type ViewportTool,
  type ViewportToolGroupSelections,
  type ViewportToolbarItemDefinition,
} from "@/lib/tools/registry";

interface ViewportToolbarProps {
  activeTool: ViewportTool;
  groupSelections: ViewportToolGroupSelections;
  layoutId: ViewportLayoutId;
  imageLayoutId: ViewportImageLayoutId;
  invertEnabled: boolean;
  annotationCount: number;
  selectedAnnotationCount: number;
  onToolChange: (tool: ViewportTool) => void;
  onLayoutChange: (layoutId: ViewportLayoutId) => void;
  onImageLayoutChange: (layoutId: ViewportImageLayoutId) => void;
  onAction: (action: ViewportAction) => void;
  onAnnotationManageAction: (
    action: "deleteSelected" | "clearAll",
  ) => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}

interface OverflowToolbarOption {
  value: string;
  label: string;
  onSelect: () => void;
}

const TOOL_BUTTON_MIN_WIDTH = 50;
const TOOL_GROUP_MIN_WIDTH = 50;
const TOOL_OVERFLOW_MIN_WIDTH = 50;

function getToolbarItemIconName(
  item: ViewportToolbarItemDefinition,
  groupSelections: ViewportToolGroupSelections,
): ViewportToolbarIconName {
  if (item.kind === "group") {
    return getViewportToolGroupSelection(item.id, groupSelections);
  }

  return item.id;
}

function getToolbarItemMinWidth(item: ViewportToolbarItemDefinition) {
  if (item.kind === "group") {
    return TOOL_GROUP_MIN_WIDTH;
  }

  return TOOL_BUTTON_MIN_WIDTH;
}

function getVisibleItemCount(
  availableWidth: number,
  items: ViewportToolbarItemDefinition[],
) {
  if (!availableWidth || items.length === 0) {
    return items.length;
  }

  const totalWidth = items.reduce(
    (sum, item) => sum + getToolbarItemMinWidth(item),
    0,
  );

  if (totalWidth <= availableWidth) {
    return items.length;
  }

  const maxVisibleWidth = Math.max(0, availableWidth - TOOL_OVERFLOW_MIN_WIDTH);
  let consumedWidth = 0;
  let visibleCount = 0;

  for (const item of items) {
    const itemWidth = getToolbarItemMinWidth(item);

    if (consumedWidth + itemWidth > maxVisibleWidth) {
      break;
    }

    consumedWidth += itemWidth;
    visibleCount += 1;
  }

  return visibleCount;
}

function buildOverflowOptions(
  items: ViewportToolbarItemDefinition[],
  onToolChange: (tool: ViewportTool) => void,
  onLayoutChange: (layoutId: ViewportLayoutId) => void,
  onImageLayoutChange: (layoutId: ViewportImageLayoutId) => void,
  onAction: (action: ViewportAction) => void,
  onAnnotationManageAction: (
    action: "deleteSelected" | "clearAll",
  ) => void,
) {
  const options: OverflowToolbarOption[] = [];

  for (const item of items) {
    if (item.kind === "tool") {
      options.push({
        value: item.id,
        label: item.label,
        onSelect: () => onToolChange(item.id),
      });
      continue;
    }

    if (item.kind === "action") {
      options.push({
        value: item.id,
        label: item.label,
        onSelect: () => onAction(item.id),
      });
      continue;
    }

    if (item.kind === "menu") {
      if (item.id === "imageLayout") {
        for (const layout of getViewportImageLayoutDefinitions()) {
          options.push({
            value: `${item.id}:${layout.id}`,
            label: `${item.label} · ${layout.label}`,
            onSelect: () => onImageLayoutChange(layout.id),
          });
        }

        continue;
      }

      if (item.id === "layout") {
        for (const layout of getViewportLayoutDefinitions()) {
          options.push({
            value: `${item.id}:${layout.id}`,
            label: `${item.label} · ${layout.label}`,
            onSelect: () => onLayoutChange(layout.id),
          });
        }

        continue;
      }

      options.push({
        value: `${item.id}:deleteSelected`,
        label: "删除图元 · 删除选中",
        onSelect: () => onAnnotationManageAction("deleteSelected"),
      });
      options.push({
        value: `${item.id}:clearAll`,
        label: "删除图元 · 清空全部",
        onSelect: () => onAnnotationManageAction("clearAll"),
      });
      continue;
    }

    const groupDefinition = getViewportToolGroupDefinition(item.id);

    for (const toolId of groupDefinition.toolIds) {
      options.push({
        value: `${item.id}:${toolId}`,
        label: `${groupDefinition.label} · ${getViewportToolShortLabel(toolId)}`,
        onSelect: () => onToolChange(toolId),
      });
    }
  }

  return options;
}

export function ViewportToolbar({
  activeTool,
  groupSelections,
  layoutId,
  imageLayoutId,
  invertEnabled,
  annotationCount,
  selectedAnnotationCount,
  onToolChange,
  onLayoutChange,
  onImageLayoutChange,
  onAction,
  onAnnotationManageAction,
  onOpenSettings,
  disabled = false,
}: ViewportToolbarProps) {
  const itemsRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [overflowSelection, setOverflowSelection] = useState("");

  useEffect(() => {
    const element = itemsRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      setAvailableWidth(Math.round(element.clientWidth));
    };

    updateWidth();

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const visibleItemCount = getVisibleItemCount(availableWidth, viewportToolbarItems);
  const visibleItems = viewportToolbarItems.slice(0, visibleItemCount);
  const overflowItems = viewportToolbarItems.slice(visibleItemCount);
  const overflowOptions = buildOverflowOptions(
    overflowItems,
    onToolChange,
    onLayoutChange,
    onImageLayoutChange,
    onAction,
    onAnnotationManageAction,
  );
  const currentImageLayout = getViewportImageLayoutDefinition(imageLayoutId);
  const currentLayout = getViewportLayoutDefinition(layoutId);
  const imageLayoutMenu: MenuProps = {
    selectable: true,
    selectedKeys: [imageLayoutId],
    items: getViewportImageLayoutDefinitions().map((layout) => ({
      key: layout.id,
      label: (
        <span data-testid={`viewport-image-layout-option-${layout.id}`}>
          {layout.label} · {layout.description}
        </span>
      ),
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
      label: (
        <span data-testid={`viewport-layout-option-${layout.id}`}>
          {layout.label} · {layout.description}
        </span>
      ),
    })),
    onClick: ({ key }) => {
      onLayoutChange(key as ViewportLayoutId);
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
            {annotationCount > 0
              ? `清空全部 (${annotationCount})`
              : "清空全部"}
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

  return (
    <div className="viewport-toolbar" data-testid="viewport-toolbar">
      <div className="viewport-toolbar-main">
        <div className="viewport-toolbar-tools" ref={itemsRef}>
          {visibleItems.map((item) => {
            if (item.kind === "group") {
              const groupDefinition = getViewportToolGroupDefinition(item.id);
              const selectedTool = getViewportToolGroupSelection(
                item.id,
                groupSelections,
              );
              const isActiveGroup = isViewportToolInGroup(activeTool, item.id);
              const selectedToolLabel = getViewportToolDisplayLabel(selectedTool);

              return (
                <div
                  key={item.id}
                  className={`viewport-tool-group${isActiveGroup ? " is-active" : ""}${disabled ? " is-disabled" : ""}`}
                  data-testid={`viewport-tool-group-${item.id}`}
                >
                  <button
                    type="button"
                    className="viewport-tool-group-trigger"
                    data-testid={`viewport-tool-group-${item.id}-trigger`}
                    aria-pressed={isActiveGroup}
                    aria-label={selectedToolLabel}
                    title={selectedToolLabel}
                    disabled={disabled}
                    onClick={() => onToolChange(selectedTool)}
                  >
                    <ViewportToolbarIcon
                      className="viewport-toolbar-icon"
                      name={getToolbarItemIconName(item, groupSelections)}
                    />
                  </button>
                  <div className="viewport-tool-group-picker">
                    <span
                      className="viewport-tool-group-picker-indicator"
                      aria-hidden="true"
                    />
                    <select
                      className="viewport-tool-group-select"
                      aria-label={`${groupDefinition.label}工具选择`}
                      data-testid={`viewport-tool-group-${item.id}-select`}
                      value={selectedTool}
                      disabled={disabled}
                      onChange={(event) => {
                        onToolChange(event.target.value as ViewportTool);
                      }}
                    >
                      {groupDefinition.toolIds.map((toolId) => (
                        <option key={toolId} value={toolId}>
                          {getViewportToolShortLabel(toolId)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            }

            if (item.kind === "menu") {
              const menu =
                item.id === "imageLayout"
                  ? imageLayoutMenu
                  : item.id === "layout"
                    ? layoutMenu
                    : annotationManageMenu;
              const dataTestId =
                item.id === "imageLayout"
                  ? "viewport-image-layout-button"
                  : item.id === "layout"
                  ? "viewport-layout-button"
                  : "viewport-annotation-manage-button";
              const count =
                item.id === "annotationManage" && selectedAnnotationCount > 0
                  ? selectedAnnotationCount
                  : null;
              const title =
                item.id === "imageLayout"
                  ? `图像布局 ${currentImageLayout.label} · ${currentImageLayout.description}`
                  : item.id === "layout"
                  ? `布局 ${currentLayout.label} · ${currentLayout.description}`
                  : "删除图元";

              return (
                <Dropdown
                  key={item.id}
                  menu={menu}
                  trigger={["click"]}
                  disabled={disabled}
                >
                  <button
                    type="button"
                    className="viewport-tool-button has-menu"
                    data-testid={dataTestId}
                    data-tool-id={item.id}
                    data-tool-kind={item.kind}
                    aria-label={item.label}
                    title={title}
                    disabled={disabled}
                  >
                    <ViewportToolbarIcon
                      className="viewport-toolbar-icon"
                      name={getToolbarItemIconName(item, groupSelections)}
                    />
                    {count ? (
                      <span className="viewport-utility-count">{count}</span>
                    ) : null}
                    <span className="viewport-menu-indicator" aria-hidden="true" />
                  </button>
                </Dropdown>
              );
            }

            const isCurrentTool = item.kind === "tool" && activeTool === item.id;
            const isToggledAction =
              item.kind === "action" && item.id === "invert" && invertEnabled;
            const count =
              item.kind === "action" &&
              item.id === "annotationList" &&
              annotationCount > 0
                ? annotationCount
                : null;
            const dataTestId =
              item.kind === "action" && item.id === "annotationList"
                ? "viewport-annotation-list-button"
                : `viewport-tool-${item.id}`;

            return (
              <button
                key={item.id}
                type="button"
                className={`viewport-tool-button${isCurrentTool ? " is-active" : ""}${isToggledAction ? " is-toggled" : ""}`}
                data-testid={dataTestId}
                data-tool-id={item.id}
                data-tool-kind={item.kind}
                aria-pressed={item.kind === "tool" ? isCurrentTool : isToggledAction}
                aria-label={item.label}
                title={item.label}
                disabled={disabled}
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
                {count ? (
                  <span className="viewport-utility-count">{count}</span>
                ) : null}
              </button>
            );
          })}
          {overflowOptions.length ? (
            <div
              className="viewport-tool-overflow"
              data-testid="viewport-tool-overflow"
              title="更多工具"
            >
              <ViewportToolbarIcon
                className="viewport-toolbar-icon"
                name="overflow"
              />
              <select
                className="viewport-tool-overflow-select"
                aria-label="更多工具"
                title="更多工具"
                value={overflowSelection}
                disabled={disabled}
                onChange={(event) => {
                  const option = overflowOptions.find(
                    (entry) => entry.value === event.target.value,
                  );

                  option?.onSelect();
                  setOverflowSelection("");
                }}
              >
                <option value="" disabled>
                  更多工具
                </option>
                {overflowOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        <div className="viewport-toolbar-divider" aria-hidden="true" />
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
  );
}
