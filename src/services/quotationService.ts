import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const quotationService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/quotations', { params: { per_page: 100, ...params } }));
  },
  async defaults() {
    return unwrap<any>(await apiClient.get('/quotations/defaults'));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/quotations/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/quotations', payload));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/quotations/${id}`, payload));
  },
  async preview(id: string) {
    return unwrap<any>(await apiClient.get(`/quotations/${id}/preview`));
  },
  async duplicate(id: string) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/duplicate`));
  },
  async updateStatus(id: string, status: string) {
    return unwrap<any>(await apiClient.patch(`/quotations/${id}/status`, { status }));
  },
  async submitForApproval(id: string, remarks?: string) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/submit-for-approval`, { remarks }));
  },
  async approve(id: string, remarks?: string) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/approve`, { remarks }));
  },
  async reject(id: string, remarks: string) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/reject`, { remarks }));
  },
  async revise(id: string, remarks: string) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/revise`, { remarks }));
  },
  async activity(id: string) {
    return unwrap<any[]>(await apiClient.get(`/quotations/${id}/activity`));
  },
};

