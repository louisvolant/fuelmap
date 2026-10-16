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
  stableBboxKey,
  type BrandResolution,
} from "@/lib/brandResolutions";
import { fetchBrandSnapshot } from "@/lib/brandSnapshot";
import { enrichStationsWithBrandsDetailed } from "@/lib/osmBrands";
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

  const boundsKey = bounds ? stableBboxKey(bounds) : null;

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

  // Load the persistent brand overlay once: IndexedDB first (instant), then the
  // precomputed Worker snapshot (covers areas this device never visited), so
  // logos render before any live OpenStreetMap fetch resolves.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cached, snapshot] = await Promise.all([
          getAllBrandResolutions(),
          needsEnrichment ? fetchBrandSnapshot().catch(() => null) : null,
        ]);
        if (cancelled) return;
        const now = Date.now();
        const merged = new Map<string, BrandResolution>();
        for (const resolution of cached) {
          if (isResolutionFresh(resolution, now)) {
            merged.set(resolution.stationId, resolution);
          }
        }
        // Snapshot wins when newer: it is the newest offline computation.
        for (const resolution of snapshot ?? []) {
          const existing = merged.get(resolution.stationId);
          if (!existing || resolution.resolvedAt >= existing.resolvedAt) {
            merged.set(resolution.stationId, resolution);
          }
        }
        setResolutions(merged);
        // Backfill IndexedDB so the snapshot works offline on next boot.
        const missing = [...merged.values()].filter(
          (resolution) =>
            !cached.some((entry) => entry.stationId === resolution.stationId),
        );
        if (missing.length > 0) void saveBrandResolutions(missing).catch(() => {});
      } catch {
        // Overlay is best-effort: OSM enrichment still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
    // needsEnrichment is stable per country session; snapshot fetch runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const enriched = useMemo(() => {
    if (!needsEnrichment || !osm.data || osm.data.length === 0) {
      return { stations: cachedStations, assignments: [] };
    }
    return enrichStationsWithBrandsDetailed(cachedStations, osm.data);
  }, [needsEnrichment, cachedStations, osm.data]);
  const { stations, assignments } = enriched;

  // Persist newly enriched brands so the next visit skips the OSM wait. The
  // in-memory overlay syncs after the IndexedDB write (async fetch pattern).
  useEffect(() => {
    if (!needsEnrichment || stations.length === 0) return;
    const provenance = new Map(
      assignments.map((assignment) => [
        assignment.stationId,
        { osmKey: assignment.osmKey, distanceM: assignment.distanceM },
      ]),
    );
    const fresh = collectNewResolutions(cachedStations, stations, provenance);
    if (fresh.length === 0) return;
    void (async () => {
      try {
        await saveBrandResolutions(fresh);
      } catch {
        // Overlay is best-effort.
      }
      setResolutions((previous) => {
        const next = new Map(previous);
        for (const resolution of fresh) next.set(resolution.stationId, resolution);
        return next;
      });
    })();
  }, [needsEnrichment, cachedStations, stations, assignments]);

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
