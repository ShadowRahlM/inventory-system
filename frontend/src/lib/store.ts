import { create } from 'zustand';
import { clearSession } from './useSessionTimeout';

export interface UserInfo {
  username: string;
  role: 'admin' | 'manager' | 'viewer';
}

interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  setAuth: (isAuthenticated: boolean, user: UserInfo | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('access_token'),
  user: null,
  setAuth: (isAuthenticated, user) => set({ isAuthenticated, user }),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    clearSession();
    set({ isAuthenticated: false, user: null });
  },
}));

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedTile: string | null;
  setSelectedTile: (tileId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  selectedTile: null,
  setSelectedTile: (tileId) => set({ selectedTile: tileId }),
}));