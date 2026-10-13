import { describe, expect, it } from "vitest";
import { matchBrand } from "@/lib/brands";

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

  it("returns undefined for unknown brands", () => {
    expect(matchBrand("Random Station")).toBeUndefined();
    expect(matchBrand("")).toBeUndefined();
    expect(matchBrand(undefined)).toBeUndefined();
    expect(matchBrand(null)).toBeUndefined();
  });
});
