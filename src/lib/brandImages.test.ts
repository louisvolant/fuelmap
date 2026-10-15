import { describe, expect, it } from "vitest";
import { styliseLogoPixels, type PixelBuffer } from "./brandImages";

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
 * out of the round bubble. These tests pin the two steps that fix it.
 */
describe("styliseLogoPixels", () => {
  it("drops a light background so only the artwork is painted", () => {
    const pixels = buffer(16, [255, 255, 255, 255]);
    setPixel(pixels, 8, 8, [217, 37, 37, 255]);

    styliseLogoPixels(pixels);

    // White around the mark is gone, the mark itself is untouched.
    expect(alphaAt(pixels, 2, 2)).toBe(0);
    expect(alphaAt(pixels, 7, 8)).toBe(0);
    expect(alphaAt(pixels, 8, 8)).toBe(255);
  });

  it("keeps a drop shadow soft instead of hard-edged", () => {
    const pixels = buffer(16, [250, 250, 250, 255]);
    // A pixel 30 units away from the background: neither background nor artwork.
    setPixel(pixels, 8, 8, [220, 220, 220, 255]);

    styliseLogoPixels(pixels);

    const alpha = alphaAt(pixels, 8, 8);
    expect(alpha).toBeGreaterThan(0);
    expect(alpha).toBeLessThan(255);
  });

  it("clips the corners to the inscribed circle", () => {
    // A brand-coloured background is legitimate artwork and must not be keyed…
    const pixels = buffer(16, [0, 60, 160, 255]);

    styliseLogoPixels(pixels);

    // …but the square's corners still have to disappear.
    expect(alphaAt(pixels, 0, 0)).toBe(0);
    expect(alphaAt(pixels, 15, 15)).toBe(0);
    expect(alphaAt(pixels, 8, 8)).toBe(255);
    expect(alphaAt(pixels, 0, 8)).toBeGreaterThan(200);
  });

  it("never keys an already transparent logo", () => {
    // White artwork on a transparent canvas: the corners are transparent, so
    // there is no background to remove — white must survive.
    const pixels = buffer(16, [0, 0, 0, 0]);
    setPixel(pixels, 8, 1, [255, 255, 255, 255]);

    styliseLogoPixels(pixels);

    expect(alphaAt(pixels, 8, 1)).toBe(255);
    expect(alphaAt(pixels, 0, 0)).toBe(0);
  });
});
