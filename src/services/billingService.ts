import { apiClient, unwrap, unwrapEnvelope } from './apiClient';

export type TaxMode = 'igst' | 'cgst_sgst' | 'cgst_utgst';
export type InvoicePayload = {
  dispatch_id: number; source_token: string; invoice_date: string; due_date: string | null;
  place_of_supply: string; tax_mode: TaxMode; notes: string;
  hsn_codes: { dispatch_item_id: number; hsn_code: string }[];
};

export const billingService = {
  async payments(params: Record<string, unknown>) { return unwrapEnvelope<any[]>(await apiClient.get('/billing/payments', { params })); },
  async uploadQuote(payload: FormData) { return unwrap(await apiClient.post('/billing/payments', payload)); },
  async paymentStatus(source: string, id: string, paymentStatus: string) { return unwrap(await apiClient.patch(`/billing/payments/${source}/${id}/status`, { payment_status: paymentStatus })); },
  async customQuotePdf(id: string) { return (await apiClient.get(`/billing/payments/custom/${id}/pdf`, { responseType: 'blob' })).data as Blob; },
  async dispatches(params: Record<string, unknown>) { return unwrapEnvelope<any[]>(await apiClient.get('/billing/dispatches', { params })); },
  async source(id: string) { return unwrap<any>(await apiClient.get(`/billing/dispatches/${id}`)); },
  async list(params: Record<string, unknown>) { return unwrapEnvelope<any[]>(await apiClient.get('/billing/invoices', { params })); },
  async preview(payload: InvoicePayload) { return unwrap<any>(await apiClient.post('/billing/invoices/preview', payload)); },
  async create(payload: InvoicePayload) { return unwrap<any>(await apiClient.post('/billing/invoices', payload)); },
  async get(id: string) { return unwrap<any>(await apiClient.get(`/billing/invoices/${id}`)); },
  async download(id: string, number: string) {
    const response = await apiClient.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${number.split('/').join('-')}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
