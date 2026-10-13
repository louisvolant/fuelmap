import { useTranslation } from "react-i18next";
import type { CountryDefinition, NormalizedStation } from "@/countries/types";
import { Sheet } from "@/components/ui/Sheet";
import { FavoriteToggle } from "@/components/favorites/FavoriteToggle";
import { formatDistance } from "@/lib/format";
import { getFuel } from "@/lib/fuelCatalog";
import { FuelPriceRow } from "./FuelPriceRow";
import { NavigationButtons } from "./NavigationButtons";
import { OpeningHours } from "./OpeningHours";
import { ServicesList } from "./ServicesList";

interface StationSheetProps {
  station: NormalizedStation | null;
  country: CountryDefinition;
  onClose: () => void;
  /** Distance from the user, in meters, when known. */
  distance?: number;
}

/** Bottom sheet showing a station's fuels, prices, freshness and services. */
export function StationSheet({
  station,
  country,
  onClose,
  distance,
}: StationSheetProps) {
  const { t, i18n } = useTranslation();
  if (!station) return null;

  const locale = i18n.language;

  // Available (priced) fuels first, cheapest first; then unavailable ones.
  const sortedFuels = [...station.fuels].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.price !== undefined && b.price !== undefined) return a.price - b.price;
    return 0;
  });

  const badgeClasses =
    "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <Sheet open onClose={onClose} title={station.city || t("station.title")}>
      <div className="flex flex-col gap-5">
        <header>
          {station.address && (
            <p className="text-sm font-medium">{station.address}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[station.postalCode, station.city].filter(Boolean).join(" ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={badgeClasses}>
              {station.isHighway ? t("station.highway") : t("station.route")}
            </span>
            {distance !== undefined && (
              <span className={badgeClasses}>{formatDistance(distance, locale)}</span>
            )}
          </div>
          <div className="mt-3">
            <FavoriteToggle stationId={station.id} country={station.country} />
          </div>
        </header>

        <section>
          <h3 className="mb-1 text-sm font-semibold">{t("station.fuels")}</h3>
          {sortedFuels.length === 0 ? (
            <p className="text-sm text-slate-500">{t("station.noFuels")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedFuels.map((fuel) => {
                const definition = getFuel(country.fuelCatalog, fuel.fuelId);
                return (
                  <FuelPriceRow
                    key={fuel.fuelId}
                    fuel={fuel}
                    label={definition ? t(definition.labelKey) : fuel.fuelId}
                    color={definition?.color ?? "#94a3b8"}
                    locale={locale}
                  />
                );
              })}
            </ul>
          )}
        </section>

        <ServicesList services={station.services} />
        <OpeningHours
          hours={station.openingHours}
          automat24h={station.automat24h}
        />
        <NavigationButtons lat={station.lat} lon={station.lon} />
      </div>
    </Sheet>
  );
}
