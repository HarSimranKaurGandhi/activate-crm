import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const productService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/products', { params: { per_page: 100, ...params } }));
  },
  async selectable(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/products/selectable', { params: { per_page: 100, ...params } }));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/products/${id}`));
  },
  async create(payload: FormData | Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/products', payload));
  },
  async update(id: string, payload: FormData | Record<string, unknown>) {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      return unwrap<any>(await apiClient.post(`/products/${id}`, payload));
    }

    return unwrap<any>(await apiClient.put(`/products/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/products/${id}`));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/products/${id}/status`, { is_active: isActive }));
  },
  async bulkUpload(file: File) {
    const payload = new FormData();
    payload.append('file', file);
    return unwrap<any>(await apiClient.post('/products/bulk-upload', payload));
  },
  async downloadSample() {
    const response = await apiClient.get('/products/bulk-sample', { responseType: 'blob' });
    return response.data as Blob;
  },
};
