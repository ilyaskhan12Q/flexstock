import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { extractError } from '../hooks/useApiError';
import { toastApiError, toastWarning } from '../store/toastStore';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// ── Request Interceptor: Attach JWT token ─────────────────────────────────────
API.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Auto Refresh + Global Error Handling ────────────────
API.interceptors.response.use(
  // Happy path — pass through untouched
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // ── 1. Token expired → try silent refresh ──────────────────────────────
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/refresh`,
            { refreshToken }
          );

          const { accessToken } = response.data;
          useAuthStore.getState().setAccessToken(accessToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return API(originalRequest);
        } catch {
          // Refresh failed → session is truly dead
          useAuthStore.getState().logout();
          toastWarning(
            'Session expired',
            'Your session has ended. Please log in again.',
            6000
          );
          // Small delay so the toast is visible before redirect
          setTimeout(() => { window.location.href = '/login'; }, 1500);
          return Promise.reject(error);
        }
      } else {
        // No refresh token → immediate logout
        useAuthStore.getState().logout();
        toastWarning('Not logged in', 'Please log in to continue.', 5000);
        setTimeout(() => { window.location.href = '/login'; }, 1000);
        return Promise.reject(error);
      }
    }

    // ── 2. Global error toast for all other failures ───────────────────────
    // Skip toasting on requests that opt-out via config flag:
    //   API.get('/something', { _silent: true })
    if (!originalRequest?._silent) {
      // Rate limited — special UX copy
      if (status === 429) {
        toastWarning(
          'Slow down',
          "You're making requests too quickly. Please wait a moment.",
          6000
        );
      } else {
        toastApiError(error, extractError);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
