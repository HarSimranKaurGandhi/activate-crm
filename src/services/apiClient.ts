import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';

export const AUTH_TOKEN_KEY = 'activate_crm_token';

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    pagination?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      from: number | null;
      to: number | null;
    };
    [key: string]: unknown;
  } | null;
}

export interface ApiErrorPayload {
  message: string;
  errors: Record<string, string[]>;
  status?: number;
}

export const defaultBaseUrl = 'http://localhost:8001/api';
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
export const apiOrigin = new URL(apiBaseUrl).origin;
export const DROPDOWN_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const dropdownCachePrefix = 'activate_crm_dropdown_cache:';
const dropdownRequests = new Map<string, Promise<unknown>>();

const stableParams = (params: Record<string, unknown>) => JSON.stringify(
  Object.keys(params).sort().reduce<Record<string, unknown>>((result, key) => {
    result[key] = params[key];
    return result;
  }, {}),
);

const dropdownCacheKey = (path: string, params: Record<string, unknown>) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || '';
  const tokenScope = token.slice(-16);
  return `${dropdownCachePrefix}${tokenScope}:${path}:${stableParams(params)}`;
};

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
});

export const cachedDropdown = async <T>(path: string, params: Record<string, unknown> = {}): Promise<T> => {
  const key = dropdownCacheKey(path, params);

  try {
    const cached = localStorage.getItem(key);
    if (cached) {
      const entry = JSON.parse(cached) as { expiresAt: number; data: T };
      if (entry.expiresAt > Date.now()) return entry.data;
      localStorage.removeItem(key);
    }
  } catch {
    localStorage.removeItem(key);
  }

  const existingRequest = dropdownRequests.get(key) as Promise<T> | undefined;
  if (existingRequest) return existingRequest;

  const request = apiClient.get<ApiEnvelope<T>>(path, { params })
    .then((response) => {
      const data = response.data.data;
      try {
        localStorage.setItem(key, JSON.stringify({
          expiresAt: Date.now() + DROPDOWN_CACHE_TTL_MS,
          data,
        }));
      } catch {
        // A full or unavailable browser cache should not block the dropdown.
      }
      return data;
    })
    .finally(() => dropdownRequests.delete(key));

  dropdownRequests.set(key, request);
  return request;
};

export const invalidateDropdownCache = (path: string) => {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(dropdownCachePrefix) && key.includes(`:${path}:`)) {
      localStorage.removeItem(key);
    }
  }
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (!config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status;
    const payload = error.response?.data;
    const message = payload?.message || error.message || 'Something went wrong';
    const errors = payload?.errors || {};

    if (status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      toast.error('You do not have permission to perform this action.');
    } else if (status && status >= 500) {
      toast.error('Server error. Please try again.');
    } else if (message) {
      toast.error(message);
    }

    return Promise.reject({ message, errors, status } satisfies ApiErrorPayload);
  }
);

export const unwrap = <T>(response: { data: ApiEnvelope<T> }) => response.data.data;

export const unwrapEnvelope = <T>(response: { data: ApiEnvelope<T> }) => response.data;
