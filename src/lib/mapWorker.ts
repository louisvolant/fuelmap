import { setWorkerUrl } from "maplibre-gl";
// `?worker&url` routes the file through Vite's worker pipeline and emits a
// self-contained worker chunk. A plain `?url` would emit the worker verbatim
// without its sibling import, so the worker would fail and no vector tile would
// ever load in production builds.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

/**
 * Point MapLibre at its bundled web worker.
 * Required for production builds: `import.meta.url` does not reliably resolve
 * to the worker inside Vite's module graph.
 */
export function configureMapLibreWorker(): void {
  setWorkerUrl(workerUrl);
}
