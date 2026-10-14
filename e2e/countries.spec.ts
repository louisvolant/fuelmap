import { expect } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockSpainApi } from "./support/mockSpainApi";
import { mockGermanyApi } from "./support/mockGermanyApi";
import { mockItalyApi } from "./support/mockItalyApi";
import { mockMaxPrices } from "./support/mockMaxPrices";
import { mockOsmStations } from "./support/mockOsmStations";
import { waitForStations, stationCount } from "./support/map";

// Two OSM fuel stations, returned for any bounding box.
const OSM_STATIONS = [
  { lat: 50.8503, lon: 4.3517, brand: "Total", city: "Bruxelles" },
  { lat: 50.846, lon: 4.36, brand: "Q8", city: "Leuven" },
];

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockSpainApi(page);
  await mockGermanyApi(page);
  await mockItalyApi(page);
  await mockMaxPrices(page);
  await mockOsmStations(page, OSM_STATIONS);
  await page.goto("/");
  await waitForStations(page);
});

test("switches to Spain and loads Spanish stations", async ({ page }) => {
  // France first.
  await expect.poll(() => stationCount(page)).toBe(4);

  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("ES");

  await expect.poll(() => stationCount(page)).toBe(2);
});

test("switches to Germany and loads stations for the viewport", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("DE");

  // Germany is area-based: stations are fetched for the current viewport.
  await expect.poll(() => stationCount(page)).toBe(3);
});

test("switches to Italy and loads Italian stations", async ({ page }) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("IT");

  await expect.poll(() => stationCount(page)).toBe(2);
  // Italian fuel catalog is shown.
  await expect(
    page.getByRole("button", { name: "Essence", exact: true }),
  ).toBeVisible();
});

test("switches to Belgium, loads OSM stations and shows the maximum prices", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("BE");

  await expect(page.getByText(/Prix maximum officiel/)).toBeVisible();
  await expect(page.getByText(/2,121/)).toBeVisible();
  await expect.poll(() => stationCount(page)).toBe(2);
});

test("switches to Switzerland with OpenStreetMap stations and no prices", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Réglages" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("combobox", { name: "Pays" }).selectOption("CH");

  await expect.poll(() => stationCount(page)).toBe(2);
  await expect(page.getByText(/Prix maximum officiel/)).toHaveCount(0);
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
