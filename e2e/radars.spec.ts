import { expect, type Page } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { mockRadars } from "./support/mockRadars";
import { focusParis, waitForLayer, waitForStations } from "./support/map";

const RADAR = {
  id: "12001",
  type: "ETD",
  maxSpeedKmh: 70,
  commissionedAt: "2011-10-31",
  lon: 2.356,
  lat: 48.856,
};

async function radarSourceCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const map = (
      window as unknown as {
        __fuelmapMap: {
          getSource: (id: string) => {
            serialize: () => { data: { features: unknown[] } };
          };
        };
      }
    ).__fuelmapMap;
    try {
      return map.getSource("radars").serialize().data.features.length;
    } catch {
      return -1;
    }
  });
}

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOsmStations(page);
  await mockRadars(page, [RADAR]);
  await page.goto("/");
  await waitForStations(page);
  await focusParis(page);
});

test("shows fixed radars and their details", async ({ page }) => {
  await waitForLayer(page, "radar-points");
  expect(await radarSourceCount(page)).toBe(1);

  const point = await page.evaluate(() => {
    const map = (
      window as unknown as {
        __fuelmapMap: {
          getSource: (id: string) => {
            serialize: () => {
              data: {
                features: { geometry: { coordinates: [number, number] } }[];
              };
            };
          };
          project: (coordinates: [number, number]) => { x: number; y: number };
        };
      }
    ).__fuelmapMap;
    const feature = map.getSource("radars").serialize().data.features[0];
    return map.project(feature.geometry.coordinates);
  });

  await page.mouse.click(point.x, point.y);

  const popup = page.locator(".maplibregl-popup-content");
  await expect(popup).toContainText("Radar vitesse discriminant");
  await expect(popup).toContainText("70 km/h");
  await expect(popup).toContainText("2011");
});

test("hides the radar layer from the settings", async ({ page }) => {
  await waitForLayer(page, "radar-points");

  await page.getByRole("button", { name: "Réglages" }).click();
  const toggle = page.getByRole("switch", {
    name: /Afficher les radars fixes/,
  });
  await expect(toggle).toBeChecked();
  await toggle.click();

  await expect.poll(() => radarSourceCount(page)).toBe(0);
});
