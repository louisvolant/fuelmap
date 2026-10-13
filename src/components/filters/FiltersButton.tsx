import { useTranslation } from "react-i18next";
import { countActiveFilters, useFilterStore } from "@/stores/filterStore";
import { useUiStore } from "@/stores/uiStore";

/** Button that opens the advanced filter sheet, with an active-filter badge. */
export function FiltersButton() {
  const { t } = useTranslation();
  const activeCount = useFilterStore(countActiveFilters);
  const isOpen = useUiStore((state) => state.openSheet === "filters");
  const toggleSheet = useUiStore((state) => state.toggleSheet);

  return (
    <button
      type="button"
      aria-pressed={isOpen}
      onClick={() => toggleSheet("filters")}
      className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur hover:bg-white dark:bg-slate-800/90 dark:text-slate-100"
    >
      {t("filters.title")}
      {activeCount > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[10px] font-bold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
