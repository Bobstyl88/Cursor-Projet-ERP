import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject tokens from localStorage (client-only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('erp_access_token');
      const tenantId = localStorage.getItem('erp_tenant_id');

      if (token) config.headers['Authorization'] = `Bearer ${token}`;
      if (tenantId) config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor (auto-refresh on 401) ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('erp_refresh_token');
        const tenantSlug = localStorage.getItem('erp_tenant_slug');

        if (!refreshToken || !tenantSlug) throw new Error('No refresh token');

        const { data } = await axios.post<{
          data: { accessToken: string; refreshToken: string };
        }>(`${BASE_URL}/auth/${tenantSlug}/refresh`, { refreshToken });

        localStorage.setItem('erp_access_token', data.data.accessToken);
        localStorage.setItem('erp_refresh_token', data.data.refreshToken);

        originalRequest.headers['Authorization'] = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
