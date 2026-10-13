import { useTranslation } from "react-i18next";
import type { CountryCode } from "@/countries/types";
import { useFavoritesStore } from "@/stores/favoritesStore";

interface FavoriteToggleProps {
  stationId: string;
  country: CountryCode;
}

/** Star button to add/remove a station from local favorites. */
export function FavoriteToggle({ stationId, country }: FavoriteToggleProps) {
  const { t } = useTranslation();
  const isFavorite = useFavoritesStore((state) =>
    state.favoriteIds.includes(stationId),
  );
  const toggle = useFavoritesStore((state) => state.toggle);

  const label = isFavorite ? t("favorites.remove") : t("favorites.add");

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={label}
      title={label}
      onClick={() => void toggle(stationId, country)}
      className={[
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        isFavorite
          ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
      ].join(" ")}
    >
      <span aria-hidden>{isFavorite ? "★" : "☆"}</span>
      {label}
    </button>
  );
}
