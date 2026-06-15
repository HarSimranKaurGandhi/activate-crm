import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

const listParams = { per_page: 100 };

const crud = (resource: string) => ({
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get(`/${resource}`, { params: { ...listParams, ...params } }));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/${resource}/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post(`/${resource}`, payload));
  },
  async update(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/${resource}/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/${resource}/${id}`));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/${resource}/${id}/status`, { is_active: isActive }));
  },
});

export const categoryService = {
  ...crud('categories'),
  async dropdown(params: Record<string, unknown> = {}) {
    return unwrap<any[]>(await apiClient.get('/categories/dropdown', { params }));
  },
};

export const brandService = {
  ...crud('brands'),
  async create(payload: FormData | Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/brands', payload));
  },
  async update(id: string, payload: FormData | Record<string, unknown>) {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      return unwrap<any>(await apiClient.post(`/brands/${id}`, payload));
    }

    return unwrap<any>(await apiClient.put(`/brands/${id}`, payload));
  },
  async dropdown(params: Record<string, unknown> = {}) {
    return unwrap<any[]>(await apiClient.get('/brands/dropdown', { params }));
  },
};

export const measurementUnitService = {
  ...crud('measurement-units'),
};

export const adjustmentService = {
  ...crud('adjustments'),
  async active() {
    return unwrap<any[]>(await apiClient.get('/adjustments/active'));
  },
  async reorder(items: Array<{ id: string; display_order: number }>) {
    return unwrap<any>(await apiClient.post('/adjustments/reorder', { items }));
  },
};

export const termService = {
  ...crud('terms'),
  async active() {
    return unwrap<any[]>(await apiClient.get('/terms/active'));
  },
  async reorder(items: Array<{ id: string; display_order: number }>) {
    return unwrap<any>(await apiClient.post('/terms/reorder', { items }));
  },
};

export const customerFieldService = {
  ...crud('customer-fields'),
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/customer-fields/${id}`));
  },
  async reorder(items: Array<{ id: string; display_order: number }>) {
    return unwrap<any>(await apiClient.post('/customer-fields/reorder', { items }));
  },
};
