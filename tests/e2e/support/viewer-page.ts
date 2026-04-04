import type { Locator, Page } from "@playwright/test";

import {
  expectViewerShellReady,
  expectViewportReady,
} from "./viewer-expect";

interface ViewerOpenOptions {
  width?: number;
  height?: number;
  waitFor?: "shell" | "viewport";
}

function getWaitForMode(options?: ViewerOpenOptions) {
  return options?.waitFor ?? "viewport";
}

export async function openViewer(page: Page, options?: ViewerOpenOptions) {
  if (options?.width && options?.height) {
    await page.setViewportSize({
      width: options.width,
      height: options.height,
    });
  }

  await page.goto("/");
  await expectViewerShellReady(page);

  if (getWaitForMode(options) === "viewport") {
    await expectViewportReady(page);
  }
}

export async function waitForViewerReady(page: Page) {
  await openViewer(page);
}

export async function openDesktopViewer(
  page: Page,
  width = 1440,
  height = 900,
) {
  await openViewer(page, {
    width,
    height,
  });
}

export async function openMobileViewer(
  page: Page,
  width = 390,
  height = 844,
) {
  await openViewer(page, {
    width,
    height,
  });
}

export async function setViewportLayout(page: Page, layoutId: string) {
  await page.getByTestId("viewport-layout-button").click();
  await page.getByTestId(`viewport-layout-option-${layoutId}`).click();
}

export async function setViewportMprLayout(
  page: Page,
  layoutId: string | "off",
) {
  await page.getByTestId("viewport-mpr-layout-button").click();
  await page.getByTestId(`viewport-mpr-layout-option-${layoutId}`).click();
}

export function getViewportStage(page: Page, viewportId = "viewport-1") {
  if (viewportId === "viewport-1") {
    return page.getByTestId("viewport-stage");
  }

  return page
    .getByTestId(`viewport-slot-${viewportId}`)
    .getByTestId("viewport-stage");
}

export async function selectViewport(
  page: Page,
  viewportId = "viewport-1",
  x = 24,
  y = 24,
) {
  await getViewportStage(page, viewportId).click({
    position: {
      x,
      y,
    },
  });
}

export async function toggleSequenceSync(
  page: Page,
  syncType: "sameStudy" | "crossStudy" | "display",
) {
  await page.getByTestId("viewport-sequence-sync-button").click();
  await page.getByTestId(`viewport-sequence-sync-option-${syncType}`).click();
}

export async function clearSequenceSync(page: Page) {
  await page.getByTestId("viewport-sequence-sync-button").click();
  await page.getByTestId("viewport-sequence-sync-option-clear").click();
}

export async function selectToolbarTool(page: Page, toolId: string) {
  await page.getByTestId(`viewport-tool-${toolId}`).click();
}

export async function selectWindowPreset(page: Page, presetId: string) {
  await page.getByTestId("viewport-window-preset-button").click();
  await page.getByTestId(`viewport-window-preset-option-${presetId}`).click();
}

export async function runViewAction(
  page: Page,
  actionId: "fit" | "reset" | "rotateRight" | "flipHorizontal" | "flipVertical",
) {
  await page.getByTestId(`viewport-view-action-${actionId}`).click();
}

export async function scrollViewportFrames(
  page: Page,
  viewportStage: Locator,
  deltaY: number,
  times: number,
) {
  await viewportStage.click({
    position: {
      x: 36,
      y: 36,
    },
  });

  for (let index = 0; index < times; index += 1) {
    await page.mouse.wheel(0, deltaY);
  }
}
