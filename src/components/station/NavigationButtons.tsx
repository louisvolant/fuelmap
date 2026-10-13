import { useTranslation } from "react-i18next";
import { navigationOptions } from "@/lib/navigation";

interface NavigationButtonsProps {
  lat: number;
  lon: number;
}

/** Turn-by-turn hand-off buttons: Waze, Google Maps and Apple Maps. */
export function NavigationButtons({ lat, lon }: NavigationButtonsProps) {
  const { t } = useTranslation();
  const options = navigationOptions({ lat, lon });

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">{t("navigation.title")}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <a
            key={option.id}
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-sky-600 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 dark:border-sky-400 dark:text-sky-300 dark:hover:bg-sky-950"
          >
            {t(option.labelKey)}
          </a>
        ))}
      </div>
    </section>
  );
}
