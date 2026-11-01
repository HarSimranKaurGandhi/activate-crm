import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const customerService = {
  async deleteInvoice(id: string, invoiceId: number) { return unwrap(await apiClient.delete(`/customers/${id}/invoices/${invoiceId}`)); },
  async generateRequirement(id: string, requirement: string, assignedTo: string) {
    return unwrap<any>(await apiClient.post(`/customers/${id}/generate-requirement`, { requirement, assigned_to: Number(assignedTo) }));
  },
  async invoices(id: string) {
    return unwrap<{ invoices: any[]; products: any[] }>(await apiClient.get(`/customers/${id}/invoices`));
  },
  async uploadInvoice(id: string, payload: FormData) {
    return unwrap<any>(await apiClient.post(`/customers/${id}/invoices`, payload));
  },
  async downloadInvoice(id: string, invoiceId: number) {
    const response = await apiClient.get(`/customers/${id}/invoices/${invoiceId}/download`, { responseType: 'blob' });
    return response.data as Blob;
  },
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
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/customers/${id}`));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/customers/${id}/status`, { is_active: isActive }));
  },
  async quotations(id: string, params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get(`/customers/${id}/quotations`, { params }));
  },
  async overview(id: string) {
    return unwrap<any>(await apiClient.get(`/customers/${id}/overview`));
  },
  async addOwnedProduct(id: string, productId: string, description: string, quantity: number, purchaseDate: string, serialNumber = '', referenceImage: File | null = null) {
    const payload = new FormData();
    payload.append('product_id', productId);
    payload.append('product_description', description.trim());
    payload.append('quantity', String(quantity));
    payload.append('purchase_date', purchaseDate);
    payload.append('serial_number', serialNumber.trim());
    if (referenceImage) payload.append('reference_image', referenceImage);
    return unwrap<any>(await apiClient.post(`/customers/${id}/owned-products`, payload));
  },
  async removeOwnedProduct(id: string, ownedProductId: string) {
    return unwrap<any>(await apiClient.delete(`/customers/${id}/owned-products/${ownedProductId}`));
  },
};
