import { useEffect, useRef } from "react";
import type { FeatureCollection } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from "maplibre-gl";
import { useTranslation } from "react-i18next";
import { loadMapLibre } from "@/lib/mapLibreLoader";
import {
  formatRadarDate,
  radarTypeLabelKey,
  type RadarFeatureCollection,
  type RadarProperties,
} from "@/lib/radars";
import { useMap } from "./MapContext";

const SOURCE_ID = "radars";
export const RADAR_LAYER = "radar-points";
const ICON_ID = "radar-icon";
/** Keep the map readable at country scale; radars appear when zooming in. */
const RADAR_MIN_ZOOM = 11;
const ATTRIBUTION = "Radars fixes — Ministère de l'Intérieur (Licence Ouverte 2.0)";

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Small red/white round sign with a speed-camera pictogram. */
const RADAR_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="29" fill="#ffffff" stroke="#dc2626" stroke-width="4"/>
  <rect x="17" y="25" width="30" height="19" rx="3" fill="#1f2937"/>
  <circle cx="32" cy="34.5" r="6.5" fill="#ffffff"/>
  <circle cx="32" cy="34.5" r="2.8" fill="#dc2626"/>
  <rect x="28" y="18" width="8" height="8" rx="1.5" fill="#1f2937"/>
  <path d="M13 48h38" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
</svg>`;
const RADAR_ICON_URL = `data:image/svg+xml,${encodeURIComponent(RADAR_ICON_SVG)}`;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function popupHtml(
  properties: RadarProperties,
  t: (key: string) => string,
  locale: string,
): string {
  const type = t(radarTypeLabelKey(properties.type));
  const speed =
    properties.maxSpeedKmh === null
      ? t("radars.noSpeed")
      : `${properties.maxSpeedKmh} km/h`;
  const commissioned = formatRadarDate(properties.commissionedAt, locale);

  return [
    '<div style="font:12px/1.45 system-ui,sans-serif;color:#0f172a">',
    `<strong style="font-size:13px">${escapeHtml(t("radars.title"))}</strong>`,
    `<div>${escapeHtml(type)}</div>`,
    `<div>${escapeHtml(t("radars.speed"))}: ${escapeHtml(speed)}</div>`,
    commissioned
      ? `<div>${escapeHtml(t("radars.commissioned"))}: ${escapeHtml(commissioned)}</div>`
      : "",
    `<div style="margin-top:4px;color:#64748b">${escapeHtml(t("radars.source"))}</div>`,
    "</div>",
  ].join("");
}

async function ensureRadarImage(map: MapLibreMap): Promise<void> {
  if (map.hasImage(ICON_ID)) return;
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("radar icon could not be decoded"));
      element.src = RADAR_ICON_URL;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, 64, 64);
    if (!map.hasImage(ICON_ID)) {
      map.addImage(ICON_ID, context.getImageData(0, 0, 64, 64));
    }
  } catch {
    // The layer still works without the icon (the map simply shows no symbol).
  }
}

interface RadarMarkersProps {
  data?: RadarFeatureCollection | null;
}

/**
 * Fixed speed cameras (France), drawn as a symbol layer above the stations.
 * The payload is a single country-wide GeoJSON snapshot served from R2 and
 * cached by the Worker, so panning never triggers a new upstream query.
 */
export function RadarMarkers({ data }: RadarMarkersProps) {
  const map = useMap();
  const { t, i18n } = useTranslation();
  const dataRef = useRef<FeatureCollection>(data ?? EMPTY);
  const tRef = useRef(t);
  const localeRef = useRef(i18n.language);

  useEffect(() => {
    tRef.current = t;
    localeRef.current = i18n.language;
  }, [t, i18n.language]);

  useEffect(() => {
    dataRef.current = data ?? EMPTY;
  }, [data]);

  useEffect(() => {
    if (!map) return;

    const applyData = () => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(dataRef.current);
    };

    const ensureLayers = async () => {
      try {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: dataRef.current,
            attribution: ATTRIBUTION,
          });
        }

        // The image must exist before the symbol layer is added, otherwise
        // MapLibre marks the layer as having a missing image and never recovers.
        await ensureRadarImage(map);

        if (!map.getLayer(RADAR_LAYER)) {
          map.addLayer({
            id: RADAR_LAYER,
            type: "symbol",
            source: SOURCE_ID,
            minzoom: RADAR_MIN_ZOOM,
            layout: {
              "icon-image": ICON_ID,
              "icon-size": [
                "interpolate",
                ["linear"],
                ["zoom"],
                RADAR_MIN_ZOOM,
                0.4,
                16,
                0.62,
              ],
              "icon-allow-overlap": false,
              "icon-padding": 2,
            },
          });
        }

        applyData();
      } catch {
        // Style not ready yet: retry on the next `styledata` / `idle` event.
      }
    };

    ensureLayers();
    map.on("load", ensureLayers);
    map.on("styledata", ensureLayers);
    map.on("idle", ensureLayers);

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature?.geometry || feature.geometry.type !== "Point") return;
      const coordinates = feature.geometry.coordinates as [number, number];
      const properties = feature.properties as unknown as RadarProperties;

      void loadMapLibre().then((maplibregl) => {
        new maplibregl.Popup({ offset: 16, maxWidth: "280px" })
          .setLngLat(coordinates)
          .setHTML(popupHtml(properties, tRef.current, localeRef.current))
          .addTo(map);
      });
    };

    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", RADAR_LAYER, handleClick);
    map.on("mouseenter", RADAR_LAYER, setPointer);
    map.on("mouseleave", RADAR_LAYER, clearPointer);

    return () => {
      map.off("load", ensureLayers);
      map.off("styledata", ensureLayers);
      map.off("idle", ensureLayers);
      map.off("click", RADAR_LAYER, handleClick);
      map.off("mouseenter", RADAR_LAYER, setPointer);
      map.off("mouseleave", RADAR_LAYER, clearPointer);
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(data ?? EMPTY);
  }, [map, data]);

  return null;
}
