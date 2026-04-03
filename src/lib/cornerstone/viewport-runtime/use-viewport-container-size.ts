"use client";

import { useEffect, useState, type RefObject } from "react";

export function useViewportContainerSize(
  elementRef: RefObject<HTMLElement | null>,
  key: string,
) {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = elementRef.current;

    if (!element) {
      return;
    }

    const updateViewportSize = () => {
      const nextWidth = Math.round(element.clientWidth);
      const nextHeight = Math.round(element.clientHeight);

      setViewportSize((previous) =>
        previous.width === nextWidth && previous.height === nextHeight
          ? previous
          : {
              width: nextWidth,
              height: nextHeight,
            },
      );
    };

    updateViewportSize();

    const observer = new ResizeObserver(() => {
      updateViewportSize();
    });

    observer.observe(element);
    window.addEventListener("resize", updateViewportSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateViewportSize);
    };
  }, [elementRef, key]);

  return viewportSize;
}
