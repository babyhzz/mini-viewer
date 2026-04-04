import { expect, test } from "@playwright/test";
import {
  openDesktopViewer,
  setViewportLayout,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

  test("home page loads navigator and renders an active viewport @smoke", async ({
    page,
  }) => {
    await waitForViewerReady(page);
    const viewportGrid = page.getByTestId("viewport-grid");
    const seriesCards = page.getByTestId("series-card");
    const viewportStage = page.getByTestId("viewport-stage");
    const frameIndicator = page.getByTestId("viewport-frame-indicator");
    const firstImageCount = Number(
      (await seriesCards.first().getAttribute("data-image-count")) ?? "0",
    );

    await expect(viewportGrid).toHaveAttribute("data-layout-id", "1x1");
    await expect(viewportGrid).toHaveAttribute("data-layout-count", "1");
    await expect(page.getByTestId("thumbnail-canvas").first()).toBeVisible();
    await expect(page.getByTestId("viewport-toolbar")).toBeVisible();
    await expect(page.getByTestId("viewport-tool-select")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("viewport-tool-zoom")).toBeVisible();
    await expect(page.getByTestId("viewport-tool-keyImage")).toBeVisible();
    await expect(
      page.getByTestId("viewport-window-preset-button"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-cine-button")).toBeVisible();
    await expect(page.getByTestId("viewport-view-action-fit")).toBeVisible();
    await expect(page.getByTestId("viewport-view-action-reset")).toBeVisible();
    await expect(
      page.getByTestId("viewport-view-action-rotateRight"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewport-image-layout-button"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-mpr-layout-button")).toBeVisible();
    await expect(
      page.getByTestId("viewport-sequence-sync-button"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-tool-group-measure")).toBeVisible();
    await expect(page.getByTestId("viewport-tool-group-roi")).toBeVisible();
    await expect(page.getByTestId("viewport-tool-referenceLines")).toBeVisible();
    await expect(page.getByTestId("viewport-tool-invert")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(
      page.getByTestId("viewport-annotation-manage-button"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewport-annotation-list-button"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-undo-button")).toBeVisible();
    await expect(page.getByTestId("viewport-redo-button")).toBeVisible();
    await expect(
      page.getByTestId("viewport-key-image-list-button"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-settings-button")).toBeVisible();
    await expect(page.getByTestId("viewport-overlay-top-left")).toBeVisible();
    await expect(page.getByTestId("viewport-overlay-top-right")).toBeVisible();
    await expect(
      page.getByTestId("viewport-overlay-bottom-left"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-scrollbar")).toBeVisible();
    await expect(frameIndicator).toContainText(`[1]/[${firstImageCount}]`);
    await expect(page.getByText("主视图加载失败")).toHaveCount(0);
    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(viewportStage).toHaveAttribute("data-invert-enabled", "false");
    await expect(viewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );
    await expect(page.getByTestId("viewport-tool-keyImage")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await expect(viewportStage).toHaveAttribute(
      "data-sequence-sync-state",
      "off",
    );
    await expect(page.getByTestId("viewport-scrollbar")).toHaveAttribute(
      "data-single-frame",
      String(firstImageCount === 1),
    );

    if (firstImageCount > 1) {
      await viewportStage.hover();
      await page.mouse.wheel(0, 320);
      await expect(viewportStage).not.toHaveAttribute("data-frame-index", "1");

      const nextFrameIndex = Number(
        (await viewportStage.getAttribute("data-frame-index")) ?? "0",
      );

      expect(nextFrameIndex).toBeGreaterThan(1);
      await expect(frameIndicator).toContainText(
        `[${nextFrameIndex}]/[${firstImageCount}]`,
      );
      await expect(page.getByTestId("viewport-scrollbar")).toHaveAttribute(
        "data-frame-index",
        String(nextFrameIndex),
      );
    }

    if ((await seriesCards.count()) > 1) {
      const secondCard = seriesCards.nth(1);
      const secondImageCount = Number(
        (await secondCard.getAttribute("data-image-count")) ?? "0",
      );

      await secondCard.click();
      await expect(viewportStage).toHaveAttribute("data-status", "ready", {
        timeout: 60_000,
      });
      await expect(frameIndicator).toContainText(`[1]/[${secondImageCount}]`);
    }
  });

  test("toolbar and dropdown icons share one rendered size system @smoke", async ({
    page,
  }) => {
    await waitForViewerReady(page);

    await page.getByTestId("viewport-window-preset-button").click();
    await expect(
      page.getByTestId("viewport-window-preset-option-default"),
    ).toBeVisible();

    const sizeMetrics = await page.evaluate(() => {
      const getMetrics = (selector: string) => {
        const element = document.querySelector(selector);

        if (!(element instanceof HTMLElement)) {
          throw new Error(`Missing element for selector: ${selector}`);
        }

        const style = window.getComputedStyle(element);

        return {
          width: style.width,
          height: style.height,
          fontSize: style.fontSize,
        };
      };

      return {
        toolbar: getMetrics(
          '[data-testid="viewport-tool-select"] .viewport-toolbar-icon',
        ),
        dropdown: getMetrics(
          ".viewport-toolbar-dropdown-tool-menu .viewport-tool-menu-option-icon",
        ),
      };
    });

    expect(sizeMetrics.dropdown).toEqual(sizeMetrics.toolbar);
  });

  test("layout switch expands to multiple auto-filled viewports", async ({
    page,
  }) => {
    const runtimeErrors: string[] = [];
    const runtimeWarnings: string[] = [];

    page.on("pageerror", (error) => {
      runtimeErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "warning" || message.type() === "error") {
        runtimeWarnings.push(message.text());
      }
    });

    await openDesktopViewer(page);

    await setViewportLayout(page, "2x2");

    const viewportGrid = page.getByTestId("viewport-grid");
    const viewportSlots = page.locator('[data-testid^="viewport-slot-"]');
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .locator('[data-testid="viewport-stage"]');
    const secondViewportTitle =
      (await page
        .getByTestId("viewport-slot-viewport-2")
        .getAttribute("data-series-title")) ?? "";

    await expect(viewportGrid).toHaveAttribute("data-layout-id", "2x2");
    await expect(viewportGrid).toHaveAttribute("data-layout-count", "4");
    await expect(viewportSlots).toHaveCount(4);
    await expect(page.getByTestId("viewport-stage")).toHaveCount(4);

    for (const viewportId of [
      "viewport-1",
      "viewport-2",
      "viewport-3",
      "viewport-4",
    ]) {
      await expect(
        page.getByTestId(`viewport-slot-${viewportId}`),
      ).not.toHaveAttribute("data-series-title", "");
    }

    expect(secondViewportTitle).toBeTruthy();

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
    expect(
      runtimeErrors.filter(
        (message) =>
          message.includes("isAttributeUsed") ||
          message.includes("Error compiling shader"),
      ),
    ).toEqual([]);
    expect(
      runtimeWarnings.filter((message) =>
        message.includes("Too many active WebGL contexts"),
      ),
    ).toEqual([]);
  });

  test("double click maximizes a viewport and restores the previous layout", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    await setViewportLayout(page, "2x2");

    const viewportGrid = page.getByTestId("viewport-grid");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .locator('[data-testid="viewport-stage"]');

    await expect(viewportGrid).toHaveAttribute("data-layout-id", "2x2");
    await expect(viewportGrid).toHaveAttribute("data-layout-count", "4");
    await expect(page.locator('[data-testid^="viewport-slot-"]')).toHaveCount(
      4,
    );

    await secondViewportStage.dblclick({
      position: {
        x: 36,
        y: 36,
      },
    });

    await expect(viewportGrid).toHaveAttribute("data-layout-id", "1x1");
    await expect(viewportGrid).toHaveAttribute("data-layout-count", "1");
    await expect(viewportGrid).toHaveAttribute(
      "data-maximized-viewport-id",
      "viewport-2",
    );
    await expect(page.locator('[data-testid^="viewport-slot-"]')).toHaveCount(
      1,
    );
    await expect(page.getByTestId("viewport-slot-viewport-2")).toHaveAttribute(
      "data-viewport-maximized",
      "true",
    );

    await secondViewportStage.dblclick({
      position: {
        x: 36,
        y: 36,
      },
    });

    await expect(viewportGrid).toHaveAttribute("data-layout-id", "2x2");
    await expect(viewportGrid).toHaveAttribute("data-layout-count", "4");
    await expect(viewportGrid).toHaveAttribute(
      "data-maximized-viewport-id",
      "",
    );
    await expect(page.locator('[data-testid^="viewport-slot-"]')).toHaveCount(
      4,
    );
  });

  test("image layout switches the selected viewport into a montage grid", async ({
    page,
  }) => {
    await openDesktopViewer(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const imageLayoutCells = page.getByTestId("viewport-image-layout-cell");
    const firstImageLayoutCanvas = page
      .getByTestId("viewport-image-layout-canvas")
      .first();
    const frameCount = Number(
      (await viewportStage.getAttribute("data-frame-count")) ?? "0",
    );
    const visibleCellCount = Math.min(4, frameCount);

    await page.getByTestId("viewport-image-layout-button").click();
    await page.getByTestId("viewport-image-layout-option-2x2").click();

    await expect(viewportStage).toHaveAttribute("data-image-layout-id", "2x2");
    await expect(viewportStage).toHaveAttribute("data-image-layout-count", "4");
    await expect(viewportStage).toHaveAttribute("data-cell-selection", "all");
    await expect(page.getByTestId("viewport-image-layout-grid")).toBeVisible();
    await expect(imageLayoutCells).toHaveCount(4);
    await expect(viewportStage).toHaveAttribute(
      "data-image-layout-start-frame",
      "1",
    );
    await expect(viewportStage).toHaveAttribute(
      "data-image-layout-end-frame",
      String(visibleCellCount),
    );
    await expect(page.getByTestId("viewport-frame-indicator")).toHaveCount(0);
    await expect(
      page.getByTestId("viewport-image-layout-cell-frame-indicator"),
    ).toHaveCount(visibleCellCount);
    await expect(
      imageLayoutCells
        .first()
        .getByTestId("viewport-image-layout-cell-overlay-top-left"),
    ).toBeVisible();
    await expect(
      imageLayoutCells
        .first()
        .getByTestId("viewport-image-layout-cell-frame-indicator"),
    ).toContainText(`[1]/[${frameCount}]`);
    await expect(firstImageLayoutCanvas).toHaveAttribute(
      "data-source-width",
      /[1-9]\d*/,
    );
    await expect(firstImageLayoutCanvas).toHaveAttribute(
      "data-source-height",
      /[1-9]\d*/,
    );

    const firstCanvasAspectMetrics = await firstImageLayoutCanvas.evaluate(
      (canvas) => {
        const rect = canvas.getBoundingClientRect();
        const cellRect = canvas.parentElement?.getBoundingClientRect() ?? rect;
        const sourceWidth = Number(
          canvas.getAttribute("data-source-width") ?? "0",
        );
        const sourceHeight = Number(
          canvas.getAttribute("data-source-height") ?? "0",
        );

        return {
          displayAspectRatio: rect.width / Math.max(rect.height, 1),
          sourceAspectRatio: sourceWidth / Math.max(sourceHeight, 1),
          widthFillRatio: rect.width / Math.max(cellRect.width, 1),
          heightFillRatio: rect.height / Math.max(cellRect.height, 1),
        };
      },
    );

    expect(
      Math.abs(
        firstCanvasAspectMetrics.displayAspectRatio -
          firstCanvasAspectMetrics.sourceAspectRatio,
      ),
    ).toBeLessThan(0.05);
    expect(
      Math.max(
        firstCanvasAspectMetrics.widthFillRatio,
        firstCanvasAspectMetrics.heightFillRatio,
      ),
    ).toBeGreaterThan(0.94);

    if (frameCount > 1) {
      const stageBox = await viewportStage.boundingBox();

      expect(stageBox).not.toBeNull();

      await viewportStage.click({
        position: {
          x: stageBox!.width * 0.75,
          y: stageBox!.height * 0.25,
        },
      });

      await expect(viewportStage).toHaveAttribute("data-cell-selection", "1");
      await expect(
        page.locator(
          '[data-testid="viewport-image-layout-cell"][data-cell-index="0"]',
        ),
      ).toHaveAttribute("data-cell-selected", "false");
      await expect(
        page.locator(
          '[data-testid="viewport-image-layout-cell"][data-cell-index="1"]',
        ),
      ).toHaveAttribute("data-cell-selected", "true");
      await expect(
        page
          .locator(
            '[data-testid="viewport-image-layout-cell"][data-cell-index="1"]',
          )
          .getByTestId("viewport-image-layout-cell-frame-indicator"),
      ).toContainText(`[2]/[${frameCount}]`);
    }

    if (frameCount > 4) {
      const scrollTopBefore = await page.evaluate(
        () => document.scrollingElement?.scrollTop ?? 0,
      );
      const stageBoxBefore = await viewportStage.boundingBox();

      await viewportStage.hover();
      await page.mouse.wheel(0, 320);

      const nextStartFrame = Number(
        (await viewportStage.getAttribute("data-image-layout-start-frame")) ??
          "0",
      );
      const nextEndFrame = Number(
        (await viewportStage.getAttribute("data-image-layout-end-frame")) ??
          "0",
      );

      expect(nextStartFrame).toBeGreaterThan(1);
      expect(nextEndFrame).toBeGreaterThan(nextStartFrame);
      await expect(
        imageLayoutCells
          .first()
          .getByTestId("viewport-image-layout-cell-frame-indicator"),
      ).toContainText(`[${nextStartFrame}]/[${frameCount}]`);

      const scrollTopAfter = await page.evaluate(
        () => document.scrollingElement?.scrollTop ?? 0,
      );
      const stageBoxAfter = await viewportStage.boundingBox();

      expect(scrollTopAfter).toBe(scrollTopBefore);
      expect(stageBoxBefore).not.toBeNull();
      expect(stageBoxAfter).not.toBeNull();
      expect(Math.abs(stageBoxAfter!.x - stageBoxBefore!.x)).toBeLessThan(1);
      expect(Math.abs(stageBoxAfter!.y - stageBoxBefore!.y)).toBeLessThan(1);
    }
  });
});
