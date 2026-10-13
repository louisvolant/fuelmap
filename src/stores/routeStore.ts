import { create } from "zustand";
import type { RouteResult } from "@/lib/routing";

export type RouteStatus = "idle" | "loading" | "ready" | "error";

interface RouteState {
  /** Whether the user is picking a destination on the map. */
  picking: boolean;
  destination: [number, number] | null;
  route: RouteResult | null;
  status: RouteStatus;
  /** Restrict map and list to stations along the route. */
  onlyOnRoute: boolean;

  startPicking: () => void;
  setDestination: (coordinates: [number, number]) => void;
  setRoute: (route: RouteResult | null) => void;
  setStatus: (status: RouteStatus) => void;
  toggleOnlyOnRoute: () => void;
  clear: () => void;
}

export const useRouteStore = create<RouteState>((set, get) => ({
  picking: false,
  destination: null,
  route: null,
  status: "idle",
  onlyOnRoute: false,

  startPicking: () =>
    set({ picking: true, destination: null, route: null, status: "idle" }),
  setDestination: (destination) => set({ destination, picking: false }),
  setRoute: (route) =>
    set({
      route,
      status: route ? "ready" : get().status,
      onlyOnRoute: route ? true : get().onlyOnRoute,
    }),
  setStatus: (status) => set({ status }),
  toggleOnlyOnRoute: () => set((state) => ({ onlyOnRoute: !state.onlyOnRoute })),
  clear: () =>
    set({
      picking: false,
      destination: null,
      route: null,
      status: "idle",
      onlyOnRoute: false,
    }),
}));
