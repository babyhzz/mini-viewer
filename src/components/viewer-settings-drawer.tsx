"use client";

import {
  Alert,
  Button,
  Card,
  ColorPicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
  Segmented,
  Switch,
  Tag,
} from "antd";
import type { Color } from "antd/es/color-picker";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppIcon } from "@/components/app-icon";
import {
  cloneViewerSettings,
  createDefaultViewerSettings,
  createNewOverlayItemConfig,
  createOverlayItemId,
  OVERLAY_FONT_WEIGHT_OPTIONS,
  OVERLAY_TAG_DEFINITIONS,
  VIEWPORT_CORNER_LABELS,
} from "@/lib/settings/overlay";
import {
  areToolbarShortcutBindingsEqual,
  formatToolbarShortcutBinding,
  getToolbarShortcutBindingFromKeyboardEvent,
  TOOLBAR_SHORTCUT_CATEGORY_LABELS,
  TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS,
} from "@/lib/settings/shortcuts";
import { getViewportMprSlabModeDefinitions } from "@/lib/viewports/mpr-slab";
import type {
  OverlayCornerItemConfig,
  ToolbarShortcutBinding,
  ToolbarShortcutCommandId,
  ViewerSettings,
  ViewportCorner,
} from "@/types/settings";

interface ViewerSettingsDrawerProps {
  open: boolean;
  settings: ViewerSettings;
  onClose: () => void;
  onSave: (settings: ViewerSettings) => Promise<void>;
}

interface EditingTarget {
  corner: ViewportCorner;
  itemId: string;
}

const OVERLAY_SECTION_ID = "overlay";
const MPR_PROJECTION_SECTION_ID = "mprProjection";
const SHORTCUTS_SECTION_ID = "shortcuts";
type ShortcutCategoryId = keyof typeof TOOLBAR_SHORTCUT_CATEGORY_LABELS;
type ShortcutFilter = "all" | "customized" | "unassigned";
const VIEWPORT_CORNERS: ViewportCorner[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
];
const DEFAULT_SHORTCUT_GROUP_COLLAPSED: Record<ShortcutCategoryId, boolean> = {
  basic: false,
  measure: true,
  roi: true,
  actions: false,
};

function replaceCornerItems(
  settings: ViewerSettings,
  corner: ViewportCorner,
  items: OverlayCornerItemConfig[],
) {
  return {
    ...settings,
    viewportOverlay: {
      ...settings.viewportOverlay,
      corners: {
        ...settings.viewportOverlay.corners,
        [corner]: items,
      },
    },
  };
}

function replaceToolbarShortcuts(
  settings: ViewerSettings,
  bindings: ViewerSettings["toolbarShortcuts"]["bindings"],
) {
  return {
    ...settings,
    toolbarShortcuts: {
      ...settings.toolbarShortcuts,
      bindings,
    },
  };
}

function replaceMprProjectionSettings(
  settings: ViewerSettings,
  mprProjection: ViewerSettings["mprProjection"],
) {
  return {
    ...settings,
    mprProjection,
  };
}

function assignToolbarShortcutBinding(
  settings: ViewerSettings,
  commandId: ToolbarShortcutCommandId,
  binding: ToolbarShortcutBinding | null,
) {
  const nextBindings = {
    ...settings.toolbarShortcuts.bindings,
  };

  if (binding) {
    for (const definition of TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS) {
      if (definition.id === commandId) {
        continue;
      }

      if (areToolbarShortcutBindingsEqual(nextBindings[definition.id], binding)) {
        nextBindings[definition.id] = null;
      }
    }
  }

  nextBindings[commandId] = binding;
  return replaceToolbarShortcuts(settings, nextBindings);
}

function getTagDefinition(tagKey: OverlayCornerItemConfig["tagKey"]) {
  return OVERLAY_TAG_DEFINITIONS.find((definition) => definition.key === tagKey);
}

function findItemIndex(
  settings: ViewerSettings,
  corner: ViewportCorner,
  itemId: string,
) {
  return settings.viewportOverlay.corners[corner].findIndex(
    (item) => item.id === itemId,
  );
}

