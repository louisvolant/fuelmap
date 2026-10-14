/**
 * Brandfetch integration.
 *
 * Brandfetch's **Brand API** (server-side, api key) is the only product that
 * allows caching the assets — its terms grant a 30-day licence on cached
 * content and require a refresh at least every 30 days (see the CRON in
 * `wrangler.toml`). The free "Logo API" is hotlink-only and cannot be stored.
 *
 * The mapping below is keyed by domain because Brandfetch resolves brands by
 * domain. Domains marked `verify` still need a visual check: some brands exist
 * in several countries (Netto FR vs DE, Cora, Shell/BP are global marks).
 */
import type { BrandId } from "./brands";

export const BRANDFETCH_DOMAINS: Record<BrandId, string> = {
  totalenergies: "totalenergies.com",
  esso: "esso.com",
  leclerc: "e.leclerc",
  carrefour: "carrefour.com",
  avia: "avia.com", // verify
  u: "magasins-u.com",
  intermarche: "intermarche.com",
  netto: "netto.fr", // verify (Netto also exists in DE/DK)
  shell: "shell.com",
  fulli: "fulli.fr",
  auchan: "auchan.fr",
  eni: "eni.com",
  dyneff: "dyneff.com",
  elan: "elan.fr", // verify
  match: "supermarche-match.com", // verify
  cora: "cora.fr", // verify (Cora exists in several countries)
  bp: "bp.com",
};

export interface BrandfetchLogoFormat {
  src: string;
  format: string;
  width?: number;
  height?: number;
  size?: number;
}

export interface BrandfetchLogo {
  type: string;
  theme?: string;
  formats?: BrandfetchLogoFormat[];
}

export interface BrandfetchBrand {
  id?: string;
  name?: string;
  domain?: string;
  logos?: BrandfetchLogo[];
}

export interface PickedLogo {
  src: string;
  format: string;
  type: string;
  theme?: string;
}

const TYPE_ORDER = ["icon", "symbol", "logo"];
const FORMAT_ORDER = ["svg", "png", "webp", "jpeg", "jpg"];

function rank(list: string[], value: string | undefined): number {
  const index = list.indexOf(value ?? "");
  return index === -1 ? list.length : index;
}

/**
 * Pick the best logo for a round map marker: prefer an **icon** (square-ish),
 * a **light** theme (our bubbles are white), and an **SVG**.
 */
export function pickBrandfetchLogo(
  brand: BrandfetchBrand,
): PickedLogo | undefined {
  const logos = brand.logos ?? [];
  if (logos.length === 0) return undefined;

  const ordered = [...logos].sort((a, b) => {
    const byType = rank(TYPE_ORDER, a.type) - rank(TYPE_ORDER, b.type);
    if (byType !== 0) return byType;
    // Light theme first (white bubble), then unspecified, then dark.
    const themeRank = (logo: BrandfetchLogo) =>
      logo.theme === "light" ? 0 : logo.theme ? 1 : 2;
    return themeRank(a) - themeRank(b);
  });

  for (const logo of ordered) {
    const formats = [...(logo.formats ?? [])].sort(
      (a, b) => rank(FORMAT_ORDER, a.format) - rank(FORMAT_ORDER, b.format),
    );
    if (formats.length === 0) continue;

    const square = formats.find(
      (format) =>
        format.width !== undefined &&
        format.height !== undefined &&
        Math.abs(format.width - format.height) <= 4,
    );
    const chosen = square ?? formats[0];
    if (chosen.src) {
      return {
        src: chosen.src,
        format: chosen.format,
        type: logo.type,
        theme: logo.theme,
      };
    }
  }

  return undefined;
}

/** Content type to serve a cached logo with. */
export function logoContentType(format: string): string {
  if (format === "svg") return "image/svg+xml";
  if (format === "jpg" || format === "jpeg") return "image/jpeg";
  return `image/${format}`;
}
