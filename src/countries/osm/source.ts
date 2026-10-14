import type {
  AreaFuelDataSource,
  CountryCode,
  NormalizedStation,
} from "@/countries/types";
import { fetchOsmStations } from "@/lib/osmStations";

interface OsmAreaSourceOptions {
  id: string;
  country: CountryCode;
  attribution?: string;
  refreshIntervalMs?: number;
}

/**
 * Area-based station source backed by OpenStreetMap (through the Worker proxy).
 * Returns stations without prices: used for countries that have no per-station
 * price data (Belgium, Luxembourg, Switzerland).
 */
export function createOsmAreaSource({
  id,
  country,
  attribution = "© OpenStreetMap contributors",
  refreshIntervalMs = 24 * 60 * 60 * 1000,
}: OsmAreaSourceOptions): AreaFuelDataSource {
  return {
    id,
    country,
    kind: "area",
    refreshIntervalMs,
    attribution,
    async fetchArea(bounds, { signal } = {}) {
      const stations = await fetchOsmStations(bounds, { signal });
      return stations.map(
        (station): NormalizedStation => ({
          id: `${country}:${station.key}`,
          country,
          lat: station.lat,
          lon: station.lon,
          address: station.address,
          city: station.city,
          postalCode: station.postalCode,
          brand: station.brand,
          isHighway: false,
          fuels: [],
          services: [],
          automat24h: station.opening24h,
          sourceId: station.key,
        }),
      );
    },
  };
}
