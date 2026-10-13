import { useTranslation } from "react-i18next";
import { formatDistance, formatDuration } from "@/lib/format";
import { useGeolocationStore } from "@/stores/geolocationStore";
import { useRouteStore } from "@/stores/routeStore";

/** Overlay shown during the route flow: hint, progress, then route summary. */
export function RoutePanel() {
  const { t, i18n } = useTranslation();
  const position = useGeolocationStore((state) => state.position);
  const picking = useRouteStore((state) => state.picking);
  const route = useRouteStore((state) => state.route);
  const status = useRouteStore((state) => state.status);
  const onlyOnRoute = useRouteStore((state) => state.onlyOnRoute);
  const toggleOnlyOnRoute = useRouteStore((state) => state.toggleOnlyOnRoute);
  const clear = useRouteStore((state) => state.clear);

  if (!picking && !route && status === "idle") return null;

  const locale = i18n.language;

  return (
    <div className="pointer-events-auto flex max-w-[22rem] flex-col gap-2 rounded-2xl bg-white/95 p-3 text-xs shadow-lg backdrop-blur dark:bg-slate-800/95 dark:text-slate-100">
      {picking && (
        <p>{position ? t("route.chooseDestination") : t("route.needLocation")}</p>
      )}

      {status === "loading" && <p>{t("route.loading")}</p>}
      {status === "error" && (
        <p className="text-red-600 dark:text-red-400">{t("route.error")}</p>
      )}

      {route && (
        <>
          <div className="flex items-center gap-3 font-semibold">
            <span>{formatDistance(route.distanceMeters, locale)}</span>
            <span>{formatDuration(route.durationSeconds, locale)}</span>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              role="switch"
              checked={onlyOnRoute}
              onChange={toggleOnlyOnRoute}
              className="h-4 w-4 accent-sky-600"
            />
            {t("route.onlyOnRoute")}
          </label>
        </>
      )}

      <button
        type="button"
        onClick={clear}
        className="self-start rounded-full border border-slate-300 px-3 py-1 font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
      >
        {t("route.clear")}
      </button>
    </div>
  );
}
