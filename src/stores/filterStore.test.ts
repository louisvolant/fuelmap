import { beforeEach, describe, expect, it } from "vitest";
import { useFilterStore } from "@/stores/filterStore";

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

  it("supports multiple selected fuels", () => {
    useFilterStore.getState().toggleFuel("gazole");
    useFilterStore.getState().toggleFuel("e10");
    expect(useFilterStore.getState().selectedFuelIds).toEqual(["gazole", "e10"]);

    useFilterStore.getState().clearFuels();
    expect(useFilterStore.getState().selectedFuelIds).toEqual([]);
  });
});
