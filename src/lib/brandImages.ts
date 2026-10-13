import type { Map as MapLibreMap } from "maplibre-gl";
import { BRAND_SVGS } from "./brandSvgs";
import { brandImageId, type BrandId } from "./brands";

const imageCache = new Map<BrandId, HTMLImageElement>();

function loadBrandImage(id: BrandId): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image(64, 64);
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load brand image "${id}"`));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BRAND_SVGS[id])}`;
  });
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
