import { expect, test } from "@playwright/test";
import {
  openDesktopViewer,
  setViewportLayout,
  setViewportMprLayout,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

  test("selected MPR viewports keep independent slab mode and thickness", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const firstViewportSlabHud = firstViewportSlot.getByTestId("mpr-slab-hud");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlabHud = secondViewportSlot.getByTestId("mpr-slab-hud");

    await setViewportMprLayout(page, "left1Right2");

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
    await setViewportMprLayout(page, "top1Bottom2");

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

    await setViewportLayout(page, "2x1");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");

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

  test("MPR slab linked sync only updates MPR viewports in the same linked group", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await setViewportLayout(page, "2x2");

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

    await thirdViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await setViewportMprLayout(page, "left1Right2");
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
});
