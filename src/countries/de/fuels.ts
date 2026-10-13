import type { FuelDefinition } from "../types";

/**
 * Fuel catalog for Germany, matching the Tankerkönig / MTS-K data.
 * Only the three mandatory fuel types are published.
 */
export const GERMAN_FUELS: FuelDefinition[] = [
  {
    id: "diesel",
    labelKey: "fuels.diesel",
    color: "#1f2937",
    aliases: ["Diesel"],
  },
  {
    id: "e5",
    labelKey: "fuels.e5",
    color: "#16a34a",
    aliases: ["Super E5", "E5"],
  },
  {
    id: "e10",
    labelKey: "fuels.e10",
    color: "#2563eb",
    aliases: ["Super E10", "E10"],
  },
];
