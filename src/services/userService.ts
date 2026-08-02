import { apiClient, cachedDropdown, invalidateDropdownCache, unwrap, unwrapEnvelope } from './apiClient';

export const userService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/users', { params: { per_page: 100, ...params } }));
  },
  async dropdown() {
    return cachedDropdown<any[]>('/users/dropdown');
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/users/${id}`));
  },
  async create(payload: Record<string, unknown>) {
    const user = unwrap<any>(await apiClient.post('/users', payload));
    invalidateDropdownCache('/users/dropdown');
    return user;
  },
  async update(id: string, payload: Record<string, unknown>) {
    const user = unwrap<any>(await apiClient.put(`/users/${id}`, payload));
    invalidateDropdownCache('/users/dropdown');
    return user;
  },
  async remove(id: string, replacementUserId: string) {
    const result = unwrap<any>(await apiClient.delete(`/users/${id}`, {
      data: { replacement_user_id: Number(replacementUserId) },
    }));
    invalidateDropdownCache('/users/dropdown');
    return result;
  },
  async status(id: string, isActive: boolean) {
    const user = unwrap<any>(await apiClient.patch(`/users/${id}/status`, { is_active: isActive }));
    invalidateDropdownCache('/users/dropdown');
    return user;
  },
  async roles() {
    return cachedDropdown<any[]>('/roles');
  },
};
