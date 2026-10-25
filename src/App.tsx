import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { FavoritesButton } from "@/components/favorites/FavoritesButton";
import { FavoritesSheet } from "@/components/favorites/FavoritesSheet";
import { FilterSheet } from "@/components/filters/FilterSheet";
import { FiltersButton } from "@/components/filters/FiltersButton";
import { FuelFilterBar } from "@/components/filters/FuelFilterBar";
import { ListButton } from "@/components/list/ListButton";
import { StationListSheet } from "@/components/list/StationListSheet";
import { LocateButton } from "@/components/map/LocateButton";
import { MapCanvas } from "@/components/map/MapCanvas";
import { RadarMarkers } from "@/components/map/RadarMarkers";
import { ZoomLevelBadge } from "@/components/map/ZoomLevelBadge";
import { MapContext } from "@/components/map/MapContext";
import { StationMarkers } from "@/components/map/StationMarkers";
import { StationsStatus } from "@/components/map/StationsStatus";
import { UserLocationLayer } from "@/components/map/UserLocationLayer";
import { MaxPriceBanner } from "@/components/price/MaxPriceBanner";
import { RouteButton } from "@/components/route/RouteButton";
import { RouteLayer } from "@/components/route/RouteLayer";
import { RoutePanel } from "@/components/route/RoutePanel";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { StationDetails } from "@/components/station/StationDetails";
import { getCountry } from "@/countries";
import type { BoundingBox } from "@/countries/types";
import {
  useActiveFuelId,
  useFilteredStations,
} from "@/hooks/useFilteredStations";
import { useCountryStations } from "@/hooks/useCountryStations";
import { useFrenchRadars } from "@/hooks/useFrenchRadars";
import { useInitialView } from "@/hooks/useInitialView";
import { usePanelPresentation } from "@/hooks/usePanelPresentation";
import { useTheme } from "@/hooks/useTheme";
import { collectServices } from "@/lib/filters";
import { resolveMapStyle } from "@/lib/mapStyles";
import { stationsAlongRoute } from "@/lib/routeStations";
import { sortStations } from "@/lib/sortStations";
import { useCountryStore } from "@/stores/countryStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useFilterStore } from "@/stores/filterStore";
import { useGeolocationStore } from "@/stores/geolocationStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useMapStyleStore } from "@/stores/mapStyleStore";
import { useRouteStore } from "@/stores/routeStore";
import { useUiStore } from "@/stores/uiStore";

/** Width reserved for the station details side panel, in pixels. */
const PANEL_WIDTH = 400;

/** Stations within this distance (meters) of the route are kept. */
const ROUTE_CORRIDOR_METERS = 2000;

