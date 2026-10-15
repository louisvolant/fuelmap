/**
 * Brand catalog.
 *
 * The French open data does not expose brands, so brands come from the data
 * source when available (Spain `Rótulo`, Germany `brand`) or from an
 * OpenStreetMap enrichment (see `lib/osmBrands.ts`).
 *
 * `aliases` are used to map raw provider/OSM brand strings onto a canonical id.
 */
export type BrandId =
  | "auchan"
  | "avia"
  | "bp"
  | "carrefour"
  | "cora"
  | "dyneff"
  | "elan"
  | "eni"
  | "esso"
  | "fulli"
  | "intermarche"
  | "leclerc"
  | "match"
  | "netto"
  | "shell"
  | "totalenergies"
  | "u";

/**
 * Brands not indexed by Brandfetch (API 404).
 * We serve their bundled vector marks directly without attempting remote fetches.
 */
export const LOCAL_ONLY_BRANDS: ReadonlySet<BrandId> = new Set([
  "dyneff",
  "elan",
  "fulli",
  "match",
]);

export interface BrandDefinition {
  id: BrandId;
  /** Human-readable name. */
  label: string;
  /** Raw values found in data sources or OpenStreetMap. */
  aliases: string[];
}

export const BRANDS: BrandDefinition[] = [
  {
    id: "totalenergies",
    label: "TotalEnergies",
    aliases: ["Total", "TotalEnergies", "Total Energies", "Total Access", "TotalEnergies Access"],
  },
  { id: "esso", label: "Esso", aliases: ["Esso", "Esso Express", "Esso Station"] },
  {
    id: "leclerc",
    label: "E.Leclerc",
    aliases: ["E.Leclerc", "E Leclerc", "Leclerc", "Centre E.Leclerc"],
  },
  {
    id: "carrefour",
    label: "Carrefour",
    aliases: ["Carrefour", "Carrefour Market", "Carrefour Contact", "Carrefour City", "Carrefour Express"],
  },
  { id: "avia", label: "Avia", aliases: ["Avia"] },
  {
    id: "u",
    label: "Système U",
    aliases: ["U", "Super U", "Hyper U", "Station U", "Système U", "Systeme U", "U Express", "Utile"],
  },
  {
    id: "intermarche",
    label: "Intermarché",
    aliases: ["Intermarché", "Intermarche", "Intermarché Contact", "Intermarché Express"],
  },
  { id: "netto", label: "Netto", aliases: ["Netto", "Netto City"] },
  { id: "shell", label: "Shell", aliases: ["Shell", "Shell Express"] },
  { id: "fulli", label: "Fulli", aliases: ["Fulli", "Ulys Fulli"] },
  { id: "auchan", label: "Auchan", aliases: ["Auchan", "Auchan Supermarché", "Auchan Supermarche"] },
  { id: "eni", label: "Eni", aliases: ["Eni", "Agip", "Agip Eni", "Eni Station"] },
  { id: "dyneff", label: "Dyneff", aliases: ["Dyneff"] },
  { id: "elan", label: "Élan", aliases: ["Elan", "Élan", "Elan Station"] },
  { id: "match", label: "Supermarché Match", aliases: ["Match", "Supermarché Match", "Supermarche Match"] },
  { id: "cora", label: "Cora", aliases: ["Cora", "Cora Station"] },
  { id: "bp", label: "BP", aliases: ["BP", "BP Express"] },
];

/** Normalize a brand string for matching: accents, case and punctuation. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const EXACT = new Map<string, BrandId>();
/** Aliases long enough to be safely used for substring matching. */
const CONTAINS: { alias: string; id: BrandId }[] = [];

for (const brand of BRANDS) {
  for (const alias of brand.aliases) {
    const key = normalize(alias);
    EXACT.set(key, brand.id);
    if (key.length >= 3) CONTAINS.push({ alias: key, id: brand.id });
  }
}
// Longest aliases first so "carrefourmarket" wins over "carrefour".
CONTAINS.sort((a, b) => b.alias.length - a.alias.length);

/** Resolve a raw brand string to a canonical brand id, or `undefined`. */
export function matchBrand(rawBrand: string | undefined | null): BrandId | undefined {
  if (!rawBrand) return undefined;
  const value = normalize(rawBrand);
  if (!value) return undefined;

  const exact = EXACT.get(value);
  if (exact) return exact;

  for (const { alias, id } of CONTAINS) {
    if (value.includes(alias)) return id;
  }
  return undefined;
}

/** MapLibre image id used to render a brand mark. */
export function brandImageId(id: BrandId): string {
  return `brand-${id}`;
}
