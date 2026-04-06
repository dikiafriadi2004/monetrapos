import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('company_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if we're already refreshing to avoid loops
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh using stored token
        const currentToken = typeof window !== 'undefined' ? localStorage.getItem('company_token') : null;
        if (currentToken) {
          const refreshRes = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4404/api/v1'}/admin/auth/refresh`,
            { refreshToken: currentToken },
            { timeout: 10000 }
          );
          const newToken = refreshRes.data?.accessToken;
          if (newToken) {
            localStorage.setItem('company_token', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(null, newToken);
            isRefreshing = false;
            return api(originalRequest);
          }
        }
        throw new Error('No token to refresh');
      } catch {
        processQueue(error, null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('company_token');
          localStorage.removeItem('company_user');
          window.location.href = '/login';
        }
      } finally {
        isRefreshing = false;
      }
    }

    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

export default api;
