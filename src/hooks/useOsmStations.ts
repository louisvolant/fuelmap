import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BoundingBox, CountryCode } from "@/countries/types";
import { getMeta, setMeta } from "@/lib/db/indexedDb";
import { stableBboxKey } from "@/lib/brandResolutions";
import { fetchOsmStations, type OsmFuelStation } from "@/lib/osmStations";
import { useOsmStationsStore } from "@/stores/osmStationsStore";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Version of the IndexedDB cache key. Bumped for the quantized tile key: small
 * pans now reuse the same entry instead of refetching OpenStreetMap. Bumped
 * previously because an older client could store an empty result (the Worker
 * used to cache upstream failures as "no station"), which then hid every
 * brand for a week.
 */
const OSM_CACHE_VERSION = "v3";

interface CachedOsmStations {
  at: number;
  stations: OsmFuelStation[];
}

/** Stable tile key so small pans reuse the same cached OSM result. */
export function osmBboxKey(bounds: BoundingBox): string {
  return stableBboxKey(bounds);
}

/**
 * OpenStreetMap fuel stations for the current viewport, cached for a week in
 * IndexedDB **and accumulated in memory** so brands never flicker while panning.
 * Only enabled for France (the one country whose official data has no brand)
 * and at zooms where brand marks are displayed.
 */
export function useOsmStations(
  country: CountryCode,
  bounds: BoundingBox | null,
) {
  const key = bounds ? osmBboxKey(bounds) : null;
  const merge = useOsmStationsStore((state) => state.merge);
  const accumulated = useOsmStationsStore((state) => state.stations);

  const query = useQuery<OsmFuelStation[]>({
    queryKey: ["osm-stations", key],
    enabled: country === "FR" && bounds !== null,
    staleTime: CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!bounds) return [];
      const metaKey = `osmStations:${OSM_CACHE_VERSION}:${key}`;
      const cached = await getMeta<CachedOsmStations>(metaKey);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.stations;

      const stations = await fetchOsmStations(bounds);
      await setMeta(metaKey, { at: Date.now(), stations });
      return stations;
    },
  });

  useEffect(() => {
    if (query.data) merge(query.data);
  }, [query.data, merge]);

  return { ...query, data: accumulated };
}
