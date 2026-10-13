import { useTranslation } from "react-i18next";
import {
  useThemeStore,
  type ThemePreference,
} from "@/stores/themeStore";

const OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: "system", labelKey: "settings.themeSystem" },
  { value: "light", labelKey: "settings.themeLight" },
  { value: "dark", labelKey: "settings.themeDark" },
];

/** Segmented control to pick the theme: system, light or dark. */
export function ThemeSwitcher() {
  const { t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div
      role="group"
      aria-label={t("settings.theme")}
      className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800"
    >
      {OPTIONS.map((option) => {
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => setTheme(option.value)}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              isActive
                ? "bg-sky-600 text-white"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            {t(option.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
