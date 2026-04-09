import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, AuthTokens } from '@/types';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;

  setAuth: (user: User, tokens: AuthTokens, tenant?: Tenant) => void;
  setUser: (user: User) => void;
  setTenant: (tenant: Tenant) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      tokens: null,
      isAuthenticated: false,

      setAuth: (user, tokens, tenant) =>
        set({
          user,
          tokens,
          tenant: tenant ?? null,
          isAuthenticated: true,
        }),

      setUser: (user) => set({ user }),

      setTenant: (tenant) => set({ tenant }),

      setTokens: (tokens) => set({ tokens }),

      logout: () =>
        set({
          user: null,
          tenant: null,
          tokens: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
