import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';
import type { Role } from '@/ctx';

// Show a banner (and list entry) even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * registerForPush — Requests notification permission, obtains the Expo push
 * token, and saves it to the backend for the logged-in user. Best-effort: fails
 * silently on emulators/simulators and inside Expo Go (which can't get a remote
 * push token on SDK 53+). Requires a dev/standalone build with FCM configured.
 */
export async function registerForPush(role: Role): Promise<void> {
  try {
    if (!Device.isDevice) return;
    // Expo Go (SDK 53+) removed remote push — calling the token API there throws a
    // console error. Skip entirely in Expo Go; push works in dev/standalone builds.
    if (Constants.appOwnership === 'expo') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563eb',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const pushToken = tokenResp.data;

    const endpoint = role === 'MECHANIC' ? '/mechanic/push-token' : '/driver/push-token';
    await api.post(endpoint, { pushToken });
  } catch {
    /* push is optional — never block the app on it */
  }
}
