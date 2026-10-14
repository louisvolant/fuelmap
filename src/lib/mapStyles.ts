/**
 * OpenFreeMap basemap styles.
 *
 * OpenFreeMap serves free, unlimited vector tiles from OpenStreetMap data with
 * no API key and no registration. Attribution is required and is rendered
 * automatically by MapLibre.
 */
export type MapStyleName = "liberty" | "bright" | "positron" | "dark";

/** User-selectable preference: an explicit style, or "follow the UI theme". */
export type MapStyleId = "auto" | MapStyleName;

export interface MapStyleDefinition {
  id: MapStyleName;
  /** i18n key for the style's display name. */
  labelKey: string;
  url: string;
  /** Whether this style is dark, used to align with the UI theme. */
  dark: boolean;
}

export const MAP_STYLES: MapStyleDefinition[] = [
  {
    id: "liberty",
    labelKey: "map.styleLiberty",
    url: "https://tiles.openfreemap.org/styles/liberty",
    dark: false,
  },
  {
    id: "bright",
    labelKey: "map.styleBright",
    url: "https://tiles.openfreemap.org/styles/bright",
    dark: false,
  },
  {
    id: "positron",
    labelKey: "map.stylePositron",
    url: "https://tiles.openfreemap.org/styles/positron",
    dark: false,
  },
  {
    id: "dark",
    labelKey: "map.styleDark",
    url: "https://tiles.openfreemap.org/styles/dark",
    dark: true,
  },
];

/** Colourful default basemap (green parks, blue water). */
export const DEFAULT_MAP_STYLE =
  MAP_STYLES.find((style) => style.id === "liberty") ?? MAP_STYLES[0];

/** Style used when the dark theme is active. */
export const DARK_MAP_STYLE =
  MAP_STYLES.find((style) => style.dark) ?? DEFAULT_MAP_STYLE;

export function getMapStyle(id: string): MapStyleDefinition | undefined {
  return MAP_STYLES.find((style) => style.id === id);
}

/**
 * Resolve the effective style: `"auto"` follows the UI theme (Liberty in light
 * mode, the dark style in dark mode), anything else is used as-is.
 */
export function resolveMapStyle(
  styleId: MapStyleId,
  theme: "light" | "dark",
): MapStyleDefinition {
  if (styleId === "auto") {
    return theme === "dark" ? DARK_MAP_STYLE : DEFAULT_MAP_STYLE;
  }
  return getMapStyle(styleId) ?? DEFAULT_MAP_STYLE;
}
