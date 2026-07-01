import { create } from 'zustand';
import { login as apiLogin, logout as apiLogout, type UserInfo } from '../api/auth';

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await apiLogin(username, password);
      set({ user, isLoading: false });
    } catch {
      set({ error: 'Invalid credentials', isLoading: false });
      throw new Error('Invalid credentials');
    }
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
