import { apiClient, unwrap, unwrapEnvelope, type ApiEnvelope } from './apiClient';

export type PaginationMeta = NonNullable<NonNullable<ApiEnvelope<unknown>['meta']>['pagination']>;

const defaultPagination: PaginationMeta = {
  current_page: 1,
  per_page: 15,
  total: 0,
  last_page: 1,
  from: null,
  to: null,
};

const paginationFrom = (result: ApiEnvelope<unknown>): PaginationMeta => ({
  ...defaultPagination,
  ...(result.meta?.pagination || {}),
});

export const productService = {
  async list(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/products', { params }));
  },
  async selectable(params: Record<string, unknown> = {}) {
    return unwrapEnvelope<any[]>(await apiClient.get('/products/selectable', { params }));
  },
  async listAll(params: Record<string, unknown> = {}) {
    const perPage = 100;
    let page = 1;
    let products: any[] = [];
    let pagination = defaultPagination;

    do {
      const result = await this.list({ ...params, page, per_page: perPage });
      pagination = paginationFrom(result);
      products = products.concat(Array.isArray(result.data) ? result.data : []);
      page += 1;
    } while (page <= pagination.last_page);

    return products;
  },
  async get(id: string) {
    return unwrap<any>(await apiClient.get(`/products/${id}`));
  },
  async create(payload: FormData | Record<string, unknown>) {
    return unwrap<any>(await apiClient.post('/products', payload));
  },
  async update(id: string, payload: FormData | Record<string, unknown>) {
    if (payload instanceof FormData) {
      payload.append('_method', 'PUT');
      return unwrap<any>(await apiClient.post(`/products/${id}`, payload));
    }

    return unwrap<any>(await apiClient.put(`/products/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<any>(await apiClient.delete(`/products/${id}`));
  },
  async status(id: string, isActive: boolean) {
    return unwrap<any>(await apiClient.patch(`/products/${id}/status`, { is_active: isActive }));
  },
  async bulkUpload(file: File) {
    const payload = new FormData();
    payload.append('file', file);
    return unwrap<any>(await apiClient.post('/products/bulk-upload', payload));
  },
  async downloadSample() {
    const response = await apiClient.get('/products/bulk-sample', { responseType: 'blob' });
    return response.data as Blob;
  },
};
