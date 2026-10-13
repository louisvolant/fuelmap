import { useEffect, useMemo, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { FilterSheet } from "@/components/filters/FilterSheet";
import { FiltersButton } from "@/components/filters/FiltersButton";
import { FuelFilterBar } from "@/components/filters/FuelFilterBar";
import { MapCanvas } from "@/components/map/MapCanvas";
import { MapContext } from "@/components/map/MapContext";
import { StationMarkers } from "@/components/map/StationMarkers";
import { StationsStatus } from "@/components/map/StationsStatus";
import { StationSheet } from "@/components/station/StationSheet";
import { getCountry } from "@/countries";
import {
  useActiveFuelId,
  useFilteredStations,
} from "@/hooks/useFilteredStations";
import { useStations } from "@/hooks/useStations";
import { collectServices } from "@/lib/filters";
import { DEFAULT_MAP_STYLE } from "@/lib/mapStyles";
import { useCountryStore } from "@/stores/countryStore";
import { useUiStore } from "@/stores/uiStore";

export default function App() {
  const countryCode = useCountryStore((state) => state.country);
  const country = getCountry(countryCode);
  const { data: stations } = useStations(countryCode);
  const filteredStations = useFilteredStations(stations ?? []);
  const activeFuelId = useActiveFuelId();
  const selectStation = useUiStore((state) => state.selectStation);
  const selectedStationId = useUiStore((state) => state.selectedStationId);
  const openSheet = useUiStore((state) => state.openSheet);
  const setOpenSheet = useUiStore((state) => state.setOpenSheet);
  const [map, setMap] = useState<MapLibreMap | null>(null);

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
          styleUrl={DEFAULT_MAP_STYLE.url}
          onMapReady={setMap}
          className="h-full w-full"
        />

        <StationMarkers
          stations={filteredStations}
          activeFuelId={activeFuelId}
          onSelect={(id) => selectStation(id)}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 p-3">
          <FuelFilterBar />
          <div className="flex items-center gap-2">
            <FiltersButton />
            <StationsStatus count={filteredStations.length} />
          </div>
        </div>

        <FilterSheet
          open={openSheet === "filters"}
          onClose={() => setOpenSheet(null)}
          services={allServices}
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
