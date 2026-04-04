import { expect, test } from "@playwright/test";
import {
  clearSequenceSync,
  openDesktopViewer,
  setViewportLayout,
  toggleSequenceSync,
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
});
