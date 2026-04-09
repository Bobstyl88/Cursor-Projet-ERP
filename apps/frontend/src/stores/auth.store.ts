import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  tenantSlug: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string, refreshToken: string, tenantSlug: string) => void;
  setTenantId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      tenantSlug: null,
      tenantId: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken, tenantSlug) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('erp_access_token', accessToken);
          localStorage.setItem('erp_refresh_token', refreshToken);
          localStorage.setItem('erp_tenant_slug', tenantSlug);
        }
        set({ accessToken, refreshToken, tenantSlug, isAuthenticated: true });
      },

      setTenantId: (tenantId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('erp_tenant_id', tenantId);
        }
        set({ tenantId });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('erp_access_token');
          localStorage.removeItem('erp_refresh_token');
          localStorage.removeItem('erp_tenant_slug');
          localStorage.removeItem('erp_tenant_id');
        }
        set({ accessToken: null, refreshToken: null, tenantSlug: null, tenantId: null, isAuthenticated: false });
      },
    }),
    { name: 'erp-auth' },
  ),
);
