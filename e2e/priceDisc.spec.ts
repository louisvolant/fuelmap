import { expect, type Page } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { focusParis, waitForLayer, waitForStations } from "./support/map";

/**
 * A bubble must never be drawn blank.
 *
 * The French open data exposes no brand, so a station whose OpenStreetMap
 * enrichment is missing (or unavailable upstream) would render as an empty white
 * disc. Such a bubble carries the selected fuel's price instead, while a branded
 * one keeps its logo and the price capsule next to it.
 */

/** A single Paris station, priced, at the fixture's OpenStreetMap coordinates. */
const STATIONS = [
  {
    id: 75101001,
    geom: { lon: 2.3522, lat: 48.8566 },
    cp: "75001",
    pop: "R" as const,
    adresse: "1 RUE DE RIVOLI",
    ville: "Paris",
    services_service: [],
    horaires_automate_24_24: "Non",
    gazole_prix: 1.859,
    gazole_maj: "2026-10-12 08:00:00",
  },
];

const OSM_BRAND = [{ lat: 48.8566, lon: 2.3522, brand: "Total" }];

async function renderedCount(page: Page, layer: string): Promise<number> {
  return page.evaluate((layerId) => {
    const map = (
      window as unknown as {
        __fuelmapMap: {
          queryRenderedFeatures: (options: unknown) => unknown[];
        };
      }
    ).__fuelmapMap;
    try {
      return map.queryRenderedFeatures({ layers: [layerId] }).length;
    } catch {
      return 0;
    }
  }, layer);
}

test.describe("unknown brand", () => {
  test.beforeEach(async ({ page }) => {
    await mockFuelApi(page, STATIONS);
    await mockOsmStations(page);
    await page.goto("/");
    await waitForStations(page);
    await focusParis(page);
  });

  test("shows the price inside the bubble instead of a blank disc", async ({
    page,
  }) => {
    await waitForLayer(page, "station-price-disc");

    expect(await renderedCount(page, "station-price-disc")).toBeGreaterThanOrEqual(1);
    // No brand mark: the capsule is reserved for branded bubbles.
    expect(await renderedCount(page, "station-price-labels")).toBe(0);
  });
});

test.describe("known brand", () => {
  test.beforeEach(async ({ page }) => {
    await mockFuelApi(page, STATIONS);
    await mockOsmStations(page, OSM_BRAND);
    await page.goto("/");
    await waitForStations(page);
    await focusParis(page);
  });

  test("keeps the price in a capsule next to the brand mark", async ({ page }) => {
    await waitForLayer(page, "station-price-labels");

    expect(await renderedCount(page, "station-price-labels")).toBeGreaterThanOrEqual(1);
    expect(await renderedCount(page, "station-price-disc")).toBe(0);
  });
});
