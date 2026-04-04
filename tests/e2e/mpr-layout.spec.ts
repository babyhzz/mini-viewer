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

  test("selected viewports can switch into independent MPR layouts @smoke", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    await setViewportLayout(page, "2x2");

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");

    await setViewportMprLayout(page, "left1Right2");

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

    await setViewportMprLayout(page, "top1Bottom2");

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

    await setViewportMprLayout(page, "off");

    await expect(secondViewportStage).toHaveAttribute(
      "data-view-mode",
      "stack",
    );
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(0);
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
  });

  test("MPR slab menu accepts a custom thickness value", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");

    await setViewportMprLayout(page, "left1Right2");
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
});
