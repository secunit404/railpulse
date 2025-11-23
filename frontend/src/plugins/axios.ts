import axios from 'axios';

type AuthErrorHandler = () => void;
let onUnauthorized: AuthErrorHandler | null = null;

export function setUnauthorizedHandler(handler: AuthErrorHandler) {
  onUnauthorized = handler;
}

// API base URL
// In development (Vite dev server on :5173), use the backend on :9876
// In production (served from backend), use same origin
const getBaseURL = () => {
  if (typeof window === 'undefined') return 'http://localhost:9876';

  // If running on Vite dev server (port 5173), point to backend
  if (window.location.port === '5173') {
    return 'http://localhost:9876';
  }

  // Otherwise use same origin (production)
  return window.location.origin;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - allow app to clear auth state and redirect
      onUnauthorized?.();
      console.warn('Authentication Required: Please log in to continue');
    } else if (error.response?.status === 429) {
      // Rate limit exceeded
      console.error('Rate Limit Exceeded:', error.response.data.message || 'Too many requests. Please try again later.');
    } else if (error.response?.status >= 500) {
      // Server error
      console.error('Server Error: An unexpected error occurred. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default api;
