import { useTranslation } from "react-i18next";
import type { CountryDefinition, NormalizedStation } from "@/countries/types";
import { Sheet } from "@/components/ui/Sheet";
import { formatDistance, formatPricePerLiter } from "@/lib/format";
import { getFuel } from "@/lib/fuelCatalog";
import { stationDistance } from "@/lib/sortStations";
import { displayFuel } from "@/lib/stationUtils";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useFilterStore } from "@/stores/filterStore";

interface StationListSheetProps {
  open: boolean;
  onClose: () => void;
  stations: NormalizedStation[];
  country: CountryDefinition;
  activeFuelId: string | null;
  /** Reference point for distances, as `[lon, lat]`. */
  center?: [number, number];
  onSelect: (id: string) => void;
}

interface SortChipProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}

function SortChip({ active, disabled, onClick, children }: SortChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-medium",
        active
          ? "bg-sky-600 text-white"
          : "border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Sortable list of the filtered stations. */
export function StationListSheet({
  open,
  onClose,
  stations,
  country,
  activeFuelId,
  center,
  onSelect,
}: StationListSheetProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const sortBy = useFilterStore((state) => state.sortBy);
  const setSortBy = useFilterStore((state) => state.setSortBy);
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);

  return (
    <Sheet open={open} onClose={onClose} title={t("list.title")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t("list.sortBy")}
        </span>
        <SortChip active={sortBy === "price"} onClick={() => setSortBy("price")}>
          {t("list.sortPrice")}
        </SortChip>
        <SortChip
          active={sortBy === "distance"}
          disabled={!center}
          onClick={() => setSortBy("distance")}
        >
          {t("list.sortDistance")}
        </SortChip>
      </div>

      {stations.length === 0 ? (
        <p className="text-sm text-slate-500">{t("list.empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {stations.map((station) => {
            const fuel = displayFuel(station, activeFuelId);
            const definition = fuel
              ? getFuel(country.fuelCatalog, fuel.fuelId)
              : undefined;
            const subtitle = [
              definition ? t(definition.labelKey) : null,
              station.address,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(station.id);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 py-2.5 text-left"
                >
                  <span className="w-20 shrink-0 text-right">
                    {fuel?.price !== undefined ? (
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPricePerLiter(fuel.price, fuel.currency, locale)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">
                        {t("station.noPrice")}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {station.brand || station.city || station.address}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {subtitle}
                    </span>
                  </span>

                  {center && (
                    <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {formatDistance(stationDistance(station, center), locale)}
                    </span>
                  )}

                  {favoriteIds.includes(station.id) && (
                    <span aria-hidden className="shrink-0 text-amber-500">
                      ★
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
