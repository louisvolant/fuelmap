import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
});

test("renders the fullscreen map", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
});

test("loads and counts stations from the fuel API", async ({ page }) => {
  await page.goto("/");
  // The status pill reports the number of stations the app loaded.
  await expect(page.getByText(/Stations\s*:\s*4/)).toBeVisible();
});
