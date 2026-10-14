import type { FuelDefinition } from "../types";

/**
 * Fuel catalog for Italy, matching the MIMIT Osservaprezzi data.
 * Brand-specific premium variants are folded into generic premium fuels by the
 * worker (see `matchItalianFuel`).
 */
export const ITALIAN_FUELS: FuelDefinition[] = [
  {
    id: "benzina",
    labelKey: "fuels.benzina",
    color: "#16a34a",
    aliases: ["Benzina"],
  },
  {
    id: "benzinaPremium",
    labelKey: "fuels.benzinaPremium",
    color: "#dc2626",
    aliases: ["Benzina speciale", "Blue Super", "F101"],
  },
  {
    id: "gasolio",
    labelKey: "fuels.gasolio",
    color: "#1f2937",
    aliases: ["Gasolio"],
  },
  {
    id: "gasolioPremium",
    labelKey: "fuels.gasolioPremium",
    color: "#0ea5e9",
    aliases: ["Blue Diesel", "Supreme Diesel", "Hi-Q Diesel"],
  },
  {
    id: "hvo",
    labelKey: "fuels.hvo",
    color: "#65a30d",
    aliases: ["HVO", "HVOlution", "HVO100"],
  },
  {
    id: "gpl",
    labelKey: "fuels.gpl",
    color: "#9333ea",
    aliases: ["GPL"],
  },
  {
    id: "metano",
    labelKey: "fuels.metano",
    color: "#0891b2",
    aliases: ["Metano", "GNL"],
  },
];
