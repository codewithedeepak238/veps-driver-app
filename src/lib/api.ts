import axios from 'axios';
import { API_BASE_URL } from '@/config';

/**
 * Shared axios instance for the VEPS backend.
 * The auth token is injected per-request via setAuthToken() so we don't have to
 * read secure storage on every call.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  // Generous timeout so slow mobile-data connections don't look like an outage.
  timeout: 20000,
});

/**
 * Human-friendly message for a "no response" network error.
 * This covers several distinct failures (timeout, DNS, TLS/certificate,
 * no internet), so the wording stays generic and points at the real,
 * common device-side causes rather than assuming a Wi-Fi setup.
 */
export function connectivityMessage(err?: any): string {
  const detail = err?.code ? ` (${err.code})` : '';
  return (
    "Couldn't connect to the server. Please check:\n" +
    '• Your phone has a working internet connection\n' +
    "• The date & time are correct (Settings → Date and time → Automatic)\n\n" +
    'If it keeps happening, try again on a different network.' +
    detail
  );
}

/** Human-friendly message for an API error (distinguishes connectivity issues). */
export function apiErrorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err) && !err.response) {
    return connectivityMessage(err);
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
