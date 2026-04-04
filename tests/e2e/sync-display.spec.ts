import { expect, test } from "@playwright/test";
import {
  openDesktopViewer,
  selectWindowPreset,
  setViewportLayout,
  toggleSequenceSync,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
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
