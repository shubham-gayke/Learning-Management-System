import axios from 'axios';

/**
 * Returns the sanitized backend API base URL.
 * Strips any trailing slashes or '/api' so relative endpoints starting with '/api' work uniformly.
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || '';
  return raw.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}

/**
 * Constructs a full API URL for static assets, streams, or downloads.
 * Example: apiUrl('/api/stream/123/video') -> 'https://server.onrender.com/api/stream/123/video'
 */
export function apiUrl(path = '') {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
