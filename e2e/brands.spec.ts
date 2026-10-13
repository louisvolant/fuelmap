import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOverpass } from "./support/mockOverpass";
import { mockSpainApi } from "./support/mockSpainApi";
import { focusParis, waitForStations } from "./support/map";

type TestMap = {
  getLayer: (id: string) => unknown;
  hasImage: (id: string) => boolean;
  getSource: (id: string) => {
    serialize: () => {
      data: {
        features: {
          properties?: { id?: string; brandImage?: string };
        }[];
      };
    };
  };
};

// One OSM node sits exactly on the first French fixture station.
const OSM_NODES = [
  { lat: 48.8566, lon: 2.3522, tags: { brand: "Total" } },
];

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockSpainApi(page);
  await mockOverpass(page, OSM_NODES);
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

test("enriches French stations with brands from OpenStreetMap", async ({
  page,
}) => {
  // France has no brand in its open data: it is derived from OSM by proximity.
  await focusParis(page);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
        const features = map.getSource("stations").serialize().data.features;
        const station = features.find(
          (feature) => feature.properties?.id === "FR:75101001",
        );
        return station?.properties?.brandImage ?? "";
      }),
    )
    .toBe("brand-totalenergies");
});
