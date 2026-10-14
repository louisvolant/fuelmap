import { test as base } from "@playwright/test";
import { mockBasemap } from "./mockBasemap";

/**
 * Playwright test with the heavy OpenFreeMap basemap stubbed out.
 * Import `test` from here (instead of `@playwright/test`) in every spec.
 */
export const test = base.extend({
  page: async ({ page }, run) => {
    await mockBasemap(page);
    await run(page);
  },
});

export { expect } from "@playwright/test";
