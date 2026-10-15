import { expect, type Page } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";

interface TestFeatureProperties {
  id?: string;
  brandImage?: string;
}

type TestMap = {
  jumpTo: (options: unknown) => void;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => {
    serialize: () => { data: { features: { properties?: TestFeatureProperties }[] } };
  };
  queryRenderedFeatures: (options: unknown) => {
    properties?: TestFeatureProperties;
  }[];
};

/** Wait until a layer renders at least one feature. */
async function waitForLayer(page: Page, layer: string): Promise<void> {
  await page.waitForFunction(
    (layerId) => {
      const map = (window as unknown as { __fuelmapMap?: TestMap }).__fuelmapMap;
      if (!map || !map.getLayer(layerId)) return false;
      try {
        return map.queryRenderedFeatures({ layers: [layerId] }).length > 0;
      } catch {
        return false;
      }
    },
    layer,
    { timeout: 20_000 },
  );
}

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOsmStations(page);
  await page.goto("/");
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __fuelmapMap?: unknown }).__fuelmapMap),
  );
});

test("feeds one map feature per station into the source", async ({ page }) => {
  await waitForLayer(page, "station-clusters");

  const ids = await page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    const data = map.getSource("stations").serialize().data;
    return data.features.map((feature) => feature.properties?.id).sort();
  });

  expect(ids).toEqual(["FR:75101001", "FR:75102002", "FR:75103003", "FR:75104004"]);
});

test("clusters nearby stations at country zoom", async ({ page }) => {
  await waitForLayer(page, "station-clusters");

  const clusterCount = await page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    return map.queryRenderedFeatures({ layers: ["station-clusters"] }).length;
  });
  expect(clusterCount).toBeGreaterThan(0);
});

test("renders individual markers when zoomed in", async ({ page }) => {
  // Ensure stations are loaded before moving the camera.
  await waitForLayer(page, "station-clusters");

  await page.evaluate(() => {
    (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap.jumpTo({
      center: [2.3522, 48.8566],
      zoom: 15,
    });
  });

  await waitForLayer(page, "station-points");

  // Wait for the cluster tiles to be replaced at this zoom.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
        return map.queryRenderedFeatures({ layers: ["station-clusters"] }).length;
      }),
    )
    .toBe(0);

  const { pointCount, labelCount } = await page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    const pointIds = new Set(
      map
        .queryRenderedFeatures({ layers: ["station-points"] })
        .map((feature) => feature.properties?.id),
    );
    return {
      pointCount: pointIds.size,
      labelCount: map.queryRenderedFeatures({
        layers: ["station-price-labels"],
      }).length,
    };
  });

  expect(pointCount).toBeGreaterThanOrEqual(1);
  // Price labels are rendered inside the bubbles.
  expect(labelCount).toBeGreaterThanOrEqual(1);
});
