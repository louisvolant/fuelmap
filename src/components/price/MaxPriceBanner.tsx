import { useTranslation } from "react-i18next";
import { getCountry } from "@/countries";
import { useMaxPrices } from "@/hooks/useMaxPrices";
import { formatPricePerLiter } from "@/lib/format";
import { useCountryStore } from "@/stores/countryStore";

/**
 * Banner with the official national maximum prices, shown for countries whose
 * fuel prices are regulated (Belgium, Luxembourg) instead of per-station prices.
 */
export function MaxPriceBanner() {
  const { t, i18n } = useTranslation();
  const country = useCountryStore((state) => state.country);
  const definition = getCountry(country);
  const { data, isLoading, isError } = useMaxPrices(country);

  if (definition.priceMode !== "national-max") return null;

  const entries = Object.entries(data?.prices ?? {});
  const locale = i18n.language;

  return (
    <div className="pointer-events-auto max-w-[22rem] rounded-2xl bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-slate-800/95 dark:text-slate-100">
      <p className="font-semibold">{t("maxPrice.title")}</p>

      {isError || (data && entries.length === 0) ? (
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          {t("maxPrice.unavailable")}
        </p>
      ) : isLoading && !data ? (
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          {t("common.loading")}
        </p>
      ) : (
        <>
          <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {entries.map(([fuelId, price]) => (
              <li key={fuelId} className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">
                  {t(`fuels.${fuelId}`)}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatPricePerLiter(price, data?.currency ?? "EUR", locale)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            {t("maxPrice.note")}
          </p>
        </>
      )}
    </div>
  );
}
