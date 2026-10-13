import { useTranslation } from "react-i18next";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useUiStore } from "@/stores/uiStore";

/** Button that opens the favorites sheet, with a favorite count badge. */
export function FavoritesButton() {
  const { t } = useTranslation();
  const count = useFavoritesStore((state) => state.favoriteIds.length);
  const isOpen = useUiStore((state) => state.openSheet === "favorites");
  const toggleSheet = useUiStore((state) => state.toggleSheet);

  return (
    <button
      type="button"
      aria-pressed={isOpen}
      onClick={() => toggleSheet("favorites")}
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur hover:bg-white dark:bg-slate-800/90 dark:text-slate-100"
    >
      <span aria-hidden className="text-amber-500">
        ★
      </span>
      {t("favorites.title")}
      {count > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
