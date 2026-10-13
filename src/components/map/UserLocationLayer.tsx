import { useEffect, useRef } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import type { GeoJSONSource } from "maplibre-gl";
import { useMap } from "./MapContext";
import { useGeolocationStore } from "@/stores/geolocationStore";

const SOURCE_ID = "user-location";
const HALO_LAYER = "user-location-halo";
const POINT_LAYER = "user-location-point";

/** Blue "you are here" dot rendered on the map. */
export function UserLocationLayer() {
  const map = useMap();
  const position = useGeolocationStore((state) => state.position);
  const dataRef = useRef<FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  });

  useEffect(() => {
    dataRef.current = position
      ? {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: position },
              properties: {},
            },
          ] as Feature<Point>[],
        }
      : { type: "FeatureCollection", features: [] };

    const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(dataRef.current);
  }, [map, position]);

  useEffect(() => {
    if (!map) return;

    const ensureLayers = () => {
      try {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: dataRef.current,
          });
        }
        if (!map.getLayer(HALO_LAYER)) {
          map.addLayer({
            id: HALO_LAYER,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-color": "#3b82f6",
              "circle-opacity": 0.25,
              "circle-radius": 16,
            },
          });
        }
        if (!map.getLayer(POINT_LAYER)) {
          map.addLayer({
            id: POINT_LAYER,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-color": "#2563eb",
              "circle-radius": 7,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
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

  return null;
}
