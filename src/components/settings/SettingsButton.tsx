import { useTranslation } from "react-i18next";
import { useUiStore } from "@/stores/uiStore";

/** Icon button that opens the settings sheet. */
export function SettingsButton() {
  const { t } = useTranslation();
  const isOpen = useUiStore((state) => state.openSheet === "settings");
  const toggleSheet = useUiStore((state) => state.toggleSheet);

  return (
    <button
      type="button"
      aria-pressed={isOpen}
      aria-label={t("common.settings")}
      title={t("common.settings")}
      onClick={() => toggleSheet("settings")}
      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow backdrop-blur hover:bg-white dark:bg-slate-800/90 dark:text-slate-100"
    >
      <span aria-hidden>⚙</span>
    </button>
  );
}
