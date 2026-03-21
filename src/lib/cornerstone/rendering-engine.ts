"use client";

const SHARED_RENDERING_ENGINE_ID = "dicom-shared-rendering-engine";
const SHARED_RENDERING_ENGINE_DESTROY_DELAY_MS = 160;

let pendingDestroyTimer: number | null = null;

function clearPendingSharedRenderingEngineDestroy() {
  if (pendingDestroyTimer === null || typeof window === "undefined") {
    return;
  }

  window.clearTimeout(pendingDestroyTimer);
  pendingDestroyTimer = null;
}

export function getSharedCornerstoneRenderingEngineId() {
  return SHARED_RENDERING_ENGINE_ID;
}

export function getSharedCornerstoneRenderingEngine(
  core: typeof import("@cornerstonejs/core"),
) {
  clearPendingSharedRenderingEngineDestroy();

  const existingRenderingEngine = core.getRenderingEngine(
    SHARED_RENDERING_ENGINE_ID,
  );

  if (existingRenderingEngine) {
    return existingRenderingEngine;
  }

  return new core.RenderingEngine(SHARED_RENDERING_ENGINE_ID);
}

export function scheduleSharedCornerstoneRenderingEngineDestroy(
  core: typeof import("@cornerstonejs/core"),
) {
  if (typeof window === "undefined") {
    return;
  }

  clearPendingSharedRenderingEngineDestroy();
  pendingDestroyTimer = window.setTimeout(() => {
    pendingDestroyTimer = null;

    const renderingEngine = core.getRenderingEngine(SHARED_RENDERING_ENGINE_ID);

    if (!renderingEngine || renderingEngine.getViewports().length > 0) {
      return;
    }

    renderingEngine.destroy();
  }, SHARED_RENDERING_ENGINE_DESTROY_DELAY_MS);
}
