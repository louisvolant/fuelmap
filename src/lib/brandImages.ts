import type { Map as MapLibreMap } from "maplibre-gl";
import { BRAND_SVGS } from "./brandSvgs";
import { brandImageId, type BrandId } from "./brands";

const imageCache = new Map<BrandId, HTMLImageElement>();

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(64, 64);
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to rasterize SVG"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function loadBrandImage(id: BrandId): Promise<HTMLImageElement> {
  return loadSvgImage(BRAND_SVGS[id]).catch((error) => {
    throw new Error(`Failed to load brand image "${id}": ${String(error)}`);
  });
}

/** White rounded capsule drawn behind the price text (`icon-text-fit`). */
export const PRICE_PILL_IMAGE_ID = "price-pill";
const PRICE_PILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="48" viewBox="0 0 128 48"><rect x="2" y="2" width="124" height="44" rx="20" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/></svg>`;

/** Register the price capsule (idempotent; re-registered after a style swap). */
export async function ensurePricePillImage(map: MapLibreMap): Promise<void> {
  if (map.hasImage(PRICE_PILL_IMAGE_ID)) return;
  try {
    const image = await loadSvgImage(PRICE_PILL_SVG);
    if (!map.hasImage(PRICE_PILL_IMAGE_ID)) {
      map.addImage(PRICE_PILL_IMAGE_ID, image, { pixelRatio: 2 });
    }
  } catch {
    // Ignore: the price is still rendered without its capsule.
  }
}

/**
 * Register the SVG marks of the given brands as MapLibre images.
 * Idempotent and fire-and-forget friendly: failures are ignored so a missing
 * mark never breaks marker rendering.
 */
export async function ensureBrandImages(
  map: MapLibreMap,
  brandIds: Iterable<BrandId>,
): Promise<void> {
  for (const id of brandIds) {
    const imageId = brandImageId(id);
    if (map.hasImage(imageId)) continue;
    try {
      let image = imageCache.get(id);
      if (!image) {
        image = await loadBrandImage(id);
        imageCache.set(id, image);
      }
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, image, { pixelRatio: 2 });
      }
    } catch {
      // Ignore: the price marker is still rendered without a logo.
    }
  }
}
