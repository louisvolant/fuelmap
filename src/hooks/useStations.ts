import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCountry } from "@/countries";
import type { CountryCode, NormalizedStation } from "@/countries/types";
import {
  getMeta,
  getStationsByCountry,
  lastSyncKey,
  saveStations,
  setMeta,
} from "@/lib/db/indexedDb";

const DEFAULT_STALE_TIME = 10 * 60 * 1000;

export function stationsQueryKey(country: CountryCode) {
  return ["stations", country] as const;
}

/**
 * Load the stations of a country.
 *
 * Strategy: stale-while-revalidate.
 * 1. Cached stations are hydrated immediately from IndexedDB (instant first paint).
 * 2. The network source is queried; results are written back to IndexedDB.
 * 3. Data is refreshed every `refreshIntervalMs` (10 min for France).
 */
export function useStations(country: CountryCode) {
  const queryClient = useQueryClient();
  const countryDefinition = getCountry(country);
  const source = countryDefinition.dataSource;
  const queryKey = useMemo(() => stationsQueryKey(country), [country]);

  // Hydrate from IndexedDB before/while the network request resolves.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [cached, lastSync] = await Promise.all([
        getStationsByCountry(country),
        getMeta<number>(lastSyncKey(country)),
      ]);
      if (cancelled || cached.length === 0) return;
      if (queryClient.getQueryData(queryKey)) return;

      // Mark data as of `lastSync` so React Query can decide to revalidate.
      queryClient.setQueryData<NormalizedStation[]>(queryKey, cached, {
        updatedAt: lastSync ?? Date.now(),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [country, queryClient, queryKey]);

  return useQuery<NormalizedStation[]>({
    queryKey,
    enabled: source !== null,
    staleTime: source?.refreshIntervalMs ?? DEFAULT_STALE_TIME,
    refetchInterval: source?.refreshIntervalMs ?? false,
    queryFn: async () => {
      if (!source) return [];
      const stations = await source.fetchStations();
      await saveStations(country, stations);
      await setMeta(lastSyncKey(country), Date.now());
      return stations;
    },
  });
}
