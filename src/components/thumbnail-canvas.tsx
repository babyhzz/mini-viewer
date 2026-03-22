"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Spin } from "antd";

import { BootstrapIcon } from "@/components/bootstrap-icon";
import { initializeCornerstone } from "@/lib/cornerstone/init";
import { toCornerstoneImageId } from "@/lib/cornerstone/image-id";

interface ThumbnailCanvasProps {
  dicomUrl: string;
  alt: string;
}

export function ThumbnailCanvas({ dicomUrl, alt }: ThumbnailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderingEngineId = useId().replaceAll(":", "-");
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderThumbnail() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      setLoading(true);
      setHasError(false);

      try {
        const { core } = await initializeCornerstone();

        if (cancelled) {
          return;
        }

        await core.utilities.loadImageToCanvas({
          canvas,
          imageId: toCornerstoneImageId(dicomUrl),
          renderingEngineId: `thumbnail-${renderingEngineId}`,
          thumbnail: true,
        });

        canvas.style.width = "100%";
        canvas.style.height = "100%";

        if (!cancelled) {
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to render series thumbnail", error);

        if (!cancelled) {
          setHasError(true);
          setLoading(false);
        }
      }
    }

    renderThumbnail();

    return () => {
      cancelled = true;
    };
  }, [dicomUrl, renderingEngineId]);

  return (
    <div className="thumbnail-frame" aria-label={alt}>
      <div className="thumbnail-label">PREVIEW</div>
      <canvas
        ref={canvasRef}
        className="thumbnail-canvas"
        data-testid="thumbnail-canvas"
        width={512}
        height={512}
      />
      {loading ? (
        <div className="status-layer">
          <Spin
            size="small"
            indicator={
              <BootstrapIcon
                name="arrow-repeat"
                spin
                className="app-spin-indicator is-small"
              />
            }
          />
        </div>
      ) : null}
      {hasError ? (
        <div className="status-layer">
          <div className="status-card is-error">
            <strong>缩略图加载失败</strong>
            <p>该序列仍可点击，右侧主视图会再次尝试加载。</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
