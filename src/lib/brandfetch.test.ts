import { describe, expect, it } from "vitest";
import {
  BRANDFETCH_DOMAINS,
  logoContentType,
  pickBrandfetchLogo,
  type BrandfetchBrand,
} from "@/lib/brandfetch";
import { BRANDS } from "@/lib/brands";

describe("BRANDFETCH_DOMAINS", () => {
  it("covers every known brand", () => {
    for (const brand of BRANDS) {
      expect(BRANDFETCH_DOMAINS[brand.id]).toBeTruthy();
    }
  });
});

describe("pickBrandfetchLogo", () => {
  it("prefers an icon, light theme and SVG", () => {
    const brand: BrandfetchBrand = {
      logos: [
        {
          type: "logo",
          theme: "light",
          formats: [{ src: "wordmark.svg", format: "svg" }],
        },
        {
          type: "icon",
          theme: "dark",
          formats: [{ src: "icon-dark.svg", format: "svg" }],
        },
        {
          type: "icon",
          theme: "light",
          formats: [
            { src: "icon.png", format: "png", width: 512, height: 512 },
            { src: "icon.svg", format: "svg", width: 512, height: 512 },
          ],
        },
      ],
    };

    expect(pickBrandfetchLogo(brand)).toMatchObject({
      src: "icon.svg",
      format: "svg",
      type: "icon",
      theme: "light",
    });
  });

  it("falls back to a non-square PNG when no square asset exists", () => {
    const brand: BrandfetchBrand = {
      logos: [
        {
          type: "icon",
          theme: "light",
          formats: [{ src: "wide.png", format: "png", width: 800, height: 200 }],
        },
      ],
    };
    expect(pickBrandfetchLogo(brand)?.src).toBe("wide.png");
  });

  it("returns undefined without a usable logo", () => {
    expect(pickBrandfetchLogo({})).toBeUndefined();
    expect(pickBrandfetchLogo({ logos: [] })).toBeUndefined();
    expect(pickBrandfetchLogo({ logos: [{ type: "icon", formats: [] }] })).toBeUndefined();
  });
});

describe("logoContentType", () => {
  it("maps formats to content types", () => {
    expect(logoContentType("svg")).toBe("image/svg+xml");
    expect(logoContentType("png")).toBe("image/png");
    expect(logoContentType("jpg")).toBe("image/jpeg");
  });
});
