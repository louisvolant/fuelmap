import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
  // Focus on Gazole so prices on the list are comparable.
  await page.getByRole("button", { name: "Gazole" }).click();
});

test("lists stations cheapest first", async ({ page }) => {
  await page.getByRole("button", { name: "Liste" }).click();

  const dialog = page.getByRole("dialog");
  const rows = dialog.getByRole("listitem");
  await expect(rows).toHaveCount(3);
  // Cheapest gazole in the fixture is 1.829.
  await expect(rows.first()).toContainText("1,829");
});

test("opens a station from the list", async ({ page }) => {
  await page.getByRole("button", { name: "Liste" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("listitem").first().getByRole("button").click();

  // The station detail sheet replaces the list.
  await expect(page.getByRole("dialog")).toContainText("Gazole");
});
