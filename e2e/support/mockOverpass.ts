import type { Page } from "@playwright/test";

const OVERPASS_PATTERN = /overpass-api\.de\/api\/interpreter/;

export interface OsmNodeFixture {
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

/** Intercept the OpenStreetMap Overpass API with deterministic node fixtures. */
export async function mockOverpass(
  page: Page,
  nodes: OsmNodeFixture[] = [],
): Promise<void> {
  await page.route(OVERPASS_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ elements: nodes }),
    });
  });
}
