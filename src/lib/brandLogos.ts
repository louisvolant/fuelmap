import { BRAND_SVGS } from "./brandSvgs";
import type { BrandId } from "./brands";

/**
 * Where the snapshotted brand logos are served from.
 * In production this is the Worker, backed by R2 (see `worker/index.ts`).
 */
export const BRANDS_BASE =
  import.meta.env.VITE_BRANDS_BASE_URL?.toString() ?? "/brands";

/** URL of the snapshot served by the Worker (R2). */
export function remoteBrandLogoUrl(id: BrandId): string {
  return `${BRANDS_BASE}/${id}`;
}

/** Bundled fallback mark, as a data URL usable in `<img src>`. */
export function brandSvgDataUrl(id: BrandId): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BRAND_SVGS[id])}`;
}
