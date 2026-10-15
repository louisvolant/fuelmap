import type { Feature, FeatureCollection, Point } from "geojson";
import type { NormalizedStation } from "@/countries/types";
import { brandImageId, matchBrand } from "@/lib/brands";
import { DEFAULT_BRAND_IMAGE_ID } from "@/lib/brandImages";
import { displayFuel } from "@/lib/stationUtils";
import { formatPriceCompact } from "@/lib/format";

const SOURCE_ID = "stations";
const CLUSTER_LAYER = "station-clusters";
const CLUSTER_COUNT_LAYER = "station-cluster-count";
const POINT_LAYER = "station-points";
const BRAND_LAYER = "station-brands";
const LABEL_LAYER = "station-price-labels";
const PRICE_DISC_LAYER = "station-price-disc";

/** Zoom up to which nearby stations are grouped into cluster bubbles. */
export const CLUSTER_MAX_ZOOM = 12;
/**
 * Zoom from which brand data is fetched for countries that need an OpenStreetMap
 * enrichment (see `hooks/useOsmStations`).
 *
 * It is only a *fetch* threshold, never a *display* one: clustering is
 * radius-based, so isolated stations already show as individual bubbles below
 * `CLUSTER_MAX_ZOOM`. Brand marks are therefore not tied to a zoom level at all
 * — a bubble always carries the logo of its brand.
 */
export const BRAND_FETCH_MIN_ZOOM = CLUSTER_MAX_ZOOM;
/** Zoom from which the price is shown next to the brand mark. */
export const PRICE_MIN_ZOOM = 12.5;

export interface StationFeatureProperties {
  id: string;
  priceLabel: string | null;
  hasPrice: boolean;
  favorite: boolean;
  /** MapLibre image id of the brand mark, or `""` when unknown. */
  brandImage: string;
  /** Station shown but with nothing to display for the current fuel. */
  dimmed: boolean;
  /**
   * No brand mark is available, so the bubble itself carries the price instead.
   * A bubble must never be drawn empty: without this it would be a blank disc
   * (the French open data has no brand at all before the OpenStreetMap
   * enrichment lands, or while that enrichment is unavailable upstream).
   */
  priceInDisc: boolean;
  /** Relative price color: green for cheapest, red for highest, neutral slate otherwise. */
  priceColor: string;
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

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = Number.NEGATIVE_INFINITY;

  for (const station of stations) {
    const fuel = displayFuel(station, activeFuelId);
    if (typeof fuel?.price === "number") {
      if (fuel.price < minPrice) minPrice = fuel.price;
      if (fuel.price > maxPrice) maxPrice = fuel.price;
    }
  }

  for (const station of stations) {
    const fuel = displayFuel(station, activeFuelId);
    const price = fuel?.price;
    const brand = matchBrand(station.brand);
    const hasPrice = typeof price === "number";
    const dimmed = showPrices && !hasPrice;
    // No logo to draw: the disc carries the price so it is never left blank.
    const priceInDisc = hasPrice && !brand;
    const brandImage = brand
      ? brandImageId(brand)
      : priceInDisc
        ? ""
        : (!dimmed && !showPrices ? DEFAULT_BRAND_IMAGE_ID : "");

    // A priced country with neither a price nor a brand has nothing to show.
    if (dimmed && !brandImage) continue;

    const priceColor =
      typeof price === "number" && maxPrice > minPrice
        ? (price - minPrice) / (maxPrice - minPrice) <= 0.25
          ? "#15803d"
          : (price - minPrice) / (maxPrice - minPrice) >= 0.75
            ? "#b91c1c"
            : "#0f172a"
        : "#0f172a";

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
        priceInDisc,
        priceColor,
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
  PRICE_DISC_LAYER,
} as const;
