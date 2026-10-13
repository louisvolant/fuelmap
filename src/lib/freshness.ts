const UNIT_MS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1_000],
];

/**
 * Format an ISO timestamp as a localized relative time, e.g. "il y a 2 heures".
 * `now` is injectable to keep tests deterministic.
 */
export function formatRelativeTime(
  iso: string,
  locale: string,
  now: Date = new Date(),
): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const absolute = Math.abs(diff);
  const [unit, unitMs] =
    UNIT_MS.find(([, ms]) => absolute >= ms) ?? UNIT_MS[UNIT_MS.length - 1];

  return formatter.format(Math.round(diff / unitMs), unit);
}
