import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/ui/Sheet";
import { useFilterStore } from "@/stores/filterStore";

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** Distinct services available across the loaded stations. */
  services: string[];
}

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 py-3 dark:border-slate-800">
      <span className="text-sm">{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-sky-600"
      />
    </label>
  );
}

/** Advanced filters: availability, 24/7 pump and services. */
export function FilterSheet({ open, onClose, services }: FilterSheetProps) {
  const { t } = useTranslation();
  const hideShortages = useFilterStore((state) => state.hideShortages);
  const only24h = useFilterStore((state) => state.only24h);
  const selectedServices = useFilterStore((state) => state.services);
  const setHideShortages = useFilterStore((state) => state.setHideShortages);
  const setOnly24h = useFilterStore((state) => state.setOnly24h);
  const toggleService = useFilterStore((state) => state.toggleService);
  const reset = useFilterStore((state) => state.reset);

  return (
    <Sheet open={open} onClose={onClose} title={t("filters.title")}>
      <div className="flex flex-col">
        <ToggleRow
          label={t("filters.hideShortages")}
          checked={hideShortages}
          onChange={setHideShortages}
        />
        <ToggleRow
          label={t("filters.only24h")}
          checked={only24h}
          onChange={setOnly24h}
        />

        <section className="pt-4">
          <h3 className="mb-2 text-sm font-semibold">{t("filters.services")}</h3>
          {services.length === 0 ? (
            <p className="text-sm text-slate-500">{t("filters.noServices")}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {services.map((service) => (
                <li key={service}>
                  <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(service)}
                      onChange={() => toggleService(service)}
                      className="h-4 w-4 accent-sky-600"
                    />
                    {service}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={reset}
          className="mt-4 self-start rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {t("filters.clear")}
        </button>
      </div>
    </Sheet>
  );
}
