import { expect, test } from "@playwright/test";
import {
  scrollViewportFrames,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

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
});
