import { useEffect, useMemo, useRef } from "react";
import type { FeatureCollection, Point } from "geojson";
import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import type { NormalizedStation } from "@/countries/types";
import {
  ensureBrandImages,
  ensureDefaultBrandImage,
  ensurePricePillImage,
  PRICE_PILL_IMAGE_ID,
} from "@/lib/brandImages";
import { matchBrand, type BrandId } from "@/lib/brands";
import { useMap } from "./MapContext";
import {
  CLUSTER_MAX_ZOOM,
  PRICE_MIN_ZOOM,
  STATION_LAYERS,
  stationsToFeatureCollection,
} from "./stationLayers";

const {
  SOURCE_ID,
  CLUSTER_LAYER,
  CLUSTER_COUNT_LAYER,
  POINT_LAYER,
  BRAND_LAYER,
  LABEL_LAYER,
  PRICE_DISC_LAYER,
} = STATION_LAYERS;

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
  /** Whether the country publishes per-station prices (see stationLayers). */
  showPrices?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * Renders stations as a clustered GeoJSON layer.
 *
 * Marker anatomy, zoom by zoom:
 * - clustered bubbles at country scale;
 * - individual bubbles carry their brand mark whenever they are drawn;
 * - a bubble whose brand is unknown carries the selected fuel's price instead,
 *   so a bubble is never drawn blank;
 * - from `PRICE_MIN_ZOOM`: the bubble opens into a capsule — brand mark on the
 *   left, price in a rounded capsule right behind it.
 *
 * The component is resilient to basemap style swaps: sources, layers **and
 * images** (which live inside the style) are re-injected on `styledata`/`idle`.
 */
