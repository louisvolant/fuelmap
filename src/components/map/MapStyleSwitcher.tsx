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
 * Discrete control to switch the basemap style at runtime.
 * The choice is persisted and survives a reload.
 */
export function MapStyleSwitcher() {
  const { t } = useTranslation();
  const styleId = useMapStyleStore((state) => state.styleId);
  const setStyleId = useMapStyleStore((state) => state.setStyleId);

  return (
    <label className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-xs shadow backdrop-blur dark:bg-slate-800/90">
      <span className="sr-only">{t("map.style")}</span>
      <span aria-hidden>🗺️</span>
      <select
        aria-label={t("map.style")}
        value={styleId}
        onChange={(event) => setStyleId(event.target.value as MapStyleId)}
        className="bg-transparent text-slate-700 focus:outline-none dark:text-slate-100"
      >
        {OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
