/**
 * Italian MIMIT open-data parsing, shared by the Cloudflare Worker (which
 * fetches the CSVs and serves the joined result) and its unit tests.
 */

export interface ItalianStation {
  id: string;
  lat: number;
  lon: number;
  brand?: string;
  address?: string;
  city?: string;
  province?: string;
  highway: boolean;
  /** Prices keyed by FuelMap fuel id. */
  prices: Record<string, number>;
}

export interface ItalianStationsPayload {
  updatedAt: string | null;
  stations: ItalianStation[];
}

/**
 * Map an Italian `descCarburante` value to a FuelMap fuel id.
 * Brand-specific premium variants are folded into generic premium fuels.
 */
export function matchItalianFuel(raw: string): string | undefined {
  const value = raw.toUpperCase();
  if (value.includes("HVO")) return "hvo";
  if (value.includes("GPL")) return "gpl";
  if (value.includes("METANO") || value.includes("GNL") || value.includes("GNC")) {
    return "metano";
  }
  if (value.includes("GASOLIO") || value.includes("DIESEL")) {
    const premium =
      /(SPECIAL|PREMIUM|BLUE|SUPREME|HI-?Q|MAX|ARTIC|ALPIN|GELO|ORO|EXCELLIUM|ENERGY|PERFORM|PLUS|V.?POWER|ECOPLUS|PRESTAZIONAL|GP DIESEL|E-DIESEL)/.test(
        value,
      );
    return premium ? "gasolioPremium" : "gasolio";
  }
  if (
    value.includes("BENZINA") ||
    value.includes("VERDE") ||
    value.includes("F101") ||
    value.includes("SUPER")
  ) {
    const premium =
      /(SPECIAL|98|100|102|PLUS|V.?POWER|WR|ENERGY|BLUE|HIQ|PERFORM|F-?101)/.test(
        value,
      );
    return premium ? "benzinaPremium" : "benzina";
  }
  return undefined;
}

/**
 * Join the MIMIT "anagrafica" (station registry) and "prezzo alle 8" (prices)
 * CSV files. Both use `|` as the delimiter, start with a title line, and then a
 * header line. Self-service prices are preferred over full-service ones.
 */
export function parseItalianStations(
  anagrafica: string,
  prezzi: string,
): ItalianStationsPayload {
  const anagraficaLines = anagrafica.split(/\r?\n/);
  const prezziLines = prezzi.split(/\r?\n/);
  const extractedAt = anagraficaLines[0]?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;

  const pricesById = new Map<string, Record<string, number>>();
  const selfFuels = new Map<string, Set<string>>();

  for (let i = 2; i < prezziLines.length; i += 1) {
    const parts = prezziLines[i].split("|");
    if (parts.length < 5) continue;
    const [id, descCarburante, prezzoRaw, isSelf] = parts;
    const fuelId = matchItalianFuel(descCarburante);
    if (!fuelId) continue;
    const price = Number(prezzoRaw);
    if (!Number.isFinite(price)) continue;

    const prices = pricesById.get(id) ?? {};
    const self = selfFuels.get(id) ?? new Set<string>();
    const isSelfPrice = isSelf === "1";
    const alreadySet = fuelId in prices;
    if (!alreadySet || (isSelfPrice && !self.has(fuelId))) {
      prices[fuelId] = price;
      if (isSelfPrice) self.add(fuelId);
    }
    pricesById.set(id, prices);
    selfFuels.set(id, self);
  }

  const stations: ItalianStation[] = [];
  for (let i = 2; i < anagraficaLines.length; i += 1) {
    const parts = anagraficaLines[i].split("|");
    if (parts.length < 10) continue;
    const prices = pricesById.get(parts[0]);
    if (!prices || Object.keys(prices).length === 0) continue;

    const lat = Number(parts[8]);
    const lon = Number(parts[9]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    stations.push({
      id: parts[0],
      lat,
      lon,
      brand: parts[2] || undefined,
      address: parts[5]?.trim() || undefined,
      city: parts[6] || undefined,
      province: parts[7] || undefined,
      highway: /autostrada/i.test(parts[3] ?? ""),
      prices,
    });
  }

  return {
    updatedAt: extractedAt ? `${extractedAt}T08:00:00+02:00` : null,
    stations,
  };
}
