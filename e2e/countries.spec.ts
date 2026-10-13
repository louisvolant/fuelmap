import { expect, test } from "@playwright/test";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockSpainApi } from "./support/mockSpainApi";
import { mockGermanyApi } from "./support/mockGermanyApi";
import { waitForStations } from "./support/map";

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockSpainApi(page);
  await mockGermanyApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("switches to Spain and loads Spanish stations", async ({ page }) => {
  // France first.
  await expect(page.getByText(/Stations:\s*4/)).toBeVisible();

  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("ES");

  await expect(page.getByText(/Stations:\s*2/)).toBeVisible();
});

test("switches to Germany and loads stations for the viewport", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("DE");

  // Germany is area-based: stations are fetched for the current viewport.
  await expect(page.getByText(/Stations:\s*3/)).toBeVisible({ timeout: 15_000 });
});

test("resets the fuel filter when switching country", async ({ page }) => {
  // Select a French-only fuel, then switch to Spain: the filter must clear.
  await page.getByRole("button", { name: "E85" }).click();
  await expect(page.getByRole("button", { name: "E85" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("ES");

  // Spanish catalog is shown and no fuel is selected.
  await expect(page.getByRole("button", { name: "Essence 95" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.getByRole("button", { name: "E85" })).toHaveCount(0);
});
