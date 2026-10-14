import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { sourceStationIds, waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("keeps only 24/7 automated stations", async ({ page }) => {
  await page.getByRole("button", { name: /^Filtres/ }).click();
  await page.getByRole("switch", { name: "Automate 24/24 uniquement" }).click();

  await expect.poll(() => sourceStationIds(page)).toEqual([
    "FR:75102002",
    "FR:75103003",
  ]);
});

test("hides stations with a fuel shortage", async ({ page }) => {
  await page.getByRole("button", { name: /^Filtres/ }).click();
  await page
    .getByRole("switch", { name: "Masquer les stations en rupture" })
    .click();

  await expect.poll(() => sourceStationIds(page)).toEqual([
    "FR:75102002",
    "FR:75103003",
    "FR:75104004",
  ]);
});

test("filters by required service", async ({ page }) => {
  await page.getByRole("button", { name: /^Filtres/ }).click();
  await page.getByRole("checkbox", { name: "Boutique" }).click();

  await expect.poll(() => sourceStationIds(page)).toEqual([
    "FR:75101001",
    "FR:75103003",
    "FR:75104004",
  ]);
});
