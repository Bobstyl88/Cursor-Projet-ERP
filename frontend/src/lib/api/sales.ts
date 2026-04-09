import apiClient from './client';
import type { Quotation, SaleOrder, PaginatedResponse } from '@/types';

export const salesApi = {
  async getQuotations(params?: Record<string, unknown>): Promise<PaginatedResponse<Quotation>> {
    const response = await apiClient.get('/sales/quotations', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getQuotation(id: string): Promise<Quotation> {
    const response = await apiClient.get(`/sales/quotations/${id}`);
    return response.data;
  },

  async createQuotation(data: Partial<Quotation>): Promise<Quotation> {
    const response = await apiClient.post('/sales/quotations', data);
    return response.data;
  },

  async updateQuotation(id: string, data: Partial<Quotation>): Promise<Quotation> {
    const response = await apiClient.put(`/sales/quotations/${id}`, data);
    return response.data;
  },

  async deleteQuotation(id: string): Promise<void> {
    await apiClient.delete(`/sales/quotations/${id}`);
  },

  async sendQuotation(id: string): Promise<Quotation> {
    const response = await apiClient.post(`/sales/quotations/${id}/send`);
    return response.data;
  },

  async acceptQuotation(id: string): Promise<Quotation> {
    const response = await apiClient.post(`/sales/quotations/${id}/accept`);
    return response.data;
  },

  async convertQuotation(id: string): Promise<SaleOrder> {
    const response = await apiClient.post(`/sales/quotations/${id}/convert`);
    return response.data;
  },

  async getOrders(params?: Record<string, unknown>): Promise<PaginatedResponse<SaleOrder>> {
    const response = await apiClient.get('/sales/orders', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getOrder(id: string): Promise<SaleOrder> {
    const response = await apiClient.get(`/sales/orders/${id}`);
    return response.data;
  },

  async createOrder(data: Partial<SaleOrder>): Promise<SaleOrder> {
    const response = await apiClient.post('/sales/orders', data);
    return response.data;
  },

  async updateOrder(id: string, data: Partial<SaleOrder>): Promise<SaleOrder> {
    const response = await apiClient.put(`/sales/orders/${id}`, data);
    return response.data;
  },

  async confirmOrder(id: string): Promise<SaleOrder> {
    const response = await apiClient.post(`/sales/orders/${id}/confirm`);
    return response.data;
  },

  async cancelOrder(id: string): Promise<SaleOrder> {
    const response = await apiClient.post(`/sales/orders/${id}/cancel`);
    return response.data;
  },
};
