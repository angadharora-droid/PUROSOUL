import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLogin) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      'Request failed'
    );
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

/** Resolves an uploaded file path (e.g. /uploads/x.png) to an absolute URL when the API is remote. */
export function fileUrl(path?: string): string | undefined {
  if (!path) return undefined;
  const base = API_URL.replace(/\/api\/?$/, '');
  return `${base}${path}`;
}
