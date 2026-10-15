import type { Feature, FeatureCollection, Point } from "geojson";
import type { NormalizedStation } from "@/countries/types";
import { brandImageId, matchBrand } from "@/lib/brands";
import { displayFuel } from "@/lib/stationUtils";
import { formatPriceCompact } from "@/lib/format";

const SOURCE_ID = "stations";
const CLUSTER_LAYER = "station-clusters";
const CLUSTER_COUNT_LAYER = "station-cluster-count";
const POINT_LAYER = "station-points";
const BRAND_LAYER = "station-brands";
const LABEL_LAYER = "station-price-labels";

/** Zoom up to which stations are clustered. */
export const CLUSTER_MAX_ZOOM = 12;
/**
 * Zoom from which individual markers (and their brand marks) are shown.
 *
 * Derived from the clustering threshold on purpose: stations are unclustered as
 * soon as the zoom goes past `CLUSTER_MAX_ZOOM`, so this guarantees there is
 * never a bubble on screen without its brand mark.
 */
export const LOGO_MIN_ZOOM = CLUSTER_MAX_ZOOM;
/** Zoom from which the price is shown next to the brand mark. */
export const PRICE_MIN_ZOOM = 13.5;

export interface StationFeatureProperties {
  id: string;
  priceLabel: string | null;
  hasPrice: boolean;
  favorite: boolean;
  /** MapLibre image id of the brand mark, or `""` when unknown. */
  brandImage: string;
  /** Station shown but with nothing to display for the current fuel. */
  dimmed: boolean;
}

export interface StationLayersOptions {
  /**
   * Whether the country has per-station prices. When it does, a station with no
   * price is "dimmed", and a station with neither a price nor a brand is skipped
   * (an empty bubble would be meaningless). Countries without per-station prices
   * (national maxima, OSM-only) always keep their markers.
   */
  showPrices?: boolean;
}

export function stationsToFeatureCollection(
  stations: NormalizedStation[],
  activeFuelId: string | null,
  favoriteIds: readonly string[] = [],
  options: StationLayersOptions = {},
): FeatureCollection<Point, StationFeatureProperties> {
  const { showPrices = true } = options;
  const favorites = new Set(favoriteIds);
  const features: Feature<Point, StationFeatureProperties>[] = [];

  for (const station of stations) {
    const fuel = displayFuel(station, activeFuelId);
    const price = fuel?.price;
    const brand = matchBrand(station.brand);
    const brandImage = brand ? brandImageId(brand) : "";
    const hasPrice = typeof price === "number";
    const dimmed = showPrices && !hasPrice;

    // A priced country with neither a price nor a brand has nothing to show.
    if (dimmed && !brandImage) continue;

    features.push({
      type: "Feature",
      id: station.id,
      geometry: { type: "Point", coordinates: [station.lon, station.lat] },
      properties: {
        id: station.id,
        priceLabel: hasPrice ? formatPriceCompact(price as number) : null,
        hasPrice,
        favorite: favorites.has(station.id),
        brandImage,
        dimmed,
      },
    });
  }

  return { type: "FeatureCollection", features };
}

/** Layer/source identifiers, exported for tests and interactions. */
export const STATION_LAYERS = {
  SOURCE_ID,
  CLUSTER_LAYER,
  CLUSTER_COUNT_LAYER,
  POINT_LAYER,
  BRAND_LAYER,
  LABEL_LAYER,
} as const;
