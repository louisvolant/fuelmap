import type { Map as MapLibreMap } from "maplibre-gl";
import { brandSvgDataUrl, remoteBrandLogoUrl } from "./brandLogos";
import { BRAND_SVGS } from "./brandSvgs";
import { brandImageId, LOCAL_ONLY_BRANDS, type BrandId } from "./brands";

/**
 * Brand logos are served by the Worker from R2 (`/brands/<id>`), snapshotted
 * from the Brandfetch Brand API with a self-healing cache: a missing snapshot is
 * fetched in the background and appears on the next load.
 *
 * The client therefore always *tries* the snapshot first and silently falls back
 * to the bundled mark, so it never waits for a third party and works offline.
 *
 * Whatever the source, the pixels are **normalised for a round marker** before
 * they reach MapLibre (see `keyLogoBackground`, `artworkReach` and
 * `maskLogoToCircle`): Brandfetch serves most brands as **JPEG**, which has no
 * alpha channel, so a transparent logo comes back baked on a white or light-grey
 * square whose corners would stick out of the bubble.
 */
const LOGO_SIZE = 64;
/**
 * Share of the canvas the artwork may occupy. It is `contain`ed in this box, so
 * the circular mask around it never shaves a wordmark's ends.
 */
const LOGO_FIT = 0.88;

const imageDataCache = new Map<BrandId, ImageData>();

/** The part of `ImageData` the logo styliser works on. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Channel distance under which a pixel is definitely the background. */
const BACKGROUND_CLEAR = 18;
/** Channel distance above which a pixel is definitely *not* the background. */
const BACKGROUND_KEEP = 52;
/** How far from the edge the background is sampled (avoids border artefacts). */
const CORNER_INSET = 2;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Alpha above which a pixel counts as artwork (fits the circle test). */
const ARTWORK_ALPHA = 40;
/** How far the artwork may reach towards the circle's edge (hairline margin). */
export const ARTWORK_REACH = 0.98;

/**
 * Average colour of the four corners, or `null` when they are not a uniform,
 * opaque, light background.
 *
 * The `opaque` test matters: a logo that is *already* transparent has
 * `rgb(0,0,0,0)` corners, and keying white out of it could erase white artwork.
 * The `light` test keeps marks drawn on their own brand colour intact.
 */
function cornerBackground(
  pixels: PixelBuffer,
): [number, number, number] | null {
  const { data, width, height } = pixels;
  const xs = [CORNER_INSET, width - 1 - CORNER_INSET];
  const ys = [CORNER_INSET, height - 1 - CORNER_INSET];

  const corners: [number, number, number][] = [];
  let minChannel = 255;
  let maxChannel = 0;

  for (const y of ys) {
    for (const x of xs) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha < 200) return null;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      corners.push([red, green, blue]);
      minChannel = Math.min(minChannel, red, green, blue);
      maxChannel = Math.max(maxChannel, red, green, blue);
    }
  }

  // A uniform, neutral, light colour — the signature of a flattened JPEG.
  const average = corners
    .reduce<[number, number, number]>(
      (sum, corner) => [
        sum[0] + corner[0] / corners.length,
        sum[1] + corner[1] / corners.length,
        sum[2] + corner[2] / corners.length,
      ],
      [0, 0, 0],
    )
    .map(Math.round) as [number, number, number];

  const luminance =
    (average[0] * 299 + average[1] * 587 + average[2] * 114) / 1000;
  if (luminance < 200) return null;
  if (maxChannel - minChannel > 30) return null;

  return average;
}

/**
 * Drop the flat background, when the four corners are one uniform light colour
 * (what a transparent logo looks like once flattened to JPEG). Every pixel close
 * to that colour becomes transparent; the ramp keeps anti-aliased edges and drop
 * shadows soft instead of jagged.
 *
 * Mutates in place: the buffer is at most 64×64, so this is a few microseconds.
 */
export function keyLogoBackground(pixels: PixelBuffer): void {
  const background = cornerBackground(pixels);
  if (!background) return;

  const { data, width, height } = pixels;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const distance = Math.max(
        Math.abs(data[index] - background[0]),
        Math.abs(data[index + 1] - background[1]),
        Math.abs(data[index + 2] - background[2]),
      );
      const factor = clamp01(
        (distance - BACKGROUND_CLEAR) / (BACKGROUND_KEEP - BACKGROUND_CLEAR),
      );
      if (factor === 0) {
        data[index + 3] = 0;
      } else if (factor < 1) {
        data[index + 3] = Math.round(data[index + 3] * factor);
      }
    }
  }
}

