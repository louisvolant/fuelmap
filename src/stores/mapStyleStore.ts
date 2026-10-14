import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MapStyleId } from "@/lib/mapStyles";

interface MapStyleState {
  /** Basemap style preference. `"auto"` follows the UI theme. */
  styleId: MapStyleId;
  setStyleId: (id: MapStyleId) => void;
}

export const useMapStyleStore = create<MapStyleState>()(
  persist(
    (set) => ({
      styleId: "auto",
      setStyleId: (styleId) => set({ styleId }),
    }),
    { name: "fuelmap.mapStyle" },
  ),
);
