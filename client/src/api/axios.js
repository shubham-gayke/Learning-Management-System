import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — redirect on 401 (skip for /me endpoint)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    if (
      error.response?.status === 401 &&
      !requestUrl.includes('/api/auth/me') &&
      !requestUrl.includes('/api/auth/2fa/')
    ) {
      // Clear any stale state and redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
