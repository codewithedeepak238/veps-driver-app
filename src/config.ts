import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Base URL of the VEPS backend API.
 *
 * In development we AUTO-DETECT the server host from the address the phone used
 * to load the app from Metro (e.g. Expo Go connects to 10.243.71.14:8081, so the
 * API is assumed to be at 10.243.71.14:8000). This means the app follows your
 * computer's LAN IP automatically — no need to edit anything when your Wi-Fi /
 * IP changes.
 *
 * To point at a fixed/deployed backend instead, set EXPO_PUBLIC_API_URL in .env
 * (that always takes priority).
 */
const API_PORT = 8000;

function hostFromMetro(): string | null {
  const anyConstants = Constants as any;
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ||
    anyConstants.expoGoConfig?.debuggerHost ||
    anyConstants.manifest?.debuggerHost ||
    anyConstants.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

function resolveBaseUrl(): string {
  // 1. Explicit override (e.g. a deployed backend) always wins.
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // 2. Auto-detect the LAN IP the phone reached Metro on (physical device / dev).
  const host = hostFromMetro();
  if (host) return `http://${host}:${API_PORT}/api/v1`;

  // 3. Fallbacks: Android emulator alias, otherwise localhost.
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${API_PORT}/api/v1`
    : `http://localhost:${API_PORT}/api/v1`;
}

export const API_BASE_URL = resolveBaseUrl();
