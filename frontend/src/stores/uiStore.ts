import { create } from 'zustand';

interface UiState {
  distractionFree: boolean;
  toggleDistractionFree: () => void;
  setDistractionFree: (v: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  distractionFree: false,
  toggleDistractionFree: () =>
    set((state) => ({ distractionFree: !state.distractionFree })),
  setDistractionFree: (v) => set({ distractionFree: v }),
}));
