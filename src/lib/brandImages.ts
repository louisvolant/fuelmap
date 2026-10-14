import type { Map as MapLibreMap } from "maplibre-gl";
import { BRAND_SVGS } from "./brandSvgs";
import { brandImageId, type BrandId } from "./brands";

/**
 * Brand logos are served by the Worker from R2 (`/brands/<id>`), snapshotted
 * from the Brandfetch Brand API. When a brand is not available there, the
 * bundled SVG mark is used instead — the app never depends on a third party at
 * runtime.
 */
const BRANDS_BASE =
  import.meta.env.VITE_BRANDS_BASE_URL?.toString() ?? "/brands";

/** Square size (in device pixels) every logo is rasterized to. */
const LOGO_SIZE = 64;

interface BrandManifest {
  at: number | null;
  brands: { id: string; status: string }[];
}

const imageDataCache = new Map<BrandId, ImageData>();
let remoteBrandIdsPromise: Promise<Set<string>> | null = null;

/** Brand ids that have a snapshot in R2 (empty when the Worker is absent). */
function fetchRemoteBrandIds(): Promise<Set<string>> {
  if (!remoteBrandIdsPromise) {
    remoteBrandIdsPromise = fetch(`${BRANDS_BASE}/manifest.json`)
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: BrandManifest | null) => {
        const ids = (manifest?.brands ?? [])
          .filter((brand) => brand.status === "ok")
          .map((brand) => brand.id);
        return new Set(ids);
      })
      .catch(() => new Set<string>());
  }
  return remoteBrandIdsPromise;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

/** Draw an image centred in a transparent square and return its pixels. */
function toSquareImageData(
  image: HTMLImageElement,
  size = LOGO_SIZE,
): ImageData {
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
async function loadBrandLogo(
  id: BrandId,
  remote: boolean,
): Promise<ImageData> {
  const cached = imageDataCache.get(id);
  if (cached) return cached;

  let image: HTMLImageElement | undefined;
  if (remote) {
    image = await loadImage(`${BRANDS_BASE}/${id}`).catch(() => undefined);
  }
  if (!image) {
    const svg = BRAND_SVGS[id];
    image = await loadImage(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
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
  const ids = [...brandIds];
  if (ids.length === 0) return;

  const remote = await fetchRemoteBrandIds();

  for (const id of ids) {
    const imageId = brandImageId(id);
    if (map.hasImage(imageId)) continue;
    try {
      const imageData = await loadBrandLogo(id, remote.has(id));
      if (!map.hasImage(imageId)) {
        map.addImage(imageId, imageData, { pixelRatio: 2 });
      }
    } catch {
      // Ignore: the price marker is still rendered without a logo.
    }
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
    }
  } catch {
    // Ignore: the price is still rendered without its capsule.
  }
}
