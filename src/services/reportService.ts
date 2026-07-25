import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export const reportService = {
  async leaderboard(date: string, period: 'today' | 'week' | 'month') {
    return unwrap<any>(await apiClient.get('/reports/leaderboard', { params: { date, period } }));
  },
  async quotations(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/reports/quotations', { params: { per_page: 100, ...params } }));
  },
  async exportQuotations(params: Record<string, unknown> = {}) {
    return unwrap<any>(await apiClient.get('/reports/quotations/export', { params }));
  },
};
