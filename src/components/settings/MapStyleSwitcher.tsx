import { useTranslation } from "react-i18next";
import { MAP_STYLES, type MapStyleId } from "@/lib/mapStyles";
import { useMapStyleStore } from "@/stores/mapStyleStore";

const OPTIONS: { id: MapStyleId; labelKey: string }[] = [
  { id: "auto", labelKey: "map.styleAuto" },
  ...MAP_STYLES.map((style) => ({
    id: style.id as MapStyleId,
    labelKey: style.labelKey,
  })),
];

/**
 * Basemap style picker, rendered inside the settings sheet.
 * The choice is persisted and survives a reload.
 */
export function MapStyleSwitcher() {
  const { t } = useTranslation();
  const styleId = useMapStyleStore((state) => state.styleId);
  const setStyleId = useMapStyleStore((state) => state.setStyleId);

  return (
    <select
      aria-label={t("map.style")}
      value={styleId}
      onChange={(event) => setStyleId(event.target.value as MapStyleId)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      {OPTIONS.map((option) => (
        <option key={option.id} value={option.id}>
          {t(option.labelKey)}
        </option>
      ))}
    </select>
  );
}
