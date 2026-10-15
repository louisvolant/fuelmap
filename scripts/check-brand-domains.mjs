// Checks the Brandfetch integration end to end, from the domain table to the
// actual logo bytes.
//
// Usage:
//   BRANDFETCH_API_KEY=xxxxxxxx node scripts/check-brand-domains.mjs [brand…]
//
// For every brand it reports whether the domain resolves, which assets the Brand
// API returns, and — the part that matters — whether those assets can actually be
// downloaded. Brandfetch's Logo CDN answers 200 with an **HTML documentation
// page** for links it refuses to serve, so an HTTP 200 alone proves nothing:
// the bytes are sniffed here exactly like the Worker does before caching them.
//
// With no argument every brand is checked; pass ids to focus on a few.
import {
  BRANDFETCH_DOMAINS,
  assetHostPath,
  credentialedAssetUrl,
  pickBrandfetchLogos,
  sniffImageFormat,
} from "../src/lib/brandfetch.ts";

const apiKey = process.env.BRANDFETCH_API_KEY;
if (!apiKey) {
  console.error(
    "Missing BRANDFETCH_API_KEY.\nUsage: BRANDFETCH_API_KEY=xxxxxxxx node scripts/check-brand-domains.mjs [brand…]",
  );
  process.exit(1);
}

const base =
  process.env.BRANDFETCH_API_URL ?? "https://api.brandfetch.io/v2/brands";

const requested = process.argv.slice(2);
const ids = requested.length > 0 ? requested : Object.keys(BRANDFETCH_DOMAINS);
const MAX_CANDIDATES = 4;

let usable = 0;

for (const id of ids) {
  const domain = BRANDFETCH_DOMAINS[id];
  if (!domain) {
    console.log(`${id}\n  unknown brand id\n`);
    continue;
  }

  console.log(`${id}  (${domain})`);

  let brand;
  try {
    const response = await fetch(`${base}/${encodeURIComponent(domain)}`, {
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok) {
      console.log(
        `  api     ${response.status} ${contentType} ${(await response.text()).slice(0, 120)}`,
      );
      console.log("");
      continue;
    }
    brand = await response.json();
    const logos = brand.logos ?? [];
    console.log(
      `  api     200 ${contentType} name="${brand.name ?? ""}" logos=${logos.length}`,
    );
  } catch (error) {
    console.log(`  api     failed: ${String(error).slice(0, 140)}\n`);
    continue;
  }

  const candidates = pickBrandfetchLogos(brand).slice(0, MAX_CANDIDATES);
  if (candidates.length === 0) {
    console.log("  assets  none proposed by the API\n");
    continue;
  }

  let found = false;
  for (const [index, candidate] of candidates.entries()) {
    const url = credentialedAssetUrl(candidate.src, apiKey);
    const label = `${assetHostPath(url)}${url.includes("?") ? "?…" : ""}`;
    try {
      const asset = await fetch(url);
      if (!asset.ok) {
        console.log(`  #${index + 1}  ${label}  -> ${asset.status}`);
        continue;
      }
      const bytes = new Uint8Array(await asset.arrayBuffer());
      const sniffed = sniffImageFormat(bytes);
      const contentType = asset.headers.get("content-type") ?? "";
      console.log(
        `  #${index + 1}  ${label}  -> 200 ${contentType}, ${bytes.byteLength} B, ` +
          (sniffed ? `${sniffed} — usable` : "no image signature (HTML page?)"),
      );
      if (sniffed) {
        found = true;
        break;
      }
    } catch (error) {
      console.log(`  #${index + 1}  ${label}  -> failed: ${String(error).slice(0, 80)}`);
    }
  }

  if (found) usable += 1;
  console.log(`  result  ${found ? "usable logo found" : "NO usable logo"}\n`);
}

console.log(`${usable}/${ids.length} brands resolved with a downloadable logo.`);
