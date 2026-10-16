import { describe, expect, it, vi } from "vitest";
import {
  artworkReach,
  keyLogoBackground,
  maskLogoToCircle,
  type PixelBuffer,
} from "./brandImages";

/** Build a uniform RGBA buffer. */
function buffer(
  size: number,
  [red, green, blue, alpha]: [number, number, number, number],
): PixelBuffer {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = red;
    data[index + 1] = green;
    data[index + 2] = blue;
    data[index + 3] = alpha;
  }
  return { data, width: size, height: size };
}

function setPixel(
  pixels: PixelBuffer,
  x: number,
  y: number,
  [red, green, blue, alpha]: [number, number, number, number],
): void {
  const index = (y * pixels.width + x) * 4;
  pixels.data[index] = red;
  pixels.data[index + 1] = green;
  pixels.data[index + 2] = blue;
  pixels.data[index + 3] = alpha;
}

function alphaAt(pixels: PixelBuffer, x: number, y: number): number {
  return pixels.data[(y * pixels.width + x) * 4 + 3];
}

/**
 * Brandfetch serves most logos as JPEG, which has no alpha channel: a
 * transparent mark comes back baked on a light square, and drawn as is it pokes
 * out of the round bubble. These tests pin the three steps that fix it.
 */
describe("keyLogoBackground", () => {
  it("drops a light background so only the artwork is painted", () => {
    const pixels = buffer(16, [255, 255, 255, 255]);
    setPixel(pixels, 8, 8, [217, 37, 37, 255]);

    keyLogoBackground(pixels);

    // White around the mark is gone, the mark itself is untouched.
    expect(alphaAt(pixels, 2, 2)).toBe(0);
    expect(alphaAt(pixels, 7, 8)).toBe(0);
    expect(alphaAt(pixels, 8, 8)).toBe(255);
  });

  it("keeps a drop shadow soft instead of hard-edged", () => {
    const pixels = buffer(16, [250, 250, 250, 255]);
    // A pixel 30 units away from the background: neither background nor artwork.
    setPixel(pixels, 8, 8, [220, 220, 220, 255]);

    keyLogoBackground(pixels);

    const alpha = alphaAt(pixels, 8, 8);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(255);
  });

  it("never keys an already transparent logo", () => {
    // White artwork on a transparent canvas: the corners are transparent, so
    // there is no background to remove — white must survive.
    const pixels = buffer(16, [0, 0, 0, 0]);
    setPixel(pixels, 8, 8, [255, 255, 255, 255]);

    keyLogoBackground(pixels);

    expect(alphaAt(pixels, 8, 8)).toBe(255);
  });
});

describe("artworkReach", () => {
  it("reports nothing to trim for a mark that stays inside the circle", () => {
    const pixels = buffer(16, [0, 0, 0, 0]);
    // A 4×4 dot in the middle: well inside a circle of radius 8.
    for (let y = 6; y < 10; y += 1) {
      for (let x = 6; x < 10; x += 1) setPixel(pixels, x, y, [0, 0, 0, 255]);
    }
    expect(artworkReach(pixels)).toBeLessThan(0.5);
  });

  it("reports an overflow for a full-bleed square artwork", () => {
    // A square's corner sits at √2 × the radius: the mask would shave it.
    expect(artworkReach(buffer(16, [0, 60, 160, 255]))).toBeGreaterThan(1.3);
  });
});

describe("maskLogoToCircle", () => {
  it("clips the corners but keeps the artwork on its brand background", () => {
    // A brand-coloured background is legitimate artwork and must not be keyed…
    const pixels = buffer(16, [0, 60, 160, 255]);

    maskLogoToCircle(pixels);

    // …but the square's corners still have to disappear.
    expect(alphaAt(pixels, 0, 0)).toBe(0);
    expect(alphaAt(pixels, 15, 15)).toBe(0);
    expect(alphaAt(pixels, 8, 8)).toBe(255);
    expect(alphaAt(pixels, 0, 8)).toBeGreaterThan(200);
  });
});

describe("preloadAllBrandImages", () => {
  it("warms every bundled mark off the critical path", async () => {
    const { preloadAllBrandImages, isBrandImageCached } = await import(
      "./brandImages"
    );
    const { BRAND_SVGS } = await import("./brandSvgs");

    // Fake image that "loads" instantly with a square bitmap.
    const RealImage = globalThis.Image;
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 64;
        naturalHeight = 64;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    // Fake 2d context: solid disc, no background to key.
    const createElement = document.createElement.bind(document);
    const canvasStub = vi
      .spyOn(document, "createElement")
      .mockImplementation(((tag: string, ...rest: unknown[]) => {
        if (tag !== "canvas") {
          return (createElement as (...args: unknown[]) => unknown)(
            tag,
            ...rest,
          ) as Element;
        }
        return {
          width: 0,
          height: 0,
          getContext: () => ({
            drawImage: () => {},
            clearRect: () => {},
            getImageData: (width = 64, height = 64) => ({
              data: new Uint8ClampedArray(width * height * 4).fill(255),
              width,
              height,
            }),
          }),
        } as unknown as Element;
      }) as unknown as typeof document.createElement);

    try {
      await preloadAllBrandImages();
      for (const id of Object.keys(BRAND_SVGS)) {
        expect(isBrandImageCached(id as never)).toBe(true);
      }
    } finally {
      canvasStub.mockRestore();
      vi.stubGlobal("Image", RealImage);
    }
  });
});