export default function App() {
  const countryCode = useCountryStore((state) => state.country);
  const setCountry = useCountryStore((state) => state.setCountry);
  const country = getCountry(countryCode);

  const [view, setView] = useState<{ bounds: BoundingBox; zoom: number } | null>(
    null,
  );
  const bounds = view?.bounds ?? null;
  const { stations, isLoading, isError, refetch } = useCountryStations(
    countryCode,
    bounds,
    view?.zoom,
  );

  const userPosition = useGeolocationStore((state) => state.position);
  const maxDistanceMeters = useFilterStore((state) => state.maxDistanceMeters);
  const selectedFuelIds = useFilterStore((state) => state.selectedFuelIds);
  const filteredStations = useFilteredStations(stations, {
    center: userPosition ?? undefined,
    maxDistanceMeters: maxDistanceMeters ?? undefined,
  });

  const activeFuelId = useActiveFuelId();
  const { data: radars } = useFrenchRadars();
  const sortBy = useFilterStore((state) => state.sortBy);
  const route = useRouteStore((state) => state.route);
  const onlyOnRoute = useRouteStore((state) => state.onlyOnRoute);
  const selectStation = useUiStore((state) => state.selectStation);
  const selectedStationId = useUiStore((state) => state.selectedStationId);
  const openSheet = useUiStore((state) => state.openSheet);
  const setOpenSheet = useUiStore((state) => state.setOpenSheet);
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const loadFavorites = useFavoritesStore((state) => state.load);
  const theme = useTheme();
  const styleId = useMapStyleStore((state) => state.styleId);
  const presentation = usePanelPresentation();
  const panelSide = useLayoutStore((state) => state.panelSide);
  const [map, setMap] = useState<MapLibreMap | null>(null);

  const mapStyle = resolveMapStyle(styleId, theme);

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  // Switching country changes the fuel catalog: clear the fuel selection so it
  // does not reference fuels that do not exist in the new country. Skip the
  // first render, otherwise the preset restored from IndexedDB would be wiped
  // on every reload.
  const previousCountryRef = useRef(countryCode);
  useEffect(() => {
    if (previousCountryRef.current === countryCode) return;
    previousCountryRef.current = countryCode;
    useFilterStore.getState().clearFuels();
  }, [countryCode]);

  // A restored preset may target a fuel the active country does not sell (for
  // example after changing country and reloading).
  useEffect(() => {
    if (selectedFuelIds.length === 0) return;
    const available = new Set(country.fuelCatalog.map((fuel) => fuel.id));
    if (selectedFuelIds.some((fuelId) => !available.has(fuelId))) {
      useFilterStore.getState().clearFuels();
    }
  }, [country, selectedFuelIds]);

  // Move the camera to the newly selected country. The country change coming
  // from the initial view (IP) must not override the "around me" framing.
  const initialCountryRef = useRef(false);
  useEffect(() => {
    if (!map) return;
    if (initialCountryRef.current) {
      initialCountryRef.current = false;
      return;
    }
    map.flyTo({ center: country.center, zoom: country.zoom, duration: 800 });
  }, [map, country, countryCode]);

  // On first open, frame the map around the user (geolocation, then IP).
  useInitialView(map, countryCode, (code) => {
    initialCountryRef.current = true;
    setCountry(code);
  });

  // Track the viewport (bounds + zoom): used for area-based loading (Germany)
  // and for the OpenStreetMap brand enrichment in France.
  useEffect(() => {
    if (!map) return;

    const update = () => {
      const box = map.getBounds();
      if (!box) return;
      setView({
        bounds: [box.getWest(), box.getSouth(), box.getEast(), box.getNorth()],
        zoom: map.getZoom(),
      });
    };

    update();
    let timeout: number | undefined;
    const onMove = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(update, 400);
    };

    map.on("moveend", onMove);
    return () => {
      window.clearTimeout(timeout);
      map.off("moveend", onMove);
    };
  }, [map]);

  const allServices = useMemo(
    () => collectServices(stations),
    [stations],
  );

  // Restrict to the route corridor when the route filter is enabled.
  const visibleStations = useMemo(() => {
    if (!route || !onlyOnRoute) return filteredStations;
    return stationsAlongRoute(
      filteredStations,
      route.coordinates,
      ROUTE_CORRIDOR_METERS,
    );
  }, [filteredStations, route, onlyOnRoute]);

  const listStations = useMemo(
    () =>
      sortStations(visibleStations, {
        sortBy,
        fuelId: activeFuelId,
        center: userPosition ?? undefined,
      }),
    [visibleStations, sortBy, activeFuelId, userPosition],
  );

  const selectedStation = useMemo(
    () =>
      stations.find((station) => station.id === selectedStationId) ?? null,
    [stations, selectedStationId],
  );

  // Recenter on the selected station, leaving room for the side panel so the
  // marker is not hidden behind it.
  useEffect(() => {
    if (!map || !selectedStation) return;
    const padding =
      presentation === "panel"
        ? panelSide === "right"
          ? { right: PANEL_WIDTH }
          : { left: PANEL_WIDTH }
        : undefined;
    map.easeTo({
      center: [selectedStation.lon, selectedStation.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
      ...(padding ? { padding } : {}),
    });
  }, [map, selectedStation, presentation, panelSide]);

  // Clear the panel padding once the details are closed.
  useEffect(() => {
    if (!map || selectedStation) return;
    map.easeTo({ padding: { top: 0, right: 0, bottom: 0, left: 0 } });
  }, [map, selectedStation]);

  return (
    <MapContext.Provider value={map}>
      <div className="relative h-dvh w-screen overflow-hidden bg-slate-200 dark:bg-slate-900">
        <MapCanvas
          center={country.center}
          zoom={country.zoom}
          styleUrl={mapStyle.url}
          onMapReady={setMap}
          className="h-full w-full"
        />

        <StationMarkers
          stations={visibleStations}
          activeFuelId={activeFuelId}
          favoriteIds={favoriteIds}
          showPrices={country.priceMode === "station"}
          onSelect={(id) => selectStation(id)}
        />

        <UserLocationLayer />
        <RouteLayer />
        <RadarMarkers data={radars} />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-3">
          <FuelFilterBar />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ListButton />
            <FiltersButton />
            <FavoritesButton />
            <RouteButton />
            <StationsStatus
              count={visibleStations.length}
              isLoading={isLoading}
              isError={isError}
              onRetry={refetch}
            />
            <SettingsButton />
          </div>
          <RoutePanel />
          <MaxPriceBanner />
        </div>

        {/* Own map controls, stacked above MapLibre's zoom control and attribution. */}
        <div className="pointer-events-none absolute right-3 bottom-30 z-20 flex flex-col items-center gap-2">
          <LocateButton />
          <ZoomLevelBadge />
        </div>

        <FilterSheet
          open={openSheet === "filters"}
          onClose={() => setOpenSheet(null)}
          services={allServices}
        />

        <StationListSheet
          open={openSheet === "list"}
          onClose={() => setOpenSheet(null)}
          stations={listStations}
          country={country}
          activeFuelId={activeFuelId}
          center={userPosition ?? undefined}
          onSelect={(id) => selectStation(id)}
        />

        <FavoritesSheet
          open={openSheet === "favorites"}
          onClose={() => setOpenSheet(null)}
          stations={stations}
          onSelect={(id) => selectStation(id)}
        />

        <SettingsSheet
          open={openSheet === "settings"}
          onClose={() => setOpenSheet(null)}
        />

        <StationDetails
          station={selectedStation}
          country={country}
          onClose={() => selectStation(null)}
        />
      </div>
    </MapContext.Provider>
  );
}
