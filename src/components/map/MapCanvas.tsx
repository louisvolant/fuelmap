import { useEffect, useRef } from "react";
import { Map as MapLibreMap, NavigationControl, ScaleControl } from "maplibre-gl";
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
  /** Called once the map has fired its first `load` event. */
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

  // Create the map exactly once. Camera changes are handled by the parent.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center,
      zoom,
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    window.__fuelmapMap = map;
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new ScaleControl({ maxWidth: 100 }), "bottom-left");

    // Hand the instance over immediately: consumers guard on `isStyleLoaded()`
    // and react to `styledata`, so there is no need to wait for the (potentially
    // slow) `load` event, which also waits for every initial tile.
    onMapReadyRef.current?.(map);

    return () => {
      map.remove();
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
