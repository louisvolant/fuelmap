import { useTranslation } from "react-i18next";
import { useStations } from "@/hooks/useStations";
import { useCountryStore } from "@/stores/countryStore";

/**
 * Compact status pill overlaid on the map.
 * Temporary dev-facing surface that proves data loading works; it will sit next
 * to the filter bar once markers are rendered.
 */
export function StationsStatus() {
  const { t } = useTranslation();
  const country = useCountryStore((state) => state.country);
  const { data, isLoading, isError, refetch } = useStations(country);

  const baseClasses =
    "pointer-events-auto rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow backdrop-blur dark:bg-slate-800/90 dark:text-slate-100";

  if (isError) {
    return (
      <button
        type="button"
        onClick={() => void refetch()}
        className={`${baseClasses} text-red-600 dark:text-red-400`}
      >
        {t("map.loadError")}
      </button>
    );
  }

  if (isLoading && !data) {
    return <span className={baseClasses}>{t("map.loadingStations")}</span>;
  }

  return (
    <span className={baseClasses}>
      {t("map.stations")}: {data?.length ?? 0}
    </span>
  );
}
