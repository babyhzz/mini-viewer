import { expect, test } from "@playwright/test";
import {
  setViewportLayout,
  setViewportMprLayout,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

  test("reference lines project the selected stack slice into another MPR viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await setViewportMprLayout(page, "left1Right2");

    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await expect(firstViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );

    await page.getByTestId("viewport-tool-referenceLines").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-visible",
      "true",
    );
    await expect
      .poll(
        async () => await secondViewportSlot.getByTestId("mpr-reference-line").count(),
        {
          timeout: 10_000,
        },
      )
      .toBeGreaterThan(0);

    await page.getByTestId("viewport-tool-referenceLines").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-visible",
      "false",
    );
    await expect(secondViewportSlot.getByTestId("mpr-reference-line")).toHaveCount(
      0,
    );
  });

  test("selected MPR pane can act as the reference-line source for another stack viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await setViewportMprLayout(page, "left1Right2");

    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");

    const coronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await coronalPane.click({
      position: {
        x: 18,
        y: 18,
      },
    });
    await expect(coronalPane).toHaveAttribute("data-pane-selected", "true");

    await page.getByTestId("viewport-tool-referenceLines").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-line-visible",
      "true",
    );
    await expect
      .poll(
        async () =>
          await firstViewportSlot.getByTestId("viewport-reference-line").count(),
        {
          timeout: 10_000,
        },
      )
      .toBeGreaterThan(0);
  });

  test("scrolling the selected MPR pane navigates the linked stack viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await setViewportMprLayout(page, "left1Right2");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    const axialPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="axial"]',
    );
    const initialFrameIndex = await firstViewportStage.getAttribute(
      "data-frame-index",
    );

    await axialPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(axialPane).toHaveAttribute("data-pane-selected", "true");

    await page.getByTestId("viewport-tool-referenceLines").click();
    await axialPane.hover({
      position: {
        x: 40,
        y: 40,
      },
    });
    await page.mouse.wheel(0, 960);

    await expect(firstViewportStage).not.toHaveAttribute(
      "data-frame-index",
      initialFrameIndex ?? "1",
    );
  });

  test("dragging the MPR crosshair center navigates the linked stack viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await setViewportMprLayout(page, "left1Right2");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    const coronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await coronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(coronalPane).toHaveAttribute("data-pane-selected", "true");

    await page.getByTestId("viewport-tool-referenceLines").click();

    const initialFrameIndex = Number(
      (await firstViewportStage.getAttribute("data-frame-index")) ?? "0",
    );
    const paneBox = await coronalPane.boundingBox();

    expect(paneBox).toBeTruthy();

    const startX = paneBox!.x + paneBox!.width * 0.5;
    const startY = paneBox!.y + paneBox!.height * 0.5;
    const endY = Math.min(
      paneBox!.y + paneBox!.height * 0.82,
      startY + paneBox!.height * 0.22,
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 14 });
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          Number((await firstViewportStage.getAttribute("data-frame-index")) ?? "0"),
        {
          timeout: 10_000,
        },
      )
      .not.toBe(initialFrameIndex);
  });

  test("selected MPR crosshair center synchronizes another MPR viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await setViewportMprLayout(page, "left1Right2");
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await setViewportMprLayout(page, "top1Bottom2");
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await expect(firstViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );

    const firstCoronalPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );
    const secondAxialPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="axial"]',
    );
    const secondSagittalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="sagittal"]',
    );
    const secondCoronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await firstCoronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(firstCoronalPane).toHaveAttribute(
      "data-pane-selected",
      "true",
    );

    await page.getByTestId("viewport-tool-referenceLines").click();
    await expect(firstCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(secondCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );
    await expect(secondViewportStage).not.toHaveAttribute(
      "data-crosshair-sync-applied-id",
      "0",
    );

    const initialSecondPaneFrames = [
      (await secondAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await secondSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await secondCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
    ].join(":");
    const paneBox = await firstCoronalPane.boundingBox();

    expect(paneBox).toBeTruthy();

    const startX = paneBox!.x + paneBox!.width * 0.5;
    const startY = paneBox!.y + paneBox!.height * 0.5;
    const endX = Math.min(
      paneBox!.x + paneBox!.width * 0.76,
      startX + paneBox!.width * 0.16,
    );
    const endY = Math.min(
      paneBox!.y + paneBox!.height * 0.82,
      startY + paneBox!.height * 0.22,
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 14 });
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          [
            (await secondAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await secondSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await secondCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
          ].join(":"),
        {
          timeout: 10_000,
        },
      )
      .not.toBe(initialSecondPaneFrames);
  });

  test("clicking another MPR viewport transfers the sync source immediately", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await setViewportMprLayout(page, "left1Right2");
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await setViewportMprLayout(page, "top1Bottom2");
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    const firstCoronalPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );
    const firstAxialPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="axial"]',
    );
    const firstSagittalPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="sagittal"]',
    );
    const secondCoronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstCoronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(firstCoronalPane).toHaveAttribute(
      "data-pane-selected",
      "true",
    );

    await page.getByTestId("viewport-tool-referenceLines").click();
    await expect(secondViewportStage).not.toHaveAttribute(
      "data-crosshair-sync-applied-id",
      "0",
    );

    const baselineFirstPaneFrames = [
      (await firstAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await firstSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await firstCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
    ].join(":");

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await expect(secondViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "false",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );

    await secondCoronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(secondCoronalPane).toHaveAttribute(
      "data-pane-selected",
      "true",
    );
    await expect(secondCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(firstCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );

    const secondPaneBox = await secondCoronalPane.boundingBox();

    expect(secondPaneBox).toBeTruthy();

    const startX = secondPaneBox!.x + secondPaneBox!.width * 0.5;
    const startY = secondPaneBox!.y + secondPaneBox!.height * 0.5;
    const endY = Math.min(
      secondPaneBox!.y + secondPaneBox!.height * 0.82,
      startY + secondPaneBox!.height * 0.22,
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 14 });
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          [
            (await firstAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await firstSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await firstCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
          ].join(":"),
        {
          timeout: 10_000,
        },
      )
      .not.toBe(baselineFirstPaneFrames);
  });
});
