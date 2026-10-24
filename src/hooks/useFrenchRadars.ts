import { useQuery } from "@tanstack/react-query";
import { fetchFrenchRadars } from "@/lib/api/radars";
import type { RadarFeatureCollection } from "@/lib/radars";
import { useCountryStore } from "@/stores/countryStore";
import { useRadarStore } from "@/stores/radarStore";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Official French fixed speed cameras, fetched once and reused for a week.
 * Outside France, or when the layer is disabled, no request is made.
 */
export function useFrenchRadars(): {
  data: RadarFeatureCollection | undefined;
} {
  const country = useCountryStore((state) => state.country);
  const showFixedRadars = useRadarStore((state) => state.showFixedRadars);
  const enabled = country === "FR" && showFixedRadars;

  const query = useQuery<RadarFeatureCollection>({
    queryKey: ["radars", "FR"],
    enabled,
    staleTime: CACHE_TTL_MS,
    gcTime: CACHE_TTL_MS,
    refetchOnWindowFocus: false,
    queryFn: ({ signal }) => fetchFrenchRadars({ signal }),
  });

  return { data: enabled ? query.data : undefined };
}
