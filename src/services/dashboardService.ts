import { apiClient, unwrap } from './apiClient';

export const dashboardService = {
  async quotationSummary(params: Record<string, unknown> = {}) {
    return unwrap<any>(await apiClient.get('/dashboard/quotation-summary', { params }));
  },
  async leaderboard(period: 'today' | 'week' | 'month') {
    return unwrap<any>(await apiClient.get('/dashboard/leaderboard', { params: { period } }));
  },
};
