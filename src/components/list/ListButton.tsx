import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/uiStore";

/** Button that opens the sortable station list. */
export function ListButton() {
  const { t } = useTranslation();
  const isOpen = useUiStore((state) => state.openSheet === "list");
  const toggleSheet = useUiStore((state) => state.toggleSheet);

  return (
    <button
      type="button"
      aria-pressed={isOpen}
      aria-label={t("list.title")}
      title={t("list.title")}
      onClick={() => toggleSheet("list")}
      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur hover:bg-white dark:bg-slate-800/90 dark:text-slate-100"
    >
      <span aria-hidden>☰</span>
      {t("list.title")}
    </button>
  );
}
