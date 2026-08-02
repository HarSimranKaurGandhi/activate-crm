import { apiClient, cachedDropdown, invalidateDropdownCache, unwrap, unwrapEnvelope } from './apiClient';

const listParams = { per_page: 100 };

const crud = (resource: string) => ({
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get(`/${resource}`, { params: { ...listParams, ...params } }));
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/${resource}/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    const result = unwrap<any>(await apiClient.post(`/${resource}`, payload));
    invalidateDropdownCache(`/${resource}/dropdown`);
    return result;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const result = unwrap<any>(await apiClient.put(`/${resource}/${id}`, payload));
    invalidateDropdownCache(`/${resource}/dropdown`);
    return result;
  },
  async remove(id: string) {
    const result = unwrap<any>(await apiClient.delete(`/${resource}/${id}`));
    invalidateDropdownCache(`/${resource}/dropdown`);
    return result;
  },
  async status(id: string, isActive: boolean) {
    const result = unwrap<any>(await apiClient.patch(`/${resource}/${id}/status`, { is_active: isActive }));
    invalidateDropdownCache(`/${resource}/dropdown`);
    return result;
  },
});

export const categoryService = {
  ...crud('categories'),
  async dropdown(params: Record<string, unknown> = {}) {
    return cachedDropdown<any[]>('/categories/dropdown', params);
  },
};

export const brandService = {
  ...crud('brands'),
  async create(payload: FormData | Record<string, unknown>) {
    const brand = unwrap<any>(await apiClient.post('/brands', payload));
    invalidateDropdownCache('/brands/dropdown');
    return brand;
  },
  async update(id: string, payload: FormData | Record<string, unknown>) {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      const brand = unwrap<any>(await apiClient.post(`/brands/${id}`, payload));
      invalidateDropdownCache('/brands/dropdown');
      return brand;
    }

    const brand = unwrap<any>(await apiClient.put(`/brands/${id}`, payload));
    invalidateDropdownCache('/brands/dropdown');
    return brand;
  },
  async dropdown(params: Record<string, unknown> = {}) {
    return cachedDropdown<any[]>('/brands/dropdown', params);
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
