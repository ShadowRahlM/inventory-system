import { create } from 'zustand';

export type ActivePanel = 'dashboard' | 'tiles' | 'batches' | 'stock' | 'movements' | 'audit';

export interface ErrorBanner {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: number;
}

interface InventoryStoreState {
  layout: {
    sidebarOpen: boolean;
    activePanel: ActivePanel;
  };
  filters: {
    selectedTileId: string | null;
    selectedBatchId: string | null;
    selectedLocation: string | null;
    searchQuery: string;
  };
  errors: ErrorBanner[];

  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setSelectedTileId: (tileId: string | null) => void;
  setSelectedBatchId: (batchId: string | null) => void;
  setSelectedLocation: (location: string | null) => void;
  setSearchQuery: (query: string) => void;
  pushError: (banner: Omit<ErrorBanner, 'id' | 'timestamp'>) => void;
  dismissError: (id: string) => void;
  clearErrors: () => void;
}

export const useInventoryStore = create<InventoryStoreState>((set) => ({
  layout: {
    sidebarOpen: true,
    activePanel: 'dashboard',
  },
  filters: {
    selectedTileId: null,
    selectedBatchId: null,
    selectedLocation: null,
    searchQuery: '',
  },
  errors: [],

  setSidebarOpen: (open) =>
    set((state) => ({ layout: { ...state.layout, sidebarOpen: open } })),

  setActivePanel: (panel) =>
    set((state) => ({ layout: { ...state.layout, activePanel: panel } })),

  setSelectedTileId: (tileId) =>
    set((state) => ({ filters: { ...state.filters, selectedTileId: tileId } })),

  setSelectedBatchId: (batchId) =>
    set((state) => ({ filters: { ...state.filters, selectedBatchId: batchId } })),

  setSelectedLocation: (location) =>
    set((state) => ({ filters: { ...state.filters, selectedLocation: location } })),

  setSearchQuery: (query) =>
    set((state) => ({ filters: { ...state.filters, searchQuery: query } })),

  pushError: (banner) =>
    set((state) => ({
      errors: [
        ...state.errors,
        { ...banner, id: crypto.randomUUID(), timestamp: Date.now() },
      ],
    })),

  dismissError: (id) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    })),

  clearErrors: () => set({ errors: [] }),
}));
