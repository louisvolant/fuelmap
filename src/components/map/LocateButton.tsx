import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMap } from "./MapContext";
import { useGeolocationStore } from "@/stores/geolocationStore";

/**
 * Button that requests the user's position and recenters the map on it.
 * Also used to enable the radius filter.
 */
export function LocateButton() {
  const { t } = useTranslation();
  const map = useMap();
  const position = useGeolocationStore((state) => state.position);
  const status = useGeolocationStore((state) => state.status);
  const locate = useGeolocationStore((state) => state.locate);

  // Recenter whenever a fresh position becomes available.
  useEffect(() => {
    if (!map || !position) return;
    map.easeTo({
      center: position,
      zoom: Math.max(map.getZoom(), 13),
      duration: 600,
    });
  }, [map, position]);

  const isDenied = status === "denied" || status === "error";

  return (
    <button
      type="button"
      onClick={locate}
      aria-label={t("map.locate")}
      title={isDenied ? t("map.locationDenied") : t("map.locate")}
      className={[
        "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full shadow backdrop-blur",
        position
          ? "bg-sky-600 text-white"
          : "bg-white/90 text-slate-700 hover:bg-white dark:bg-slate-800/90 dark:text-slate-100",
      ].join(" ")}
    >
      <span aria-hidden>◎</span>
    </button>
  );
}
