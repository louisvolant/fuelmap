import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/settings/LanguageSwitcher";

export default function App() {
  const { t } = useTranslation();

  return (
    <div className="flex h-dvh w-screen flex-col items-center justify-center gap-4 bg-slate-900 text-slate-100">
      <h1 className="text-3xl font-bold tracking-tight">{t("app.name")}</h1>
      <p className="max-w-xs text-center text-sm text-slate-400">
        {t("app.tagline")}
      </p>
      <LanguageSwitcher />
    </div>
  );
}
