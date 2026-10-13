import { useTranslation } from "react-i18next";
import { useGeolocationStore } from "@/stores/geolocationStore";
import { useRouteStore } from "@/stores/routeStore";

/** Button that starts the route flow (pick a destination on the map). */
export function RouteButton() {
  const { t } = useTranslation();
  const picking = useRouteStore((state) => state.picking);
  const startPicking = useRouteStore((state) => state.startPicking);
  const position = useGeolocationStore((state) => state.position);
  const locate = useGeolocationStore((state) => state.locate);

  return (
    <button
      type="button"
      aria-pressed={picking}
      onClick={() => {
        if (!position) locate();
        startPicking();
      }}
      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow backdrop-blur hover:bg-white dark:bg-slate-800/90 dark:text-slate-100"
    >
      <span aria-hidden>➤</span>
      {t("route.title")}
    </button>
  );
}
