import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, tenantSlug: string) => Promise<void>;
  register: (data: {
    companyName: string;
    companySlug: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password, tenantSlug) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        tenantSlug,
      });

      localStorage.setItem('accessToken', data.data?.accessToken || data.accessToken);
      localStorage.setItem('refreshToken', data.data?.refreshToken || data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));
      localStorage.setItem('tenant', JSON.stringify(data.data?.tenant || data.tenant));

      set({
        user: data.data?.user || data.user,
        tenant: data.data?.tenant || data.tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', registerData);

      localStorage.setItem('accessToken', data.data?.accessToken || data.accessToken);
      localStorage.setItem('refreshToken', data.data?.refreshToken || data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data?.user || data.user));
      localStorage.setItem('tenant', JSON.stringify(data.data?.tenant || data.tenant));

      set({
        user: data.data?.user || data.user,
        tenant: data.data?.tenant || data.tenant,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    set({ user: null, tenant: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('accessToken');
    const user = localStorage.getItem('user');
    const tenant = localStorage.getItem('tenant');

    if (token && user && tenant) {
      set({
        user: JSON.parse(user),
        tenant: JSON.parse(tenant),
        isAuthenticated: true,
      });
    }
  },
}));
