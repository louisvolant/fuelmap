// `?worker&url` routes the worker file through Vite's worker pipeline and emits
// a self-contained worker chunk. A plain `?url` would emit the worker verbatim
// without its sibling import, so the worker would fail and no vector tile would
// ever load in production builds.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

export type MapLibreModule = typeof import("maplibre-gl");

let loaderPromise: Promise<MapLibreModule> | null = null;

/**
 * Load MapLibre GL JS on demand.
 *
 * MapLibre is by far the heaviest dependency (~1 MB), so it is imported
 * dynamically: the app shell, filters and sheets render first, and the map
 * arrives in a separate chunk. The worker URL is configured once, right after
 * the module resolves.
 */
export function loadMapLibre(): Promise<MapLibreModule> {
  if (!loaderPromise) {
    loaderPromise = import("maplibre-gl").then((module) => {
      module.setWorkerUrl(workerUrl);
      return module;
    });
  }
  return loaderPromise;
}
