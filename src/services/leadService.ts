import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const leadService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/leads', { params: { per_page: 10, ...params } }));
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
  async activity(id: string) {
    return unwrap<any[]>(await apiClient.get(`/leads/${id}/activity`));
  },
  async addComment(id: string, comment: string) {
    return unwrap<any>(await apiClient.post(`/leads/${id}/comments`, { comment }));
  },
  async startCall(id: string) {
    return unwrap<any>(await apiClient.post(`/leads/${id}/calls`));
  },
  async resolveCall(id: string, activityId: string, connected: boolean, notes?: string, followUpDate?: string) {
    return unwrap<any>(await apiClient.patch(`/leads/${id}/calls/${activityId}`, {
      connected,
      notes,
      follow_up_date: followUpDate || null,
    }));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/leads/${id}`));
  },
  async bulkUpload(file: File) {
    const payload = new FormData();
    payload.append('file', file);
    return unwrap<any>(await apiClient.post('/leads/bulk-upload', payload));
  },
  async downloadBulkTemplate() {
    const response = await apiClient.get('/leads/bulk-sample', { responseType: 'blob' });
    return response.data as Blob;
  },
  async favourite(id: string, favourite: boolean) {
    return unwrap<{ is_favourite: boolean }>(await apiClient.patch(`/leads/${id}/favourite`, { favourite }));
  },
};
