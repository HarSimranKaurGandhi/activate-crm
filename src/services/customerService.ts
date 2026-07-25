import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const customerService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/customers', { params: { per_page: 100, ...params } }));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/customers/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/customers', payload));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/customers/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/customers/${id}`));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/customers/${id}/status`, { is_active: isActive }));
  },
  async quotations(id: string, params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get(`/customers/${id}/quotations`, { params }));
  },
  async overview(id: string) {
    return unwrap<any>(await apiClient.get(`/customers/${id}/overview`));
  },
  async addOwnedProduct(id: string, productId: string, description: string, quantity: number) {
    return unwrap<any>(await apiClient.post(`/customers/${id}/owned-products`, {
      product_id: productId ? Number(productId) : null,
      product_description: description.trim() || null,
      quantity,
    }));
  },
  async removeOwnedProduct(id: string, ownedProductId: string) {
    return unwrap<any>(await apiClient.delete(`/customers/${id}/owned-products/${ownedProductId}`));
  },
};
