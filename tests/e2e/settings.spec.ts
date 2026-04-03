import { expect, test } from "@playwright/test";
import { waitForViewerReady } from "./support/viewer-page";

test.describe("DICOM viewer smoke coverage", () => {
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
});
