/**
 * OpenFreeMap basemap styles.
 *
 * OpenFreeMap serves free, unlimited vector tiles from OpenStreetMap data with
 * no API key and no registration. Attribution is required and is rendered
 * automatically by MapLibre.
 */
export interface MapStyleDefinition {
  id: string;
  /** i18n key for the style's display name. */
  labelKey: string;
  url: string;
  /** Whether this style is dark, used to align the UI theme. */
  dark: boolean;
}

export const MAP_STYLES: MapStyleDefinition[] = [
  {
    id: "positron",
    labelKey: "map.stylePositron",
    url: "https://tiles.openfreemap.org/styles/positron",
    dark: false,
  },
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
    id: "dark",
    labelKey: "map.styleDark",
    url: "https://tiles.openfreemap.org/styles/dark",
    dark: true,
  },
];

/** Neutral, highly readable basemap so station markers stand out. */
export const DEFAULT_MAP_STYLE = MAP_STYLES[0];

/** Style used when the dark theme is active. */
export const DARK_MAP_STYLE =
  MAP_STYLES.find((style) => style.dark) ?? DEFAULT_MAP_STYLE;
