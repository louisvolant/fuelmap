import { useTranslation } from "react-i18next";
import type { OpeningHours as OpeningHoursModel } from "@/countries/types";

interface OpeningHoursProps {
  hours?: OpeningHoursModel;
  automat24h: boolean;
}

/** Opening hours, or a 24/7 automated-pump note when applicable. */
export function OpeningHours({ hours, automat24h }: OpeningHoursProps) {
  const { t } = useTranslation();

  if (automat24h) {
    return (
      <section>
        <h3 className="mb-2 text-sm font-semibold">{t("station.openingHours")}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("station.automat24h")}
        </p>
      </section>
    );
  }

  if (!hours || hours.days.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{t("station.openingHours")}</h3>
      <ul className="flex flex-col gap-1">
        {hours.days.map((day) => (
          <li
            key={day.day}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-slate-600 dark:text-slate-300">{day.day}</span>
            <span className="tabular-nums">
              {day.closed
                ? t("station.closed")
                : day.periods.map((period) => `${period.from}–${period.to}`).join(", ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
