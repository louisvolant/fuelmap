import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { loadMapLibre } from "@/lib/mapLibreLoader";
import "maplibre-gl/dist/maplibre-gl.css";

declare global {
  interface Window {
    /**
     * Live MapLibre instance. Exposed as a debugging and end-to-end testing
     * hook so tests can inspect rendered layers and move the camera.
     */
    __fuelmapMap?: MapLibreMap;
  }
}

interface MapCanvasProps {
  /** Initial center as `[lon, lat]`. */
  center: [number, number];
  /** Initial zoom level. */
  zoom: number;
  /** OpenFreeMap style URL. */
  styleUrl: string;
  className?: string;
  /** Called once the map instance is created. */
  onMapReady?: (map: MapLibreMap) => void;
}

/** Full-screen MapLibre canvas backed by OpenFreeMap vector tiles. */
export function MapCanvas({
  center,
  zoom,
  styleUrl,
  className,
  onMapReady,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const initialStyleRef = useRef(styleUrl);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  // Create the map exactly once, after MapLibre has been lazy-loaded.
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    void (async () => {
      const maplibregl = await loadMapLibre();
      if (cancelled || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center,
        zoom,
        attributionControl: { compact: true },
      });

      mapRef.current = map;
      window.__fuelmapMap = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");

      onMapReadyRef.current?.(map);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      delete window.__fuelmapMap;
    };
    // Intentionally run once: `center`/`zoom`/`styleUrl` are treated as initial values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap style when it changes (e.g. theme switch), skipping the first render.
  useEffect(() => {
    if (initialStyleRef.current === styleUrl) return;
    initialStyleRef.current = styleUrl;
    mapRef.current?.setStyle(styleUrl);
  }, [styleUrl]);

  return (
    <div
      ref={containerRef}
      data-testid="map-canvas"
      role="application"
      aria-label="Fuel stations map"
      className={className}
    />
  );
}
