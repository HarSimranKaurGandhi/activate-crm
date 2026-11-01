import { apiClient, cachedDropdown, invalidateDropdownCache, unwrap, unwrapEnvelope } from './apiClient';

const HELP_BOOK_PATH = '/dispatches/help-book';
const HELP_BOOK_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const dispatchService={
  async helpBook(){return cachedDropdown<any[]>(HELP_BOOK_PATH,{},HELP_BOOK_CACHE_TTL_MS);},
  async createHelpBookEntry(payload:{name:string;value:string}){
    const entry=unwrap<any>(await apiClient.post(HELP_BOOK_PATH,payload));
    invalidateDropdownCache(HELP_BOOK_PATH);
    return entry;
  },
  async list(params:Record<string,unknown>={}){return unwrapEnvelope<any[]>(await apiClient.get('/dispatches',{params}));},
  async get(id:string){return unwrap<any>(await apiClient.get(`/dispatches/${id}`));},
  async create(payload:any){return unwrap<any>(await apiClient.post('/dispatches',payload));},
  async update(id:string,payload:any){return unwrap<any>(await apiClient.put(`/dispatches/${id}`,payload));},
  async uploadInvoice(id:string,file:File){const payload=new FormData();payload.append('invoice',file);return unwrap<any>(await apiClient.post(`/dispatches/${id}/invoice`,payload));},
  async reopen(id:string){return unwrap<any>(await apiClient.patch(`/dispatches/${id}/reopen`));},
  async cancel(id:string){return unwrap<any>(await apiClient.patch(`/dispatches/${id}/cancel`));},
  async remove(id:string){return unwrap<any>(await apiClient.delete(`/dispatches/${id}`));},
};
