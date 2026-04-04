import { expect, test } from "@playwright/test";
import {
  clearSequenceSync,
  openDesktopViewer,
  scrollViewportFrames,
  selectWindowPreset,
  setViewportLayout,
  toggleSequenceSync,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

  test("same-study stack viewports sync by slice position", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    await setViewportLayout(page, "2x1");

    const firstViewportStage = page
      .getByTestId("viewport-slot-viewport-1")
      .getByTestId("viewport-stage");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .getByTestId("viewport-stage");
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
    await toggleSequenceSync(page, "sameStudy");
    await expect(firstViewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "sameStudy",
    );

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await toggleSequenceSync(page, "sameStudy");
    await expect(secondViewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "sameStudy",
    );

    await firstViewportStage.click({
      position: {
        x: 36,
        y: 36,
      },
    });
    await page.mouse.wheel(0, 640);

    await expect(firstViewportStage).not.toHaveAttribute(
      "data-frame-index",
      "1",
    );
    const syncedFrameIndex =
      await firstViewportStage.getAttribute("data-frame-index");

    await expect(secondViewportStage).toHaveAttribute(
      "data-frame-index",
      syncedFrameIndex ?? "1",
    );
  });

  test("cross-study stack viewports sync after calibration", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    await setViewportLayout(page, "2x1");

    const firstViewportStage = page
      .getByTestId("viewport-slot-viewport-1")
      .getByTestId("viewport-stage");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .getByTestId("viewport-stage");
    const thirdSeriesCard = page.getByTestId("series-card").nth(2);

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await thirdSeriesCard.click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await scrollViewportFrames(page, firstViewportStage, 960, 18);
    await expect(firstViewportStage).not.toHaveAttribute(
      "data-frame-index",
      "1",
    );

    await scrollViewportFrames(page, secondViewportStage, 960, 3);
    await expect(secondViewportStage).not.toHaveAttribute(
      "data-frame-index",
      "1",
    );

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await toggleSequenceSync(page, "crossStudy");
    await expect(firstViewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "crossStudy",
    );

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await toggleSequenceSync(page, "crossStudy");
    await expect(secondViewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "crossStudy",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-cross-study-calibration-count",
      "1",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-cross-study-calibration-count",
      "1",
    );

    const firstViewportFrameIndexBefore =
      (await firstViewportStage.getAttribute("data-frame-index")) ?? "0";
    const secondViewportFrameIndexBefore =
      (await secondViewportStage.getAttribute("data-frame-index")) ?? "0";

    await scrollViewportFrames(page, secondViewportStage, -960, 2);

    await expect(secondViewportStage).not.toHaveAttribute(
      "data-frame-index",
      secondViewportFrameIndexBefore,
    );
    await expect(firstViewportStage).not.toHaveAttribute(
      "data-frame-index",
      firstViewportFrameIndexBefore,
    );
  });

  test("same-study and cross-study sync can be enabled together", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    const viewportStage = page.getByTestId("viewport-stage");

    await toggleSequenceSync(page, "sameStudy");
    await expect(viewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "sameStudy",
    );

    await toggleSequenceSync(page, "crossStudy");
    await expect(viewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "sameStudy,crossStudy",
    );

    await clearSequenceSync(page);
    await expect(viewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "off",
    );
  });

  test("display sync propagates zoom pan and VOI presentation", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    await setViewportLayout(page, "2x1");

    const firstViewportStage = page
      .getByTestId("viewport-slot-viewport-1")
      .getByTestId("viewport-stage");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .getByTestId("viewport-stage");

    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await toggleSequenceSync(page, "display");
    await expect(firstViewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "display",
    );

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await toggleSequenceSync(page, "display");
    await expect(secondViewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "display",
    );

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await selectWindowPreset(page, "lung");

    await expect(firstViewportStage).toHaveAttribute(
      "data-voi-window-width",
      "1500.00",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-voi-window-center",
      "-600.00",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-voi-window-width",
      "1500.00",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-voi-window-center",
      "-600.00",
    );
  });
});
