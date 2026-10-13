import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_COUNTRY } from "@/countries";
import type { CountryCode } from "@/countries/types";

interface CountryState {
  /** Active country. Drives the map view, fuel catalog and data source. */
  country: CountryCode;
  setCountry: (code: CountryCode) => void;
}

export const useCountryStore = create<CountryState>()(
  persist(
    (set) => ({
      country: DEFAULT_COUNTRY,
      setCountry: (country) => set({ country }),
    }),
    { name: "fuelmap.country" },
  ),
);
