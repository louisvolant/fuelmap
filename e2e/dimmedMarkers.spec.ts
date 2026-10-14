import { expect, test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { waitForMap } from "./support/map";

// Station 111 only offers a fuel in shortage (no price) but has an OSM brand.
// Station 222 has neither a price nor a brand.
const STATIONS = [
  {
    id: 111,
    geom: { lon: 2.35, lat: 48.85 },
    cp: "75001",
    pop: "R",
    adresse: "1 RUE A",
    ville: "Paris",
    services_service: [],
    horaires_automate_24_24: "Non",
    sp95_rupture_type: "definitive",
    sp95_rupture_debut: "2026-01-01 00:00:00",
  },
  {
    id: 222,
    geom: { lon: 2.36, lat: 48.86 },
    cp: "75002",
    pop: "R",
    adresse: "2 RUE B",
    ville: "Paris",
    services_service: [],
    horaires_automate_24_24: "Non",
  },
];

const OSM = [{ lat: 48.85, lon: 2.35, brand: "Total" }];

type TestFeature = {
  properties: {
    id: string;
    dimmed: boolean;
    hasPrice: boolean;
    brandImage: string;
  };
};

function sourceFeatures(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const map = (
      window as unknown as {
        __fuelmapMap: {
          getSource: (id: string) => {
            serialize: () => { data: { features: TestFeature[] } };
          };
        };
      }
    ).__fuelmapMap;
    try {
      return map
        .getSource("stations")
        .serialize()
        .data.features.map((feature) => feature.properties);
    } catch {
      return [];
    }
  });
}

test("dims stations with no price and hides those with nothing to show", async ({
  page,
}) => {
  const osmRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/osm/stations")) osmRequests.push(request.url());
  });

  await mockFuelApi(page, STATIONS);
  await mockOsmStations(page, OSM);
  await page.goto("/");
  await waitForMap(page);

  // Zooming in triggers the OpenStreetMap brand enrichment.
  await page.evaluate(() => {
    const map = (
      window as unknown as {
        __fuelmapMap: {
          jumpTo: (options: unknown) => void;
          triggerRepaint?: () => void;
        };
      }
    ).__fuelmapMap;
    map.jumpTo({ center: [2.35, 48.85], zoom: 15 });
    map.triggerRepaint?.();
  });

  await expect.poll(() => sourceFeatures(page)).toHaveLength(1);
  expect(osmRequests.length).toBeGreaterThan(0);

  const features = await sourceFeatures(page);
  expect(features).toHaveLength(1);
  expect(features[0]).toMatchObject({
    id: "FR:111",
    dimmed: true,
    hasPrice: false,
    brandImage: "brand-totalenergies",
  });
});
