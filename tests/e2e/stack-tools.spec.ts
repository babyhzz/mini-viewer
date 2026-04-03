import { expect, test } from "@playwright/test";
import { waitForViewerReady, selectToolbarTool, selectWindowPreset, runViewAction, scrollViewportFrames } from "./support/viewer-page";

test.describe("DICOM viewer smoke coverage", () => {
  test("cine tool can play and pause stack playback on the selected viewport", async ({
    page,
  }) => {
    await waitForViewerReady(page);

    const seriesCards = page.getByTestId("series-card");
    const viewportStage = page.getByTestId("viewport-stage");
    let cineCardIndex = -1;

    for (let index = 0; index < (await seriesCards.count()); index += 1) {
      const imageCount = Number(
        (await seriesCards.nth(index).getAttribute("data-image-count")) ?? "0",
      );

      if (imageCount > 1) {
        cineCardIndex = index;
        break;
      }
    }

    expect(cineCardIndex).toBeGreaterThanOrEqual(0);

    await seriesCards.nth(cineCardIndex).click();
    await expect(viewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(page.getByTestId("viewport-cine-button")).toBeEnabled();

    await page.getByTestId("viewport-cine-button").click();
    await page.getByTestId("viewport-cine-option-loop").click();
    await expect(viewportStage).toHaveAttribute("data-cine-loop", "false");

    await page.getByTestId("viewport-cine-button").click();
    await page.getByTestId("viewport-cine-option-fps-16").click();
    await expect(viewportStage).toHaveAttribute("data-cine-fps", "16");

    const initialFrameIndex = Number(
      (await viewportStage.getAttribute("data-frame-index")) ?? "0",
    );

    expect(initialFrameIndex).toBeGreaterThan(0);

    await page.getByTestId("viewport-cine-button").click();
    await page.getByTestId("viewport-cine-option-toggle").click();
    await expect(viewportStage).toHaveAttribute("data-cine-playing", "true");

    await expect
      .poll(
        async () =>
          Number((await viewportStage.getAttribute("data-frame-index")) ?? "0"),
        {
          timeout: 4_000,
        },
      )
      .toBeGreaterThan(initialFrameIndex);

    await page.getByTestId("viewport-cine-button").click();
    await page.getByTestId("viewport-cine-option-toggle").click();
    await expect(viewportStage).toHaveAttribute("data-cine-playing", "false");
  });

  test("key image action bookmarks the current frame and the drawer can jump to it", async ({
    page,
  }) => {
    await waitForViewerReady(page);

    const seriesCards = page.getByTestId("series-card");
    const viewportStage = page.getByTestId("viewport-stage");
    let targetCardIndex = -1;

    for (let index = 0; index < (await seriesCards.count()); index += 1) {
      const imageCount = Number(
        (await seriesCards.nth(index).getAttribute("data-image-count")) ?? "0",
      );

      if (imageCount > 2) {
        targetCardIndex = index;
        break;
      }
    }

    expect(targetCardIndex).toBeGreaterThanOrEqual(0);

    await seriesCards.nth(targetCardIndex).click();
    await expect(viewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await page.getByTestId("viewport-tool-keyImage").click();
    await expect(page.getByTestId("viewport-tool-keyImage")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await scrollViewportFrames(page, viewportStage, 320, 2);
    await expect(viewportStage).not.toHaveAttribute("data-frame-index", "1");

    await page.getByTestId("viewport-key-image-list-button").click();
    await expect(page.getByTestId("key-image-drawer")).toBeVisible();
    await expect(page.getByTestId("key-image-item")).toHaveCount(1);
    await page.getByTestId("key-image-select-1").click();
    await expect(viewportStage).toHaveAttribute("data-frame-index", "1");
    await page.getByTestId("key-image-delete-1").click();
    await expect(page.getByTestId("key-image-empty")).toBeVisible();
    await page.getByTestId("key-image-close").click();
  });

  test("dicom tag modal opens from shortcut and supports tag number/name search", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.route("**/api/dicom-tags?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          filePath: "mock-study/mock-series/image-1.dcm",
          fileName: "image-1.dcm",
          generatedAt: new Date().toISOString(),
          tagCount: 5,
          tags: [
            {
              id: "root/x00100010",
              nodeType: "element",
              tag: "00100010",
              displayTag: "(0010,0010)",
              name: "Patient Name",
              keyword: "PatientName",
              vr: "PN",
              value: "Demo^Patient",
              length: 12,
              children: [],
            },
            {
              id: "root/x00082112",
              nodeType: "element",
              tag: "00082112",
              displayTag: "(0008,2112)",
              name: "Source Image Sequence",
              keyword: "SourceImageSequence",
              vr: "SQ",
              value: "1 item",
              length: null,
              children: [
                {
                  id: "root/x00082112/item-1",
                  nodeType: "item",
                  tag: "item-1",
                  displayTag: "Item #1",
                  name: "Sequence Item",
                  keyword: null,
                  vr: "ITEM",
                  value: "2 tags",
                  length: null,
                  children: [
                    {
                      id: "root/x00082112/item-1/x00081150",
                      nodeType: "element",
                      tag: "00081150",
                      displayTag: "(0008,1150)",
                      name: "Referenced SOP Class UID",
                      keyword: "ReferencedSOPClassUID",
                      vr: "UI",
                      value: "1.2.840.10008.5.1.4.1.1.2",
                      length: 26,
                      children: [],
                    },
                    {
                      id: "root/x00082112/item-1/x00081155",
                      nodeType: "element",
                      tag: "00081155",
                      displayTag: "(0008,1155)",
                      name: "Referenced SOP Instance UID",
                      keyword: "ReferencedSOPInstanceUID",
                      vr: "UI",
                      value: "1.2.3.4.5",
                      length: 10,
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
    });

    await waitForViewerReady(page);

    await page.keyboard.press("F2");

    await expect(page.getByTestId("dicom-tag-modal")).toBeVisible();
    await expect(page.getByText("Patient Name")).toBeVisible();
    await expect(page.getByText("Demo^Patient")).toBeVisible();
    await expect(page.getByTestId("dicom-tag-count")).toHaveCount(0);

    const patientNameRow = page.locator("tr", { hasText: "Patient Name" });
    const sequenceRow = page.locator("tr", {
      hasText: "Source Image Sequence",
    });

    await expect(
      patientNameRow.locator(".ant-table-row-expand-icon"),
    ).toHaveCount(0);
    await expect(sequenceRow.locator(".ant-table-row-expand-icon")).toHaveCount(
      1,
    );

    const searchInput = page.getByPlaceholder("搜索 Tag 编号、名称或关键字");

    await searchInput.fill("00100010");
    await expect(page.getByText("Patient Name")).toBeVisible();
    await expect(page.getByText("Source Image Sequence")).toHaveCount(0);

    await searchInput.fill("Referenced SOP Instance UID");
    await expect(page.getByText("Referenced SOP Instance UID")).toBeVisible();
    await expect(page.getByText("Item #1")).toBeVisible();
    await expect(page.getByText("Source Image Sequence")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("dicom-tag-modal")).not.toBeVisible();
  });

  test("select tool is the default and left-drag scrolls the stack", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

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

  test("measurement group switches tools and length measurement creates an annotation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const measureTrigger = page.getByTestId(
      "viewport-tool-group-measure-trigger",
    );
    const measureMenuTrigger = page.getByTestId(
      "viewport-tool-group-measure-select",
    );
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

    await measureMenuTrigger.click();
    await page.getByTestId("viewport-tool-group-measure-option-angle").click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "angle");

    await measureMenuTrigger.click();
    await page
      .getByTestId("viewport-tool-group-measure-option-polyline")
      .click();
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

    await measureMenuTrigger.click();
    await page
      .getByTestId("viewport-tool-group-measure-option-freehand")
      .click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "freehand");
  });

  test("undo button and redo shortcut restore the latest annotation change", async ({
    page,
    request,
  }) => {
    const response = await request.get("/api/settings");
    const baseSettings = (await response.json()) as {
      schemaVersion: number;
      viewportOverlay: {
        schemaVersion: number;
        corners: Record<string, Array<{ id: string; tagKey: string }>>;
      };
      toolbarShortcuts: {
        schemaVersion: number;
        bindings: Record<
          string,
          {
            code: string;
            ctrlKey: boolean;
            altKey: boolean;
            shiftKey: boolean;
            metaKey: boolean;
          } | null
        >;
      };
    };

    baseSettings.toolbarShortcuts.bindings.redo = {
      code: "KeyY",
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
    };

    await page.route("**/api/settings", async (route, requestDetails) => {
      if (requestDetails.method() !== "GET") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(baseSettings),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const measureTrigger = page.getByTestId(
      "viewport-tool-group-measure-trigger",
    );
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await measureTrigger.click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "length");

    const startX = stageBox!.x + stageBox!.width * 0.36;
    const startY = stageBox!.y + stageBox!.height * 0.4;
    const endX = stageBox!.x + stageBox!.width * 0.64;
    const endY = stageBox!.y + stageBox!.height * 0.54;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");

    await page.getByTestId("viewport-undo-button").click();
    await expect(viewportStage).toHaveAttribute("data-annotation-total", "0");

    await page.keyboard.press("KeyY");

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "1");
  });

  test("polyline text box drag keeps the annotation intact", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");
    const measureMenuTrigger = page.getByTestId(
      "viewport-tool-group-measure-select",
    );
    const stageBox = await viewportStage.boundingBox();

    expect(stageBox).not.toBeNull();

    await measureMenuTrigger.click();
    await page
      .getByTestId("viewport-tool-group-measure-option-polyline")
      .click();
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
    const roiMenuTrigger = page.getByTestId("viewport-tool-group-roi-select");
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

    await roiMenuTrigger.click();
    await page.getByTestId("viewport-tool-group-roi-option-ellipseRoi").click();
    await expect(viewportStage).toHaveAttribute(
      "data-active-tool",
      "ellipseRoi",
    );
    await page.mouse.move(startX + 20, startY + 24);
    await page.mouse.down();
    await page.mouse.move(endX + 36, endY + 30, { steps: 10 });
    await page.mouse.up();

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "2");

    await roiMenuTrigger.click();
    await page.getByTestId("viewport-tool-group-roi-option-circleRoi").click();
    await expect(viewportStage).toHaveAttribute(
      "data-active-tool",
      "circleRoi",
    );
    await page.mouse.move(stageBox!.x + stageBox!.width * 0.68, stageBox!.y + stageBox!.height * 0.58);
    await page.mouse.down();
    await page.mouse.move(stageBox!.x + stageBox!.width * 0.82, stageBox!.y + stageBox!.height * 0.76, {
      steps: 10,
    });
    await page.mouse.up();

    await expect(viewportStage).toHaveAttribute("data-annotation-total", "3");
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
    const measureMenuTrigger = page.getByTestId(
      "viewport-tool-group-measure-select",
    );
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

    await measureMenuTrigger.click();
    await page
      .getByTestId("viewport-tool-group-measure-option-polyline")
      .click();
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
    await expect(page.getByTestId("annotation-list-empty")).toBeVisible();
  });
});
