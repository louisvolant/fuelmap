/**
 * Parsing of the official national **maximum** fuel prices for Belgium and
 * Luxembourg. Both are bounded prices, identical at every station.
 *
 * Belgium: Statbel "Official rate of petroleum products" CSV
 *   ("Product group","Product","Day","Price excl. VAT","…","Price incl. VAT")
 * Luxembourg: the official price table (first "TVAC" row = current prices).
 *
 * Fuel ids reuse the French catalog ids (`gazole`, `sp95`, `sp98`, `e10`) so
 * their labels are already available in every locale.
 */

export interface MaxPricesPayload {
  updatedAt: string | null;
  currency: string;
  /** Price per liter, keyed by FuelMap fuel id. */
  prices: Record<string, number>;
}

/** Minimal CSV parser (handles quoted fields, comma separated). */
function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) =>
      line
        .split(",")
        .map((cell) => cell.trim().replace(/^"|"$/g, "")),
    );
}

const BELGIAN_PRODUCTS: { match: string; fuelId: string }[] = [
  { match: "euro super 95 e5", fuelId: "sp95" },
  { match: "euro super 95 e10", fuelId: "e10" },
  { match: "super plus 98 e5", fuelId: "sp98" },
  { match: "road diesel b7", fuelId: "gazole" },
];

/** Parse the Statbel CSV into the national maximum prices. */
export function parseBelgianMaxPrices(csv: string): MaxPricesPayload {
  const rows = parseCsv(csv);
  const prices: Record<string, number> = {};
  let day: string | null = null;

  for (const row of rows) {
    if (row.length < 6) continue;
    const [, product, rawDay, , , priceInclVat] = row;
    const normalized = product.toLowerCase();
    const entry = BELGIAN_PRODUCTS.find((candidate) =>
      normalized.startsWith(candidate.match),
    );
    if (!entry) continue;
    const price = Number(priceInclVat);
    if (!Number.isFinite(price)) continue;
    prices[entry.fuelId] = price;
    if (!day && /^\d{2}[A-Z]{3}\d{2}$/.test(rawDay)) day = rawDay;
  }

  return { updatedAt: day, currency: "EUR", prices };
}

const LUXEMBOURG_COLUMNS: { index: number; fuelId: string }[] = [
  { index: 1, fuelId: "sp98" },
  { index: 2, fuelId: "sp95" },
  { index: 3, fuelId: "gazole" },
];

const CELL_PATTERN = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g;

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

/**
 * Parse the Luxembourg official price table. Rows come as
 * `Date | Super 98 | Super 95 | Diesel | … | TVAC|HTVA`; the first `TVAC` row
 * holds the current (incl. VAT) prices.
 */
export function parseLuxembourgMaxPrices(html: string): MaxPricesPayload {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? [];

  for (const row of rows) {
    const cells = [...row.matchAll(CELL_PATTERN)].map((match) =>
      stripTags(match[1]),
    );
    if (cells.length < 6) continue;
    if (!/tvac/i.test(cells[cells.length - 1])) continue;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(cells[0])) continue;

    const [day, month, year] = cells[0].split("/");
    const prices: Record<string, number> = {};
    for (const column of LUXEMBOURG_COLUMNS) {
      const value = Number(cells[column.index]?.replace(",", "."));
      if (Number.isFinite(value)) prices[column.fuelId] = value;
    }
    if (Object.keys(prices).length === 0) continue;

    return {
      updatedAt: `${year}-${month}-${day}`,
      currency: "EUR",
      prices,
    };
  }

  return { updatedAt: null, currency: "EUR", prices: {} };
}
