import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const leadService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/leads', { params: { per_page: 100, ...params } }));
  },
  async show(id: string) {
    return unwrap<any>(await apiClient.get(`/leads/${id}`));
  },
  async create(payload: any) {
    return unwrap<any>(await apiClient.post('/leads', payload));
  },
  async update(id: string, payload: any) {
    return unwrap<any>(await apiClient.put(`/leads/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/leads/${id}`));
  },
};
