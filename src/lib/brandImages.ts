import type { Map as MapLibreMap } from "maplibre-gl";
import { brandSvgDataUrl, remoteBrandLogoUrl } from "./brandLogos";
import { brandImageId, type BrandId } from "./brands";

/**
 * Brand logos are served by the Worker from R2 (`/brands/<id>`), snapshotted
 * from the Brandfetch Brand API with a self-healing cache: a missing snapshot is
 * fetched in the background and appears on the next load.
 *
 * The client therefore always *tries* the snapshot first and silently falls back
 * to the bundled mark, so it never waits for a third party and works offline.
 */
const LOGO_SIZE = 64;

const imageDataCache = new Map<BrandId, ImageData>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

/** Draw an image centred in a transparent square and return its pixels. */
function toSquareImageData(image: HTMLImageElement, size = LOGO_SIZE): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");

  const width = image.naturalWidth || size;
  const height = image.naturalHeight || size;
  const scale = Math.min(size / width, size / height);
  const drawWidth = width * scale;
  const drawHeight = height * scale;

  context.drawImage(
    image,
    (size - drawWidth) / 2,
    (size - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
  return context.getImageData(0, 0, size, size);
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
  try {
    image = await loadImage(remoteBrandLogoUrl(id));
  } catch {
    image = undefined;
  }
  if (!image) {
    image = await loadImage(brandSvgDataUrl(id));
  }

  const imageData = toSquareImageData(image);
  imageDataCache.set(id, imageData);
  return imageData;
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
