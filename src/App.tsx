import { useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { FuelFilterBar } from "@/components/filters/FuelFilterBar";
import { MapCanvas } from "@/components/map/MapCanvas";
import { MapContext } from "@/components/map/MapContext";
import { StationMarkers } from "@/components/map/StationMarkers";
import { StationsStatus } from "@/components/map/StationsStatus";
import { getCountry } from "@/countries";
import {
  useActiveFuelId,
  useFilteredStations,
} from "@/hooks/useFilteredStations";
import { useStations } from "@/hooks/useStations";
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
  const [map, setMap] = useState<MapLibreMap | null>(null);

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
          <StationsStatus count={filteredStations.length} />
        </div>
      </div>
    </MapContext.Provider>
  );
}
