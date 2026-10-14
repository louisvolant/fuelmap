import type { Page } from "@playwright/test";

/**
 * Minimal basemap style used in end-to-end tests.
 *
 * The real OpenFreeMap style draws ~100 vector layers, which is very expensive
 * under headless software WebGL and is never asserted by our tests. Replacing it
 * with a single background layer keeps GeoJSON layers, clustering, symbols and
 * the camera working, and removes almost all of the rendering cost.
 *
 * Font glyphs are still fetched from OpenFreeMap because our price labels need
 * them.
 */
const STUB_STYLE = {
  version: 8,
  name: "fuelmap-test",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#e8eef5" },
    },
  ],
};

export async function mockBasemap(page: Page): Promise<void> {
  await page.route(/tiles\.openfreemap\.org\//, async (route) => {
    const url = route.request().url();
    if (url.includes("/styles/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(STUB_STYLE),
      });
      return;
    }
    if (url.includes("/fonts/")) {
      await route.continue();
      return;
    }
    await route.abort();
  });
}
