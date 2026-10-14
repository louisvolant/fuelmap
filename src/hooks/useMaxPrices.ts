import { useQuery } from "@tanstack/react-query";
import { getCountry } from "@/countries";
import type { CountryCode } from "@/countries/types";

export interface MaxPrices {
  updatedAt: string | null;
  currency: string;
  /** Price per liter, keyed by FuelMap fuel id. */
  prices: Record<string, number>;
}

const ENDPOINT =
  import.meta.env.VITE_MAX_PRICES_API_URL?.toString() ?? "/api/max-prices";

/**
 * Official national maximum prices (Belgium, Luxembourg), fetched through the
 * Cloudflare Worker. Only enabled for countries whose prices are regulated.
 */
export function useMaxPrices(country: CountryCode) {
  const definition = getCountry(country);

  return useQuery<MaxPrices>({
    queryKey: ["max-prices", country],
    enabled: definition.priceMode === "national-max",
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await fetch(`${ENDPOINT}?country=${country}`);
      if (!response.ok) {
        throw new Error(`Max prices failed with status ${response.status}`);
      }
      return (await response.json()) as MaxPrices;
    },
  });
}
