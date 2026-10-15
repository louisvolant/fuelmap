import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCountry } from "@/countries";
import type {
  BoundingBox,
  CountryCode,
  NormalizedStation,
} from "@/countries/types";
import {
  getAllBrandResolutions,
  getMeta,
  getStationsByCountry,
  lastSyncKey,
  saveBrandResolutions,
  saveStations,
  setMeta,
} from "@/lib/db/indexedDb";
import { BRAND_FETCH_MIN_ZOOM } from "@/components/map/stationLayers";
import {
  applyBrandResolutions,
  collectNewResolutions,
  isResolutionFresh,
  type BrandResolution,
} from "@/lib/brandResolutions";
import { enrichStationsWithBrands } from "@/lib/osmBrands";
import { useAreaStationsStore } from "@/stores/areaStationsStore";
import { useOsmStations } from "./useOsmStations";

const DEFAULT_STALE_TIME = 10 * 60 * 1000;

/** Stable empty array so store selectors do not trigger needless renders. */
const EMPTY_STATIONS: NormalizedStation[] = [];

export function stationsQueryKey(country: CountryCode) {
  return ["stations", country] as const;
}

/**
 * Bulk countries (France, Spain): hydrate from IndexedDB, then revalidate from
 * the network and write back to IndexedDB.
 */
export function useBulkStations(country: CountryCode) {
  const queryClient = useQueryClient();
  const source = getCountry(country).dataSource;
  const queryKey = useMemo(() => stationsQueryKey(country), [country]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [cached, lastSync] = await Promise.all([
        getStationsByCountry(country),
        getMeta<number>(lastSyncKey(country)),
      ]);
      if (cancelled || cached.length === 0) return;
      if (queryClient.getQueryData(queryKey)) return;
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
    enabled: source?.kind === "bulk",
    staleTime: source?.refreshIntervalMs ?? DEFAULT_STALE_TIME,
    refetchInterval: source?.refreshIntervalMs ?? false,
    queryFn: async () => {
      if (source?.kind !== "bulk") return [];
      const stations = await source.fetchStations();
      await saveStations(country, stations);
      await setMeta(lastSyncKey(country), Date.now());
      return stations;
    },
  });
}

/**
 * Area countries (Germany): fetch the current viewport and accumulate results
 * across map movements so the list stays populated while panning.
 */
export function useAreaStations(
  country: CountryCode,
  bounds: BoundingBox | null,
) {
  const source = getCountry(country).dataSource;
  const merge = useAreaStationsStore((state) => state.merge);
  const stations = useAreaStationsStore(
    (state) => state.byCountry[country] ?? EMPTY_STATIONS,
  );

  const boundsKey = bounds
    ? bounds.map((value) => value.toFixed(2)).join(",")
    : null;

  const query = useQuery<NormalizedStation[]>({
    queryKey: ["stations-area", country, boundsKey],
    enabled: source?.kind === "area" && bounds !== null,
    staleTime: source?.refreshIntervalMs ?? DEFAULT_STALE_TIME,
    queryFn: async () => {
      if (source?.kind !== "area" || !bounds) return [];
      return source.fetchArea(bounds);
    },
  });

  useEffect(() => {
    if (query.data) merge(country, query.data);
  }, [country, query.data, merge]);

  return {
    stations,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export interface CountryStations {
  stations: NormalizedStation[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/** Pick the right loading strategy for the active country, with automatic brand enrichment. */
export function useCountryStations(
  country: CountryCode,
  bounds: BoundingBox | null,
  zoom?: number,
): CountryStations {
  const definition = getCountry(country);
  const source = definition.dataSource;
  const bulk = useBulkStations(country);
  const area = useAreaStations(country, bounds);
  const [resolutions, setResolutions] = useState<Map<string, BrandResolution>>(
    () => new Map(),
  );

  // Load the persistent brand overlay once: logos render instantly, before any
  // OpenStreetMap fetch for the current viewport resolves.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cached = await getAllBrandResolutions();
        if (cancelled) return;
        const now = Date.now();
        setResolutions(
          new Map(
            cached
              .filter((resolution) => isResolutionFresh(resolution, now))
              .map((resolution) => [resolution.stationId, resolution]),
          ),
        );
      } catch {
        // Overlay is best-effort: OSM enrichment still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const needsEnrichment = Boolean(definition.needsBrandEnrichment);
  const osmBounds =
    needsEnrichment && zoom !== undefined && zoom >= BRAND_FETCH_MIN_ZOOM
      ? bounds
      : null;
  const osm = useOsmStations(country, osmBounds);

  const rawStations =
    source?.kind === "area" ? area.stations : (bulk.data ?? EMPTY_STATIONS);

  // Fast path: apply remembered brands synchronously, then let OSM fill the gaps.
  const cachedStations = useMemo(() => {
    if (!needsEnrichment || resolutions.size === 0) return rawStations;
    return applyBrandResolutions(rawStations, resolutions);
  }, [needsEnrichment, rawStations, resolutions]);

  const stations = useMemo(() => {
    if (!needsEnrichment || !osm.data || osm.data.length === 0) {
      return cachedStations;
    }
    return enrichStationsWithBrands(cachedStations, osm.data);
  }, [needsEnrichment, cachedStations, osm.data]);

  // Persist newly enriched brands so the next visit skips the OSM wait.
  useEffect(() => {
    if (!needsEnrichment || stations.length === 0) return;
    const fresh = collectNewResolutions(cachedStations, stations);
    if (fresh.length === 0) return;
    setResolutions((previous) => {
      const next = new Map(previous);
      for (const resolution of fresh) next.set(resolution.stationId, resolution);
      return next;
    });
    void saveBrandResolutions(fresh).catch(() => {});
  }, [needsEnrichment, cachedStations, stations]);

  if (source?.kind === "area") {
    return {
      stations,
      isLoading: area.isLoading && area.stations.length === 0,
      isError: area.isError,
      refetch: () => void area.refetch(),
    };
  }

  return {
    stations,
    isLoading: bulk.isLoading,
    isError: bulk.isError,
    refetch: () => void bulk.refetch(),
  };
}
