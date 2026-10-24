import { expect, test } from "./support/fixtures";
import { mockBrandLogo } from "./support/mockBrandLogos";
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
  await mockBrandLogo(page, "totalenergies", 404);

  await page.reload();
  await waitForStations(page);
  await focusParis(page);

  // The snapshot 404s, but the bundled SVG still provides the mark.
  await expect.poll(() => hasBrandImage(page)).toBe(true);
});

test("shows the brand badge in the station details", async ({ page }) => {
  await mockBrandLogo(page, "totalenergies");

  await page.reload();
  await waitForStations(page);
  await focusParis(page);
  await clickStation(page, "FR:75101001");

  // The badge starts from the bundled mark and upgrades to the snapshot
  // normalized through the logo pipeline (never a raw JPEG that would render as
  // a grey disc). The upgrade can land before the first assertion, so accept
  // either data URL here and require the normalized PNG below.
  const badge = page.getByRole("dialog").getByRole("img");
  await expect(badge).toHaveAttribute("src", /^data:image\/(svg\+xml|png)/);
  await expect
    .poll(() => badge.getAttribute("src"))
    .toMatch(/^data:image\/png/);
});
