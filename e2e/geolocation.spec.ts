import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOverpass } from "./support/mockOverpass";
import { sourceStationIds, waitForStations } from "./support/map";

test.use({
  geolocation: { latitude: 48.8566, longitude: 2.3522 },
  permissions: ["geolocation"],
});

test("filters stations within a radius of the user position", async ({ page }) => {
  await mockFuelApi(page);
  await mockOverpass(page);
  await page.goto("/");
  await waitForStations(page);

  await page.getByRole("button", { name: "Ma position" }).click();
  await page.getByRole("button", { name: /^Filtres/ }).click();

  // Radius options only appear once the position is known.
  await page.getByRole("button", { name: /^1\s?km$/ }).click();

  await expect.poll(() => sourceStationIds(page)).toEqual([
    "FR:75101001",
    "FR:75104004",
  ]);
});
