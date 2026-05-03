import { apiClient, AUTH_TOKEN_KEY, unwrap } from './apiClient';

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async login(payload: LoginPayload) {
    const data = await unwrap<any>(await apiClient.post('/auth/login', payload));
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    return data;
  },

  async me() {
    return unwrap<any>(await apiClient.get('/auth/me'));
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },
};

