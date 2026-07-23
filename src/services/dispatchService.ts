import { apiClient, unwrap, unwrapEnvelope } from './apiClient';
export const dispatchService={
  async list(params:Record<string,unknown>={}){return unwrapEnvelope<any[]>(await apiClient.get('/dispatches',{params}));},
  async get(id:string){return unwrap<any>(await apiClient.get(`/dispatches/${id}`));},
  async create(payload:any){return unwrap<any>(await apiClient.post('/dispatches',payload));},
  async update(id:string,payload:any){return unwrap<any>(await apiClient.put(`/dispatches/${id}`,payload));},
  async uploadInvoice(id:string,file:File){const payload=new FormData();payload.append('invoice',file);return unwrap<any>(await apiClient.post(`/dispatches/${id}/invoice`,payload));},
  async reopen(id:string){return unwrap<any>(await apiClient.patch(`/dispatches/${id}/reopen`));},
};
