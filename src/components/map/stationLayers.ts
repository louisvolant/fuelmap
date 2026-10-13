import type { Feature, FeatureCollection, Point } from "geojson";
import type { NormalizedStation } from "@/countries/types";
import { displayFuel } from "@/lib/stationUtils";
import { formatPriceCompact } from "@/lib/format";

const SOURCE_ID = "stations";
const CLUSTER_LAYER = "station-clusters";
const CLUSTER_COUNT_LAYER = "station-cluster-count";
const POINT_LAYER = "station-points";
const LABEL_LAYER = "station-price-labels";

/** Zoom level from which individual prices are shown instead of clusters. */
export const PRICE_LABEL_MIN_ZOOM = 11;

export interface StationFeatureProperties {
  id: string;
  priceLabel: string | null;
  hasPrice: boolean;
}

export function stationsToFeatureCollection(
  stations: NormalizedStation[],
  activeFuelId: string | null,
): FeatureCollection<Point, StationFeatureProperties> {
  return {
    type: "FeatureCollection",
    features: stations.map((station): Feature<Point, StationFeatureProperties> => {
      const fuel = displayFuel(station, activeFuelId);
      const price = fuel?.price;
      return {
        type: "Feature",
        id: station.id,
        geometry: { type: "Point", coordinates: [station.lon, station.lat] },
        properties: {
          id: station.id,
          priceLabel: typeof price === "number" ? formatPriceCompact(price) : null,
          hasPrice: typeof price === "number",
        },
      };
    }),
  };
}

/** Layer/source identifiers, exported for tests and interactions. */
export const STATION_LAYERS = {
  SOURCE_ID,
  CLUSTER_LAYER,
  CLUSTER_COUNT_LAYER,
  POINT_LAYER,
  LABEL_LAYER,
} as const;
