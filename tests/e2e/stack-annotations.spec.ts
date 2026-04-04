import { expect, test } from "@playwright/test";
import { waitForViewerReady } from "./support/viewer-page";
import {
  createViewerSettingsFixture,
  mockDefaultViewerSettings,
  mockViewerSettings,
} from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
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
  }) => {
    await mockViewerSettings(
      page,
      createViewerSettingsFixture((settings) => {
        settings.toolbarShortcuts.bindings.redo = {
          code: "KeyY",
          ctrlKey: false,
          altKey: false,
          shiftKey: false,
          metaKey: false,
        };

        return settings;
      }),
    );

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
    await page.mouse.move(
      stageBox!.x + stageBox!.width * 0.68,
      stageBox!.y + stageBox!.height * 0.58,
    );
    await page.mouse.down();
    await page.mouse.move(
      stageBox!.x + stageBox!.width * 0.82,
      stageBox!.y + stageBox!.height * 0.76,
      {
        steps: 10,
      },
    );
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
