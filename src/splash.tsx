import * as SplashScreen from 'expo-splash-screen';
import { useSession } from '@/ctx';

SplashScreen.preventAutoHideAsync();

/**
 * Keeps the native splash screen up until the persisted session has been
 * restored, so the app doesn't flash the login screen before we know whether
 * the driver is already logged in.
 */
export function SplashScreenController() {
  const { isLoading } = useSession();

  if (!isLoading) {
    SplashScreen.hideAsync();
  }

  return null;
}
