import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const userService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/users', { params: { per_page: 100, ...params } }));
  },
  async dropdown() {
    return unwrap<any[]>(await apiClient.get('/users/dropdown'));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/users/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/users', payload));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/users/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/users/${id}`));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/users/${id}/status`, { is_active: isActive }));
  },
  async roles() {
    return unwrap<any[]>(await apiClient.get('/roles'));
  },
};
