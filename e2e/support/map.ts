import { type Page } from "@playwright/test";

export type TestMap = {
  jumpTo: (options: unknown) => void;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => {
    serialize: () => { data: { features: { properties?: { id?: string } }[] } };
  };
  queryRenderedFeatures: (options: unknown) => { properties?: { id?: string } }[];
};

/** Wait until the MapLibre instance is exposed on the window. */
export async function waitForMap(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __fuelmapMap?: unknown }).__fuelmapMap),
  );
}

/** Wait until a given layer renders at least one feature. */
export async function waitForLayer(page: Page, layer: string): Promise<void> {
  await page.waitForFunction(
    (layerId) => {
      const map = (window as unknown as { __fuelmapMap?: TestMap }).__fuelmapMap;
      if (!map || !map.getLayer(layerId)) return false;
      try {
        return map.queryRenderedFeatures({ layers: [layerId] }).length > 0;
      } catch {
        return false;
      }
    },
    layer,
    { timeout: 20_000 },
  );
}

/** Wait until stations are loaded and clustered on the map. */
export async function waitForStations(page: Page): Promise<void> {
  await waitForMap(page);
  await waitForLayer(page, "station-clusters");
}

/** Sorted station ids currently fed into the map source. */
export function sourceStationIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    return map
      .getSource("stations")
      .serialize()
      .data.features.map((feature) => feature.properties?.id ?? "")
      .sort();
  });
}
