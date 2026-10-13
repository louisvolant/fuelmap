import { useTranslation } from "react-i18next";
import type { NormalizedFuelPrice } from "@/countries/types";
import { formatPricePerLiter } from "@/lib/format";
import { formatRelativeTime } from "@/lib/freshness";

interface FuelPriceRowProps {
  fuel: NormalizedFuelPrice;
  label: string;
  color: string;
  locale: string;
}

/** One fuel line in the station sheet: price, freshness and shortage status. */
export function FuelPriceRow({
  fuel,
  label,
  color,
  locale,
}: FuelPriceRowProps) {
  const { t } = useTranslation();
  const hasPrice = typeof fuel.price === "number";

  const shortageLabel =
    fuel.shortage?.type === "temporary"
      ? t("station.shortageTemporary")
      : fuel.shortage?.type === "definitive"
        ? t("station.shortageDefinitive")
        : null;

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hasPrice && fuel.updatedAt
              ? formatRelativeTime(fuel.updatedAt, locale)
              : shortageLabel ?? t("station.noPrice")}
          </span>
        </span>
      </span>

      <span className="flex flex-col items-end">
        {hasPrice ? (
          <span className="text-sm font-semibold tabular-nums">
            {formatPricePerLiter(fuel.price as number, fuel.currency, locale)}
          </span>
        ) : (
          <span className="text-xs font-medium text-slate-400">
            {shortageLabel ?? t("station.unavailable")}
          </span>
        )}
        {hasPrice && shortageLabel && (
          <span className="text-[10px] font-medium text-amber-600">
            {shortageLabel}
          </span>
        )}
      </span>
    </li>
  );
}
