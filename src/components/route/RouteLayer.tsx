import { useEffect, useRef } from "react";
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { GeoJSONSource, MapMouseEvent } from "maplibre-gl";
import { useMap } from "@/components/map/MapContext";
import { fetchRoute, type RouteResult } from "@/lib/routing";
import { useGeolocationStore } from "@/stores/geolocationStore";
import { useRouteStore } from "@/stores/routeStore";

const SOURCE_ID = "route";
const LINE_LAYER = "route-line";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function routeFeature(route: RouteResult | null): FeatureCollection {
  if (!route) return EMPTY;
  const feature: Feature<LineString> = {
    type: "Feature",
    geometry: { type: "LineString", coordinates: route.coordinates },
    properties: {},
  };
  return { type: "FeatureCollection", features: [feature] };
}

/**
 * Handles the route workflow: destination picking on the map, route computation
 * from the user's position, and drawing the route line.
 */
export function RouteLayer() {
  const map = useMap();
  const position = useGeolocationStore((state) => state.position);
  const picking = useRouteStore((state) => state.picking);
  const destination = useRouteStore((state) => state.destination);
  const route = useRouteStore((state) => state.route);

  const dataRef = useRef<FeatureCollection>(EMPTY);
  const pickingRef = useRef(picking);

  useEffect(() => {
    pickingRef.current = picking;
  }, [picking]);

  // Keep the route line data in sync with the store.
  useEffect(() => {
    dataRef.current = routeFeature(route);
    const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(dataRef.current);
  }, [map, route]);

  useEffect(() => {
    if (!map) return;

    const ensureLayers = () => {
      try {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, { type: "geojson", data: dataRef.current });
        }
        if (!map.getLayer(LINE_LAYER)) {
          map.addLayer({
            id: LINE_LAYER,
            type: "line",
            source: SOURCE_ID,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": "#0ea5e9",
              "line-width": 5,
              "line-opacity": 0.85,
            },
          });
        }
        (map.getSource(SOURCE_ID) as GeoJSONSource | undefined)?.setData(
          dataRef.current,
        );
      } catch {
        // Style not ready yet: retry on the next `styledata` / `idle` event.
      }
    };

    ensureLayers();
    map.on("load", ensureLayers);
    map.on("styledata", ensureLayers);
    map.on("idle", ensureLayers);

    return () => {
      map.off("load", ensureLayers);
      map.off("styledata", ensureLayers);
      map.off("idle", ensureLayers);
    };
  }, [map]);

  // Pick a destination by clicking the map (ignoring clicks on station markers).
  useEffect(() => {
    if (!map) return;

    const onClick = (event: MapMouseEvent) => {
      if (!pickingRef.current) return;
      const hitStation = map.queryRenderedFeatures(event.point, {
        layers: ["station-points", "station-clusters"],
      });
      if (hitStation.length > 0) return;
      useRouteStore
        .getState()
        .setDestination([event.lngLat.lng, event.lngLat.lat]);
    };

    map.getCanvas().style.cursor = picking ? "crosshair" : "";

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, picking]);

  // Compute the route once we have a start (user position) and a destination.
  useEffect(() => {
    if (!position || !destination) return;
    let cancelled = false;
    const controller = new AbortController();
    useRouteStore.getState().setStatus("loading");

    void fetchRoute(position, destination, { signal: controller.signal })
      .then((result) => {
        if (!cancelled) useRouteStore.getState().setRoute(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof Error && error.name === "AbortError") return;
        useRouteStore.getState().setStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [position, destination]);

  return null;
}
