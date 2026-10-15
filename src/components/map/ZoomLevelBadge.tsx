import { useCallback, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useMap } from "./MapContext";

/**
 * Small pill showing the current map zoom level (one decimal).
 * Subscribes to MapLibre's `zoom` event, so it follows pinch, wheel and buttons.
 */
export function ZoomLevelBadge() {
  const { t } = useTranslation();
  const map = useMap();

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!map) return () => {};
      map.on("zoom", onChange);
      return () => {
        map.off("zoom", onChange);
      };
    },
    [map],
  );

  const getSnapshot = useCallback(() => map?.getZoom() ?? null, [map]);
  const zoom = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (zoom === null) return null;

  const label = zoom.toFixed(1);

  return (
    <span
      role="status"
      aria-label={`${t("map.zoomLevel")} ${label}`}
      className="pointer-events-auto rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-700 tabular-nums shadow backdrop-blur dark:bg-slate-800/90 dark:text-slate-100"
    >
      {label}
    </span>
  );
}
