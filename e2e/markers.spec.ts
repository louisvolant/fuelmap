import { expect, test, type Page } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";

type TestMap = {
  jumpTo: (options: unknown) => void;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => {
    serialize: () => { data: { features: { properties?: { id?: string } }[] } };
  };
  queryRenderedFeatures: (options: unknown) => {
    properties?: { id?: string };
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
  await page.evaluate(() => {
    (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap.jumpTo({
      center: [2.3522, 48.8566],
      zoom: 15,
    });
  });

  await waitForLayer(page, "station-points");

  const { pointCount, clusterCount } = await page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    const pointIds = new Set(
      map
        .queryRenderedFeatures({ layers: ["station-points"] })
        .map((feature) => feature.properties?.id),
    );
    return {
      pointCount: pointIds.size,
      clusterCount: map.queryRenderedFeatures({ layers: ["station-clusters"] })
        .length,
    };
  });

  // At this zoom stations are no longer clustered.
  expect(pointCount).toBeGreaterThanOrEqual(1);
  expect(clusterCount).toBe(0);
});
