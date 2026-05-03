import { apiClient, unwrap } from './apiClient';

export const dashboardService = {
  async quotationSummary(params: Record<string, unknown> = {}) {
    return unwrap<any>(await apiClient.get('/dashboard/quotation-summary', { params }));
  },
};

