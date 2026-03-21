"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
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
  Switch,
  Tag,
} from "antd";
import type { Color } from "antd/es/color-picker";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  cloneViewerSettings,
  createDefaultViewerSettings,
  createNewOverlayItemConfig,
  createOverlayItemId,
  OVERLAY_FONT_WEIGHT_OPTIONS,
  OVERLAY_TAG_DEFINITIONS,
  VIEWPORT_CORNER_LABELS,
} from "@/lib/settings/overlay";
import type {
  OverlayCornerItemConfig,
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
const VIEWPORT_CORNERS: ViewportCorner[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
];

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
  const [draftSettings, setDraftSettings] = useState<ViewerSettings>(() =>
    cloneViewerSettings(settings),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState<EditingTarget | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!open) {
      setEditingTarget(null);
      return;
    }

    setDraftSettings(cloneViewerSettings(settings));
    setSaveError(null);
    setEditingTarget(null);
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
                  icon={<ReloadOutlined />}
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
                  icon={<SaveOutlined />}
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
                <p>当前面板先聚焦四角信息，点击后定位到统一配置块。</p>
              </div>
              <div className="viewer-settings-nav-list">
                <button
                  type="button"
                  className="viewer-settings-nav-button"
                  onClick={() => handleScrollToSection(OVERLAY_SECTION_ID)}
                >
                  四角信息
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
                            icon={<PlusOutlined />}
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
                                      icon={<ArrowUpOutlined />}
                                      disabled={itemIndex === 0}
                                      title="上移"
                                      onClick={() =>
                                        handleMoveItem(corner, itemIndex, "up")
                                      }
                                    />
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<ArrowDownOutlined />}
                                      disabled={itemIndex === items.length - 1}
                                      title="下移"
                                      onClick={() =>
                                        handleMoveItem(corner, itemIndex, "down")
                                      }
                                    />
                                    <Button
                                      size="small"
                                      type="text"
                                      icon={<EditOutlined />}
                                      title="编辑"
                                      data-testid={`viewer-settings-edit-${corner}-${itemIndex}`}
                                      onClick={() =>
                                        setEditingTarget({
                                          corner,
                                          itemId: item.id,
                                        })
                                      }
                                    />
                                    <Button
                                      size="small"
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
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
                              icon={<PlusOutlined />}
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
            </div>
          </div>
        </Drawer>
      ) : null}

      {editingTarget && editingItem ? (
        <Modal
          open
          title={`编辑${VIEWPORT_CORNER_LABELS[editingTarget.corner]}信息项`}
          destroyOnHidden
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
