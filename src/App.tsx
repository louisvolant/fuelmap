import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { FavoritesButton } from "@/components/favorites/FavoritesButton";
import { FavoritesSheet } from "@/components/favorites/FavoritesSheet";
import { FilterSheet } from "@/components/filters/FilterSheet";
import { FiltersButton } from "@/components/filters/FiltersButton";
import { FuelFilterBar } from "@/components/filters/FuelFilterBar";
import { MapCanvas } from "@/components/map/MapCanvas";
import { MapContext } from "@/components/map/MapContext";
import { StationMarkers } from "@/components/map/StationMarkers";
import { StationsStatus } from "@/components/map/StationsStatus";
import { StationSheet } from "@/components/station/StationSheet";
import { LocateButton } from "@/components/map/LocateButton";
import { UserLocationLayer } from "@/components/map/UserLocationLayer";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsSheet } from "@/components/settings/SettingsSheet";
import { getCountry } from "@/countries";
import {
  useActiveFuelId,
  useFilteredStations,
} from "@/hooks/useFilteredStations";
import { useStations } from "@/hooks/useStations";
import { useTheme } from "@/hooks/useTheme";
import { collectServices } from "@/lib/filters";
import { DARK_MAP_STYLE, DEFAULT_MAP_STYLE } from "@/lib/mapStyles";
import { useCountryStore } from "@/stores/countryStore";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { useFilterStore } from "@/stores/filterStore";
import { useGeolocationStore } from "@/stores/geolocationStore";
import { useUiStore } from "@/stores/uiStore";

export default function App() {
  const countryCode = useCountryStore((state) => state.country);
  const country = getCountry(countryCode);
  const { data: stations } = useStations(countryCode);
  const userPosition = useGeolocationStore((state) => state.position);
  const maxDistanceMeters = useFilterStore((state) => state.maxDistanceMeters);
  const filteredStations = useFilteredStations(stations ?? [], {
    center: userPosition ?? undefined,
    maxDistanceMeters: maxDistanceMeters ?? undefined,
  });
  const activeFuelId = useActiveFuelId();
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

  // Move the camera to the newly selected country.
  useEffect(() => {
    if (!map) return;
    map.flyTo({ center: country.center, zoom: country.zoom, duration: 800 });
  }, [map, country, countryCode]);

  const allServices = useMemo(() => collectServices(stations ?? []), [stations]);

  const selectedStation = useMemo(
    () => (stations ?? []).find((station) => station.id === selectedStationId) ?? null,
    [stations, selectedStationId],
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
          stations={filteredStations}
          activeFuelId={activeFuelId}
          favoriteIds={favoriteIds}
          onSelect={(id) => selectStation(id)}
        />

        <UserLocationLayer />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-3">
          <FuelFilterBar />
          <div className="flex items-center gap-2">
            <FiltersButton />
            <FavoritesButton />
            <StationsStatus count={filteredStations.length} />
            <SettingsButton />
          </div>
        </div>

        <div className="pointer-events-none absolute right-3 bottom-24 z-20 flex flex-col items-center gap-2">
          <LocateButton />
        </div>

        <FilterSheet
          open={openSheet === "filters"}
          onClose={() => setOpenSheet(null)}
          services={allServices}
        />

        <FavoritesSheet
          open={openSheet === "favorites"}
          onClose={() => setOpenSheet(null)}
          stations={stations ?? []}
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
