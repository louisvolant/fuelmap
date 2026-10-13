export interface NavigationPoint {
  lat: number;
  lon: number;
}

export type NavigationOptionId = "waze" | "googleMaps" | "appleMaps";

export interface NavigationOption {
  id: NavigationOptionId;
  /** i18n key for the button label. */
  labelKey: string;
  href: string;
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

/**
 * Deep links to open turn-by-turn navigation to a point.
 * Waze, Google Maps and Apple Maps are supported, matching Essence&Co.
 */
export function navigationOptions({ lat, lon }: NavigationPoint): NavigationOption[] {
  const coordinates = `${formatCoordinate(lat)},${formatCoordinate(lon)}`;

  return [
    {
      id: "waze",
      labelKey: "navigation.waze",
      href: `https://waze.com/ul?ll=${coordinates}&navigate=yes`,
    },
    {
      id: "googleMaps",
      labelKey: "navigation.googleMaps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${coordinates}&travelmode=driving`,
    },
    {
      id: "appleMaps",
      labelKey: "navigation.appleMaps",
      href: `https://maps.apple.com/?daddr=${coordinates}&dirflg=d`,
    },
  ];
}

/** Generic `geo:` URI, used as a fallback on platforms without an app handler. */
export function geoUri({ lat, lon }: NavigationPoint): string {
  return `geo:${formatCoordinate(lat)},${formatCoordinate(lon)}`;
}
