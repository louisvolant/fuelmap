import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RadarState {
  /** Show the official French fixed speed cameras on the map. */
  showFixedRadars: boolean;
  setShowFixedRadars: (value: boolean) => void;
}

export const useRadarStore = create<RadarState>()(
  persist(
    (set) => ({
      showFixedRadars: true,
      setShowFixedRadars: (showFixedRadars) => set({ showFixedRadars }),
    }),
    { name: "fuelmap.radars" },
  ),
);
