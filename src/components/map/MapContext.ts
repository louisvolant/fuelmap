import { createContext, useContext } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

/**
 * Holds the live MapLibre map instance so that sibling components (markers,
 * controls, filters) can interact with it without prop drilling.
 */
export const MapContext = createContext<MapLibreMap | null>(null);

export function useMap(): MapLibreMap | null {
  return useContext(MapContext);
}
