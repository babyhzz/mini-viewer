import { expect, test } from "@playwright/test";
import {
  openDesktopViewer,
  runViewAction,
  selectToolbarTool,
  selectWindowPreset,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

  test("select tool is the default and left-drag scrolls the stack @smoke", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const viewportScrollbar = page.getByTestId("viewport-scrollbar");
    const viewportCanvas = viewportStage.locator(".viewport-canvas");
    const stageBox = await viewportStage.boundingBox();
    const frameCount = Number(
      (await viewportStage.getAttribute("data-frame-count")) ?? "0",
    );

    expect(stageBox).not.toBeNull();

    await expect(page.getByTestId("viewport-tool-select")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(viewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );
    await expect(viewportStage).toHaveAttribute(
      "data-select-scroll-active",
      "false",
    );
    await expect(viewportCanvas).toHaveCSS("cursor", "default");

    if (frameCount > 1) {
      const startX = stageBox!.x + stageBox!.width * 0.5;
      const startY = stageBox!.y + stageBox!.height * 0.3;
      const endY = stageBox!.y + stageBox!.height * 0.7;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, endY, { steps: 12 });
      await expect(viewportStage).toHaveAttribute(
        "data-select-scroll-active",
        "true",
      );
      await expect(viewportScrollbar).not.toHaveAttribute("data-frame-index", "1");
      await page.mouse.up();

      await expect(viewportStage).toHaveAttribute(
        "data-select-scroll-active",
        "false",
      );
      await expect(viewportStage).not.toHaveAttribute("data-frame-index", "1");
    }
  });

  test("pan tool drags the active image without resetting the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const panButton = page.getByTestId("viewport-tool-pan");
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await panButton.click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "pan");
    await expect(viewportStage).toHaveAttribute(
      "data-pan-offset",
      "0.00,0.00,0.00",
    );

    const startX = stageBox!.x + stageBox!.width / 2;
    const startY = stageBox!.y + stageBox!.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 80, startY + 56, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).not.toHaveAttribute(
      "data-pan-offset",
      "0.00,0.00,0.00",
    );
    await expect(viewportStage).toHaveAttribute("data-status", "ready");
  });

  test("window level tool adjusts VOI without switching slices", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const windowLevelButton = page.getByTestId("viewport-tool-windowLevel");
    const stageBox = await viewportStage.boundingBox();
    const initialWindowWidth =
      (await viewportStage.getAttribute("data-voi-window-width")) ?? "";
    const initialWindowCenter =
      (await viewportStage.getAttribute("data-voi-window-center")) ?? "";
    const initialFrameIndex =
      (await viewportStage.getAttribute("data-frame-index")) ?? "";

    expect(stageBox).not.toBeNull();
    expect(initialWindowWidth).not.toBe("na");
    expect(initialWindowCenter).not.toBe("na");

    await windowLevelButton.click();
    await expect(viewportStage).toHaveAttribute(
      "data-active-tool",
      "windowLevel",
    );

    const startX = stageBox!.x + stageBox!.width * 0.42;
    const startY = stageBox!.y + stageBox!.height * 0.42;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 96, startY + 64, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).not.toHaveAttribute(
      "data-voi-window-width",
      initialWindowWidth,
    );
    await expect(viewportStage).not.toHaveAttribute(
      "data-voi-window-center",
      initialWindowCenter,
    );
    await expect(viewportStage).toHaveAttribute(
      "data-frame-index",
      initialFrameIndex,
    );
  });

  test("zoom tool changes zoom and fit restores the initial framing", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const stageBox = await viewportStage.boundingBox();
    const initialZoom =
      (await viewportStage.getAttribute("data-view-zoom")) ?? "";

    expect(stageBox).not.toBeNull();
    expect(initialZoom).not.toBe("na");

    await selectToolbarTool(page, "zoom");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "zoom");

    const startX = stageBox!.x + stageBox!.width * 0.52;
    const startY = stageBox!.y + stageBox!.height * 0.52;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, startY - 140, { steps: 12 });
    await page.mouse.up();

    await expect(viewportStage).not.toHaveAttribute(
      "data-view-zoom",
      initialZoom,
    );

    await selectToolbarTool(page, "pan");
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 84, startY + 60, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).not.toHaveAttribute(
      "data-pan-offset",
      "0.00,0.00,0.00",
    );

    await runViewAction(page, "fit");

    await expect(viewportStage).toHaveAttribute(
      "data-pan-offset",
      "0.00,0.00,0.00",
    );
    await expect(viewportStage).toHaveAttribute("data-view-zoom", initialZoom);
  });

  test("window presets and view operations update the viewport presentation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const initialWindowWidth =
      (await viewportStage.getAttribute("data-voi-window-width")) ?? "";
    const initialWindowCenter =
      (await viewportStage.getAttribute("data-voi-window-center")) ?? "";

    expect(initialWindowWidth).not.toBe("na");
    expect(initialWindowCenter).not.toBe("na");

    await selectWindowPreset(page, "bone");

    await expect(viewportStage).toHaveAttribute(
      "data-voi-window-width",
      "2000.00",
    );
    await expect(viewportStage).toHaveAttribute(
      "data-voi-window-center",
      "350.00",
    );

    await runViewAction(page, "reset");

    await expect(viewportStage).toHaveAttribute(
      "data-voi-window-width",
      initialWindowWidth,
    );
    await expect(viewportStage).toHaveAttribute(
      "data-voi-window-center",
      initialWindowCenter,
    );

    await runViewAction(page, "rotateRight");

    await expect(viewportStage).toHaveAttribute("data-view-rotation", "90");

    await runViewAction(page, "reset");

    await expect(viewportStage).toHaveAttribute("data-view-rotation", "0");
    await expect(viewportStage).toHaveAttribute(
      "data-voi-window-width",
      initialWindowWidth,
    );
    await expect(viewportStage).toHaveAttribute(
      "data-voi-window-center",
      initialWindowCenter,
    );
  });

  test("invert acts as an immediate action without replacing the active tool", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const invertButton = page.getByTestId("viewport-tool-invert");
    const selectButton = page.getByTestId("viewport-tool-select");

    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(viewportStage).toHaveAttribute("data-invert-enabled", "false");
    await expect(invertButton).toHaveAttribute("aria-pressed", "false");

    await invertButton.click();

    await expect(viewportStage).toHaveAttribute("data-invert-enabled", "true");
    await expect(invertButton).toHaveAttribute("aria-pressed", "true");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(selectButton).toHaveAttribute("aria-pressed", "true");

    await invertButton.click();

    await expect(viewportStage).toHaveAttribute("data-invert-enabled", "false");
    await expect(invertButton).toHaveAttribute("aria-pressed", "false");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
  });
});
