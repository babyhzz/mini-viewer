import { expect, test } from "@playwright/test";

async function waitForViewerReady(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Series Navigator" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("series-card").first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("viewport-stage")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 60_000 },
  );
}

async function toggleSequenceSync(
  page: import("@playwright/test").Page,
  syncType: "sameStudy" | "crossStudy" | "display",
) {
  await page.getByTestId("viewport-sequence-sync-button").click();
  await page.getByTestId(`viewport-sequence-sync-option-${syncType}`).click();
}

async function clearSequenceSync(page: import("@playwright/test").Page) {
  await page.getByTestId("viewport-sequence-sync-button").click();
  await page.getByTestId("viewport-sequence-sync-option-clear").click();
}

async function selectToolbarTool(
  page: import("@playwright/test").Page,
  toolId: string,
) {
  await page.getByTestId(`viewport-tool-${toolId}`).click();
}

async function selectWindowPreset(
  page: import("@playwright/test").Page,
  presetId: string,
) {
  await page.getByTestId("viewport-window-preset-button").click();
  await page.getByTestId(`viewport-window-preset-option-${presetId}`).click();
}

async function runViewAction(
  page: import("@playwright/test").Page,
  actionId: "fit" | "reset" | "rotateRight" | "flipHorizontal" | "flipVertical",
) {
  await page.getByTestId(`viewport-view-action-${actionId}`).click();
}

