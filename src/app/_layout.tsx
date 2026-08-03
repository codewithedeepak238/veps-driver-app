import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import '@/i18n';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { SessionProvider, useSession } from '@/ctx';
import { SplashScreenController } from '@/splash';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <SessionProvider>
          <SplashScreenController />
          <StatusBar style="dark" />
          <RootNavigator />
        </SessionProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { session, role } = useSession();
  const router = useRouter();

  // Deep-link when the user taps a push notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { breakdownId?: string } | undefined;
      if (role === 'MECHANIC' && data?.breakdownId) {
        router.push(`/request-detail/${data.breakdownId}`);
      } else {
        router.push('/alerts');
      }
    });
    return () => sub.remove();
  }, [role, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session && role === 'MECHANIC'}>
        <Stack.Screen name="(mechanic)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && role !== 'MECHANIC'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
