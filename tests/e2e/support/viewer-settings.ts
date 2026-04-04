import type { Page } from "@playwright/test";

import { createDefaultViewerSettings } from "../../../src/lib/settings/overlay";
import type { ViewerSettings } from "../../../src/types/settings";

export function createViewerSettingsFixture(
  override?: ViewerSettings | ((settings: ViewerSettings) => ViewerSettings),
) {
  const baseSettings = createDefaultViewerSettings();

  if (!override) {
    return baseSettings;
  }

  return typeof override === "function" ? override(baseSettings) : override;
}

export async function mockViewerSettings(
  page: Page,
  settings: ViewerSettings = createViewerSettingsFixture(),
) {
  await page.route("**/api/settings", async (route, request) => {
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(settings),
    });
  });
}

export async function mockDefaultViewerSettings(page: Page) {
  await mockViewerSettings(page, createViewerSettingsFixture());
}
