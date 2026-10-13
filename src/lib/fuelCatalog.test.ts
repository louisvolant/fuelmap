import { describe, expect, it } from "vitest";
import { FRENCH_FUELS } from "@/countries/fr/fuels";
import { findFuelByAlias, fuelIds, getFuel } from "@/lib/fuelCatalog";

describe("fuelCatalog", () => {
  it("finds a fuel by internal id", () => {
    expect(getFuel(FRENCH_FUELS, "gazole")?.aliases).toContain("Diesel");
  });

  it("resolves provider aliases case-insensitively", () => {
    expect(findFuelByAlias(FRENCH_FUELS, "  diesel ")?.id).toBe("gazole");
    expect(findFuelByAlias(FRENCH_FUELS, "SP 98")?.id).toBe("sp98");
    expect(findFuelByAlias(FRENCH_FUELS, "sp95-e10")?.id).toBe("e10");
  });

  it("returns undefined for unknown fuels", () => {
    expect(findFuelByAlias(FRENCH_FUELS, "kerosene")).toBeUndefined();
  });

  it("lists fuel ids in catalog order", () => {
    expect(fuelIds(FRENCH_FUELS)).toEqual([
      "gazole",
      "sp95",
      "sp98",
      "e10",
      "e85",
      "gplc",
    ]);
  });
});
