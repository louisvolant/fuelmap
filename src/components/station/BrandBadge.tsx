import { brandSvgDataUrl, remoteBrandLogoUrl } from "@/lib/brandLogos";
import { matchBrand } from "@/lib/brands";

interface BrandBadgeProps {
  /** Raw brand string from the data source (OSM, provider field…). */
  brand?: string;
  size?: number;
  className?: string;
}

/**
 * Round brand badge used in the station details.
 * Prefers the snapshot served by the Worker and falls back to the bundled mark.
 * Drawn on a light disc so both light and dark logos stay readable.
 */
export function BrandBadge({ brand, size = 32, className }: BrandBadgeProps) {
  const id = matchBrand(brand);
  if (!id) return null;

  const fallback = brandSvgDataUrl(id);

  return (
    <img
      src={remoteBrandLogoUrl(id)}
      alt={brand ?? ""}
      title={brand ?? ""}
      width={size}
      height={size}
      loading="lazy"
      onError={(event) => {
        const image = event.currentTarget;
        // Guard against an error loop if even the fallback cannot be decoded.
        if (image.src !== fallback) image.src = fallback;
      }}
      className={[
        "shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-slate-200 dark:bg-slate-100 dark:ring-slate-600",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size }}
    />
  );
}
