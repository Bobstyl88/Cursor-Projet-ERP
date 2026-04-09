import apiClient from './client';
import type { Account, JournalEntry, FiscalYear, PaginatedResponse } from '@/types';

export const accountingApi = {
  async getAccounts(params?: Record<string, unknown>): Promise<PaginatedResponse<Account>> {
    const response = await apiClient.get('/accounting/accounts', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getAccount(id: string): Promise<Account> {
    const response = await apiClient.get(`/accounting/accounts/${id}`);
    return response.data;
  },

  async createAccount(data: Partial<Account>): Promise<Account> {
    const response = await apiClient.post('/accounting/accounts', data);
    return response.data;
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    const response = await apiClient.put(`/accounting/accounts/${id}`, data);
    return response.data;
  },

  async getJournalEntries(params?: Record<string, unknown>): Promise<PaginatedResponse<JournalEntry>> {
    const response = await apiClient.get('/accounting/journal-entries', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiClient.get(`/accounting/journal-entries/${id}`);
    return response.data;
  },

  async createJournalEntry(data: Partial<JournalEntry>): Promise<JournalEntry> {
    const response = await apiClient.post('/accounting/journal-entries', data);
    return response.data;
  },

  async postJournalEntry(id: string): Promise<JournalEntry> {
    const response = await apiClient.post(`/accounting/journal-entries/${id}/post`);
    return response.data;
  },

  async getFiscalYears(): Promise<FiscalYear[]> {
    const response = await apiClient.get('/accounting/fiscal-years');
    return response.data;
  },

  async createFiscalYear(data: Partial<FiscalYear>): Promise<FiscalYear> {
    const response = await apiClient.post('/accounting/fiscal-years', data);
    return response.data;
  },

  async closeFiscalYear(id: string): Promise<FiscalYear> {
    const response = await apiClient.post(`/accounting/fiscal-years/${id}/close`);
    return response.data;
  },
};
