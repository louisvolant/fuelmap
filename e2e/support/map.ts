import { type Page } from "@playwright/test";

export type TestMap = {
  jumpTo: (options: unknown) => void;
  getLayer: (id: string) => unknown;
  getSource: (id: string) => {
    serialize: () => {
      data: {
        features: {
          properties?: { id?: string };
          geometry?: { coordinates: [number, number] };
        }[];
      };
    };
  };
  project: (lngLat: [number, number]) => { x: number; y: number };
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
    { timeout: 30_000 },
  );
}

/**
 * Wait until stations are loaded and rendered, whether they are clustered
 * (country zoom) or individual (zoomed in around the user).
 */
export async function waitForStations(page: Page): Promise<void> {
  await waitForMap(page);
  await page.waitForFunction(
    () => {
      const map = (window as unknown as { __fuelmapMap?: TestMap }).__fuelmapMap;
      if (!map) return false;
      return ["station-clusters", "station-points"].some((layer) => {
        try {
          return (
            Boolean(map.getLayer(layer)) &&
            map.queryRenderedFeatures({ layers: [layer] }).length > 0
          );
        } catch {
          return false;
        }
      });
    },
    undefined,
    { timeout: 30_000 },
  );
}

/** Move the camera over Paris at a zoom where markers are unclustered. */
export async function focusParis(page: Page, zoom = 15): Promise<void> {
  await page.evaluate((value) => {
    (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap.jumpTo({
      center: [2.3522, 48.8566],
      zoom: value,
    });
  }, zoom);
  await waitForLayer(page, "station-points");
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

/** Click the marker of a station by projecting its coordinates to screen space. */
export async function clickStation(page: Page, id: string): Promise<void> {
  const point = await page.evaluate((stationId) => {
    const map = (window as unknown as { __fuelmapMap: TestMap }).__fuelmapMap;
    const collection = map.getSource("stations").serialize().data;
    const feature = collection.features.find(
      (item) => item.properties?.id === stationId,
    );
    if (!feature?.geometry) throw new Error(`station ${stationId} not found`);
    const projected = map.project(feature.geometry.coordinates);
    return { x: projected.x, y: projected.y };
  }, id);

  await page.mouse.click(point.x, point.y);
}
