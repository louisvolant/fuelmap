import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { clickStation, focusParis, waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("adds a station to favorites and persists it across a reload", async ({
  page,
}) => {
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Ajouter aux favoris" }).click();
  await expect(
    dialog.getByRole("button", { name: "Retirer des favoris" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer" }).last().click();

  // Favorites are stored in IndexedDB and survive a reload.
  await page.reload();
  await waitForStations(page);

  await page.getByRole("button", { name: /^Favoris/ }).click();
  const favoritesDialog = page.getByRole("dialog");
  await expect(favoritesDialog).toContainText("Paris");
});
