import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const taskService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/tasks', { params: { per_page: 100, ...params } }));
  },
  async show(id: string) {
    return unwrap<any>(await apiClient.get(`/tasks/${id}`));
  },
  async create(payload: any) {
    return unwrap<any>(await apiClient.post('/tasks', payload));
  },
  async update(id: string, payload: any) {
    return unwrap<any>(await apiClient.put(`/tasks/${id}`, payload));
  },
};
