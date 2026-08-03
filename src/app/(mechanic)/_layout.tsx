import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Authenticated area for mechanics. Mirrors the driver (app) group: a tab bar
 * plus pushed detail screens.
 */
export default function MechanicLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="request-detail/[id]" options={{ headerShown: true, title: t('layout.repairRequest') }} />
    </Stack>
  );
}
