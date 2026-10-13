import type { FuelDefinition } from "../types";

/**
 * Fuel catalog for France, matching the DGCCRF open data.
 * `aliases` mirror the raw names found in the API payload.
 */
export const FRENCH_FUELS: FuelDefinition[] = [
  {
    id: "gazole",
    labelKey: "fuels.gazole",
    color: "#1f2937",
    aliases: ["Gazole", "Diesel", "Gasoil", "B7"],
  },
  {
    id: "sp95",
    labelKey: "fuels.sp95",
    color: "#16a34a",
    aliases: ["SP95", "SP 95", "Sans plomb 95"],
  },
  {
    id: "sp98",
    labelKey: "fuels.sp98",
    color: "#dc2626",
    aliases: ["SP98", "SP 98", "Sans plomb 98"],
  },
  {
    id: "e10",
    labelKey: "fuels.e10",
    color: "#2563eb",
    aliases: ["E10", "SP95-E10", "SP95 E10"],
  },
  {
    id: "e85",
    labelKey: "fuels.e85",
    color: "#65a30d",
    aliases: ["E85", "Ethanol", "Superethanol"],
  },
  {
    id: "gplc",
    labelKey: "fuels.gplc",
    color: "#9333ea",
    aliases: ["GPLc", "GPL", "LPG", "Autogas"],
  },
];
