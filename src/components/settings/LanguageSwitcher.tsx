import { useTranslation } from "react-i18next";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/i18n";

/** Select control to switch the UI language. Choice is persisted by i18next. */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? "fr") as SupportedLanguage;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-400">{t("common.language")}</span>
      <select
        aria-label={t("common.language")}
        value={current}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng} value={lng}>
            {LANGUAGE_LABELS[lng]}
          </option>
        ))}
      </select>
    </label>
  );
}
