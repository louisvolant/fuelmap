import { useTranslation } from "react-i18next";
import { getCountry } from "@/countries";
import { useCountryStore } from "@/stores/countryStore";
import { useFilterStore } from "@/stores/filterStore";

/**
 * Horizontal fuel filter. Chips are mutually exclusive: selecting a fuel
 * replaces the previous one, and clicking the active chip shows all fuels.
 */
export function FuelFilterBar() {
  const { t } = useTranslation();
  const countryCode = useCountryStore((state) => state.country);
  const country = getCountry(countryCode);
  const selectedFuelIds = useFilterStore((state) => state.selectedFuelIds);
  const toggleFuel = useFilterStore((state) => state.toggleFuel);

  if (country.fuelCatalog.length === 0) return null;

  return (
    <div
      data-testid="fuel-filter-bar"
      role="group"
      aria-label={t("filters.fuel")}
      className="pointer-events-auto flex max-w-full gap-2 overflow-x-auto rounded-full bg-white/80 p-1 shadow backdrop-blur dark:bg-slate-800/80"
    >
      {country.fuelCatalog.map((fuel) => {
        const isSelected = selectedFuelIds.includes(fuel.id);
        return (
          <button
            key={fuel.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleFuel(fuel.id)}
            className={[
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              isSelected
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "text-slate-700 hover:bg-slate-200/70 dark:text-slate-100 dark:hover:bg-slate-700/70",
            ].join(" ")}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: fuel.color }}
            />
            {t(fuel.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
