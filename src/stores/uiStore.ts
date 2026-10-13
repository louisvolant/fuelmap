import { create } from "zustand";

interface UiState {
  /** Currently selected station id, or `null`. Drives the detail sheet. */
  selectedStationId: string | null;
  selectStation: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedStationId: null,
  selectStation: (selectedStationId) => set({ selectedStationId }),
}));
