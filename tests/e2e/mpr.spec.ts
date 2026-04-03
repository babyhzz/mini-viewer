import { expect, test } from "@playwright/test";
import { waitForViewerReady } from "./support/viewer-page";

test.describe("DICOM viewer smoke coverage", () => {
  test("selected viewports can switch into independent MPR layouts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x2").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-status",
      /ready|error/,
      {
        timeout: 60_000,
      },
    );
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-layout-id",
      "left1Right2",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-primary-tool",
      "crosshairs",
    );
    await expect(firstViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
    if ((await firstViewportStage.getAttribute("data-status")) === "ready") {
      await expect(
        firstViewportSlot.getByTestId("mpr-pane-scrollbar"),
      ).toHaveCount(3);
    }

    await secondViewportStage.click({
      position: {
        x: 36,
        y: 36,
      },
    });
    await expect(secondViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-status",
      /ready|error/,
      {
        timeout: 60_000,
      },
    );
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-layout-id",
      "top1Bottom2",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-primary-tool",
      "crosshairs",
    );
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
    if ((await secondViewportStage.getAttribute("data-status")) === "ready") {
      await expect(
        secondViewportSlot.getByTestId("mpr-pane-scrollbar"),
      ).toHaveCount(3);
    }
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-layout-id",
      "left1Right2",
    );

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-off").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-view-mode",
      "stack",
    );
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(0);
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
  });

  test("selected MPR viewports keep independent slab mode and thickness", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const firstViewportSlabHud = firstViewportSlot.getByTestId("mpr-slab-hud");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlabHud = secondViewportSlot.getByTestId("mpr-slab-hud");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(firstViewportSlabHud).toHaveAttribute("data-slab-mode", "none");
    await expect(firstViewportSlabHud).toHaveAttribute("data-pane-id", "axial");
    await expect(firstViewportSlabHud).toContainText("AX");
    await expect(firstViewportSlabHud).toContainText("普通");
    await expect(firstViewportSlabHud).toContainText("单层");

    await firstViewportSlot
      .locator('[data-testid="mpr-pane"][data-pane-id="sagittal"]')
      .click({
        position: {
          x: 24,
          y: 24,
        },
      });
    await expect(firstViewportSlabHud).toHaveAttribute(
      "data-pane-id",
      "sagittal",
    );
    await expect(firstViewportSlabHud).toContainText("SA");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-mip").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-20").click();

    await expect(firstViewportStage).toHaveAttribute("data-mpr-slab-mode", "mip");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
    await expect(firstViewportSlabHud).toHaveAttribute("data-slab-mode", "mip");
    await expect(firstViewportSlabHud).toHaveAttribute(
      "data-slab-value",
      "20 mm",
    );
    await expect(firstViewportSlabHud).toContainText("MIP");
    await expect(firstViewportSlabHud).toContainText("20 mm");

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();

    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "none",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );
    await expect(secondViewportSlabHud).toHaveAttribute("data-slab-mode", "none");
    await expect(secondViewportSlabHud).toHaveAttribute("data-pane-id", "axial");
    await expect(secondViewportSlabHud).toContainText("AX");
    await expect(secondViewportSlabHud).toContainText("单层");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-average").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-5").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "5",
    );
    await expect(secondViewportSlabHud).toHaveAttribute(
      "data-slab-mode",
      "average",
    );
    await expect(secondViewportSlabHud).toHaveAttribute(
      "data-slab-value",
      "5 mm",
    );
    await expect(secondViewportSlabHud).toContainText("平均");
    await expect(secondViewportSlabHud).toContainText("5 mm");
    await expect(firstViewportStage).toHaveAttribute("data-mpr-slab-mode", "mip");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
  });

  test("MPR slab menu can sync projection to all MPR viewports and reset a single viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
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
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-minip").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-40").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-apply-all").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "minip",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "40",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "minip",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "40",
    );

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-reset").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "none",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "minip",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "40",
    );
  });

  test("MPR slab menu accepts a custom thickness value", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(viewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(viewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-custom-thickness").click();

    const thicknessDialog = page.getByTestId("mpr-slab-custom-thickness-dialog");
    await expect(thicknessDialog).toBeVisible();

    const thicknessInput = thicknessDialog.getByRole("spinbutton");
    await thicknessInput.fill("7.5");
    await page.getByTestId("mpr-slab-custom-thickness-submit").click();

    await expect(viewportStage).toHaveAttribute("data-mpr-slab-thickness", "7.5");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await expect(
      page.getByTestId("viewport-mpr-slab-thickness-option-custom-current"),
    ).toBeVisible();
  });

  test("MPR slab linked sync only updates MPR viewports in the same linked group", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x2").click();

    const firstViewportStage = page
      .getByTestId("viewport-slot-viewport-1")
      .getByTestId("viewport-stage");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .getByTestId("viewport-stage");
    const thirdViewportStage = page
      .getByTestId("viewport-slot-viewport-3")
      .getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();
    const thirdSeriesCard = page.getByTestId("series-card").nth(2);

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

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

    await thirdViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await thirdSeriesCard.click();
    await expect(thirdViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await thirdViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(thirdViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(thirdViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-average").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-20").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-apply-linked").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
    await expect(thirdViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "none",
    );
    await expect(thirdViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );
  });

  test("reference lines project the selected stack slice into another MPR viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

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

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

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

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
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

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
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

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
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

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
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
