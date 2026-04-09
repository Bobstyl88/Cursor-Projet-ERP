'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse, Quote, SaleOrder, Customer } from '@/types/api';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Customer[]>>('/v1/sales/customers');
      return data.data;
    },
  });
}

export function useQuotes(status?: string) {
  return useQuery({
    queryKey: ['quotes', status],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Quote[]>>('/v1/sales/quotes', {
        params: status ? { status } : {},
      });
      return data.data;
    },
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Quote>>(`/v1/sales/quotes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const { data } = await apiClient.post<ApiResponse<Quote>>('/v1/sales/quotes', payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useConvertQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data } = await apiClient.post<ApiResponse<SaleOrder>>(
        `/v1/sales/quotes/${quoteId}/convert`,
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSaleOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SaleOrder[]>>('/v1/sales/orders');
      return data.data;
    },
  });
}
