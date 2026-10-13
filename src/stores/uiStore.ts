import { create } from "zustand";

/** Modal sheets that can be opened from the map. */
export type SheetId = "filters" | "favorites" | "settings";

interface UiState {
  /** Currently selected station id, or `null`. Drives the detail sheet. */
  selectedStationId: string | null;
  selectStation: (id: string | null) => void;
  /** Currently open sheet, or `null` when none is open. */
  openSheet: SheetId | null;
  setOpenSheet: (sheet: SheetId | null) => void;
  toggleSheet: (sheet: SheetId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedStationId: null,
  selectStation: (selectedStationId) => set({ selectedStationId }),
  openSheet: null,
  setOpenSheet: (openSheet) => set({ openSheet }),
  toggleSheet: (sheet) =>
    set((state) => ({ openSheet: state.openSheet === sheet ? null : sheet })),
}));
