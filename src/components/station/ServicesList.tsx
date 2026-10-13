import { useTranslation } from "react-i18next";

interface ServicesListProps {
  services: string[];
}

/** List of services offered by a station. Returns `null` when empty. */
export function ServicesList({ services }: ServicesListProps) {
  const { t } = useTranslation();
  if (services.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{t("station.services")}</h3>
      <ul className="flex flex-wrap gap-2">
        {services.map((service) => (
          <li
            key={service}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {service}
          </li>
        ))}
      </ul>
    </section>
  );
}
