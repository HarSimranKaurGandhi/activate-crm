import { apiClient, unwrap } from './apiClient';

export const settingsService = {
  async company() {
    return unwrap<any>(await apiClient.get('/settings/company'));
  },
  async updateCompany(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put('/settings/company', payload));
  },
  async bankDetails() {
    return unwrap<any[]>(await apiClient.get('/settings/bank-details'));
  },
  async storeBankDetail(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/settings/bank-details', payload));
  },
  async updateBankDetail(id: string, payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put(`/settings/bank-details/${id}`, payload));
  },
  async makeDefaultBankDetail(id: string) {
    return unwrap<any>(await apiClient.patch(`/settings/bank-details/${id}/default`));
  },
  async quotationNumbering() {
    return unwrap<any>(await apiClient.get('/settings/quotation-numbering'));
  },
  async updateQuotationNumbering(payload: Record<string, unknown>) {
    return unwrap<any>(await apiClient.put('/settings/quotation-numbering', payload));
  },
};