export function StationMarkers({
  stations,
  activeFuelId = null,
  favoriteIds = [],
  showPrices = true,
  onSelect,
}: StationMarkersProps) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);
  const dataRef = useRef<FeatureCollection>(EMPTY_COLLECTION);
  // Brands currently displayed; needed to re-register their SVG marks after a
  // basemap style swap (images live inside the style and are dropped by it).
  const brandIdsRef = useRef<Set<BrandId>>(new Set());

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const data = useMemo(
    () =>
      stationsToFeatureCollection(stations, activeFuelId, favoriteIds, {
        showPrices,
      }),
    [stations, activeFuelId, favoriteIds, showPrices],
  );

  // Track the brands currently displayed, and register their SVG marks.
  useEffect(() => {
    const ids = new Set<BrandId>();
    for (const station of stations) {
      const id = matchBrand(station.brand);
      if (id) ids.add(id);
    }
    brandIdsRef.current = ids;
    if (map && ids.size > 0) void ensureBrandImages(map, ids);
  }, [map, stations]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Create sources, images and layers, and (re)bind interactions.
  useEffect(() => {
    if (!map) return;

    const applyData = () => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(dataRef.current);
    };

    const ensureLayers = () => {
      try {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: dataRef.current,
            cluster: true,
            clusterRadius: 50,
            clusterMaxZoom: CLUSTER_MAX_ZOOM,
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
              "text-font": ["Noto Sans Regular"],
              "text-size": 12,
              "text-allow-overlap": true,
            },
            paint: { "text-color": "#ffffff" },
          });
        }

        // The bubble: a round white disc holding the brand mark, or the price
        // when the brand is unknown.
        if (!map.getLayer(POINT_LAYER)) {
          map.addLayer({
            id: POINT_LAYER,
            type: "circle",
            source: SOURCE_ID,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-color": [
                "case",
                ["get", "favorite"],
                "#f59e0b",
                ["case", ["get", "dimmed"], "#e5e7eb", "#ffffff"],
              ],
              "circle-radius": 15,
              "circle-stroke-width": 2,
              "circle-stroke-color": [
                "case",
                ["get", "favorite"],
                "#b45309",
                [
                  "case",
                  ["get", "dimmed"],
                  "#cbd5e1",
                  ["case", ["get", "priceInDisc"], ["get", "priceColor"], "#0f172a"],
                ],
              ],
            },
          });
        }

        // Price: a rounded capsule right behind the bubble (from PRICE_MIN_ZOOM).
        // Only for branded bubbles; an unknown brand shows its price *inside* the
        // disc instead (see PRICE_DISC_LAYER).
        if (!map.getLayer(LABEL_LAYER)) {
          map.addLayer({
            id: LABEL_LAYER,
            type: "symbol",
            source: SOURCE_ID,
            minzoom: PRICE_MIN_ZOOM,
            filter: [
              "all",
              ["!", ["has", "point_count"]],
              ["==", ["get", "hasPrice"], true],
              ["==", ["get", "priceInDisc"], false],
            ],
            layout: {
              "icon-image": PRICE_PILL_IMAGE_ID,
              "icon-text-fit": "both",
              "icon-text-fit-padding": [2, 6, 2, 6],
              "icon-allow-overlap": true,
              "text-field": ["get", "priceLabel"],
              // OpenFreeMap hosts Noto Sans; the Mapbox default font stack 404s.
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-anchor": "left",
              "text-offset": [1.5, 0],
              "text-allow-overlap": true,
            },
            paint: { "text-color": ["get", "priceColor"] },
          });
        }

        // Price inside the disc, for stations whose brand is unknown: a bubble
        // with no logo must still say something (see `priceInDisc`). No minzoom
        // on purpose — it is the only content of that bubble, at every zoom.
        if (!map.getLayer(PRICE_DISC_LAYER)) {
          map.addLayer({
            id: PRICE_DISC_LAYER,
            type: "symbol",
            source: SOURCE_ID,
            filter: [
              "all",
              ["!", ["has", "point_count"]],
              ["==", ["get", "priceInDisc"], true],
            ],
            layout: {
              "text-field": ["get", "priceLabel"],
              "text-font": ["Noto Sans Regular"],
              "text-size": 10,
              "text-anchor": "center",
              "text-allow-overlap": true,
            },
            paint: { "text-color": ["get", "priceColor"] },
          });
        }

        // Brand mark, drawn above the bubble and the price capsule.
        // No minzoom on purpose: clustering is radius-based, so individual
        // bubbles also exist below CLUSTER_MAX_ZOOM and must carry their logo.
        if (!map.getLayer(BRAND_LAYER)) {
          map.addLayer({
            id: BRAND_LAYER,
            type: "symbol",
            source: SOURCE_ID,
            filter: [
              "all",
              ["!", ["has", "point_count"]],
              ["!=", ["get", "brandImage"], ""],
            ],
            layout: {
              "icon-image": ["get", "brandImage"],
              // Fill the bubble: keep only a hairline of white around the mark.
              "icon-size": 0.86,
              "icon-allow-overlap": true,
              "icon-anchor": "center",
            },
            paint: {
              // Dimmed stations (no price for the current fuel) are greyed out.
              "icon-opacity": ["case", ["get", "dimmed"], 0.4, 1],
            },
          });
        }

        applyData();

        // Images belong to the style: re-register them after a style swap.
        void ensurePricePillImage(map);
        void ensureDefaultBrandImage(map);
        if (brandIdsRef.current.size > 0) {
          void ensureBrandImages(map, brandIdsRef.current);
        }
      } catch {
        // Style not ready yet: retry on the next `styledata` / `idle` event.
      }
    };

    ensureLayers();
    map.on("load", ensureLayers);
    map.on("styledata", ensureLayers);
    map.on("idle", ensureLayers);

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

    const interactiveLayers = [
      POINT_LAYER,
      BRAND_LAYER,
      LABEL_LAYER,
      PRICE_DISC_LAYER,
    ];

    map.on("click", CLUSTER_LAYER, handleClusterClick);
    for (const layer of interactiveLayers) {
      map.on("click", layer, handlePointClick);
      map.on("mouseenter", layer, setPointer);
      map.on("mouseleave", layer, clearPointer);
    }
    map.on("mouseenter", CLUSTER_LAYER, setPointer);
    map.on("mouseleave", CLUSTER_LAYER, clearPointer);

    return () => {
      map.off("load", ensureLayers);
      map.off("styledata", ensureLayers);
      map.off("idle", ensureLayers);
      map.off("click", CLUSTER_LAYER, handleClusterClick);
      for (const layer of interactiveLayers) {
        map.off("click", layer, handlePointClick);
        map.off("mouseenter", layer, setPointer);
        map.off("mouseleave", layer, clearPointer);
      }
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
