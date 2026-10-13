import { useEffect, useMemo, useRef } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import type { NormalizedStation } from "@/countries/types";
import { useMap } from "./MapContext";
import {
  PRICE_LABEL_MIN_ZOOM,
  STATION_LAYERS,
  stationsToFeatureCollection,
} from "./stationLayers";

const { SOURCE_ID, CLUSTER_LAYER, CLUSTER_COUNT_LAYER, POINT_LAYER, LABEL_LAYER } =
  STATION_LAYERS;

const EMPTY_COLLECTION: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

interface StationMarkersProps {
  stations: NormalizedStation[];
  /** Fuel whose price is shown on markers. `null` uses the cheapest fuel. */
  activeFuelId?: string | null;
  /** Ids of favorite stations, highlighted on the map. */
  favoriteIds?: readonly string[];
  onSelect?: (id: string) => void;
}

/**
 * Renders stations as a clustered GeoJSON layer on the map.
 * Prices are only shown from `PRICE_LABEL_MIN_ZOOM` to avoid clutter.
 * The component is resilient to basemap style swaps (theme changes) by
 * re-adding its source and layers on `styledata`.
 */
export function StationMarkers({
  stations,
  activeFuelId = null,
  favoriteIds = [],
  onSelect,
}: StationMarkersProps) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  const dataRef = useRef<FeatureCollection>(EMPTY_COLLECTION);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const data = useMemo(
    () => stationsToFeatureCollection(stations, activeFuelId, favoriteIds),
    [stations, activeFuelId, favoriteIds],
  );

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Create source and layers, and (re)bind interactions.
  useEffect(() => {
    if (!map) return;

    const applyData = () => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(dataRef.current);
    };

    const ensureLayers = () => {
      if (!map.isStyleLoaded()) return;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: dataRef.current,
          cluster: true,
          clusterRadius: 50,
          clusterMaxZoom: 13,
        });
      }

      if (!map.getLayer(CLUSTER_LAYER)) {
        map.addLayer({
          id: CLUSTER_LAYER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0ea5e9",
            "circle-opacity": 0.85,
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 50, 26],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      if (!map.getLayer(CLUSTER_COUNT_LAYER)) {
        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#ffffff" },
        });
      }

      if (!map.getLayer(POINT_LAYER)) {
        map.addLayer({
          id: POINT_LAYER,
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": ["case", ["get", "favorite"], "#f59e0b", "#ffffff"],
            "circle-radius": 13,
            "circle-stroke-width": 2,
            "circle-stroke-color": ["case", ["get", "favorite"], "#b45309", "#0f172a"],
          },
        });
      }

      if (!map.getLayer(LABEL_LAYER)) {
        map.addLayer({
          id: LABEL_LAYER,
          type: "symbol",
          source: SOURCE_ID,
          minzoom: PRICE_LABEL_MIN_ZOOM,
          filter: [
            "all",
            ["!", ["has", "point_count"]],
            ["==", ["get", "hasPrice"], true],
          ],
          layout: {
            "text-field": ["get", "priceLabel"],
            "text-size": 10,
            "text-allow-overlap": true,
          },
          paint: { "text-color": "#0f172a" },
        });
      }

      applyData();
    };

    ensureLayers();
    map.on("load", ensureLayers);
    map.on("styledata", ensureLayers);

    const handleClusterClick = (event: MapLayerMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, {
        layers: [CLUSTER_LAYER],
      })[0];
      if (!feature) return;
      const clusterId = feature.properties?.cluster_id as number;
      const source = map.getSource(SOURCE_ID) as GeoJSONSource;
      const coordinates = (feature.geometry as Point).coordinates as [
        number,
        number,
      ];
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({ center: coordinates, zoom });
      });
    };

    const handlePointClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id as string | undefined;
      if (id) onSelectRef.current?.(id);
    };

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", CLUSTER_LAYER, handleClusterClick);
    map.on("click", POINT_LAYER, handlePointClick);
    map.on("mouseenter", CLUSTER_LAYER, setPointer);
    map.on("mouseleave", CLUSTER_LAYER, clearPointer);
    map.on("mouseenter", POINT_LAYER, setPointer);
    map.on("mouseleave", POINT_LAYER, clearPointer);

    return () => {
      map.off("load", ensureLayers);
      map.off("styledata", ensureLayers);
      map.off("click", CLUSTER_LAYER, handleClusterClick);
      map.off("click", POINT_LAYER, handlePointClick);
      map.off("mouseenter", CLUSTER_LAYER, setPointer);
      map.off("mouseleave", CLUSTER_LAYER, clearPointer);
      map.off("mouseenter", POINT_LAYER, setPointer);
      map.off("mouseleave", POINT_LAYER, clearPointer);
    };
  }, [map]);

  // Push fresh data into the source whenever stations or the active fuel change.
  useEffect(() => {
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data);
  }, [map, data]);

  return null;
}
