import axios from 'axios';
import { API_BASE_URL } from '@/config';

/**
 * Shared axios instance for the VEPS backend.
 * The auth token is injected per-request via setAuthToken() so we don't have to
 * read secure storage on every call.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
});

/** Human-friendly message for an API error (distinguishes connectivity issues). */
export function apiErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err) && !err.response) {
    return `Can't reach the server (${API_BASE_URL}). Make sure your phone and computer are on the same Wi-Fi and the backend is running.`;
  }
  return err?.response?.data?.message || fallback;
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default api;
