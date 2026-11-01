import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const godownService = {
  async list(activeOnly = false) { return unwrap<any[]>(await apiClient.get('/godowns', { params: { active_only: activeOnly ? 1 : 0 } })); },
  async create(payload: any) { return unwrap<any>(await apiClient.post('/godowns', payload)); },
  async update(id: string, payload: any) { return unwrap<any>(await apiClient.put(`/godowns/${id}`, payload)); },
  async remove(id: string) { return unwrap<any>(await apiClient.delete(`/godowns/${id}`)); },
};

export const inventoryService = {
  async thresholds(params: Record<string, unknown>) { return unwrapEnvelope<any[]>(await apiClient.get('/inventory/thresholds', { params })); },
  async saveThreshold(id: string, style: string, quantity: string | null) {
    return unwrap<any>(await apiClient.put(`/inventory/products/${id}/threshold`, { style, quantity }));
  },
  async updateStyle(id: string, currentStyle: string, style: string) {
    return unwrap<any>(await apiClient.patch(`/inventory/products/${id}/style`, { current_style: currentStyle, style }));
  },
  async overview(params: Record<string, unknown>) { return unwrapEnvelope<any>(await apiClient.get('/inventory', { params })); },
  async selectableProducts(params: Record<string, unknown>) { return unwrapEnvelope<any[]>(await apiClient.get('/inventory/selectable-products', { params })); },
  async productStock(id: string) { return unwrap<any>(await apiClient.get(`/inventory/products/${id}/stock`)); },
  async movements(params: Record<string, unknown>) { return unwrapEnvelope<any[]>(await apiClient.get('/inventory/movements', { params })); },
  async createMovement(payload: FormData) { return unwrap<any>(await apiClient.post('/inventory/movements', payload)); },
};
