import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BoundingBox, CountryCode } from "@/countries/types";
import { getMeta, setMeta } from "@/lib/db/indexedDb";
import { fetchOsmStations, type OsmFuelStation } from "@/lib/osmStations";
import { useOsmStationsStore } from "@/stores/osmStationsStore";

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
 * OpenStreetMap fuel stations for the current viewport, cached for a week in
 * IndexedDB **and accumulated in memory** so brands never flicker while panning.
 * Only enabled for France (the one country whose official data has no brand)
 * and at zooms where brand marks are displayed.
 */
export function useOsmStations(
  country: CountryCode,
  bounds: BoundingBox | null,
) {
  const key = bounds ? bboxKey(bounds) : null;
  const merge = useOsmStationsStore((state) => state.merge);
  const accumulated = useOsmStationsStore((state) => state.stations);

  const query = useQuery<OsmFuelStation[]>({
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

  useEffect(() => {
    if (query.data) merge(query.data);
  }, [query.data, merge]);

  return { ...query, data: accumulated };
}
