import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOverpass } from "./support/mockOverpass";
import { mockSpainApi } from "./support/mockSpainApi";
import { focusParis, stationCount, waitForStations } from "./support/map";

type TestMap = {
  getCenter: () => { lng: number; lat: number };
  getZoom: () => number;
  getLayer: (id: string) => unknown;
  hasImage: (id: string) => boolean;
};

const STYLE_CONTROL = "Fond de carte";

test.describe("basemap style switcher", () => {
  test.beforeEach(async ({ page }) => {
    await mockFuelApi(page);
    await mockSpainApi(page);
    await mockOverpass(page);
    await page.goto("/");
    await waitForStations(page);
  });

  test("switching style keeps the camera and the app layers", async ({
    page,
  }) => {
    await focusParis(page);

    const before = await page.evaluate(() => {
      const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
      return { center: map.getCenter(), zoom: map.getZoom() };
    });

    await page.getByRole("combobox", { name: STYLE_CONTROL }).selectOption("bright");

    // Sources and layers are re-injected after the style swap.
    await expect
      .poll(() =>
        page.evaluate(() =>
          Boolean(
            (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap.getLayer(
              "station-points",
            ),
          ),
        ),
      )
      .toBe(true);
    await expect.poll(() => stationCount(page)).toBeGreaterThan(0);

    // The camera is not reset by `setStyle`.
    const after = await page.evaluate(() => {
      const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
      return { center: map.getCenter(), zoom: map.getZoom() };
    });
    expect(after.zoom).toBeCloseTo(before.zoom, 5);
    expect(after.center.lng).toBeCloseTo(before.center.lng, 5);
    expect(after.center.lat).toBeCloseTo(before.center.lat, 5);
  });

  test("brand images are restored after a style swap", async ({ page }) => {
    // Spain exposes the brand natively (`Rótulo` → Carrefour).
    await page.getByRole("button", { name: "Réglages" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("combobox", { name: "Pays" }).selectOption("ES");

    const hasBrandImage = () =>
      page.evaluate(() =>
        (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap.hasImage(
          "brand-carrefour",
        ),
      );
    await expect.poll(hasBrandImage).toBe(true);

    await page.getByRole("combobox", { name: STYLE_CONTROL }).selectOption("positron");

    // Images live inside the style: they must be re-registered.
    await expect.poll(hasBrandImage).toBe(true);
  });
});
