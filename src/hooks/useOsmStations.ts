import { useQuery } from "@tanstack/react-query";
import type { BoundingBox, CountryCode } from "@/countries/types";
import { getMeta, setMeta } from "@/lib/db/indexedDb";
import { fetchOsmStations, type OsmFuelStation } from "@/lib/osmStations";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedOsmStations {
  at: number;
  stations: OsmFuelStation[];
}

/** Coarse bounding-box key so small pans reuse the same cached result. */
function bboxKey(bounds: BoundingBox): string {
  return bounds.map((value) => value.toFixed(2)).join(",");
}

/**
 * OpenStreetMap fuel stations for the current viewport, cached for a week.
 * Only enabled for France (the one country whose official data has no brand)
 * and at zooms where brand marks are actually displayed.
 */
export function useOsmStations(
  country: CountryCode,
  bounds: BoundingBox | null,
) {
  const key = bounds ? bboxKey(bounds) : null;

  return useQuery<OsmFuelStation[]>({
    queryKey: ["osm-stations", key],
    enabled: country === "FR" && bounds !== null,
    staleTime: CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (!bounds) return [];
      const metaKey = `osmStations:${key}`;
      const cached = await getMeta<CachedOsmStations>(metaKey);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.stations;

      const stations = await fetchOsmStations(bounds);
      await setMeta(metaKey, { at: Date.now(), stations });
      return stations;
    },
  });
}
