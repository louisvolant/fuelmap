import type { FuelDefinition } from "../types";

/**
 * Fuel catalog for Spain, matching the Ministerio fuel-price open data.
 * `aliases` mirror the raw field names of the `Precio …` columns.
 */
export const SPANISH_FUELS: FuelDefinition[] = [
  {
    id: "gasoleoA",
    labelKey: "fuels.gasoleoA",
    color: "#1f2937",
    aliases: ["Gasoleo A", "Gasóleo A", "Diesel"],
  },
  {
    id: "gasolina95",
    labelKey: "fuels.gasolina95",
    color: "#16a34a",
    aliases: ["Gasolina 95 E5", "Gasolina 95", "95"],
  },
  {
    id: "gasolina98",
    labelKey: "fuels.gasolina98",
    color: "#dc2626",
    aliases: ["Gasolina 98 E5", "Gasolina 98", "98"],
  },
  {
    id: "gasoleoPremium",
    labelKey: "fuels.gasoleoPremium",
    color: "#0ea5e9",
    aliases: ["Gasoleo Premium", "Gasóleo Premium"],
  },
  {
    id: "glp",
    labelKey: "fuels.glp",
    color: "#9333ea",
    aliases: ["Gases licuados del petróleo", "GLP", "LPG"],
  },
  {
    id: "gnc",
    labelKey: "fuels.gnc",
    color: "#0891b2",
    aliases: ["Gas Natural Comprimido", "GNC", "CNG"],
  },
];
