import { describe, expect, it } from "vitest";
import {
  BRANDFETCH_DOMAINS,
  assetHostPath,
  logoContentType,
  pickBrandfetchLogo,
  pickBrandfetchLogos,
  sniffImageFormat,
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

describe("pickBrandfetchLogos", () => {
  it("lists every candidate, best first, so a fetchable one can be tried", () => {
    const brand: BrandfetchBrand = {
      logos: [
        {
          type: "icon",
          theme: "light",
          formats: [
            { src: "cdn/icon.svg", format: "svg" },
            { src: "asset/icon.png", format: "png" },
          ],
        },
      ],
    };

    // The size-less SVG has no dimensions, so the preference falls back to the
    // format order: svg first, then the other formats of the same logo.
    expect(pickBrandfetchLogos(brand).map((logo) => logo.src)).toEqual([
      "cdn/icon.svg",
      "asset/icon.png",
    ]);
    expect(pickBrandfetchLogo(brand)?.src).toBe("cdn/icon.svg");
  });
});

describe("sniffImageFormat", () => {
  const encode = (text: string) => new TextEncoder().encode(text);

  it("detects the real image type", () => {
    expect(sniffImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]))).toBe("png");
    expect(sniffImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 1, 2]))).toBe("jpeg");
    expect(sniffImageFormat(encode("\n  <svg xmlns='...'>"))).toBe("svg");
  });

  it("rejects anything else, in particular the CDN's HTML page", () => {
    expect(sniffImageFormat(encode("<!DOCTYPE html><html lang=\"en\">"))).toBeUndefined();
    expect(sniffImageFormat(new Uint8Array())).toBeUndefined();
  });
});

describe("assetHostPath", () => {
  it("drops the query string, which may carry a signed token", () => {
    expect(
      assetHostPath("https://asset.brandfetch.io/idA/idB.svg?token=secret"),
    ).toBe("asset.brandfetch.io/idA/idB.svg");
    expect(assetHostPath("not a url")).toBe("");
  });
});
