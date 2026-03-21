import { expect, test } from "@playwright/test";

async function waitForViewerReady(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Series Navigator" }),
  ).toBeVisible();
  await expect(page.getByTestId("series-card").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("viewport-stage")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 60_000 },
  );
}

test.describe("DICOM viewer smoke coverage", () => {
  test("hierarchy api exposes the local study tree", async ({ request }) => {
    const response = await request.get("/api/hierarchy");

    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/json");

    const payload = (await response.json()) as {
      generatedAt: string;
      studies: Array<{
        studyId: string;
        title: string;
        series: Array<{
          seriesId: string;
          title: string;
          images: Array<{
            dicomUrl: string;
            filePath: string;
            instanceNumber?: number;
          }>;
        }>;
      }>;
    };

    expect(payload.generatedAt).toBeTruthy();
    expect(payload.studies.length).toBeGreaterThan(0);
    expect(payload.studies[0].studyId).toBeTruthy();
    expect(payload.studies[0].title).toBeTruthy();
    expect(payload.studies[0].title).not.toBe(payload.studies[0].studyId);
    expect(payload.studies[0].series.length).toBeGreaterThan(0);
    expect(payload.studies[0].series[0].seriesId).toBeTruthy();
    expect(payload.studies[0].series[0].title).toBeTruthy();
    expect(payload.studies[0].series[0].title).not.toBe(
      payload.studies[0].series[0].seriesId,
    );
    expect(payload.studies[0].series[0].images.length).toBeGreaterThan(0);
    expect(payload.studies[0].series[0].images[0].dicomUrl).toContain("/api/dicom");

    const sortableSeries = payload.studies
      .flatMap((study) => study.series)
      .find((series) =>
        series.images.filter((image) => image.instanceNumber != null).length >= 2,
      );

    expect(sortableSeries).toBeTruthy();

    const instanceNumbers = sortableSeries!.images
      .map((image) => image.instanceNumber)
      .filter((value): value is number => value != null);

    expect(instanceNumbers.length).toBeGreaterThan(1);

    for (let index = 1; index < instanceNumbers.length; index += 1) {
      expect(instanceNumbers[index]).toBeGreaterThanOrEqual(
        instanceNumbers[index - 1],
      );
    }
  });

  test("settings api exposes the default overlay configuration", async ({
    request,
  }) => {
    const response = await request.get("/api/settings");

    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as {
      schemaVersion: number;
      viewportOverlay: {
        schemaVersion: number;
        corners: Record<string, Array<{ id: string; tagKey: string }>>;
      };
    };

    expect(payload.schemaVersion).toBe(1);
    expect(payload.viewportOverlay.schemaVersion).toBe(1);
    expect(payload.viewportOverlay.corners.topLeft.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.topRight.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.bottomLeft.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.bottomRight.length).toBeGreaterThan(0);
  });

  test("home page loads navigator and renders an active viewport", async ({
    page,
  }) => {
    await waitForViewerReady(page);
    const seriesCards = page.getByTestId("series-card");
    const viewportStage = page.getByTestId("viewport-stage");
    const activeTitle = page.getByTestId("viewport-title");
    const frameIndicator = page.getByTestId("viewport-frame-indicator");
    const firstSeriesTitle =
      (await seriesCards.first().getAttribute("data-series-title")) ?? "";
    const firstImageCount = Number(
      (await seriesCards.first().getAttribute("data-image-count")) ?? "0",
    );

    await expect(activeTitle).toHaveText(firstSeriesTitle);
    await expect(page.getByTestId("thumbnail-canvas").first()).toBeVisible();
    await expect(page.getByTestId("viewport-toolbar")).toBeVisible();
    await expect(page.getByTestId("viewport-tool-select")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      page.getByTestId("viewport-tool-group-measure"),
    ).toBeVisible();
    const roiGroup = page.getByTestId("viewport-tool-group-roi");

    if (await roiGroup.count()) {
      await expect(roiGroup).toBeVisible();
    } else {
      await expect(page.getByTestId("viewport-tool-overflow")).toBeVisible();
    }
    const invertButton = page.getByTestId("viewport-tool-invert");

    if (await invertButton.count()) {
      await expect(invertButton).toHaveAttribute("aria-pressed", "false");
    } else {
      await expect(page.getByTestId("viewport-tool-overflow")).toBeVisible();
    }
    await expect(
      page.getByTestId("viewport-annotation-manage-button"),
    ).toBeVisible();
    await expect(page.getByTestId("viewport-annotation-list-button")).toBeVisible();
    await expect(page.getByTestId("viewport-settings-button")).toBeVisible();
    await expect(page.getByTestId("viewport-overlay-top-left")).toBeVisible();
    await expect(page.getByTestId("viewport-overlay-top-right")).toBeVisible();
    await expect(page.getByTestId("viewport-overlay-bottom-left")).toBeVisible();
    await expect(frameIndicator).toContainText(`[1]/[${firstImageCount}]`);
    await expect(page.getByText("主视图加载失败")).toHaveCount(0);
    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(viewportStage).toHaveAttribute("data-invert-enabled", "false");
    await expect(viewportStage).toHaveAttribute("data-viewport-selected", "true");

    if (firstImageCount > 1) {
      await viewportStage.hover();
      await page.mouse.wheel(0, 320);
      await expect(viewportStage).toHaveAttribute("data-frame-index", "2");
      await expect(frameIndicator).toContainText(`[2]/[${firstImageCount}]`);
    }

    if ((await seriesCards.count()) > 1) {
      const secondCard = seriesCards.nth(1);
      const secondSeriesTitle =
        (await secondCard.getAttribute("data-series-title")) ?? "";
      const secondImageCount = Number(
        (await secondCard.getAttribute("data-image-count")) ?? "0",
      );

      await secondCard.click();
      await expect(activeTitle).toHaveText(secondSeriesTitle);
      await expect(viewportStage).toHaveAttribute("data-status", "ready", {
        timeout: 60_000,
      });
      await expect(frameIndicator).toContainText(`[1]/[${secondImageCount}]`);
    }
  });

  test("settings drawer opens with quick navigation and overlay sections", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-settings-button").click();

    await expect(page.getByText("Viewer Settings")).toBeVisible();
    await expect(page.getByText("快捷导航")).toBeVisible();
    await expect(page.getByRole("button", { name: "四角信息" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "四角信息" }),
    ).toBeVisible();
    await expect(page.getByText("左上角")).toBeVisible();
    await expect(page.getByText("右下角")).toBeVisible();
    await expect(page.getByRole("button", { name: "保存设置" })).toBeVisible();
    await expect(page.getByRole("button", { name: "恢复默认" })).toBeVisible();

    await page.getByTestId("viewer-settings-edit-topLeft-0").click();
    await expect(page.getByText("编辑左上角信息项")).toBeVisible();
    await expect(page.getByText("前缀", { exact: true })).toBeVisible();
    await page.getByTestId("viewer-settings-editor-done").click();
    await expect(page.getByText("编辑左上角信息项")).toHaveCount(0);

    const closeButton = page
      .locator(".viewer-settings-footer-actions .ant-btn")
      .first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(page.getByText("Viewer Settings")).toHaveCount(0);
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

    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x2").click();

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
      await expect(page.getByTestId(`viewport-slot-${viewportId}`)).not.toHaveAttribute(
        "data-series-title",
        "",
      );
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
    await expect(page.getByTestId("viewport-title")).toHaveText(secondViewportTitle);
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

  test("select tool is the default and left-drag scrolls the stack", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
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
    await expect(viewportStage).toHaveAttribute("data-viewport-selected", "true");

    if (frameCount > 1) {
      const startX = stageBox!.x + stageBox!.width * 0.5;
      const startY = stageBox!.y + stageBox!.height * 0.3;
      const endY = stageBox!.y + stageBox!.height * 0.7;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, endY, { steps: 12 });
      await page.mouse.up();

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
    await expect(viewportStage).toHaveAttribute("data-active-tool", "windowLevel");

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
    await expect(viewportStage).toHaveAttribute("data-frame-index", initialFrameIndex);
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

  test("measurement group switches tools and length measurement creates an annotation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const measureTrigger = page.getByTestId(
      "viewport-tool-group-measure-trigger",
    );
    const measureSelect = page.getByTestId("viewport-tool-group-measure-select");
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(viewportStage).toHaveAttribute(
      "data-active-annotation-count",
      "0",
    );

    await measureTrigger.click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "length");

    const startX = stageBox!.x + stageBox!.width * 0.35;
    const startY = stageBox!.y + stageBox!.height * 0.38;
    const endX = stageBox!.x + stageBox!.width * 0.66;
    const endY = stageBox!.y + stageBox!.height * 0.56;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).toHaveAttribute(
      "data-active-annotation-count",
      "1",
    );
    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");

    await measureSelect.selectOption("angle");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "angle");

    await measureSelect.selectOption("polyline");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "polyline");
    await expect(viewportStage).toHaveAttribute(
      "data-active-annotation-count",
      "0",
    );

    const polylineStartX = stageBox!.x + stageBox!.width * 0.28;
    const polylineStartY = stageBox!.y + stageBox!.height * 0.26;
    const polylineMidX = stageBox!.x + stageBox!.width * 0.42;
    const polylineMidY = stageBox!.y + stageBox!.height * 0.34;
    const polylineEndX = stageBox!.x + stageBox!.width * 0.56;
    const polylineEndY = stageBox!.y + stageBox!.height * 0.43;

    await page.mouse.click(polylineStartX, polylineStartY);
    await page.mouse.click(polylineMidX, polylineMidY);
    await page.mouse.dblclick(polylineEndX, polylineEndY);

    await expect(viewportStage).toHaveAttribute(
      "data-active-annotation-count",
      "1",
    );
    await expect(viewportStage).toHaveAttribute("data-annotation-total", "2");

    await measureSelect.selectOption("freehand");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "freehand");
  });

  test("polyline text box drag keeps the annotation intact", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const measureSelect = page.getByTestId("viewport-tool-group-measure-select");
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await measureSelect.selectOption("polyline");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "polyline");

    const startX = stageBox!.x + stageBox!.width * 0.28;
    const startY = stageBox!.y + stageBox!.height * 0.26;
    const midX = stageBox!.x + stageBox!.width * 0.43;
    const midY = stageBox!.y + stageBox!.height * 0.35;
    const endX = stageBox!.x + stageBox!.width * 0.58;
    const endY = stageBox!.y + stageBox!.height * 0.43;

    await page.mouse.click(startX, startY);
    await page.mouse.click(midX, midY);
    await page.mouse.dblclick(endX, endY);

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");

    await page.getByTestId("viewport-annotation-list-button").click();
    const annotationItem = page.getByTestId("annotation-list-item").first();
    const annotationUID =
      (await annotationItem.getAttribute("data-annotation-uid")) ?? "";

    expect(annotationUID).toBeTruthy();

    await page.getByTestId("annotation-list-close").click();
    await expect(page.getByTestId("annotation-list-drawer")).toHaveCount(0);

    const textBox = viewportStage
      .locator(`[data-annotation-uid="${annotationUID}"]`)
      .first();

    await expect(textBox).toBeVisible();

    const textBoxBounds = await textBox.boundingBox();

    expect(textBoxBounds).not.toBeNull();

    const dragStartX = textBoxBounds!.x + textBoxBounds!.width / 2;
    const dragStartY = textBoxBounds!.y + textBoxBounds!.height / 2;

    await page.mouse.move(dragStartX, dragStartY);
    await page.mouse.down();
    await page.mouse.move(dragStartX + 72, dragStartY + 36, { steps: 8 });
    await page.mouse.up();

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");
    await page.getByTestId("viewport-annotation-list-button").click();
    await expect(page.getByTestId("annotation-list-item")).toHaveCount(1);
  });

  test("roi group switches tools and rectangle roi creates an annotation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const roiTrigger = page.getByTestId("viewport-tool-group-roi-trigger");
    const roiSelect = page.getByTestId("viewport-tool-group-roi-select");
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");
    await expect(viewportStage).toHaveAttribute(
      "data-active-annotation-count",
      "0",
    );

    await roiTrigger.click();
    await expect(viewportStage).toHaveAttribute(
      "data-active-tool",
      "rectangleRoi",
    );

    const startX = stageBox!.x + stageBox!.width * 0.3;
    const startY = stageBox!.y + stageBox!.height * 0.28;
    const endX = stageBox!.x + stageBox!.width * 0.58;
    const endY = stageBox!.y + stageBox!.height * 0.48;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).toHaveAttribute(
      "data-active-annotation-count",
      "1",
    );
    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");

    await roiSelect.selectOption("ellipseRoi");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "ellipseRoi");

    await roiSelect.selectOption("circleRoi");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "circleRoi");
  });

  test("annotation manager and list support selection, deletion, and clear-all", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const measureTrigger = page.getByTestId(
      "viewport-tool-group-measure-trigger",
    );
    const measureSelect = page.getByTestId("viewport-tool-group-measure-select");
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await measureTrigger.click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "length");

    const lengthStartX = stageBox!.x + stageBox!.width * 0.32;
    const lengthStartY = stageBox!.y + stageBox!.height * 0.36;
    const lengthEndX = stageBox!.x + stageBox!.width * 0.64;
    const lengthEndY = stageBox!.y + stageBox!.height * 0.52;

    await page.mouse.move(lengthStartX, lengthStartY);
    await page.mouse.down();
    await page.mouse.move(lengthEndX, lengthEndY, { steps: 10 });
    await page.mouse.up();

    await measureSelect.selectOption("polyline");
    await expect(viewportStage).toHaveAttribute("data-active-tool", "polyline");

    const polylineStartX = stageBox!.x + stageBox!.width * 0.26;
    const polylineStartY = stageBox!.y + stageBox!.height * 0.24;
    const polylineMidX = stageBox!.x + stageBox!.width * 0.41;
    const polylineMidY = stageBox!.y + stageBox!.height * 0.33;
    const polylineEndX = stageBox!.x + stageBox!.width * 0.57;
    const polylineEndY = stageBox!.y + stageBox!.height * 0.41;

    await page.mouse.click(polylineStartX, polylineStartY);
    await page.mouse.click(polylineMidX, polylineMidY);
    await page.mouse.dblclick(polylineEndX, polylineEndY);

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "2");

    await page.getByTestId("viewport-annotation-list-button").click();
    await expect(page.getByTestId("annotation-list-drawer")).toBeVisible();
    await expect(page.getByTestId("annotation-list-item")).toHaveCount(2);

    const secondItem = page.getByTestId("annotation-list-item").nth(1);
    const secondAnnotationUID =
      (await secondItem.getAttribute("data-annotation-uid")) ?? "";

    expect(secondAnnotationUID).toBeTruthy();

    await page
      .getByTestId(`annotation-list-select-${secondAnnotationUID}`)
      .click();

    await expect(viewportStage).toHaveAttribute(
      "data-selected-annotation-count",
      "1",
    );
    await expect(secondItem).toHaveAttribute("data-selected", "true");

    await page.getByTestId("annotation-list-close").click();
    await page.getByTestId("viewport-annotation-manage-button").click();
    await page.getByTestId("viewport-annotation-delete-selected").click();

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");

    await page.getByTestId("viewport-annotation-list-button").click();
    await expect(page.getByTestId("annotation-list-item")).toHaveCount(1);

    await page.getByTestId("annotation-list-clear-all").click();
    const clearAllDialog = page
      .getByRole("dialog")
      .filter({ hasText: "清空当前视口全部图元？" });
    await expect(clearAllDialog).toBeVisible();
    await clearAllDialog.getByRole("button", { name: "清空全部" }).click();

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "0");
    await expect(
      page.getByTestId("annotation-list-empty"),
    ).toBeVisible();
  });

  test("desktop layout keeps both panels fully visible without page clipping", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="viewer-shell"]');
      const sidebar = document.querySelector('[data-testid="sidebar-panel"]');
      const viewportPanel = document.querySelector('[data-testid="viewport-panel"]');

      function box(element: Element | null) {
        if (!element) {
          return null;
        }

        const rect = element.getBoundingClientRect();

        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      }

      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        shell: box(shell),
        sidebar: box(sidebar),
        viewportPanel: box(viewportPanel),
      };
    });

    expect(metrics.shell).not.toBeNull();
    expect(metrics.sidebar).not.toBeNull();
    expect(metrics.viewportPanel).not.toBeNull();
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.shell!.top).toBeGreaterThanOrEqual(0);
    expect(metrics.shell!.left).toBeGreaterThanOrEqual(0);
    expect(metrics.shell!.right).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.shell!.bottom).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.sidebar!.bottom).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.viewportPanel!.bottom).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.viewportPanel!.right).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.shell!.top).toBeLessThanOrEqual(1);
    expect(metrics.shell!.left).toBeLessThanOrEqual(1);
    expect(metrics.shell!.right).toBeGreaterThanOrEqual(metrics.innerWidth - 1);
    expect(metrics.shell!.bottom).toBeGreaterThanOrEqual(metrics.innerHeight - 1);
  });

  test("13-inch mac layout stays dense and flat", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await waitForViewerReady(page);

    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="sidebar-panel"]');
      const viewportPanel = document.querySelector('[data-testid="viewport-panel"]');
      const firstCard = document.querySelector('[data-testid="series-card"]');
      const thumb = document.querySelector(".thumbnail-frame");

      function rect(element: Element | null) {
        if (!element) {
          return null;
        }

        const box = element.getBoundingClientRect();

        return {
          width: box.width,
          height: box.height,
          bottom: box.bottom,
          right: box.right,
        };
      }

      function styles(element: Element | null) {
        if (!element) {
          return null;
        }

        const computed = getComputedStyle(element);

        return {
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
        };
      }

      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        sidebar: rect(sidebar),
        viewportPanel: rect(viewportPanel),
        firstCard: rect(firstCard),
        thumb: rect(thumb),
        sidebarStyles: styles(sidebar),
        viewportStyles: styles(viewportPanel),
      };
    });

    expect(metrics.sidebar).not.toBeNull();
    expect(metrics.viewportPanel).not.toBeNull();
    expect(metrics.thumb).not.toBeNull();
    expect(metrics.firstCard).not.toBeNull();
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(metrics.sidebar!.width).toBeLessThanOrEqual(310);
    expect(metrics.thumb!.height).toBeLessThanOrEqual(74);
    expect(metrics.firstCard!.height).toBeLessThanOrEqual(110);
    expect(metrics.sidebar!.bottom).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.viewportPanel!.bottom).toBeLessThanOrEqual(metrics.innerHeight);
    expect(metrics.sidebarStyles?.borderRadius).toBe("0px");
    expect(metrics.viewportStyles?.borderRadius).toBe("0px");
    expect(metrics.sidebarStyles?.boxShadow).toBe("none");
    expect(metrics.viewportStyles?.boxShadow).toBe("none");
  });

  test("viewport responds to resize without losing readiness", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const initialViewportSize =
      (await viewportStage.getAttribute("data-viewport-size")) ?? "";

    await page.setViewportSize({ width: 1180, height: 760 });
    await expect(viewportStage).toHaveAttribute("data-status", "ready");
    await expect(viewportStage).not.toHaveAttribute(
      "data-viewport-size",
      initialViewportSize,
    );
    await expect(page.getByTestId("viewport-frame-indicator")).toBeVisible();
  });

  test("narrow layout stacks panels without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForViewerReady(page);

    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="sidebar-panel"]');
      const viewportPanel = document.querySelector('[data-testid="viewport-panel"]');

      function box(element: Element | null) {
        if (!element) {
          return null;
        }

        const rect = element.getBoundingClientRect();

        return {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      }

      return {
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        sidebar: box(sidebar),
        viewportPanel: box(viewportPanel),
      };
    });

    expect(metrics.sidebar).not.toBeNull();
    expect(metrics.viewportPanel).not.toBeNull();
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.sidebar!.width).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.viewportPanel!.width).toBeLessThanOrEqual(metrics.innerWidth);
    expect(metrics.viewportPanel!.top).toBeGreaterThan(metrics.sidebar!.bottom - 1);

    await page.getByTestId("viewport-panel").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("viewport-stage")).toBeVisible();
  });
});
