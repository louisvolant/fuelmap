import { test as base } from "@playwright/test";
import { mockBasemap } from "./mockBasemap";
import { mockBrandManifest } from "./mockBrandLogos";
import { mockOsmStations } from "./mockOsmStations";

/**
 * Playwright test with the heavy/network-dependent external services stubbed:
 * - the OpenFreeMap basemap is replaced by a one-layer style,
 * - OpenStreetMap (Overpass) returns an empty result set by default.
 *
 * Specs that need OSM data call `mockOsmStations(page, nodes)` themselves; because
 * Playwright uses the most recently registered matching route, their handler
 * takes precedence over this default.
 *
 * Import `test` from here (instead of `@playwright/test`) in every spec.
 */
export const test = base.extend({
  page: async ({ page }, run) => {
    await mockBasemap(page);
    await mockOsmStations(page);
    // No brand logo snapshot by default: specs fall back to the bundled marks.
    await mockBrandManifest(page);
    await run(page);
  },
});

export { expect } from "@playwright/test";