async function scrollViewportFrames(
  page: import("@playwright/test").Page,
  viewportStage: import("@playwright/test").Locator,
  deltaY: number,
  times: number,
) {
  await viewportStage.click({
    position: {
      x: 36,
      y: 36,
    },
  });

  for (let index = 0; index < times; index += 1) {
    await page.mouse.wheel(0, deltaY);
  }
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
    expect(payload.studies[0].series[0].images[0].dicomUrl).toContain(
      "/api/dicom",
    );

    const sortableSeries = payload.studies
      .flatMap((study) => study.series)
      .find(
        (series) =>
          series.images.filter((image) => image.instanceNumber != null)
            .length >= 2,
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
      toolbarShortcuts: {
        schemaVersion: number;
        bindings: Record<string, { code: string } | null>;
      };
      mprProjection: {
        schemaVersion: number;
        defaultSlabMode: string;
        defaultSlabThickness: number;
      };
    };

    expect(payload.schemaVersion).toBe(1);
    expect(payload.viewportOverlay.schemaVersion).toBe(1);
    expect(payload.viewportOverlay.corners.topLeft.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.topRight.length).toBeGreaterThan(0);
    expect(payload.viewportOverlay.corners.bottomLeft.length).toBeGreaterThan(
      0,
    );
    expect(payload.viewportOverlay.corners.bottomRight.length).toBeGreaterThan(
      0,
    );
    expect(payload.toolbarShortcuts.schemaVersion).toBe(1);
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("select");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("undo");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("redo");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("referenceLines");
    expect(payload.toolbarShortcuts.bindings.keyImage?.code).toBe("KeyK");
    expect(payload.toolbarShortcuts.bindings.dicomTag?.code).toBe("F2");
    expect(payload.toolbarShortcuts.bindings).toHaveProperty("settings");
    expect(payload.mprProjection.schemaVersion).toBe(1);
    expect(payload.mprProjection.defaultSlabMode).toBe("none");
    expect(payload.mprProjection.defaultSlabThickness).toBe(10);
  });

  test("dicom tags api returns the parsed tag tree for a real image", async ({
    request,
  }) => {
    const hierarchyResponse = await request.get("/api/hierarchy");
    const hierarchyPayload = (await hierarchyResponse.json()) as {
      studies: Array<{
        series: Array<{
          images: Array<{
            filePath: string;
          }>;
        }>;
      }>;
    };
    const firstImagePath =
      hierarchyPayload.studies[0]?.series[0]?.images[0]?.filePath ?? null;

    expect(firstImagePath).toBeTruthy();

    const response = await request.get(
      `/api/dicom-tags?path=${encodeURIComponent(firstImagePath!)}`,
    );

    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as {
      filePath: string;
      fileName: string;
      tagCount: number;
      tags: Array<{
        displayTag: string;
        name: string;
        vr: string;
        children: unknown[];
      }>;
    };

    expect(payload.filePath).toBe(firstImagePath);
    expect(payload.fileName).toBeTruthy();
    expect(payload.tagCount).toBeGreaterThan(0);
    expect(payload.tags.length).toBeGreaterThan(0);
    expect(payload.tags[0].displayTag).toMatch(/^\([0-9A-F]{4},[0-9A-F]{4}\)$/);
    expect(payload.tags[0].name).toBeTruthy();
    expect(payload.tags[0].vr).toBeTruthy();
    expect(Array.isArray(payload.tags[0].children)).toBeTruthy();
  });

  test("home page loads navigator and renders an active viewport", async ({
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

  test("settings drawer opens with quick navigation and overlay sections", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-settings-button").click();

    await expect(page.getByText("Viewer Settings")).toBeVisible();
    await expect(page.getByText("快捷导航")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "四角信息", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "MPR 投影", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "快捷键", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "四角信息" })).toBeVisible();
    await expect(page.getByText("左上角")).toBeVisible();
    await expect(page.getByText("右下角")).toBeVisible();
    await expect(page.getByRole("button", { name: "保存设置" })).toBeVisible();
    await expect(page.getByRole("button", { name: "恢复默认" })).toBeVisible();
    await page.getByRole("button", { name: "MPR 投影", exact: true }).click();
    await expect(
      page.getByTestId("viewer-settings-mpr-projection-section"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewer-settings-mpr-projection-mode"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewer-settings-mpr-projection-thickness"),
    ).toBeVisible();
    await page.getByRole("button", { name: "快捷键", exact: true }).click();
    await expect(
      page.getByTestId("viewer-settings-shortcuts-section"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewer-settings-shortcut-filter"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewer-settings-shortcut-group-basic"),
    ).toBeVisible();
    await expect(
      page.getByTestId("viewer-settings-shortcut-record-pan"),
    ).toBeVisible();

    await page.getByTestId("viewer-settings-edit-topLeft-0").click();
    await expect(page.getByText("编辑左上角信息项")).toBeVisible();
    await expect(page.getByText("前缀", { exact: true })).toBeVisible();
    await page.getByTestId("viewer-settings-editor-done").click();
    await expect(page.getByText("编辑左上角信息项")).toHaveCount(0);

    const panShortcutButton = page.getByTestId(
      "viewer-settings-shortcut-record-pan",
    );
    await panShortcutButton.click();
    await expect(page.getByText("正在录制 平移")).toBeVisible();
    await page.keyboard.press("Shift+K");
    await expect(panShortcutButton).toContainText("Shift + K");
    await page
      .getByTestId("viewer-settings-shortcut-filter")
      .getByText(/已修改/)
      .click();
    await expect(panShortcutButton).toBeVisible();

    const closeButton = page
      .locator(".viewer-settings-footer-actions .ant-btn")
      .first();
    await expect(closeButton).toBeVisible();
    await closeButton.click();
    await expect(page.getByText("Viewer Settings")).toHaveCount(0);
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

  test("custom toolbar shortcuts trigger viewer commands", async ({
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

    baseSettings.toolbarShortcuts.bindings.pan = {
      code: "KeyK",
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

    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");

    await viewportStage.click();
    await expect(viewportStage).toHaveAttribute("data-active-tool", "select");

    await page.keyboard.press("K");

    await expect(viewportStage).toHaveAttribute("data-active-tool", "pan");
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

  test("same-study stack viewports sync by slice position", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

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
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

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

  test("double click maximizes a viewport and restores the previous layout", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x2").click();

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

  test("selected viewports can switch into independent MPR layouts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x2").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-status",
      /ready|error/,
      {
        timeout: 60_000,
      },
    );
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-layout-id",
      "left1Right2",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-primary-tool",
      "crosshairs",
    );
    await expect(firstViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
    if ((await firstViewportStage.getAttribute("data-status")) === "ready") {
      await expect(
        firstViewportSlot.getByTestId("mpr-pane-scrollbar"),
      ).toHaveCount(3);
    }

    await secondViewportStage.click({
      position: {
        x: 36,
        y: 36,
      },
    });
    await expect(secondViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-status",
      /ready|error/,
      {
        timeout: 60_000,
      },
    );
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-layout-id",
      "top1Bottom2",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-primary-tool",
      "crosshairs",
    );
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
    if ((await secondViewportStage.getAttribute("data-status")) === "ready") {
      await expect(
        secondViewportSlot.getByTestId("mpr-pane-scrollbar"),
      ).toHaveCount(3);
    }
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-layout-id",
      "left1Right2",
    );

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-off").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-view-mode",
      "stack",
    );
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(0);
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);
  });

  test("selected MPR viewports keep independent slab mode and thickness", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const firstViewportSlabHud = firstViewportSlot.getByTestId("mpr-slab-hud");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlabHud = secondViewportSlot.getByTestId("mpr-slab-hud");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(firstViewportSlabHud).toHaveAttribute("data-slab-mode", "none");
    await expect(firstViewportSlabHud).toHaveAttribute("data-pane-id", "axial");
    await expect(firstViewportSlabHud).toContainText("AX");
    await expect(firstViewportSlabHud).toContainText("普通");
    await expect(firstViewportSlabHud).toContainText("单层");

    await firstViewportSlot
      .locator('[data-testid="mpr-pane"][data-pane-id="sagittal"]')
      .click({
        position: {
          x: 24,
          y: 24,
        },
      });
    await expect(firstViewportSlabHud).toHaveAttribute(
      "data-pane-id",
      "sagittal",
    );
    await expect(firstViewportSlabHud).toContainText("SA");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-mip").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-20").click();

    await expect(firstViewportStage).toHaveAttribute("data-mpr-slab-mode", "mip");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
    await expect(firstViewportSlabHud).toHaveAttribute("data-slab-mode", "mip");
    await expect(firstViewportSlabHud).toHaveAttribute(
      "data-slab-value",
      "20 mm",
    );
    await expect(firstViewportSlabHud).toContainText("MIP");
    await expect(firstViewportSlabHud).toContainText("20 mm");

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();

    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "none",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );
    await expect(secondViewportSlabHud).toHaveAttribute("data-slab-mode", "none");
    await expect(secondViewportSlabHud).toHaveAttribute("data-pane-id", "axial");
    await expect(secondViewportSlabHud).toContainText("AX");
    await expect(secondViewportSlabHud).toContainText("单层");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-average").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-5").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "5",
    );
    await expect(secondViewportSlabHud).toHaveAttribute(
      "data-slab-mode",
      "average",
    );
    await expect(secondViewportSlabHud).toHaveAttribute(
      "data-slab-value",
      "5 mm",
    );
    await expect(secondViewportSlabHud).toContainText("平均");
    await expect(secondViewportSlabHud).toContainText("5 mm");
    await expect(firstViewportStage).toHaveAttribute("data-mpr-slab-mode", "mip");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
  });

  test("MPR slab menu can sync projection to all MPR viewports and reset a single viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-minip").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-40").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-apply-all").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "minip",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "40",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "minip",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "40",
    );

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-reset").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "none",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "minip",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "40",
    );
  });

  test("MPR slab menu accepts a custom thickness value", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(viewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(viewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-custom-thickness").click();

    const thicknessDialog = page.getByTestId("mpr-slab-custom-thickness-dialog");
    await expect(thicknessDialog).toBeVisible();

    const thicknessInput = thicknessDialog.getByRole("spinbutton");
    await thicknessInput.fill("7.5");
    await page.getByTestId("mpr-slab-custom-thickness-submit").click();

    await expect(viewportStage).toHaveAttribute("data-mpr-slab-thickness", "7.5");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await expect(
      page.getByTestId("viewport-mpr-slab-thickness-option-custom-current"),
    ).toBeVisible();
  });

  test("MPR slab linked sync only updates MPR viewports in the same linked group", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x2").click();

    const firstViewportStage = page
      .getByTestId("viewport-slot-viewport-1")
      .getByTestId("viewport-stage");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .getByTestId("viewport-stage");
    const thirdViewportStage = page
      .getByTestId("viewport-slot-viewport-3")
      .getByTestId("viewport-stage");
    const firstSeriesCard = page.getByTestId("series-card").first();
    const thirdSeriesCard = page.getByTestId("series-card").nth(2);

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstSeriesCard.click();
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

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

    await thirdViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await thirdSeriesCard.click();
    await expect(thirdViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await thirdViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(thirdViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(thirdViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-average").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-20").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-apply-linked").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
    await expect(thirdViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "none",
    );
    await expect(thirdViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );
  });

  test("persisted MPR projection defaults apply to new MPR viewports and reset", async ({
    page,
    request,
  }) => {
    const response = await request.get("/api/settings");
    const settings = (await response.json()) as {
      schemaVersion: number;
      viewportOverlay: {
        schemaVersion: number;
        corners: Record<string, Array<{ id: string; tagKey: string }>>;
      };
      toolbarShortcuts: {
        schemaVersion: number;
        bindings: Record<string, unknown>;
      };
      mprProjection: {
        schemaVersion: number;
        defaultSlabMode: string;
        defaultSlabThickness: number;
      };
    };

    settings.mprProjection = {
      schemaVersion: 1,
      defaultSlabMode: "minip",
      defaultSlabThickness: 7.5,
    };

    await page.route("**/api/settings", async (route, requestDetails) => {
      if (requestDetails.method() !== "GET") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settings),
      });
    });

    await waitForViewerReady(page);

    const viewportStage = page.getByTestId("viewport-stage");

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(viewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(viewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(viewportStage).toHaveAttribute("data-mpr-slab-mode", "minip");
    await expect(viewportStage).toHaveAttribute("data-mpr-slab-thickness", "7.5");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-20").click();
    await expect(viewportStage).toHaveAttribute("data-mpr-slab-thickness", "20");

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-action-reset").click();

    await expect(viewportStage).toHaveAttribute("data-mpr-slab-mode", "minip");
    await expect(viewportStage).toHaveAttribute("data-mpr-slab-thickness", "7.5");
  });

  test("saving MPR projection defaults updates untouched viewports and preserves customized ones", async ({
    page,
    request,
  }) => {
    const response = await request.get("/api/settings");
    let settings = (await response.json()) as {
      schemaVersion: number;
      viewportOverlay: {
        schemaVersion: number;
        corners: Record<string, Array<{ id: string; tagKey: string }>>;
      };
      toolbarShortcuts: {
        schemaVersion: number;
        bindings: Record<string, unknown>;
      };
      mprProjection: {
        schemaVersion: number;
        defaultSlabMode: string;
        defaultSlabThickness: number;
      };
    };

    await page.route("**/api/settings", async (route, requestDetails) => {
      if (requestDetails.method() === "PUT") {
        settings = requestDetails.postDataJSON() as typeof settings;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(settings),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settings),
      });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportStage = page
      .getByTestId("viewport-slot-viewport-1")
      .getByTestId("viewport-stage");
    const secondViewportStage = page
      .getByTestId("viewport-slot-viewport-2")
      .getByTestId("viewport-stage");

    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(firstViewportStage).toHaveAttribute("data-mpr-slab-mode", "none");
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "10",
    );

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-mode-option-mip").click();
    await page.getByTestId("viewport-mpr-slab-button").click();
    await page.getByTestId("viewport-mpr-slab-thickness-option-20").click();

    await expect(secondViewportStage).toHaveAttribute("data-mpr-slab-mode", "mip");
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );

    await page.getByTestId("viewport-settings-button").click();
    await page.getByRole("button", { name: "MPR 投影", exact: true }).click();
    await page
      .getByTestId("viewer-settings-mpr-projection-mode")
      .getByText("平均", { exact: true })
      .click();
    await page
      .getByTestId("viewer-settings-mpr-projection-section")
      .getByRole("spinbutton")
      .fill("5");
    await page.getByRole("button", { name: "保存设置" }).click();

    await expect(page.getByText("Viewer Settings")).toHaveCount(0);
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-mode",
      "average",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "5",
    );
    await expect(secondViewportStage).toHaveAttribute("data-mpr-slab-mode", "mip");
    await expect(secondViewportStage).toHaveAttribute(
      "data-mpr-slab-thickness",
      "20",
    );
  });

  test("reference lines project the selected stack slice into another MPR viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
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

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportSlot.getByTestId("mpr-pane")).toHaveCount(3);

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await expect(firstViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );

    await page.getByTestId("viewport-tool-referenceLines").click();

    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-visible",
      "true",
    );
    await expect
      .poll(
        async () => await secondViewportSlot.getByTestId("mpr-reference-line").count(),
        {
          timeout: 10_000,
        },
      )
      .toBeGreaterThan(0);

    await page.getByTestId("viewport-tool-referenceLines").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-visible",
      "false",
    );
    await expect(secondViewportSlot.getByTestId("mpr-reference-line")).toHaveCount(
      0,
    );
  });

  test("selected MPR pane can act as the reference-line source for another stack viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();

    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");

    const coronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await coronalPane.click({
      position: {
        x: 18,
        y: 18,
      },
    });
    await expect(coronalPane).toHaveAttribute("data-pane-selected", "true");

    await page.getByTestId("viewport-tool-referenceLines").click();

    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-lines-enabled",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-line-visible",
      "true",
    );
    await expect
      .poll(
        async () =>
          await firstViewportSlot.getByTestId("viewport-reference-line").count(),
        {
          timeout: 10_000,
        },
      )
      .toBeGreaterThan(0);
  });

  test("scrolling the selected MPR pane navigates the linked stack viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
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

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    const axialPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="axial"]',
    );
    const initialFrameIndex = await firstViewportStage.getAttribute(
      "data-frame-index",
    );

    await axialPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(axialPane).toHaveAttribute("data-pane-selected", "true");

    await page.getByTestId("viewport-tool-referenceLines").click();
    await axialPane.hover({
      position: {
        x: 40,
        y: 40,
      },
    });
    await page.mouse.wheel(0, 960);

    await expect(firstViewportStage).not.toHaveAttribute(
      "data-frame-index",
      initialFrameIndex ?? "1",
    );
  });

  test("dragging the MPR crosshair center navigates the linked stack viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
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

    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    const coronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await coronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(coronalPane).toHaveAttribute("data-pane-selected", "true");

    await page.getByTestId("viewport-tool-referenceLines").click();

    const initialFrameIndex = Number(
      (await firstViewportStage.getAttribute("data-frame-index")) ?? "0",
    );
    const paneBox = await coronalPane.boundingBox();

    expect(paneBox).toBeTruthy();

    const startX = paneBox!.x + paneBox!.width * 0.5;
    const startY = paneBox!.y + paneBox!.height * 0.5;
    const endY = Math.min(
      paneBox!.y + paneBox!.height * 0.82,
      startY + paneBox!.height * 0.22,
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 14 });
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          Number((await firstViewportStage.getAttribute("data-frame-index")) ?? "0"),
        {
          timeout: 10_000,
        },
      )
      .not.toBe(initialFrameIndex);
  });

  test("selected MPR crosshair center synchronizes another MPR viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await expect(firstViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "true",
    );

    const firstCoronalPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );
    const secondAxialPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="axial"]',
    );
    const secondSagittalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="sagittal"]',
    );
    const secondCoronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await firstCoronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(firstCoronalPane).toHaveAttribute(
      "data-pane-selected",
      "true",
    );

    await page.getByTestId("viewport-tool-referenceLines").click();
    await expect(firstCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(secondCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );
    await expect(secondViewportStage).not.toHaveAttribute(
      "data-crosshair-sync-applied-id",
      "0",
    );

    const initialSecondPaneFrames = [
      (await secondAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await secondSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await secondCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
    ].join(":");
    const paneBox = await firstCoronalPane.boundingBox();

    expect(paneBox).toBeTruthy();

    const startX = paneBox!.x + paneBox!.width * 0.5;
    const startY = paneBox!.y + paneBox!.height * 0.5;
    const endX = Math.min(
      paneBox!.x + paneBox!.width * 0.76,
      startX + paneBox!.width * 0.16,
    );
    const endY = Math.min(
      paneBox!.y + paneBox!.height * 0.82,
      startY + paneBox!.height * 0.22,
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 14 });
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          [
            (await secondAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await secondSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await secondCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
          ].join(":"),
        {
          timeout: 10_000,
        },
      )
      .not.toBe(initialSecondPaneFrames);
  });

  test("clicking another MPR viewport transfers the sync source immediately", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    await page.getByTestId("viewport-layout-button").click();
    await page.getByTestId("viewport-layout-option-2x1").click();

    const firstViewportSlot = page.getByTestId("viewport-slot-viewport-1");
    const firstViewportStage = firstViewportSlot.getByTestId("viewport-stage");
    const secondViewportSlot = page.getByTestId("viewport-slot-viewport-2");
    const secondViewportStage =
      secondViewportSlot.getByTestId("viewport-stage");
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
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-left1Right2").click();
    await expect(firstViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(firstViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    await secondViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await page.getByTestId("viewport-mpr-layout-button").click();
    await page.getByTestId("viewport-mpr-layout-option-top1Bottom2").click();
    await expect(secondViewportStage).toHaveAttribute("data-view-mode", "mpr");
    await expect(secondViewportStage).toHaveAttribute("data-status", "ready", {
      timeout: 60_000,
    });

    const firstCoronalPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );
    const firstAxialPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="axial"]',
    );
    const firstSagittalPane = firstViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="sagittal"]',
    );
    const secondCoronalPane = secondViewportSlot.locator(
      '[data-testid="mpr-pane"][data-pane-id="coronal"]',
    );

    await firstViewportStage.click({
      position: {
        x: 24,
        y: 24,
      },
    });
    await firstCoronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(firstCoronalPane).toHaveAttribute(
      "data-pane-selected",
      "true",
    );

    await page.getByTestId("viewport-tool-referenceLines").click();
    await expect(secondViewportStage).not.toHaveAttribute(
      "data-crosshair-sync-applied-id",
      "0",
    );

    const baselineFirstPaneFrames = [
      (await firstAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await firstSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
      (await firstCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
    ].join(":");

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
    await expect(firstViewportStage).toHaveAttribute(
      "data-viewport-selected",
      "false",
    );
    await expect(secondViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(firstViewportStage).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );

    await secondCoronalPane.click({
      position: {
        x: 20,
        y: 20,
      },
    });
    await expect(secondCoronalPane).toHaveAttribute(
      "data-pane-selected",
      "true",
    );
    await expect(secondCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "true",
    );
    await expect(firstCoronalPane).toHaveAttribute(
      "data-reference-line-source",
      "false",
    );

    const secondPaneBox = await secondCoronalPane.boundingBox();

    expect(secondPaneBox).toBeTruthy();

    const startX = secondPaneBox!.x + secondPaneBox!.width * 0.5;
    const startY = secondPaneBox!.y + secondPaneBox!.height * 0.5;
    const endY = Math.min(
      secondPaneBox!.y + secondPaneBox!.height * 0.82,
      startY + secondPaneBox!.height * 0.22,
    );

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX, endY, { steps: 14 });
    await page.mouse.up();

    await expect
      .poll(
        async () =>
          [
            (await firstAxialPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await firstSagittalPane.getAttribute("data-pane-frame-index")) ?? "0",
            (await firstCoronalPane.getAttribute("data-pane-frame-index")) ?? "0",
          ].join(":"),
        {
          timeout: 10_000,
        },
      )
      .not.toBe(baselineFirstPaneFrames);
  });

  test("image layout switches the selected viewport into a montage grid", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

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

  test("desktop layout keeps both panels fully visible without page clipping", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await waitForViewerReady(page);

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector('[data-testid="viewer-shell"]');
      const sidebar = document.querySelector('[data-testid="sidebar-panel"]');
      const viewportPanel = document.querySelector(
        '[data-testid="viewport-panel"]',
      );

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
    expect(metrics.viewportPanel!.bottom).toBeLessThanOrEqual(
      metrics.innerHeight,
    );
    expect(metrics.viewportPanel!.right).toBeLessThanOrEqual(
      metrics.innerWidth,
    );
    expect(metrics.shell!.top).toBeLessThanOrEqual(1);
    expect(metrics.shell!.left).toBeLessThanOrEqual(1);
    expect(metrics.shell!.right).toBeGreaterThanOrEqual(metrics.innerWidth - 1);
    expect(metrics.shell!.bottom).toBeGreaterThanOrEqual(
      metrics.innerHeight - 1,
    );
  });

  test("13-inch mac layout stays dense and flat", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await waitForViewerReady(page);

    const metrics = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="sidebar-panel"]');
      const viewportPanel = document.querySelector(
        '[data-testid="viewport-panel"]',
      );
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
    expect(metrics.viewportPanel!.bottom).toBeLessThanOrEqual(
      metrics.innerHeight,
    );
    expect(metrics.sidebarStyles?.borderRadius).toBe("0px");
    expect(metrics.viewportStyles?.borderRadius).toBe("0px");
    expect(metrics.sidebarStyles?.boxShadow).toBe("none");
    expect(metrics.viewportStyles?.boxShadow).toBe("none");
  });

  test("viewport responds to resize without losing readiness", async ({
    page,
  }) => {
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
      const viewportPanel = document.querySelector(
        '[data-testid="viewport-panel"]',
      );

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
    expect(metrics.viewportPanel!.width).toBeLessThanOrEqual(
      metrics.innerWidth,
    );
    expect(metrics.viewportPanel!.top).toBeGreaterThan(
      metrics.sidebar!.bottom - 1,
    );

    await page.getByTestId("viewport-panel").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("viewport-stage")).toBeVisible();
  });
});
