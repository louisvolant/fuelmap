import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CountryDefinition, NormalizedStation } from "@/countries/types";
import { FavoriteToggle } from "@/components/favorites/FavoriteToggle";
import { Sheet } from "@/components/ui/Sheet";
import { SidePanel } from "@/components/ui/SidePanel";
import { usePanelPresentation } from "@/hooks/usePanelPresentation";
import { formatDistance } from "@/lib/format";
import { getFuel } from "@/lib/fuelCatalog";
import { useLayoutStore } from "@/stores/layoutStore";
import { FuelPriceRow } from "./FuelPriceRow";
import { NavigationButtons } from "./NavigationButtons";
import { OpeningHours } from "./OpeningHours";
import { ServicesList } from "./ServicesList";

interface StationDetailsProps {
  station: NormalizedStation | null;
  country: CountryDefinition;
  onClose: () => void;
  /** Distance from the user, in meters, when known. */
  distance?: number;
}

/**
 * Station details. Rendered as a bottom sheet on small portrait screens and as
 * a side panel everywhere else.
 */
export function StationDetails({
  station,
  country,
  onClose,
  distance,
}: StationDetailsProps) {
  const { t, i18n } = useTranslation();
  const presentation = usePanelPresentation();
  const panelSide = useLayoutStore((state) => state.panelSide);
  const togglePanelSide = useLayoutStore((state) => state.togglePanelSide);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

  const content = (
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
  );

  const title = station.city || t("station.title");

  if (presentation === "sheet") {
    return (
      <Sheet open onClose={onClose} title={title}>
        {content}
      </Sheet>
    );
  }

  return (
    <SidePanel
      side={panelSide}
      title={title}
      onClose={onClose}
      onToggleSide={togglePanelSide}
    >
      {content}
    </SidePanel>
  );
}
