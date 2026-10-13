import { useTranslation } from "react-i18next";
import { enabledCountries } from "@/countries";
import type { CountryCode } from "@/countries/types";
import { useCountryStore } from "@/stores/countryStore";

/** Select control to switch the active country (fuel catalog + data source). */
export function CountrySwitcher() {
  const { t } = useTranslation();
  const country = useCountryStore((state) => state.country);
  const setCountry = useCountryStore((state) => state.setCountry);

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-slate-500 dark:text-slate-400">
        {t("settings.country")}
      </span>
      <select
        aria-label={t("settings.country")}
        value={country}
        onChange={(event) => setCountry(event.target.value as CountryCode)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {enabledCountries().map((definition) => (
          <option key={definition.code} value={definition.code}>
            {t(`countries.${definition.code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
