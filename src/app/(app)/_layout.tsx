import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

/**
 * Authenticated area: the tab bar lives in (tabs); detail screens (trip history,
 * a single trip, today's breakdowns / media) push on top of the tabs with a header.
 */
export default function AppLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trip-history" options={{ headerShown: true, title: t('layout.tripHistory') }} />
      <Stack.Screen name="trip-detail/[id]" options={{ headerShown: true, title: t('layout.tripDetails') }} />
      <Stack.Screen name="breakdowns" options={{ headerShown: true, title: t('layout.todaysBreakdowns') }} />
      <Stack.Screen name="media-gallery" options={{ headerShown: true, title: t('layout.todaysMedia') }} />
      <Stack.Screen name="fuel" options={{ headerShown: true, title: t('layout.fuelFillings') }} />
    </Stack>
  );
}
