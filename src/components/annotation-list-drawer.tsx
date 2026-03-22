"use client";

import { Button, Drawer, Empty, Tag } from "antd";

import { BootstrapIcon } from "@/components/bootstrap-icon";
import type { ViewportAnnotationEntry } from "@/lib/tools/cornerstone-tool-adapter";

interface AnnotationListDrawerProps {
  open: boolean;
  annotations: ViewportAnnotationEntry[];
  onClose: () => void;
  onSelectAnnotation: (annotationUID: string) => void;
  onDeleteAnnotation: (annotationUID: string) => void;
  onClearAll: () => void;
}

export function AnnotationListDrawer({
  open,
  annotations,
  onClose,
  onSelectAnnotation,
  onDeleteAnnotation,
  onClearAll,
}: AnnotationListDrawerProps) {
  const selectedCount = annotations.filter((item) => item.isSelected).length;

  return open ? (
    <Drawer
      rootClassName="annotation-list-drawer"
      title="图元列表"
      placement="right"
      open={open}
      width={384}
      closeIcon={<BootstrapIcon name="x-lg" />}
      onClose={onClose}
      footer={
        <div className="annotation-list-footer">
          <span className="annotation-list-footer-copy">
            当前列表展示本视口中的测量与 ROI 图元，可直接定位和删除。
          </span>
          <div className="annotation-list-footer-actions">
            <Button
              danger
              disabled={!annotations.length}
              data-testid="annotation-list-clear-all"
              onClick={onClearAll}
            >
              清空全部
            </Button>
            <Button data-testid="annotation-list-close" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      }
    >
      <div className="annotation-list-summary" data-testid="annotation-list-drawer">
        <div>
          <div className="annotation-list-kicker">Current Viewport</div>
          <h3>当前视口图元</h3>
          <p>点击列表项可定位图元，右侧可直接删除。</p>
        </div>
        <div className="annotation-list-summary-tags">
          <Tag bordered={false}>总计 {annotations.length}</Tag>
          <Tag bordered={false}>已选 {selectedCount}</Tag>
        </div>
      </div>

      {annotations.length ? (
        <div className="annotation-list-items">
          {annotations.map((annotation) => (
            <div
              key={annotation.annotationUID}
              className={`annotation-list-item${annotation.isSelected ? " is-selected" : ""}`}
              data-testid="annotation-list-item"
              data-annotation-uid={annotation.annotationUID}
              data-selected={String(annotation.isSelected)}
            >
              <button
                type="button"
                className="annotation-list-item-main"
                data-testid={`annotation-list-select-${annotation.annotationUID}`}
                onClick={() => onSelectAnnotation(annotation.annotationUID)}
              >
                <div className="annotation-list-item-head">
                  <div className="annotation-list-item-title">
                    <Tag className="annotation-list-item-tag" bordered={false}>
                      {annotation.toolShortLabel}
                    </Tag>
                  </div>
                  <div className="annotation-list-item-meta">
                    <span className="annotation-list-item-frame">
                      {annotation.frameLabel}
                    </span>
                    {annotation.isSelected ? (
                      <span className="annotation-list-item-badge">已选</span>
                    ) : null}
                  </div>
                </div>
                <div className="annotation-list-item-description">
                  {annotation.description}
                </div>
              </button>
              <button
                type="button"
                className="annotation-list-item-delete"
                aria-label={`删除 ${annotation.toolLabel}`}
                data-testid={`annotation-list-delete-${annotation.annotationUID}`}
                onClick={() => onDeleteAnnotation(annotation.annotationUID)}
              >
                <BootstrapIcon name="trash3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="annotation-list-empty" data-testid="annotation-list-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前还没有图元"
          />
        </div>
      )}
    </Drawer>
  ) : null;
}
