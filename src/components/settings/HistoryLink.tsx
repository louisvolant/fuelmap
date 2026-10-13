import { useTranslation } from "react-i18next";

/** External link to FuelStats, which handles fill-up history and savings. */
export function HistoryLink() {
  const { t } = useTranslation();

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{t("history.title")}</h3>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        {t("history.description")}
      </p>
      <a
        href="https://www.fuelstats.net"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-full border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-950"
      >
        {t("history.open")}
      </a>
    </section>
  );
}
