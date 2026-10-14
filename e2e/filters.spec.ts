import { expect, type Page } from "@playwright/test";
import { test } from "./support/fixtures";
import { mockFuelApi } from "./support/mockFuelApi";

type TestMap = {
  getLayer: (id: string) => unknown;
  getSource: (id: string) => {
    serialize: () => { data: { features: { properties?: { id?: string } }[] } };
  };
  queryRenderedFeatures: (options: unknown) => { properties?: { id?: string } }[];
};

async function waitForStations(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __fuelmapMap?: unknown }).__fuelmapMap),
  );
  await page.waitForFunction(
    () => {
      const map = (window as unknown as { __fuelmapMap?: TestMap }).__fuelmapMap;
      if (!map || !map.getLayer("station-clusters")) return false;
      return map.queryRenderedFeatures({ layers: ["station-clusters"] }).length > 0;
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function sourceStationIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    return map
      .getSource("stations")
      .serialize()
      .data.features.map((feature) => feature.properties?.id ?? "")
      .sort();
  });
}

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await page.goto("/");
  await waitForStations(page);
});

test("filters stations down to a single fuel", async ({ page }) => {
  await page.getByRole("button", { name: "E85" }).click();

  await expect
    .poll(() => sourceStationIds(page))
    .toEqual(["FR:75104004"]);
});

test("supports multi-fuel filtering", async ({ page }) => {
  await page.getByRole("button", { name: "Gazole" }).click();
  await page.getByRole("button", { name: "E10" }).click();

  await expect.poll(() => sourceStationIds(page)).toEqual([
    "FR:75101001",
    "FR:75102002",
  ]);
});

test("clearing filters restores every station", async ({ page }) => {
  const e85 = page.getByRole("button", { name: "E85" });
  await e85.click();
  await expect.poll(() => sourceStationIds(page)).toHaveLength(1);

  await e85.click();
  await expect.poll(() => sourceStationIds(page)).toHaveLength(4);
});
