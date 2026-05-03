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
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/customers/${id}/status`, { is_active: isActive }));
  },
  async quotations(id: string, params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get(`/customers/${id}/quotations`, { params }));
  },
};

