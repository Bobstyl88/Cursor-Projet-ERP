import apiClient from './client';
import type { Product, Warehouse, StockLevel, PaginatedResponse } from '@/types';

export const inventoryApi = {
  async getProducts(params?: Record<string, unknown>): Promise<PaginatedResponse<Product>> {
    const response = await apiClient.get('/inventory/products', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getProduct(id: string): Promise<Product> {
    const response = await apiClient.get(`/inventory/products/${id}`);
    return response.data;
  },

  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post('/inventory/products', data);
    return response.data;
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.put(`/inventory/products/${id}`, data);
    return response.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`/inventory/products/${id}`);
  },

  async getWarehouses(params?: Record<string, unknown>): Promise<PaginatedResponse<Warehouse>> {
    const response = await apiClient.get('/inventory/warehouses', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async getWarehouse(id: string): Promise<Warehouse> {
    const response = await apiClient.get(`/inventory/warehouses/${id}`);
    return response.data;
  },

  async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await apiClient.post('/inventory/warehouses', data);
    return response.data;
  },

  async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    const response = await apiClient.put(`/inventory/warehouses/${id}`, data);
    return response.data;
  },

  async getStockLevels(params?: Record<string, unknown>): Promise<PaginatedResponse<StockLevel>> {
    const response = await apiClient.get('/inventory/stock', { params });
    return { data: response.data, meta: (response as any).meta };
  },

  async adjustStock(productId: string, warehouseId: string, quantity: number, reason: string): Promise<StockLevel> {
    const response = await apiClient.post('/inventory/stock/adjust', {
      productId,
      warehouseId,
      quantity,
      reason,
    });
    return response.data;
  },
};
