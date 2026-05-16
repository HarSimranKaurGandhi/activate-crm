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

export const defaultBaseUrl = 'http://localhost:8000/api';
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;
export const apiOrigin = new URL(apiBaseUrl).origin;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
});

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
