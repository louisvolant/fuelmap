import { expect, test, type Page } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockGeoApi } from "./support/mockGeoApi";
import { mockOverpass } from "./support/mockOverpass";
import { mockSpainApi } from "./support/mockSpainApi";
import { waitForMap } from "./support/map";

interface TestMap {
  getCenter: () => { lng: number; lat: number };
}

function distanceTo(page: Page, lon: number, lat: number) {
  return page.evaluate(
    ({ targetLon, targetLat }) => {
      const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
      const center = map.getCenter();
      return Math.hypot(center.lng - targetLon, center.lat - targetLat);
    },
    { targetLon: lon, targetLat: lat },
  );
}

test.describe("geolocation already authorized", () => {
  test.use({
    geolocation: { latitude: 48.8566, longitude: 2.3522 },
    permissions: ["geolocation"],
  });

  test("opens the map around the user position", async ({ page }) => {
    await mockFuelApi(page);
    await mockOverpass(page);
    await mockGeoApi(page);
    await page.goto("/");
    await waitForMap(page);

    await expect
      .poll(() => distanceTo(page, 2.3522, 48.8566))
      .toBeLessThan(0.1);
  });
});

test.describe("geolocation unavailable", () => {
  test("falls back to the IP location and country", async ({ page }) => {
    await mockFuelApi(page);
    await mockSpainApi(page);
    await mockOverpass(page);
    await mockGeoApi(page, {
      country: "ES",
      city: "Madrid",
      lat: 40.4168,
      lon: -3.7038,
    });
    await page.goto("/");
    await waitForMap(page);

    await expect
      .poll(() => distanceTo(page, -3.7038, 40.4168))
      .toBeLessThan(0.2);

    const country = await page.evaluate(() =>
      localStorage.getItem("fuelmap.country"),
    );
    expect(country).toContain("ES");
  });

  test("keeps the default view when there is no IP location", async ({
    page,
  }) => {
    await mockFuelApi(page);
    await mockOverpass(page);
    await mockGeoApi(page);
    await page.goto("/");
    await waitForMap(page);

    // France's default center.
    await expect.poll(() => distanceTo(page, 2.2137, 46.2276)).toBeLessThan(0.5);
  });
});
