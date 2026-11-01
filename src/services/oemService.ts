import { apiClient, unwrap } from './apiClient';
export type Oem = { id: number; name: string; email: string; dealer_code?: string | null; dealer_name?: string | null; dealer_city?: string | null; request_template?: string | null };
export const oemService = {
  async list() { return unwrap<Oem[]>(await apiClient.get('/settings/oems')); },
  async save(payload: Omit<Oem, 'id'>, id?: number) {
    return unwrap<Oem>(id ? await apiClient.put(`/settings/oems/${id}`, payload) : await apiClient.post('/settings/oems', payload));
  },
};
