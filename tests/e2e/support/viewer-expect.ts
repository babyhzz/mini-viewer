import { expect, type Page } from "@playwright/test";

export async function expectViewerShellReady(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Series Navigator" }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("series-card").first()).toBeVisible({
    timeout: 60_000,
  });
}

export async function expectViewportReady(page: Page) {
  await expect(page.getByTestId("viewport-stage")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 60_000 },
  );
}
