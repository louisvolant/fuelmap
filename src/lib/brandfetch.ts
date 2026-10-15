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
  fulli: "fulli.com", // verify: real domain, but no Brandfetch brand
  auchan: "auchan.fr",
  eni: "eni.com",
  dyneff: "dyneff.fr", // verify: real domain, but no Brandfetch brand
  elan: "elan.fr", // verify: no Brandfetch brand
  match: "match.fr", // verify: no Brandfetch brand
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
  return pickBrandfetchLogos(brand)[0];
}

/**
 * All usable logo candidates, best first.
 *
 * The Brand API can return several assets per brand and **not every asset URL
 * serves its bytes to a programmatic client**: `cdn.brandfetch.io` (Logo API)
 * only serves baked, signed links and otherwise redirects to the documentation.
 * The Worker therefore walks the candidates in order until one returns real
 * image bytes (see `refreshBrand` in `worker/index.ts`).
 */
export function pickBrandfetchLogos(brand: BrandfetchBrand): PickedLogo[] {
  const logos = brand.logos ?? [];
  if (logos.length === 0) return [];

  const ordered = [...logos].sort((a, b) => {
    const byType = rank(TYPE_ORDER, a.type) - rank(TYPE_ORDER, b.type);
    if (byType !== 0) return byType;
    // Light theme first (white bubble), then unspecified, then dark.
    const themeRank = (logo: BrandfetchLogo) =>
      logo.theme === "light" ? 0 : logo.theme ? 1 : 2;
    return themeRank(a) - themeRank(b);
  });

  const picked: PickedLogo[] = [];
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
    // The square-ish format first, then the remaining ones as fallbacks.
    const candidates = square
      ? [square, ...formats.filter((format) => format !== square)]
      : formats;
    for (const chosen of candidates) {
      if (chosen.src) {
        picked.push({
          src: chosen.src,
          format: chosen.format,
          type: logo.type,
          theme: logo.theme,
        });
      }
    }
  }

  return picked;
}

/** Content type to serve a cached logo with. */
export function logoContentType(format: string): string {
  if (format === "svg") return "image/svg+xml";
  if (format === "jpg" || format === "jpeg") return "image/jpeg";
  return `image/${format}`;
}

/** Image type detected from the bytes themselves, whatever the headers claim. */
export type ImageFormat = "svg" | "png" | "jpeg" | "webp" | "gif";

/**
 * Identify an image from its magic bytes.
 *
 * Brandfetch's CDN answers with a 200 **HTML page** (its documentation) for URLs
 * it refuses to serve, and a happy `fetch()` cannot tell the difference from a
 * logo: the bytes have to be checked before they are cached.
 */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | undefined {
  const starts = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (bytes.length >= 8 && starts(0x89, 0x50, 0x4e, 0x47)) return "png";
  if (bytes.length >= 3 && starts(0xff, 0xd8, 0xff)) return "jpeg";
  if (bytes.length >= 6 && starts(0x47, 0x49, 0x46, 0x38)) return "gif";
  if (
    bytes.length >= 12 &&
    starts(0x52, 0x49, 0x46, 0x46) && // "RIFF"
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50 // "WEBP"
  ) {
    return "webp";
  }
  // SVG is textual. Require it to *start* with the root element (or an XML
  // prolog), so an HTML page that merely embeds an <svg> is not mistaken for
  // one — Brandfetch serves exactly such a page for links it refuses to serve.
  const head = new TextDecoder()
    .decode(bytes.slice(0, 1024))
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/^<svg[\s>]/i.test(head)) return "svg";
  if (/^<\?xml[\s\S]*?<svg[\s>]/i.test(head)) return "svg";

  return undefined;
}

/** `host/path` of a URL, without its query string (which may carry a token). */
export function assetHostPath(src: string): string {
  try {
    const url = new URL(src);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "";
  }
}
