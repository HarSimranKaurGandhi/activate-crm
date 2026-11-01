import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const influencerService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/influencers', { params: { per_page: 15, ...params } }));
  },
  async dropdown(search = '') {
    return unwrap<any[]>(await apiClient.get('/influencers/dropdown', { params: { search } }));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/influencers', payload));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/influencers/${id}`, payload));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/influencers/${id}/status`, { is_active: isActive }));
  },
};
