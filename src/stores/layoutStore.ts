import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelSide = "left" | "right";

interface LayoutState {
  /** Side on which the station details panel is shown on wide screens. */
  panelSide: PanelSide;
  setPanelSide: (side: PanelSide) => void;
  togglePanelSide: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      panelSide: "right",
      setPanelSide: (panelSide) => set({ panelSide }),
      togglePanelSide: () =>
        set((state) => ({
          panelSide: state.panelSide === "right" ? "left" : "right",
        })),
    }),
    { name: "fuelmap.layout" },
  ),
);
