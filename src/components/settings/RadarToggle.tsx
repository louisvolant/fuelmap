import { useTranslation } from "react-i18next";
import { useCountryStore } from "@/stores/countryStore";
import { useRadarStore } from "@/stores/radarStore";

/** Settings switch for the French fixed speed-camera layer. */
export function RadarToggle() {
  const { t } = useTranslation();
  const country = useCountryStore((state) => state.country);
  const showFixedRadars = useRadarStore((state) => state.showFixedRadars);
  const setShowFixedRadars = useRadarStore((state) => state.setShowFixedRadars);

  if (country !== "FR") return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{t("radars.settingsTitle")}</h3>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-sm">{t("radars.settingsLabel")}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("radars.settingsDescription")}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={showFixedRadars}
          onChange={(event) => setShowFixedRadars(event.target.checked)}
          className="h-5 w-5 shrink-0 accent-sky-600"
        />
      </label>
    </section>
  );
}
