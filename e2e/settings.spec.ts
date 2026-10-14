import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("switches to the dark theme", async ({ page }) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("button", { name: "Sombre" }).click();

  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("switches the interface language", async ({ page }) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Langue" }).selectOption("de");

  // The status pill is now in German.
  await expect(page.getByText(/Tankstellen:\s*4/)).toBeVisible();
});

test("links to FuelStats for fill-up history", async ({ page }) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(
    page.getByRole("link", { name: "Ouvrir FuelStats" }),
  ).toHaveAttribute("href", "https://www.fuelstats.net");
});
