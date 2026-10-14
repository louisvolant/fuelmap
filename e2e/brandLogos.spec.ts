import { expect, test } from "./support/fixtures";
import { mockBrandLogo, mockBrandManifest } from "./support/mockBrandLogos";
import { mockFuelApi } from "./support/mockFuelApi";
import { mockOsmStations } from "./support/mockOsmStations";
import { focusParis, clickStation, waitForStations } from "./support/map";

type TestMap = { hasImage: (id: string) => boolean };

const OSM = [{ lat: 48.8566, lon: 2.3522, brand: "Total" }];

async function hasBrandImage(page: import("@playwright/test").Page) {
  return page.evaluate(() =>
    (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap.hasImage(
      "brand-totalenergies",
    ),
  );
}

test.beforeEach(async ({ page }) => {
  await mockFuelApi(page);
  await mockOsmStations(page, OSM);
  await page.goto("/");
  await waitForStations(page);
  await focusParis(page);
});

test("prefers the snapshot served by the worker", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/brands/")) requested.push(request.url());
  });

  await mockBrandManifest(page, {
    at: Date.now(),
    brands: [{ id: "totalenergies", status: "ok" }],
  });
  await mockBrandLogo(page, "totalenergies");

  await page.reload();
  await waitForStations(page);
  await focusParis(page);

  await expect.poll(() => hasBrandImage(page)).toBe(true);
  expect(requested.some((url) => url.endsWith("/brands/totalenergies"))).toBe(
    true,
  );
});

test("falls back to the bundled mark when the snapshot is missing", async ({
  page,
}) => {
  await mockBrandManifest(page, {
    at: Date.now(),
    brands: [{ id: "totalenergies", status: "ok" }],
  });
  await mockBrandLogo(page, "totalenergies", 404);

  await page.reload();
  await waitForStations(page);
  await focusParis(page);

  // The snapshot 404s, but the bundled SVG still provides the mark.
  await expect.poll(() => hasBrandImage(page)).toBe(true);
});

test("shows the brand badge in the station details", async ({ page }) => {
  await mockBrandManifest(page, {
    at: Date.now(),
    brands: [{ id: "totalenergies", status: "ok" }],
  });
  await mockBrandLogo(page, "totalenergies");

  await page.reload();
  await waitForStations(page);
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute(
    "src",
    /\/brands\/totalenergies$/,
  );
});
