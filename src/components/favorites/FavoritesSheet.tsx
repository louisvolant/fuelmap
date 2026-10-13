import { useTranslation } from "react-i18next";
import type { NormalizedStation } from "@/countries/types";
import { Sheet } from "@/components/ui/Sheet";
import { useFavoritesStore } from "@/stores/favoritesStore";

interface FavoritesSheetProps {
  open: boolean;
  onClose: () => void;
  /** All loaded stations, used to resolve favorite ids. */
  stations: NormalizedStation[];
  onSelect: (id: string) => void;
}

/** List of locally saved favorite stations. */
export function FavoritesSheet({
  open,
  onClose,
  stations,
  onSelect,
}: FavoritesSheetProps) {
  const { t } = useTranslation();
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const toggle = useFavoritesStore((state) => state.toggle);

  const favoriteStations = stations.filter((station) =>
    favoriteIds.includes(station.id),
  );

  return (
    <Sheet open={open} onClose={onClose} title={t("favorites.title")}>
      {favoriteIds.length === 0 ? (
        <p className="text-sm text-slate-500">{t("favorites.empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {favoriteStations.map((station) => (
            <li
              key={station.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(station.id);
                  onClose();
                }}
                className="flex-1 text-left"
              >
                <span className="text-sm font-medium">
                  {station.city || station.address}
                </span>
                {station.address && station.city && (
                  <span className="block text-xs text-slate-500">
                    {station.address}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={t("favorites.remove")}
                onClick={() => void toggle(station.id, station.country)}
                className="rounded-full px-2 py-1 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950"
              >
                ★
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
