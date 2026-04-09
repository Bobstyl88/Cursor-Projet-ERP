import apiClient from './client';
import type { Invoice, Payment, PaginatedResponse } from '@/types';

export const invoicingApi = {
  async getInvoices(params?: Record<string, unknown>): Promise<PaginatedResponse<Invoice>> {
    const response = await apiClient.get('/invoicing/invoices', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/invoicing/invoices/${id}`);
    return response.data;
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const response = await apiClient.post('/invoicing/invoices', data);
    return response.data;
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const response = await apiClient.put(`/invoicing/invoices/${id}`, data);
    return response.data;
  },

  async sendInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.post(`/invoicing/invoices/${id}/send`);
    return response.data;
  },

  async voidInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.post(`/invoicing/invoices/${id}/void`);
    return response.data;
  },

  async getPayments(params?: Record<string, unknown>): Promise<PaginatedResponse<Payment>> {
    const response = await apiClient.get('/invoicing/payments', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getPayment(id: string): Promise<Payment> {
    const response = await apiClient.get(`/invoicing/payments/${id}`);
    return response.data;
  },

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const response = await apiClient.post('/invoicing/payments', data);
    return response.data;
  },

  async deletePayment(id: string): Promise<void> {
    await apiClient.delete(`/invoicing/payments/${id}`);
  },
};
