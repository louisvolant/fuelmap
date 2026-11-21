import { useEffect, useState } from "react";
import { getCachedBadgeLogo, normalizeLogoForBadge } from "@/lib/brandImages";
import { brandSvgDataUrl, remoteBrandLogoUrl } from "@/lib/brandLogos";
import { matchBrand, LOCAL_ONLY_BRANDS, type BrandId } from "@/lib/brands";

interface BrandBadgeProps {
  /** Raw brand string from the data source (OSM, provider field…). */
  brand?: string;
  size?: number;
  className?: string;
}

/**
 * Round brand badge used in the station details.
 *
 * Shows the normalized Worker snapshot immediately when already cached in
 * memory, otherwise starts with the bundled mark and upgrades to the
 * normalized snapshot (same background-keying + circular-mask pipeline as the
 * map markers, so a flattened JPEG never renders as a grey disc) when it loads.
 * Drawn on a light disc so both light and dark logos stay readable.
 */
export function BrandBadge({ brand, size = 32, className }: BrandBadgeProps) {
  const id = matchBrand(brand);
  const remoteSrc =
    id && !LOCAL_ONLY_BRANDS.has(id) ? remoteBrandLogoUrl(id) : null;
  const cachedLogo = remoteSrc ? getCachedBadgeLogo(remoteSrc) : undefined;
  const [upgraded, setUpgraded] = useState<Map<BrandId, string>>(new Map());

  useEffect(() => {
    if (!id || !remoteSrc || cachedLogo || upgraded.has(id)) return;
    let cancelled = false;
    void normalizeLogoForBadge(remoteSrc).then((normalized) => {
      if (!cancelled && normalized) {
        setUpgraded((previous) => new Map(previous).set(id, normalized));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, remoteSrc, cachedLogo, upgraded]);

  if (!id) return null;
  const fallback = brandSvgDataUrl(id);
  const src = cachedLogo ?? upgraded.get(id) ?? fallback;

  return (
    <img
      src={src}
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
