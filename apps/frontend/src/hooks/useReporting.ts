'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, DashboardKpis, RevenueByMonth } from '@/types/api';

export function useDashboardKpis(year?: number) {
  return useQuery({
    queryKey: ['dashboard', 'kpis', year],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<DashboardKpis>>(
        '/v1/reporting/dashboard',
        { params: { year } },
      );
      return data.data;
    },
  });
}

export function useRevenueByMonth(year?: number) {
  return useQuery({
    queryKey: ['reporting', 'revenue-by-month', year],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RevenueByMonth[]>>(
        '/v1/reporting/revenue-by-month',
        { params: { year } },
      );
      return data.data;
    },
  });
}
