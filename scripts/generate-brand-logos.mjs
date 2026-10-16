// Generates the embedded brand marks as small, round-friendly SVG files.
//
// These are *simplified* marks: the brand's dominant colour in a circle, with a
// short wordmark. They are intentionally lightweight and designed to fit inside
// a circular map marker. Official artwork can be dropped in by replacing the
// matching file in `src/assets/brands/` (same name, 64x64 viewBox).
//
// `dyneff`, `elan`, `fulli` and `match` carry hand-drawn marks (see git history)
// and are deliberately NOT listed below: running this script must never
// overwrite them.
//
// Run with: node scripts/generate-brand-logos.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "src/assets/brands");

/** [id, background, foreground, wordmark, fontStyle?] */
const BRANDS = [
  ["totalenergies", "#e2001a", "#ffffff", "TOTAL"],
  ["esso", "#0033a0", "#ffffff", "ESSO"],
  ["leclerc", "#0a4a9f", "#ffffff", "LECLERC"],
  ["carrefour", "#004e9f", "#ffffff", "CARR"],
  ["avia", "#e2001a", "#ffffff", "AVIA", "italic"],
  ["u", "#e30613", "#ffffff", "U"],
  ["intermarche", "#e2001a", "#ffffff", "INTER"],
  ["netto", "#f7d000", "#1a1a1a", "NETTO"],
  ["shell", "#fbc500", "#1a1a1a", "SHELL"],
  ["fulli", "#003b71", "#ffffff", "FULLI"],
  ["auchan", "#e2001a", "#ffffff", "AUCHAN"],
  ["eni", "#f7d000", "#1a1a1a", "eni"],
  ["dyneff", "#004f9f", "#ffffff", "DYNEFF"],
  ["elan", "#00953b", "#ffffff", "ELAN"],
  ["match", "#e2001a", "#ffffff", "MATCH"],
  ["cora", "#e2001a", "#ffffff", "CORA"],
  ["bp", "#007a33", "#ffffff", "bp"],
  ["aral", "#0058a9", "#ffffff", "ARAL"],
  ["jet", "#ffcc00", "#003399", "JET"],
  ["star", "#e2001a", "#ffffff", "STAR"],
  ["orlen", "#cc0000", "#ffffff", "ORLEN"],
  ["hem", "#008a00", "#ffdd00", "HEM"],
];

function fontSizeFor(length) {
  if (length <= 1) return 30;
  if (length === 2) return 25;
  if (length === 3) return 20;
  if (length === 4) return 16;
  if (length === 5) return 13;
  if (length === 6) return 11;
  return 9.5;
}

function svg(background, foreground, wordmark, fontStyle) {
  const size = fontSizeFor(wordmark.length);
  const style = fontStyle ? ` font-style="${fontStyle}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="31" fill="${background}" stroke="#ffffff" stroke-width="2"/>
  <text x="32" y="33" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-weight="700"${style} font-size="${size}" letter-spacing="0.2" fill="${foreground}">${wordmark}</text>
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const [id, background, foreground, wordmark, fontStyle] of BRANDS) {
  writeFileSync(resolve(OUT_DIR, `${id}.svg`), svg(background, foreground, wordmark, fontStyle));
  console.log(`generated src/assets/brands/${id}.svg`);
}
