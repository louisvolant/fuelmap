import { QueryClient } from "@tanstack/react-query";

/**
 * Shared React Query client.
 * Stations are cached for a day and refreshed automatically on an interval that
 * matches the source cadence (see `useCountryStations`).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});
