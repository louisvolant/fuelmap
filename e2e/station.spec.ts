import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { clickStation, focusParis, waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOsmStations(page);
  await page.goto("/");
  await waitForStations(page);
});

test("opens a station sheet with prices and freshness", async ({ page }) => {
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Paris");
  await expect(dialog).toContainText("Gazole");
  await expect(dialog).toContainText("1,859");
  // The price freshness is shown for each fuel.
  await expect(dialog).toContainText(/il y a|hier/);
});

test("shows the shortage state of an unavailable fuel", async ({ page }) => {
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("SP95");
  await expect(dialog).toContainText("Rupture définitive");
});

test("closes the station sheet", async ({ page }) => {
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).last().click();
  await expect(dialog).toBeHidden();
});

test("offers Waze, Google Maps and Apple Maps hand-off", async ({ page }) => {
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("link", { name: "Waze" })).toHaveAttribute(
    "href",
    /waze\.com\/ul\?ll=48\.856600,2\.352200/,
  );
  await expect(dialog.getByRole("link", { name: "Google Maps" })).toHaveAttribute(
    "href",
    /google\.com\/maps\/dir\/\?api=1&destination=48\.856600,2\.352200/,
  );
  await expect(dialog.getByRole("link", { name: "Plans" })).toHaveAttribute(
    "href",
    /maps\.apple\.com\/\?daddr=48\.856600,2\.352200/,
  );
});
