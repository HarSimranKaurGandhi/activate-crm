import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const quotationService = {
  async completeCrm(id: string, data: { close_lead: boolean; add_products: boolean; purchase_date?: string }) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/complete-crm`, data));
  },
  async bulkUpdateFulfillment(id: string, itemIds: string[], data: { stock_status?: string | null; stock_comment?: string }) {
    return unwrap<any>(await apiClient.patch(`/quotations/${id}/fulfillment`, { item_ids: itemIds.map(Number), ...data }));
  },
  async updateFulfillment(id: string, itemId: string, data: { stock_status: string | null; stock_comment: string }) {
    return unwrap<any>(await apiClient.put(`/quotations/${id}/items/${itemId}/fulfillment`, data));
  },
  async proforma(id: string, taxMode: string) {
    const response = await apiClient.get(`/quotations/${id}/proforma`, { params: { tax_mode: taxMode }, responseType: 'blob' });
    return response.data as Blob;
  },
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
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/quotations/${id}`));
  },
  async preview(id: string) {
    return unwrap<any>(await apiClient.get(`/quotations/${id}/preview`));
  },
  async itemImage(id: string, itemId: string) {
    const response = await apiClient.get(`/quotations/${id}/items/${itemId}/image`, { responseType: 'blob' });
    return response.data as Blob;
  },
  async downloadPdf(id: string) {
    const response = await apiClient.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
    return response.data as Blob;
  },
  async duplicate(id: string) {
    return unwrap<any>(await apiClient.post(`/quotations/${id}/duplicate`));
  },
  async shares(id: string) {
    return unwrap<{ user_ids: number[] }>(await apiClient.get(`/quotations/${id}/shares`));
  },
  async share(id: string, userIds: number[]) {
    return unwrap<{ user_ids: number[] }>(await apiClient.put(`/quotations/${id}/shares`, { user_ids: userIds }));
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
