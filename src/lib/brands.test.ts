import { describe, expect, it } from "vitest";
import { LOCAL_ONLY_BRANDS, matchBrand } from "@/lib/brands";

describe("matchBrand", () => {
  it("matches aliases case- and accent-insensitively", () => {
    expect(matchBrand("Total")).toBe("totalenergies");
    expect(matchBrand("TOTALENERGIES")).toBe("totalenergies");
    expect(matchBrand("Intermarché")).toBe("intermarche");
    expect(matchBrand("E.Leclerc")).toBe("leclerc");
  });

  it("matches substrings for compound names", () => {
    expect(matchBrand("Total Access")).toBe("totalenergies");
    expect(matchBrand("Carrefour Market")).toBe("carrefour");
    expect(matchBrand("Esso Express")).toBe("esso");
    expect(matchBrand("Super U")).toBe("u");
    expect(matchBrand("Station U")).toBe("u");
    expect(matchBrand("Supermarché Match")).toBe("match");
  });

  it("only matches single-letter brands exactly", () => {
    expect(matchBrand("U")).toBe("u");
    expect(matchBrand("Auberge du Lac")).toBeUndefined();
  });

  it("matches short brands as whole words", () => {
    // "bp" is too short to be searched for, but appears in real provider and
    // OpenStreetMap strings — it must match `BP France`, never `bpost`.
    expect(matchBrand("BP")).toBe("bp");
    expect(matchBrand("BP France")).toBe("bp");
    expect(matchBrand("BP-Autohof")).toBe("bp");
    expect(matchBrand("British Petroleum")).toBe("bp");
    expect(matchBrand("bpost")).toBeUndefined();
    expect(matchBrand("Super U")).toBe("u");
    expect(matchBrand("U Express")).toBe("u");
  });

  it("returns undefined for unknown brands", () => {
    expect(matchBrand("Random Station")).toBeUndefined();
    expect(matchBrand("")).toBeUndefined();
    expect(matchBrand(undefined)).toBeUndefined();
    expect(matchBrand(null)).toBeUndefined();
  });

  it("identifies brands not indexed by Brandfetch as local-only", () => {
    expect(LOCAL_ONLY_BRANDS.has("dyneff")).toBe(true);
    expect(LOCAL_ONLY_BRANDS.has("elan")).toBe(true);
    expect(LOCAL_ONLY_BRANDS.has("fulli")).toBe(true);
    expect(LOCAL_ONLY_BRANDS.has("match")).toBe(true);
    expect(LOCAL_ONLY_BRANDS.has("totalenergies")).toBe(false);
  });
});
