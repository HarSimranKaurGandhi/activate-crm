import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const productService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/products', { params: { per_page: 100, ...params } }));
  },
  async selectable(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/products/selectable', { params: { per_page: 100, ...params } }));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/products/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/products', payload));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/products/${id}`, payload));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/products/${id}/status`, { is_active: isActive }));
  },
};

