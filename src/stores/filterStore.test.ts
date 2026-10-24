import { beforeEach, describe, expect, it } from "vitest";
import { countActiveFilters, useFilterStore } from "@/stores/filterStore";

describe("filterStore", () => {
  beforeEach(() => {
    useFilterStore.getState().reset();
  });

  it("toggles a fuel on and off", () => {
    useFilterStore.getState().toggleFuel("gazole");
    expect(useFilterStore.getState().selectedFuelIds).toEqual(["gazole"]);

    useFilterStore.getState().toggleFuel("gazole");
    expect(useFilterStore.getState().selectedFuelIds).toEqual([]);
  });

  it("keeps a single fuel selected", () => {
    useFilterStore.getState().toggleFuel("gazole");
    useFilterStore.getState().toggleFuel("e10");
    expect(useFilterStore.getState().selectedFuelIds).toEqual(["e10"]);

    useFilterStore.getState().clearFuels();
    expect(useFilterStore.getState().selectedFuelIds).toEqual([]);
  });

  it("drops legacy multi-fuel selections when rehydrating", async () => {
    localStorage.setItem(
      "fuelmap.filters",
      JSON.stringify({
        state: { selectedFuelIds: ["gazole", "e10"] },
        version: 0,
      }),
    );

    await useFilterStore.persist.rehydrate();

    expect(useFilterStore.getState().selectedFuelIds).toEqual(["gazole"]);
  });

  it("toggles services and advanced toggles", () => {
    useFilterStore.getState().toggleService("Wifi");
    useFilterStore.getState().setOnly24h(true);
    useFilterStore.getState().setHideShortages(true);

    const state = useFilterStore.getState();
    expect(state.services).toEqual(["Wifi"]);
    expect(state.only24h).toBe(true);
    expect(state.hideShortages).toBe(true);
    expect(countActiveFilters(state)).toBe(3);
  });

  it("resets every filter", () => {
    useFilterStore.getState().toggleFuel("gazole");
    useFilterStore.getState().toggleService("Wifi");
    useFilterStore.getState().setOnly24h(true);
    useFilterStore.getState().reset();

    const state = useFilterStore.getState();
    expect(state.selectedFuelIds).toEqual([]);
    expect(state.services).toEqual([]);
    expect(state.only24h).toBe(false);
    expect(countActiveFilters(state)).toBe(0);
  });
});