/**
 * Distance from the centre to the furthest artwork pixel, as a fraction of the
 * circle's radius. `1` means the artwork touches the edge of the disc; more than
 * `1` means the mask would shave it.
 */
export function artworkReach(pixels: PixelBuffer): number {
  const { data, width, height } = pixels;
  const centreX = (width - 1) / 2;
  const centreY = (height - 1) / 2;
  const radius = Math.min(width, height) / 2;

  let reach = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < ARTWORK_ALPHA) continue;
      const distance = Math.hypot(x - centreX, y - centreY) / radius;
      if (distance > reach) reach = distance;
    }
  }
  return reach;
}

/**
 * Clip the bitmap to the inscribed circle, with a one-pixel feather, so a mark
 * whose artwork still reaches the corners is trimmed into a disc — the bubble
 * never shows a square.
 */
export function maskLogoToCircle(pixels: PixelBuffer): void {
  const { data, width, height } = pixels;
  const centreX = (width - 1) / 2;
  const centreY = (height - 1) / 2;
  const radius = Math.min(width, height) / 2;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const distance = Math.hypot(x - centreX, y - centreY);
      const mask = clamp01(radius - distance + 0.5);
      if (mask < 1) {
        data[index + 3] = Math.round(data[index + 3] * mask);
      }
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

/**
 * Draw an image `contain`ed in a square, then normalise it for the round bubble.
 *
 * The artwork is first drawn in the `LOGO_FIT` box, and — when it still reaches
 * past the circle (a square composition like Esso's or bp's) — redrawn smaller
 * so the mask never shaves it. A wordmark, whose extremes are at mid-height,
 * keeps the full box.
 */
function toSquareImageData(image: HTMLImageElement, size = LOGO_SIZE): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");

  const width = image.naturalWidth || size;
  const height = image.naturalHeight || size;
  const box = size * LOGO_FIT;
  const scale = Math.min(box / width, box / height);
  let drawWidth = width * scale;
  let drawHeight = height * scale;

  const draw = () => {
    context.clearRect(0, 0, size, size);
    context.drawImage(
      image,
      (size - drawWidth) / 2,
      (size - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
  };

  draw();
  let pixels = context.getImageData(0, 0, size, size);

  // Measure the artwork without its flat background, which fills the corners.
  keyLogoBackground(pixels);
  const reach = artworkReach(pixels);

  if (reach > ARTWORK_REACH) {
    const shrink = ARTWORK_REACH / reach;
    drawWidth *= shrink;
    drawHeight *= shrink;
    draw();
    pixels = context.getImageData(0, 0, size, size);
    keyLogoBackground(pixels);
  }

  maskLogoToCircle(pixels);
  return pixels;
}

/** Rasterize an image at its natural size, keeping its aspect ratio. */
function toImageData(image: HTMLImageElement): ImageData {
  const width = image.naturalWidth || 128;
  const height = image.naturalHeight || 48;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/** Load a brand logo: R2 snapshot first, bundled SVG as fallback. */
async function loadBrandLogo(id: BrandId): Promise<ImageData> {
  const cached = imageDataCache.get(id);
  if (cached) return cached;

  let image: HTMLImageElement | undefined;
  if (!LOCAL_ONLY_BRANDS.has(id)) {
    try {
      image = await loadImage(remoteBrandLogoUrl(id));
    } catch {
      image = undefined;
    }
  }
  if (!image) {
    image = await loadImage(brandSvgDataUrl(id));
  }

  const imageData = toSquareImageData(image);
  imageDataCache.set(id, imageData);
  return imageData;
}

/** Whether the rasterized pixels of a brand are already cached. */
export function isBrandImageCached(id: BrandId): boolean {
  return imageDataCache.has(id);
}

/**
 * Warm the rasterized pixels of every bundled brand mark while the browser is
 * idle. Brand overlays apply instantly, but the logo still needs its pixels
 * before MapLibre can draw it — preloading moves that work off the critical
 * path so a newly branded bubble never flashes its price first. Best-effort
 * and offline-safe: bundled SVGs only, failures are ignored.
 */
export async function preloadAllBrandImages(): Promise<void> {
  const ids = Object.keys(BRAND_SVGS) as BrandId[];
  await Promise.all(
    ids.map(async (id) => {
      if (imageDataCache.has(id)) return;
      try {
        const image = await loadImage(brandSvgDataUrl(id));
        imageDataCache.set(id, toSquareImageData(image));
      } catch {
        // Best-effort: the mark loads on demand later.
      }
    }),
  );
}

function loadCorsImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

/**
 * Normalize a remote logo for an `<img>` badge: same pipeline as the map
 * markers (flat-background keying, shrink-to-fit, circular mask), encoded back
 * to a PNG data URL. Returns `null` when anything fails — callers keep the
 * bundled mark. Needs CORS-open assets (see `brandAssetHeaders` server-side).
 */
export async function normalizeLogoForBadge(
  src: string,
  size = 96,
): Promise<string | null> {
  try {
    const image = await loadCorsImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const width = image.naturalWidth || size;
    const height = image.naturalHeight || size;
    const box = size * LOGO_FIT;
    const scale = Math.min(box / width, box / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    context.drawImage(
      image,
      (size - drawWidth) / 2,
      (size - drawHeight) / 2,
      drawWidth,
      drawHeight,
    );
    const pixels = context.getImageData(0, 0, size, size);
    keyLogoBackground(pixels);
    if (artworkReach(pixels) > ARTWORK_REACH) {
      // Square artwork: redraw smaller instead of shaving it (same rule as
      // the markers, single pass is enough for a badge).
      const shrink = ARTWORK_REACH / artworkReach(pixels);
      context.clearRect(0, 0, size, size);
      context.drawImage(
        image,
        (size - drawWidth * shrink) / 2,
        (size - drawHeight * shrink) / 2,
        drawWidth * shrink,
        drawHeight * shrink,
      );
      const redrawn = context.getImageData(0, 0, size, size);
      keyLogoBackground(redrawn);
      maskLogoToCircle(redrawn);
      context.putImageData(redrawn, 0, 0);
    } else {
      maskLogoToCircle(pixels);
      context.putImageData(pixels, 0, 0);
    }
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Register the logos of the given brands as MapLibre images.
 * Idempotent and fire-and-forget friendly: a failure never breaks markers.
 */
export async function ensureBrandImages(
  map: MapLibreMap,
  brandIds: Iterable<BrandId>,
): Promise<void> {
  let added = false;
  for (const id of brandIds) {
    const imageId = brandImageId(id);
    if (map.hasImage(imageId)) continue;
    try {
      const imageData = await loadBrandLogo(id);
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, imageData, { pixelRatio: 2 });
        added = true;
      }
    } catch {
      // Ignore: the price marker is still rendered without a logo.
    }
  }
  if (added) {
    map.triggerRepaint?.();
  }
}

/** Fallback pump image used when a station has no brand and no price. */
export const DEFAULT_BRAND_IMAGE_ID = "brand-default";
export const DEFAULT_PUMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#f8fafc" stroke="#64748b" stroke-width="2.5"/><path d="M22 19h12a2 2 0 0 1 2 2v24H20V21a2 2 0 0 1 2-2zm2 5v7h8v-7h-8zm12 3h2a3 3 0 0 1 3 3v8a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-8a1 1 0 0 1 1-1h1v9a3 3 0 0 1-3 3h-1a4 4 0 0 1-4-4v-8a1 1 0 0 0-1-1h-1v-2z" fill="#334155"/></svg>`;

/** Register the default generic fuel pump icon. */
export async function ensureDefaultBrandImage(map: MapLibreMap): Promise<void> {
  if (map.hasImage(DEFAULT_BRAND_IMAGE_ID)) return;
  try {
    const image = await loadImage(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_PUMP_SVG)}`,
    );
    if (!map.hasImage(DEFAULT_BRAND_IMAGE_ID)) {
      map.addImage(DEFAULT_BRAND_IMAGE_ID, toSquareImageData(image), { pixelRatio: 2 });
      map.triggerRepaint?.();
    }
  } catch {
    // Ignore.
  }
}

/** White rounded capsule drawn behind the price text (`icon-text-fit`). */
export const PRICE_PILL_IMAGE_ID = "price-pill";
const PRICE_PILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="48" viewBox="0 0 128 48"><rect x="2" y="2" width="124" height="44" rx="20" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/></svg>`;

/** Register the price capsule (idempotent; re-registered after a style swap). */
export async function ensurePricePillImage(map: MapLibreMap): Promise<void> {
  if (map.hasImage(PRICE_PILL_IMAGE_ID)) return;
  try {
    const image = await loadImage(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PRICE_PILL_SVG)}`,
    );
    if (!map.hasImage(PRICE_PILL_IMAGE_ID)) {
      // Keep the capsule's aspect ratio: `icon-text-fit` stretches it to the text.
      map.addImage(PRICE_PILL_IMAGE_ID, toImageData(image), { pixelRatio: 2 });
      map.triggerRepaint?.();
    }
  } catch {
    // Ignore: the price is still rendered without its capsule.
  }
}
