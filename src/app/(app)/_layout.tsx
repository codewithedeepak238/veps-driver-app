import { Stack } from 'expo-router';

/**
 * Authenticated area: the tab bar lives in (tabs); detail screens (trip history,
 * a single trip, today's breakdowns / media) push on top of the tabs with a header.
 */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="trip-history" options={{ headerShown: true, title: 'Trip History' }} />
      <Stack.Screen name="trip-detail/[id]" options={{ headerShown: true, title: 'Trip Details' }} />
      <Stack.Screen name="breakdowns" options={{ headerShown: true, title: "Today's Breakdowns" }} />
      <Stack.Screen name="media-gallery" options={{ headerShown: true, title: "Today's Media" }} />
    </Stack>
  );
}
