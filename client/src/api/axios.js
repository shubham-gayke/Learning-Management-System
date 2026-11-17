import axios from 'axios';
import toast from 'react-hot-toast';

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
 * Example: apiUrl('/api/stream/123/video') -> 'https://server.onrender.com/api/stream/123/video?token=...'
 */
export function apiUrl(path = '') {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = base ? `${base}${cleanPath}` : cleanPath;
  if (typeof window !== 'undefined' && cleanPath.startsWith('/api/')) {
    const token = localStorage.getItem('auth_token');
    if (token && !url.includes('token=')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

/**
 * Non-blocking background ping to wake up Render server on page load.
 */
export function warmUpServer() {
  const base = getApiBaseUrl();
  if (!base) return;
  fetch(`${base}/health`, { method: 'GET', mode: 'cors' }).catch(() => {});
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 45000, // 45 seconds to accommodate free tier cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

let wakingUpToastId = null;

// Request interceptor — attach Bearer token for mobile browsers where cross-site cookies are blocked
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization && !config.headers.authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — automatic retry for Render cold starts & redirect on 401
api.interceptors.response.use(
  (response) => {
    if (wakingUpToastId) {
      toast.dismiss(wakingUpToastId);
      wakingUpToastId = null;
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    const isNetworkOrColdStart =
      !error.response ||
      [502, 503, 504].includes(error.response?.status) ||
      error.code === 'ECONNABORTED';

    // Auto-retry up to 2 times when server is booting from cold sleep
    if (isNetworkOrColdStart && config && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;

      if (!wakingUpToastId) {
        wakingUpToastId = toast.loading('⚡ Server is waking up, please wait a moment...', {
          duration: 25000,
        });
      }

      const delayMs = config._retryCount === 1 ? 3000 : 5000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(config);
    }

    if (wakingUpToastId) {
      toast.dismiss(wakingUpToastId);
      wakingUpToastId = null;
    }

    const requestUrl = config?.url || '';
    if (
      error.response?.status === 401 &&
      !requestUrl.includes('/api/auth/me') &&
      !requestUrl.includes('/api/auth/2fa/')
    ) {
      // Clear any stale state and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
