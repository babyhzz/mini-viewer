"use client";

import { Button, Drawer, Empty, Tag } from "antd";

import { AppIcon } from "@/components/app-icon";
import { cn } from "@/lib/utils/classnames";
import type { KeyImageEntry } from "@/lib/viewports/key-images";

interface KeyImageDrawerProps {
  open: boolean;
  entries: KeyImageEntry[];
  currentFrameIndex: number | null;
  totalFrames: number;
  studyTitle: string;
  seriesTitle: string;
  onClose: () => void;
  onSelectFrame: (frameIndex: number) => void;
  onDeleteFrame: (frameIndex: number) => void;
  onClearAll: () => void;
}

function formatFrameLabel(frameIndex: number, totalFrames: number) {
  return `[${frameIndex}]/[${totalFrames}]`;
}

export function KeyImageDrawer({
  open,
  entries,
  currentFrameIndex,
  totalFrames,
  studyTitle,
  seriesTitle,
  onClose,
  onSelectFrame,
  onDeleteFrame,
  onClearAll,
}: KeyImageDrawerProps) {
  const selectedCount =
    currentFrameIndex == null
      ? 0
      : entries.filter((entry) => entry.frameIndex === currentFrameIndex).length;

  return open ? (
    <Drawer
      rootClassName="key-image-drawer"
      title="关键图像列表"
      placement="right"
      open={open}
      width={384}
      closeIcon={<AppIcon name="x-lg" className="app-icon" />}
      onClose={onClose}
      footer={
        <div className="key-image-footer">
          <span className="key-image-footer-copy">
            当前仅展示所选序列的关键图像，可快速跳转、删除或清空。
          </span>
          <div className="key-image-footer-actions">
            <Button
              danger
              disabled={!entries.length}
              data-testid="key-image-clear-all"
              onClick={onClearAll}
            >
              清空全部
            </Button>
            <Button data-testid="key-image-close" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
      }
    >
      <div className="key-image-summary" data-testid="key-image-drawer">
        <div>
          <div className="key-image-kicker">Current Series</div>
          <h3>{seriesTitle || "当前序列"}</h3>
          <p>{studyTitle || "当前检查"} · 关键图像列表</p>
        </div>
        <div className="key-image-summary-tags">
          <Tag bordered={false}>总计 {entries.length}</Tag>
          <Tag bordered={false}>当前帧 {selectedCount}</Tag>
        </div>
      </div>

      {entries.length ? (
        <div className="key-image-items">
          {entries.map((entry) => {
            const isSelected = currentFrameIndex === entry.frameIndex;

            return (
              <div
                key={entry.id}
                className={cn("key-image-item", isSelected && "is-selected")}
                data-testid="key-image-item"
                data-frame-index={entry.frameIndex}
                data-selected={String(isSelected)}
              >
                <button
                  type="button"
                  className="key-image-item-main"
                  data-testid={`key-image-select-${entry.frameIndex}`}
                  onClick={() => onSelectFrame(entry.frameIndex)}
                >
                  <div className="key-image-item-head">
                    <div className="key-image-item-title">
                      <Tag className="key-image-item-tag" bordered={false}>
                        KEY
                      </Tag>
                      <span className="key-image-item-frame">
                        {formatFrameLabel(entry.frameIndex, totalFrames)}
                      </span>
                    </div>
                    {isSelected ? (
                      <span className="key-image-item-badge">当前</span>
                    ) : null}
                  </div>
                  <div className="key-image-item-description">
                    {entry.instanceNumber != null
                      ? `Instance ${entry.instanceNumber}`
                      : "未记录 Instance Number"}
                    {entry.imageFileName ? ` · ${entry.imageFileName}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  className="key-image-item-delete"
                  aria-label={`删除关键图像 ${entry.frameIndex}`}
                  data-testid={`key-image-delete-${entry.frameIndex}`}
                  onClick={() => onDeleteFrame(entry.frameIndex)}
                >
                  <AppIcon name="trash3" className="app-icon" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="key-image-empty" data-testid="key-image-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="当前序列还没有关键图像"
          />
        </div>
      )}
    </Drawer>
  ) : null;
}
