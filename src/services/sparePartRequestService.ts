import { apiClient, unwrap, unwrapEnvelope } from './apiClient';
export const sparePartRequestService = {
  async activity(id: number) { return unwrap<any[]>(await apiClient.get(`/spare-part-requests/${id}/activity`)); },
  async comment(id: number, comment: string) { return unwrap(await apiClient.post(`/spare-part-requests/${id}/comments`, { comment })); },
  async remove(id: number) {
    return unwrap(await apiClient.delete(`/spare-part-requests/${id}`));
  },
  async get(id: number) {
    return unwrap<any>(await apiClient.get(`/spare-part-requests/${id}`));
  },
  async update(id: number, payload: FormData) {
    payload.set('_method', 'PUT');
    return unwrap<any>(await apiClient.post(`/spare-part-requests/${id}`, payload));
  },
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/spare-part-requests', { params }));
  },
  async assign(id: number, oemId: number | null) {
    return unwrap<any>(await apiClient.patch(`/spare-part-requests/${id}/oem`, { oem_id: oemId }));
  },
  async create(payload: FormData) {
    return unwrap<any>(await apiClient.post('/spare-part-requests', payload));
  },
};
