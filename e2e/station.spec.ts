import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { clickStation, focusParis, waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
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
