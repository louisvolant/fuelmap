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

test("the locate button does not overlap the MapLibre controls", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();

  const locate = await page
    .getByRole("button", { name: "Ma position" })
    .boundingBox();
  const controls = await page
    .locator(".maplibregl-ctrl-bottom-right")
    .boundingBox();

  expect(locate).not.toBeNull();
  expect(controls).not.toBeNull();

  const overlaps = !(
    locate!.x + locate!.width <= controls!.x ||
    controls!.x + controls!.width <= locate!.x ||
    locate!.y + locate!.height <= controls!.y ||
    controls!.y + controls!.height <= locate!.y
  );
  expect(overlaps).toBe(false);
});
