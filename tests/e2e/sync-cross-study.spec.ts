import { expect, test } from "@playwright/test";
import {
  openDesktopViewer,
  scrollViewportFrames,
  setViewportLayout,
  toggleSequenceSync,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
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
});
