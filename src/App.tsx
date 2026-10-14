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
import { MapContext } from "@/components/map/MapContext";
import { StationMarkers } from "@/components/map/StationMarkers";
import { StationsStatus } from "@/components/map/StationsStatus";
import { UserLocationLayer } from "@/components/map/UserLocationLayer";
import { RouteButton } from "@/components/route/RouteButton";
import { RouteLayer } from "@/components/route/RouteLayer";
import { RoutePanel } from "@/components/route/RoutePanel";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { StationSheet } from "@/components/station/StationSheet";
import { getCountry } from "@/countries";
import type { BoundingBox } from "@/countries/types";
import {
  useActiveFuelId,
  useFilteredStations,
} from "@/hooks/useFilteredStations";
import { useCountryStations } from "@/hooks/useCountryStations";
import { useInitialView } from "@/hooks/useInitialView";
import { useOsmBrands } from "@/hooks/useOsmBrands";
import { useTheme } from "@/hooks/useTheme";
import { collectServices } from "@/lib/filters";
import { DARK_MAP_STYLE, DEFAULT_MAP_STYLE } from "@/lib/mapStyles";
import { enrichStationsWithBrands } from "@/lib/osmBrands";
import { stationsAlongRoute } from "@/lib/routeStations";
import { sortStations } from "@/lib/sortStations";
import { PRICE_LABEL_MIN_ZOOM } from "@/components/map/stationLayers";
import { useCountryStore } from "@/stores/countryStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useFilterStore } from "@/stores/filterStore";
import { useGeolocationStore } from "@/stores/geolocationStore";
import { useRouteStore } from "@/stores/routeStore";
import { useUiStore } from "@/stores/uiStore";

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
  );

  const osmBrands = useOsmBrands(
    countryCode,
    view && view.zoom >= PRICE_LABEL_MIN_ZOOM ? view.bounds : null,
  );

  const enrichedStations = useMemo(
    () =>
      countryCode === "FR"
        ? enrichStationsWithBrands(stations, osmBrands.data ?? [])
        : stations,
    [countryCode, stations, osmBrands.data],
  );

  const userPosition = useGeolocationStore((state) => state.position);
  const maxDistanceMeters = useFilterStore((state) => state.maxDistanceMeters);
  const filteredStations = useFilteredStations(enrichedStations, {
    center: userPosition ?? undefined,
    maxDistanceMeters: maxDistanceMeters ?? undefined,
  });

  const activeFuelId = useActiveFuelId();
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
  const [map, setMap] = useState<MapLibreMap | null>(null);

  const mapStyle = theme === "dark" ? DARK_MAP_STYLE : DEFAULT_MAP_STYLE;

  useEffect(() => {
    void loadFavorites();
  }, [loadFavorites]);

  // Switching country changes the fuel catalog: clear the fuel selection so it
  // does not reference fuels that do not exist in the new country.
  useEffect(() => {
    useFilterStore.getState().clearFuels();
  }, [countryCode]);

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
    () => collectServices(enrichedStations),
    [enrichedStations],
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
      enrichedStations.find((station) => station.id === selectedStationId) ?? null,
    [enrichedStations, selectedStationId],
  );

  // Recenter the camera on the selected station.
  useEffect(() => {
    if (!map || !selectedStation) return;
    map.easeTo({
      center: [selectedStation.lon, selectedStation.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: 500,
    });
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
          onSelect={(id) => selectStation(id)}
        />

        <UserLocationLayer />
        <RouteLayer />

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
        </div>

        <div className="pointer-events-none absolute right-3 bottom-24 z-20 flex flex-col items-center gap-2">
          <LocateButton />
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
          stations={enrichedStations}
          onSelect={(id) => selectStation(id)}
        />

        <SettingsSheet
          open={openSheet === "settings"}
          onClose={() => setOpenSheet(null)}
        />

        <StationSheet
          station={selectedStation}
          country={country}
          onClose={() => selectStation(null)}
        />
      </div>
    </MapContext.Provider>
  );
}
