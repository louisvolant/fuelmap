import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/ui/Sheet";
import { CountrySwitcher } from "./CountrySwitcher";
import { HistoryLink } from "./HistoryLink";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MapStyleSwitcher } from "./MapStyleSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Settings sheet: country, theme, basemap style and language. */
export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onClose={onClose} title={t("settings.title")}>
      <div className="flex flex-col gap-5">
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("settings.country")}</h3>
          <CountrySwitcher />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("settings.theme")}</h3>
          <ThemeSwitcher />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("map.style")}</h3>
          <MapStyleSwitcher />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">{t("common.language")}</h3>
          <LanguageSwitcher />
        </section>
        <HistoryLink />
      </div>
    </Sheet>
  );
}
