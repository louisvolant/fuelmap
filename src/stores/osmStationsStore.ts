import { create } from "zustand";
import type { OsmFuelStation } from "@/lib/osmStations";

interface OsmStationsState {
  /** Stations accumulated across every viewport visited this session. */
  stations: OsmFuelStation[];
  /** Deduplication keys, kept in sync with `stations`. */
  keys: Set<string>;
  merge: (stations: OsmFuelStation[]) => void;
}

/**
 * Accumulates OpenStreetMap stations across bounding boxes.
 *
 * Without this, panning/zooming switches the query key, the freshly fetched list
 * replaces the previous one, and brands briefly disappear (the OSM nodes of the
 * new area may not cover the stations already on screen). Merging keeps brands
 * stable while the user explores.
 */
export const useOsmStationsStore = create<OsmStationsState>((set) => ({
  stations: [],
  keys: new Set<string>(),
  merge: (incoming) =>
    set((state) => {
      if (incoming.length === 0) return state;

      const keys = new Set(state.keys);
      const merged = [...state.stations];
      for (const station of incoming) {
        if (keys.has(station.key)) continue;
        keys.add(station.key);
        merged.push(station);
      }

      if (merged.length === state.stations.length) return state;
      return { stations: merged, keys };
    }),
}));
