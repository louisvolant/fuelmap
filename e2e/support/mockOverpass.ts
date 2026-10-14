import type { Page } from "@playwright/test";

const OVERPASS_PATTERN = /overpass-api\.de\/api\/interpreter/;

export interface OsmNodeFixture {
  /** OSM element type, defaults to `node`. */
  type?: string;
  /** OSM element id, defaults to the fixture index. */
  id?: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  center?: { lat: number; lon: number };
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
      body: JSON.stringify({
        elements: nodes.map((node, index) => ({
          type: "node",
          id: index + 1,
          ...node,
        })),
      }),
    });
  });
}
