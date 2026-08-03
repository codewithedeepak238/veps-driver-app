import * as SecureStore from 'expo-secure-store';

const LANGUAGE_KEY = 'veps_language';

export async function getStoredLanguage(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredLanguage(code: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, code);
  } catch {
    /* best-effort persistence */
  }
}
