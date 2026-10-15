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

/** How many features each station layer currently renders. */
async function renderedCounts(page: Page) {
  return page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    const count = (layer: string) => {
      try {
        return map.queryRenderedFeatures({ layers: [layer] }).length;
      } catch {
        return 0;
      }
    };
    return {
      points: count("station-points"),
      brands: count("station-brands"),
      clusters: count("station-clusters"),
    };
  });
}

/** Branded OpenStreetMap stations, one per Paris fixture station. */
const OSM_STATIONS = [
  { lat: 48.8566, lon: 2.3522, brand: "Total" },
  { lat: 48.8656, lon: 2.3469, brand: "Carrefour" },
  { lat: 48.8636, lon: 2.3622, brand: "Avia" },
  { lat: 48.8526, lon: 2.3422, brand: "Shell" },
];

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOsmStations(page);
  await page.goto("/");
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __fuelmapMap?: unknown }).__fuelmapMap),
  );
});

test("never shows an unclustered bubble without its brand mark", async ({
  page,
}) => {
  // Brands come from OpenStreetMap: serve branded OSM stations to the app.
  await mockOsmStations(page, OSM_STATIONS);

  // Zoom in once so the brand enrichment runs.
  await page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    map.jumpTo({ center: [2.3522, 48.8566], zoom: 16 });
    map.triggerRepaint?.();
  });

  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { __fuelmapMap: TestMap }
        ).__fuelmapMap
          .getSource("stations")
          .serialize()
          .data.features.some((feature) => feature.properties?.brandImage !== ""),
      ),
    )
    .toBe(true);

  // Sweep across the clustering threshold: a bubble always carries its logo.
  for (const zoom of [16, 15, 14, 13, 12.6, 12.3, 12.1]) {
    await page.evaluate((value) => {
      const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
      map.jumpTo({ center: [2.3522, 48.8566], zoom: value });
      map.triggerRepaint?.();
    }, zoom);

    await expect
      .poll(async () => {
        const counts = await renderedCounts(page);
        return counts.points + counts.clusters;
      })
      .toBeGreaterThan(0);

    const counts = await renderedCounts(page);
    if (counts.points > 0) {
      expect(counts.brands).toBeGreaterThan(0);
    }
  }
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
