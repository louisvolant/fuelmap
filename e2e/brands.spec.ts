import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockSpainApi } from "./support/mockSpainApi";
import { waitForStations } from "./support/map";

type TestMap = {
  getLayer: (id: string) => unknown;
  hasImage: (id: string) => boolean;
  getSource: (id: string) => {
    serialize: () => {
      data: { features: { properties?: { brandImage?: string } }[] };
    };
  };
};

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockSpainApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("resolves brands to logo images on markers", async ({ page }) => {
  // Spain exposes the brand natively (`Rótulo`).
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("ES");
  await expect(page.getByText(/Stations:\s*2/)).toBeVisible();

  const brandImages = await page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    return map
      .getSource("stations")
      .serialize()
      .data.features.map((feature) => feature.properties?.brandImage);
  });
  expect(brandImages).toContain("brand-carrefour");

  // The brand layer exists and its SVG mark has been registered.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
        return {
          layer: Boolean(map.getLayer("station-brands")),
          image: map.hasImage("brand-carrefour"),
        };
      }),
    )
    .toEqual({ layer: true, image: true });
});
