import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockBrandSnapshot, mockBrandSnapshotMissing } from "./support/mockBrandLogos";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { focusParis, waitForStations } from "./support/map";

type TestMap = {
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

async function brandImageOf(page: import("@playwright/test").Page, id: string) {
  return page.evaluate((stationId) => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    const features = map.getSource("stations").serialize().data.features;
    return (
      features.find((feature) => feature.properties?.id === stationId)
        ?.properties?.brandImage ?? ""
    );
  }, id);
}

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("hydrates French brands from the snapshot without OSM", async ({
  page,
}) => {
  // No OSM node at all: the brand comes from the precomputed snapshot only.
  await mockOsmStations(page, []);
  await mockBrandSnapshot(page, {
    "FR:75101001": { brand: "Total", lat: 48.8566, lon: 2.3522 },
  });

  await page.reload();
  await waitForStations(page);
  await focusParis(page);

  await expect
    .poll(() => brandImageOf(page, "FR:75101001"))
    .toBe("brand-totalenergies");
});

test("falls back to OSM when no snapshot is published", async ({ page }) => {
  await mockOsmStations(page, [{ lat: 48.8566, lon: 2.3522, brand: "Total" }]);
  await mockBrandSnapshotMissing(page);

  await page.reload();
  await waitForStations(page);
  await focusParis(page);

  await expect
    .poll(() => brandImageOf(page, "FR:75101001"))
    .toBe("brand-totalenergies");
});
