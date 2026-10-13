import { create } from "zustand";
import type { CountryCode, NormalizedStation } from "@/countries/types";

interface AreaStationsState {
  /** Accumulated stations per country, keyed by id. */
  byCountry: Partial<Record<CountryCode, NormalizedStation[]>>;
  /** Merge freshly fetched area stations into the accumulated list. */
  merge: (country: CountryCode, stations: NormalizedStation[]) => void;
}

/**
 * Area-based countries (e.g. Germany) only return the stations of the queried
 * viewport. This store accumulates them so the list stays populated while the
 * user pans the map.
 */
export const useAreaStationsStore = create<AreaStationsState>((set) => ({
  byCountry: {},
  merge: (country, stations) =>
    set((state) => {
      const previous = state.byCountry[country] ?? [];
      const merged = new Map(previous.map((station) => [station.id, station]));
      for (const station of stations) merged.set(station.id, station);
      return {
        byCountry: { ...state.byCountry, [country]: [...merged.values()] },
      };
    }),
}));
