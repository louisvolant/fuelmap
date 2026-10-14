import { expect, type Page } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOverpass } from "./support/mockOverpass";
import { mockRoute } from "./support/mockOsrm";
import { waitForStations } from "./support/map";

// Stations of the fixture are all near Paris.
const ROUTE_NEAR_PARIS: [number, number][] = [
  [2.30, 48.80],
  [2.40, 48.90],
];
const ROUTE_ELSEWHERE: [number, number][] = [
  [4.7, 45.7],
  [4.9, 45.8],
];

test.use({
  geolocation: { latitude: 48.8566, longitude: 2.3522 },
  permissions: ["geolocation"],
});

/** Enter route mode and pick a destination on an empty map area. */
async function pickDestination(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Itinéraire" }).click();
  // Wait until the picking hint is rendered (the map click handler is bound then).
  await expect(
    page.getByText("Touchez la carte pour choisir la destination"),
  ).toBeVisible();

  // Click on an empty part of the map, away from the toolbar and the markers.
  await page.mouse.click(30, 250);
}

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOverpass(page);
  await page.goto("/");
  await waitForStations(page);
});

test("draws a route and keeps stations along it", async ({ page }) => {
  await mockRoute(page, ROUTE_NEAR_PARIS);
  await pickDestination(page);

  await expect(page.getByText("Stations sur l'itinéraire")).toBeVisible();

  // The route layer is registered and holds the route geometry.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const map = (
            window as unknown as {
              __fuelmapMap: {
                getLayer: (id: string) => unknown;
                getSource: (id: string) => {
                  serialize: () => { data: { features: unknown[] } };
                } | undefined;
              };
            }
          ).__fuelmapMap;
          const source = map.getSource("route");
          return Boolean(map.getLayer("route-line")) && source
            ? source.serialize().data.features.length
            : 0;
        }),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);

  // Paris stations are within the corridor: all remain.
  await expect(page.getByText(/Stations:\s*4/)).toBeVisible();
});

test("hides stations that are not on the route", async ({ page }) => {
  await mockRoute(page, ROUTE_ELSEWHERE);
  await pickDestination(page);

  await expect(page.getByText("Stations sur l'itinéraire")).toBeVisible();
  await expect(page.getByText(/Stations:\s*0/)).toBeVisible();
});