export function ViewerSettingsDrawer({
  open,
  settings,
  onClose,
  onSave,
}: ViewerSettingsDrawerProps) {
  const defaultSettings = useMemo(() => createDefaultViewerSettings(), []);
  const shortcutGroups = useMemo(() => {
    return (
      Object.entries(TOOLBAR_SHORTCUT_CATEGORY_LABELS) as Array<
        [ShortcutCategoryId, string]
      >
    ).map(
      ([categoryId, label]) => ({
        categoryId,
        label,
        items: TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.filter(
          (definition) => definition.categoryId === categoryId,
        ),
      }),
    );
  }, []);
  const mprSlabModeOptions = useMemo(
    () =>
      getViewportMprSlabModeDefinitions().map((definition) => ({
        label: definition.label,
        value: definition.id,
      })),
    [],
  );
  const [draftSettings, setDraftSettings] = useState<ViewerSettings>(() =>
    cloneViewerSettings(settings),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const [recordingShortcutId, setRecordingShortcutId] =
    useState<ToolbarShortcutCommandId | null>(null);
  const [shortcutFilter, setShortcutFilter] = useState<ShortcutFilter>("all");
  const [collapsedShortcutGroups, setCollapsedShortcutGroups] = useState<
    Record<ShortcutCategoryId, boolean>
  >(() => ({ ...DEFAULT_SHORTCUT_GROUP_COLLAPSED }));
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!open) {
      setEditingTarget(null);
      setRecordingShortcutId(null);
      return;
    }

    setDraftSettings(cloneViewerSettings(settings));
    setSaveError(null);
    setEditingTarget(null);
    setRecordingShortcutId(null);
    setShortcutFilter("all");
    setCollapsedShortcutGroups({ ...DEFAULT_SHORTCUT_GROUP_COLLAPSED });
  }, [open, settings]);

  const hasChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);
  const differsFromDefault =
    JSON.stringify(draftSettings) !== JSON.stringify(defaultSettings);
  const editingItemIndex = editingTarget
    ? findItemIndex(draftSettings, editingTarget.corner, editingTarget.itemId)
    : -1;
  const editingItem =
    editingTarget && editingItemIndex >= 0
      ? draftSettings.viewportOverlay.corners[editingTarget.corner][editingItemIndex]
      : null;

  useEffect(() => {
    if (editingTarget && !editingItem) {
      setEditingTarget(null);
    }
  }, [editingItem, editingTarget]);

  useEffect(() => {
    if (!open || !recordingShortcutId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        event.preventDefault();
        return;
      }

      const hasModifierKey =
        event.ctrlKey || event.altKey || event.shiftKey || event.metaKey;

      if (event.key === "Escape" && !hasModifierKey) {
        event.preventDefault();
        setRecordingShortcutId(null);
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        !hasModifierKey
      ) {
        event.preventDefault();
        setDraftSettings((currentSettings) =>
          assignToolbarShortcutBinding(
            currentSettings,
            recordingShortcutId,
            null,
          ),
        );
        setRecordingShortcutId(null);
        return;
      }

      const binding = getToolbarShortcutBindingFromKeyboardEvent(event);

      if (!binding) {
        return;
      }

      event.preventDefault();
      setDraftSettings((currentSettings) =>
        assignToolbarShortcutBinding(
          currentSettings,
          recordingShortcutId,
          binding,
        ),
      );
      setRecordingShortcutId(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, recordingShortcutId]);

  const shortcutSummary = useMemo(() => {
    return TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.reduce(
      (summary, definition) => {
        const binding = draftSettings.toolbarShortcuts.bindings[definition.id];
        const defaultBinding =
          defaultSettings.toolbarShortcuts.bindings[definition.id];

        if (!binding) {
          summary.unassigned += 1;
        }

        if (!areToolbarShortcutBindingsEqual(binding, defaultBinding)) {
          summary.customized += 1;
        }

        return summary;
      },
      {
        total: TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.length,
        customized: 0,
        unassigned: 0,
      },
    );
  }, [defaultSettings, draftSettings.toolbarShortcuts.bindings]);

  const filteredShortcutGroups = useMemo(() => {
    return shortcutGroups
      .map((group) => {
        const items = group.items.filter((definition) => {
          const binding = draftSettings.toolbarShortcuts.bindings[definition.id];
          const defaultBinding =
            defaultSettings.toolbarShortcuts.bindings[definition.id];

          if (shortcutFilter === "customized") {
            return !areToolbarShortcutBindingsEqual(binding, defaultBinding);
          }

          if (shortcutFilter === "unassigned") {
            return binding == null;
          }

          return true;
        });

        const customizedCount = group.items.filter((definition) => {
          const binding = draftSettings.toolbarShortcuts.bindings[definition.id];
          const defaultBinding =
            defaultSettings.toolbarShortcuts.bindings[definition.id];

          return !areToolbarShortcutBindingsEqual(binding, defaultBinding);
        }).length;
        const unassignedCount = group.items.filter(
          (definition) =>
            draftSettings.toolbarShortcuts.bindings[definition.id] == null,
        ).length;

        return {
          ...group,
          items,
          visibleCount: items.length,
          totalCount: group.items.length,
          customizedCount,
          unassignedCount,
        };
      })
      .filter((group) => group.visibleCount > 0);
  }, [
    defaultSettings,
    draftSettings.toolbarShortcuts.bindings,
    shortcutFilter,
    shortcutGroups,
  ]);

  useEffect(() => {
    if (shortcutFilter === "all" || !filteredShortcutGroups.length) {
      return;
    }

    setCollapsedShortcutGroups((currentState) => {
      let hasChanges = false;
      const nextState = { ...currentState };

      for (const group of filteredShortcutGroups) {
        if (nextState[group.categoryId]) {
          nextState[group.categoryId] = false;
          hasChanges = true;
        }
      }

      return hasChanges ? nextState : currentState;
    });
  }, [filteredShortcutGroups, shortcutFilter]);

  const handleScrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleUpdateItem = (
    corner: ViewportCorner,
    itemIndex: number,
    nextItem: OverlayCornerItemConfig,
  ) => {
    setDraftSettings((currentSettings) => {
      const items = currentSettings.viewportOverlay.corners[corner].map(
        (item, index) => (index === itemIndex ? nextItem : item),
      );

      return replaceCornerItems(currentSettings, corner, items);
    });
  };

  const handleMoveItem = (
    corner: ViewportCorner,
    itemIndex: number,
    direction: "up" | "down",
  ) => {
    setDraftSettings((currentSettings) => {
      const items = [...currentSettings.viewportOverlay.corners[corner]];
      const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;

      if (targetIndex < 0 || targetIndex >= items.length) {
        return currentSettings;
      }

      const [movedItem] = items.splice(itemIndex, 1);
      items.splice(targetIndex, 0, movedItem);

      return replaceCornerItems(currentSettings, corner, items);
    });
  };

  const handleAddItem = (corner: ViewportCorner) => {
    const nextItem = createNewOverlayItemConfig(createOverlayItemId());

    setDraftSettings((currentSettings) =>
      replaceCornerItems(currentSettings, corner, [
        ...currentSettings.viewportOverlay.corners[corner],
        nextItem,
      ]),
    );
  };

  const handleRemoveItem = (corner: ViewportCorner, itemIndex: number) => {
    const removedItem = draftSettings.viewportOverlay.corners[corner][itemIndex];

    if (removedItem && editingTarget?.itemId === removedItem.id) {
      setEditingTarget(null);
    }

    setDraftSettings((currentSettings) => {
      const items = currentSettings.viewportOverlay.corners[corner].filter(
        (_, index) => index !== itemIndex,
      );

      return replaceCornerItems(currentSettings, corner, items);
    });
  };

  const handleRecordShortcut = (commandId: ToolbarShortcutCommandId) => {
    setEditingTarget(null);
    setRecordingShortcutId((currentId) =>
      currentId === commandId ? null : commandId,
    );
  };

  const handleClearShortcut = (commandId: ToolbarShortcutCommandId) => {
    setDraftSettings((currentSettings) =>
      assignToolbarShortcutBinding(currentSettings, commandId, null),
    );

    if (recordingShortcutId === commandId) {
      setRecordingShortcutId(null);
    }
  };

  const handleResetShortcut = (commandId: ToolbarShortcutCommandId) => {
    setDraftSettings((currentSettings) =>
      assignToolbarShortcutBinding(
        currentSettings,
        commandId,
        defaultSettings.toolbarShortcuts.bindings[commandId],
      ),
    );

    if (recordingShortcutId === commandId) {
      setRecordingShortcutId(null);
    }
  };

  const handleToggleShortcutGroup = (categoryId: ShortcutCategoryId) => {
    setCollapsedShortcutGroups((currentState) => ({
      ...currentState,
      [categoryId]: !currentState[categoryId],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      await onSave(draftSettings);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存设置时发生未知错误";
      setSaveError(message);
      return;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {open ? (
        <Drawer
          rootClassName="viewer-settings-drawer"
          title="Viewer Settings"
          placement="right"
          open={open}
          width={1040}
          closeIcon={<AppIcon name="x-lg" className="app-icon" />}
          onClose={onClose}
          styles={{
            body: {
              padding: 0,
            },
          }}
          footer={
            <div className="viewer-settings-footer">
              <div className="viewer-settings-footer-copy">
                {saveError ? (
                  <Alert
                    type="error"
                    showIcon
                    icon={<AppIcon name="exclamation-circle" className="app-icon" />}
                    message={saveError}
                    className="viewer-settings-alert"
                  />
                ) : (
                  <span>
                    设置会保存到本地 SQLite 数据库，后续可继续扩展更多面板。
                  </span>
                )}
              </div>
              <div className="viewer-settings-footer-actions">
                <Button data-testid="viewer-settings-close" onClick={onClose}>
                  关闭
                </Button>
                <Button
                  icon={<AppIcon name="arrow-clockwise" className="app-icon" />}
                  disabled={!differsFromDefault || isSaving}
                  onClick={() => {
                    setDraftSettings(cloneViewerSettings(defaultSettings));
                    setSaveError(null);
                    setEditingTarget(null);
                  }}
                >
                  恢复默认
                </Button>
                <Button
                  type="primary"
                  icon={<AppIcon name="floppy" className="app-icon" />}
                  loading={isSaving}
                  disabled={!hasChanges}
                  onClick={handleSave}
                >
                  保存设置
                </Button>
              </div>
            </div>
          }
        >
          <div className="viewer-settings-layout">
            <aside className="viewer-settings-nav">
              <div className="viewer-settings-nav-header">
                <h3>快捷导航</h3>
                <p>按配置主题拆分导航，当前支持四角信息、MPR 投影和工具栏快捷键。</p>
              </div>
              <div className="viewer-settings-nav-list">
                <button
                  type="button"
                  className="viewer-settings-nav-button"
                  onClick={() => handleScrollToSection(OVERLAY_SECTION_ID)}
                >
                  四角信息
                </button>
                <button
                  type="button"
                  className="viewer-settings-nav-button"
                  onClick={() => handleScrollToSection(MPR_PROJECTION_SECTION_ID)}
                >
                  MPR 投影
                </button>
                <button
                  type="button"
                  className="viewer-settings-nav-button"
                  onClick={() => handleScrollToSection(SHORTCUTS_SECTION_ID)}
                >
                  快捷键
                </button>
              </div>
            </aside>

            <div className="viewer-settings-content">
              <section
                ref={(element) => {
                  sectionRefs.current[OVERLAY_SECTION_ID] = element;
                }}
                className="viewer-settings-section"
              >
                <div className="viewer-settings-section-head">
                  <div>
                    <div className="viewer-settings-section-kicker">
                      Overlay Configuration
                    </div>
                    <h2>四角信息</h2>
                    <p>
                      四个角合并在一个 2 x 2 配置块里。主面板只保留 tag
                      列表，颜色、前缀、字体等详细项通过编辑弹窗调整。
                    </p>
                  </div>
                </div>

                <div className="viewer-settings-summary-row">
                  <Tag className="viewer-settings-summary-tag">
                    支持 {OVERLAY_TAG_DEFINITIONS.length} 种标签
                  </Tag>
                  <Tag className="viewer-settings-summary-tag">
                    每个角最多 6 条
                  </Tag>
                  <Tag className="viewer-settings-summary-tag">
                    点击编辑调整样式
                  </Tag>
                </div>

                <div className="viewer-settings-corner-grid">
                  {VIEWPORT_CORNERS.map((corner) => {
                    const items = draftSettings.viewportOverlay.corners[corner];

                    return (
                      <Card
                        key={corner}
                        size="small"
                        className="viewer-settings-corner-card"
                      >
                        <div className="viewer-settings-corner-head">
                          <div>
                            <div className="viewer-settings-corner-title">
                              {VIEWPORT_CORNER_LABELS[corner]}
                            </div>
                            <div className="viewer-settings-corner-subtitle">
                              按显示顺序排列，共 {items.length} 条
                            </div>
                          </div>
                          <Button
                            size="small"
                            icon={<AppIcon name="plus-lg" className="app-icon" />}
                            onClick={() => handleAddItem(corner)}
                          >
                            添加
                          </Button>
                        </div>

                        {items.length ? (
                          <div className="viewer-settings-corner-list">
                            {items.map((item, itemIndex) => {
                              const definition = getTagDefinition(item.tagKey);

                              return (
                                <div
                                  key={item.id}
                                  className="viewer-settings-corner-item"
                                >
                                  <div className="viewer-settings-corner-item-meta">
                                    <span className="viewer-settings-corner-item-index">
                                      {itemIndex + 1}
                                    </span>
                                    <Tag className="viewer-settings-corner-item-tag">
                                      {definition?.label ?? item.tagKey}
                                    </Tag>
                                  </div>
                                  <div className="viewer-settings-corner-item-actions">
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<AppIcon name="arrow-up" className="app-icon" />}
                                      disabled={itemIndex === 0}
                                      title="上移"
                                      onClick={() =>
                                        handleMoveItem(corner, itemIndex, "up")
                                      }
                                    />
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<AppIcon name="arrow-down" className="app-icon" />}
                                      disabled={itemIndex === items.length - 1}
                                      title="下移"
                                      onClick={() =>
                                        handleMoveItem(corner, itemIndex, "down")
                                      }
                                    />
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<AppIcon name="pencil-square" className="app-icon" />}
                                      title="编辑"
                                      data-testid={`viewer-settings-edit-${corner}-${itemIndex}`}
                                      onClick={() => {
                                        setRecordingShortcutId(null);
                                        setEditingTarget({
                                          corner,
                                          itemId: item.id,
                                        });
                                      }}
                                    />
                                    <Button
                                      size="small"
                                      type="text"
                                      danger
                                      icon={<AppIcon name="trash3" className="app-icon" />}
                                      title="删除"
                                      onClick={() =>
                                        handleRemoveItem(corner, itemIndex)
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="当前角落还没有信息项"
                          >
                            <Button
                              size="small"
                              icon={<AppIcon name="plus-lg" className="app-icon" />}
                              onClick={() => handleAddItem(corner)}
                            >
                              添加第一条
                            </Button>
                          </Empty>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>

              <section
                ref={(element) => {
                  sectionRefs.current[MPR_PROJECTION_SECTION_ID] = element;
                }}
                className="viewer-settings-section"
                data-testid="viewer-settings-mpr-projection-section"
              >
                <div className="viewer-settings-section-head">
                  <div>
                    <div className="viewer-settings-section-kicker">
                      MPR Projection Defaults
                    </div>
                    <h2>MPR 投影</h2>
                    <p>
                      配置默认的 MPR 投影模式和厚度。新开的 MPR
                      视口会优先使用这里的默认值，当前视口执行“重置投影”也会回到这里。
                    </p>
                  </div>
                </div>

                <div className="viewer-settings-summary-row">
                  <Tag className="viewer-settings-summary-tag">
                    保存后立即生效
                  </Tag>
                  <Tag className="viewer-settings-summary-tag">
                    厚度单位为 mm
                  </Tag>
                  <Tag className="viewer-settings-summary-tag">
                    刷新后保留
                  </Tag>
                </div>

                <Card size="small" className="viewer-settings-corner-card">
                  <div className="viewer-settings-corner-head">
                    <div>
                      <div className="viewer-settings-corner-title">
                        默认投影参数
                      </div>
                      <div className="viewer-settings-corner-subtitle">
                        用于初始化 MPR 视口和重置投影
                      </div>
                    </div>
                  </div>

                  <div
                    className="viewer-settings-editor-grid"
                    data-testid="viewer-settings-mpr-projection-controls"
                  >
                    <label className="viewer-settings-field">
                      <span>默认模式</span>
                      <Segmented
                        options={mprSlabModeOptions}
                        value={draftSettings.mprProjection.defaultSlabMode}
                        data-testid="viewer-settings-mpr-projection-mode"
                        onChange={(value) => {
                          setDraftSettings((currentSettings) =>
                            replaceMprProjectionSettings(currentSettings, {
                              ...currentSettings.mprProjection,
                              defaultSlabMode:
                                value as ViewerSettings["mprProjection"]["defaultSlabMode"],
                            }),
                          );
                        }}
                      />
                    </label>

                    <label className="viewer-settings-field">
                      <span>默认厚度</span>
                      <InputNumber
                        min={0.1}
                        max={200}
                        step={0.5}
                        precision={1}
                        addonAfter="mm"
                        value={draftSettings.mprProjection.defaultSlabThickness}
                        data-testid="viewer-settings-mpr-projection-thickness"
                        onChange={(value) => {
                          if (
                            typeof value !== "number" ||
                            !Number.isFinite(value)
                          ) {
                            return;
                          }

                          setDraftSettings((currentSettings) =>
                            replaceMprProjectionSettings(currentSettings, {
                              ...currentSettings.mprProjection,
                              defaultSlabThickness: value,
                            }),
                          );
                        }}
                      />
                      <small className="viewer-settings-field-note">
                        建议在 1 - 40 mm 范围内配置，支持 0.1 mm 步进。
                      </small>
                    </label>
                  </div>
                </Card>
              </section>

              <section
                ref={(element) => {
                  sectionRefs.current[SHORTCUTS_SECTION_ID] = element;
                }}
                className="viewer-settings-section"
                data-testid="viewer-settings-shortcuts-section"
              >
                <div className="viewer-settings-section-head">
                  <div>
                    <div className="viewer-settings-section-kicker">
                      Shortcut Configuration
                    </div>
                    <h2>快捷键</h2>
                    <p>
                      为常用工具栏命令配置快捷键。点击录制后直接按下组合键即可保存，
                      <code>Esc</code> 取消，<code>Backspace</code> 或
                      <code>Delete</code> 清空。重复绑定会自动转移到最新命令。
                    </p>
                  </div>
                </div>

                <div className="viewer-settings-summary-row">
                  <Tag className="viewer-settings-summary-tag">
                    共 {TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.length} 个命令
                  </Tag>
                  <Tag className="viewer-settings-summary-tag">
                    支持单键和组合键
                  </Tag>
                  <Tag className="viewer-settings-summary-tag">
                    保存后立即生效
                  </Tag>
                </div>

                <div className="viewer-settings-shortcut-toolbar">
                  <Segmented<ShortcutFilter>
                    size="small"
                    className="viewer-settings-shortcut-filter"
                    value={shortcutFilter}
                    data-testid="viewer-settings-shortcut-filter"
                    onChange={(value) => setShortcutFilter(value)}
                    options={[
                      {
                        label: `全部 ${shortcutSummary.total}`,
                        value: "all",
                      },
                      {
                        label: `已修改 ${shortcutSummary.customized}`,
                        value: "customized",
                      },
                      {
                        label: `未绑定 ${shortcutSummary.unassigned}`,
                        value: "unassigned",
                      },
                    ]}
                  />
                  <span className="viewer-settings-shortcut-toolbar-copy">
                    组内可折叠；悬停命令名称可查看用途说明。
                  </span>
                </div>

                {recordingShortcutId ? (
                  <Alert
                    type="info"
                    showIcon
                    icon={<AppIcon name="keyboard" className="app-icon" />}
                    className="viewer-settings-shortcut-capture-alert"
                    message={`正在录制 ${TOOLBAR_SHORTCUT_COMMAND_DEFINITIONS.find((definition) => definition.id === recordingShortcutId)?.label ?? "快捷键"}`}
                    description="请按下要绑定的组合键。Esc 取消，Backspace/Delete 清空当前绑定。"
                  />
                ) : null}

                <div className="viewer-settings-shortcut-groups">
                  {filteredShortcutGroups.length ? (
                    filteredShortcutGroups.map((group) => {
                      const isCollapsed = collapsedShortcutGroups[group.categoryId];

                      return (
                        <Card
                          key={group.categoryId}
                          size="small"
                          className="viewer-settings-shortcut-card"
                          data-testid={`viewer-settings-shortcut-group-${group.categoryId}`}
                        >
                          <button
                            type="button"
                            className="viewer-settings-shortcut-group-toggle"
                            aria-expanded={!isCollapsed}
                            onClick={() =>
                              handleToggleShortcutGroup(group.categoryId)
                            }
                          >
                            <span className="viewer-settings-shortcut-group-copy">
                              <span className="viewer-settings-corner-title">
                                {group.label}
                              </span>
                              <span className="viewer-settings-corner-subtitle">
                                {group.visibleCount === group.totalCount
                                  ? `${group.totalCount} 项`
                                  : `${group.visibleCount} / ${group.totalCount} 项`}
                                {group.customizedCount
                                  ? ` · ${group.customizedCount} 已修改`
                                  : ""}
                                {group.unassignedCount
                                  ? ` · ${group.unassignedCount} 未绑定`
                                  : ""}
                              </span>
                            </span>
                            <span className="viewer-settings-shortcut-group-icon">
                              {isCollapsed ? (
                                <AppIcon name="caret-right-fill" className="app-icon" />
                              ) : (
                                <AppIcon name="chevron-down" className="app-icon" />
                              )}
                            </span>
                          </button>

                          {isCollapsed ? null : (
                            <div className="viewer-settings-shortcut-list">
                              {group.items.map((definition) => {
                                const binding =
                                  draftSettings.toolbarShortcuts.bindings[
                                    definition.id
                                  ];
                                const defaultBinding =
                                  defaultSettings.toolbarShortcuts.bindings[
                                    definition.id
                                  ];
                                const isRecording =
                                  recordingShortcutId === definition.id;
                                const differsFromDefault =
                                  !areToolbarShortcutBindingsEqual(
                                    binding,
                                    defaultBinding,
                                  );

                                return (
                                  <div
                                    key={definition.id}
                                    className={`viewer-settings-shortcut-item${isRecording ? " is-recording" : ""}`}
                                  >
                                    <div className="viewer-settings-shortcut-item-main">
                                      <span
                                        className="viewer-settings-shortcut-item-title"
                                        title={definition.description}
                                      >
                                        {definition.label}
                                      </span>
                                      <span className="viewer-settings-shortcut-item-default">
                                        默认{" "}
                                        {formatToolbarShortcutBinding(
                                          defaultBinding,
                                        )}
                                      </span>
                                      {differsFromDefault ? (
                                        <Tag className="viewer-settings-shortcut-state-tag is-customized">
                                          已改
                                        </Tag>
                                      ) : null}
                                      {!binding ? (
                                        <Tag className="viewer-settings-shortcut-state-tag">
                                          未绑
                                        </Tag>
                                      ) : null}
                                    </div>

                                    <div className="viewer-settings-shortcut-item-actions">
                                      <Button
                                        size="small"
                                        type={isRecording ? "primary" : "default"}
                                        className="viewer-settings-shortcut-button"
                                        data-testid={`viewer-settings-shortcut-record-${definition.id}`}
                                        onClick={() =>
                                          handleRecordShortcut(definition.id)
                                        }
                                      >
                                        {isRecording
                                          ? "请按快捷键…"
                                          : formatToolbarShortcutBinding(binding)}
                                      </Button>
                                      <Button
                                        size="small"
                                        type="text"
                                        icon={<AppIcon name="arrow-clockwise" className="app-icon" />}
                                        className="viewer-settings-shortcut-icon-button"
                                        data-testid={`viewer-settings-shortcut-reset-${definition.id}`}
                                        aria-label={`恢复 ${definition.label} 默认绑定`}
                                        title="恢复默认"
                                        disabled={!differsFromDefault}
                                        onClick={() =>
                                          handleResetShortcut(definition.id)
                                        }
                                      />
                                      <Button
                                        size="small"
                                        type="text"
                                        danger
                                        icon={<AppIcon name="trash3" className="app-icon" />}
                                        className="viewer-settings-shortcut-icon-button"
                                        data-testid={`viewer-settings-shortcut-clear-${definition.id}`}
                                        aria-label={`清空 ${definition.label} 绑定`}
                                        title="清空绑定"
                                        disabled={!binding}
                                        onClick={() =>
                                          handleClearShortcut(definition.id)
                                        }
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  ) : (
                    <div className="viewer-settings-shortcut-empty">
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="当前筛选下没有快捷键项"
                      />
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </Drawer>
      ) : null}

      {editingTarget && editingItem ? (
        <Modal
          open
          title={`编辑${VIEWPORT_CORNER_LABELS[editingTarget.corner]}信息项`}
          destroyOnHidden
          closeIcon={<AppIcon name="x-lg" className="app-icon" />}
          onCancel={() => setEditingTarget(null)}
          footer={
            <Button
              type="primary"
              data-testid="viewer-settings-editor-done"
              onClick={() => setEditingTarget(null)}
            >
              完成
            </Button>
          }
          rootClassName="viewer-settings-editor-modal"
        >
          <div className="viewer-settings-editor-body">
            <label className="viewer-settings-field">
              <span>显示标签</span>
              <Select
                value={editingItem.tagKey}
                options={OVERLAY_TAG_DEFINITIONS.map((definition) => ({
                  label: definition.label,
                  value: definition.key,
                }))}
                onChange={(value) =>
                  handleUpdateItem(editingTarget.corner, editingItemIndex, {
                    ...editingItem,
                    tagKey: value,
                  })
                }
              />
              <small className="viewer-settings-field-note">
                {getTagDefinition(editingItem.tagKey)?.description}
              </small>
            </label>

            <label className="viewer-settings-field">
              <span>前缀</span>
              <Input
                value={editingItem.prefix}
                maxLength={32}
                placeholder="例如 ID "
                onChange={(event) =>
                  handleUpdateItem(editingTarget.corner, editingItemIndex, {
                    ...editingItem,
                    prefix: event.target.value,
                  })
                }
              />
            </label>

            <div className="viewer-settings-editor-grid">
              <label className="viewer-settings-field">
                <span>颜色</span>
                <div className="viewer-settings-color-control">
                  <ColorPicker
                    value={editingItem.style.color}
                    format="hex"
                    onChangeComplete={(color: Color) =>
                      handleUpdateItem(editingTarget.corner, editingItemIndex, {
                        ...editingItem,
                        style: {
                          ...editingItem.style,
                          color: color.toHexString(),
                        },
                      })
                    }
                  />
                  <Input value={editingItem.style.color} readOnly />
                </div>
              </label>

              <label className="viewer-settings-field">
                <span>字号</span>
                <InputNumber
                  min={10}
                  max={24}
                  value={editingItem.style.fontSize}
                  onChange={(value) =>
                    handleUpdateItem(editingTarget.corner, editingItemIndex, {
                      ...editingItem,
                      style: {
                        ...editingItem.style,
                        fontSize:
                          typeof value === "number"
                            ? value
                            : editingItem.style.fontSize,
                      },
                    })
                  }
                />
              </label>

              <label className="viewer-settings-field">
                <span>字重</span>
                <Select
                  value={editingItem.style.fontWeight}
                  options={OVERLAY_FONT_WEIGHT_OPTIONS}
                  onChange={(value) =>
                    handleUpdateItem(editingTarget.corner, editingItemIndex, {
                      ...editingItem,
                      style: {
                        ...editingItem.style,
                        fontWeight: value,
                      },
                    })
                  }
                />
              </label>

              <label className="viewer-settings-field">
                <span>斜体</span>
                <div className="viewer-settings-switch">
                  <Switch
                    checked={editingItem.style.italic}
                    onChange={(checked) =>
                      handleUpdateItem(editingTarget.corner, editingItemIndex, {
                        ...editingItem,
                        style: {
                          ...editingItem.style,
                          italic: checked,
                        },
                      })
                    }
                  />
                </div>
              </label>
            </div>

            <div className="viewer-settings-preview">
              <span className="viewer-settings-preview-label">Preview</span>
              <span
                className="viewer-settings-preview-value"
                style={{
                  color: editingItem.style.color,
                  fontSize: `${editingItem.style.fontSize}px`,
                  fontWeight: editingItem.style.fontWeight,
                  fontStyle: editingItem.style.italic ? "italic" : "normal",
                }}
              >
                {editingItem.prefix}
                {getTagDefinition(editingItem.tagKey)?.label ?? editingItem.tagKey}
              </span>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
