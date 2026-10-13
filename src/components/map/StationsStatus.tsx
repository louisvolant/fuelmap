import { useTranslation } from "react-i18next";

interface StationsStatusProps {
  /** Number of stations currently displayed (after filtering). */
  count: number;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Compact status pill overlaid on the map: loading, error or station count.
 */
export function StationsStatus({
  count,
  isLoading,
  isError,
  onRetry,
}: StationsStatusProps) {
  const { t } = useTranslation();

  const baseClasses =
    "pointer-events-auto rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow backdrop-blur dark:bg-slate-800/90 dark:text-slate-100";

  if (isError) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`${baseClasses} text-red-600 dark:text-red-400`}
      >
        {t("map.loadError")}
      </button>
    );
  }

  if (isLoading && count === 0) {
    return <span className={baseClasses}>{t("map.loadingStations")}</span>;
  }

  return (
    <span className={baseClasses}>
      {t("map.stations")}: {count}
    </span>
  );
}
