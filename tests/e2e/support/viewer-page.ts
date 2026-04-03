import type { Locator, Page } from "@playwright/test";

import {
  expectViewerShellReady,
  expectViewportReady,
} from "./viewer-expect";

export async function waitForViewerReady(page: Page) {
  await page.goto("/");
  await expectViewerShellReady(page);
  await expectViewportReady(page);
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
