/** Format a price with the country currency, e.g. `1,859 €`. */
export function formatPricePerLiter(
  value: number,
  currency: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

/** Compact price used on map markers, e.g. `1.859`. */
export function formatPriceCompact(value: number): string {
  return value.toFixed(3);
}

/** Format a distance in meters to a human readable string (km or m). */
export function formatDistance(meters: number, locale: string): string {
  const options: Intl.NumberFormatOptions =
    meters < 1000
      ? { style: "unit", unit: "meter", maximumFractionDigits: 0 }
      : { style: "unit", unit: "kilometer", maximumFractionDigits: 1 };
  const value = meters < 1000 ? meters : meters / 1000;
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Format a duration in seconds as e.g. `1 h 12 min`. */
export function formatDuration(seconds: number, locale: string): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const format = (value: number, unit: "hour" | "minute") =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit,
      unitDisplay: "short",
    }).format(value);

  if (hours === 0) return format(minutes, "minute");
  if (minutes === 0) return format(hours, "hour");
  return `${format(hours, "hour")} ${format(minutes, "minute")}`;
}
