import { expect, test } from "@playwright/test";
import {
  openDesktopViewer,
  openMobileViewer,
  waitForViewerReady,
} from "./support/viewer-page";
import { mockDefaultViewerSettings } from "./support/viewer-settings";

test.describe("DICOM viewer smoke coverage", () => {
  test.beforeEach(async ({ page }) => {
    await mockDefaultViewerSettings(page);
  });

  test("desktop layout keeps both panels fully visible without page clipping @smoke", async ({
    page,
  }) => {
    await openDesktopViewer(page);

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
    await openDesktopViewer(page, 1280, 800);

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
    await openDesktopViewer(page);

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
    await openMobileViewer(page);

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
