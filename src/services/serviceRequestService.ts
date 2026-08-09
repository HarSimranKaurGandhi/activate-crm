import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const serviceRequestService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/service-requests', { params }));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/service-requests', payload));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/service-requests/${id}`));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/service-requests/${id}`, payload));
  },
  async activity(id: string) {
    return unwrap<any[]>(await apiClient.get(`/service-requests/${id}/activity`));
  },
  async addComment(id: string, comment: string) {
    return unwrap<any>(await apiClient.post(`/service-requests/${id}/comments`, { comment }));
  },
};
