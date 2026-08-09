import { apiClient, unwrap, unwrapEnvelope } from './apiClient';
export const amcService={
  async list(view:string,includeCompleted=false){return unwrapEnvelope<any[]>(await apiClient.get('/amcs',{params:{view,per_page:100,include_completed:includeCompleted?1:0}}));},
  async create(payload:Record<string,unknown>){return unwrap<any>(await apiClient.post('/amcs',payload));},
  async get(id:string){return unwrap<any>(await apiClient.get(`/amcs/${id}`));},
  async update(id:string,payload:Record<string,unknown>){return unwrap<any>(await apiClient.put(`/amcs/${id}`,payload));},
  async completeVisit(id:string|number){return unwrap<any>(await apiClient.patch(`/amcs/${id}/complete-visit`));},
  async activity(id:string|number){return unwrap<any[]>(await apiClient.get(`/amcs/${id}/activity`));},
  async addComment(id:string|number,comment:string){return unwrap<any>(await apiClient.post(`/amcs/${id}/comments`,{comment}));},
};
