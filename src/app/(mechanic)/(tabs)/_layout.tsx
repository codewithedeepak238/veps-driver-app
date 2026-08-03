import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const ACTIVE = '#2563eb';
const INACTIVE = '#94a3b8';

export default function MechanicTabsLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: { height: 58 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6, borderTopColor: '#eef0f4' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home'), tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t('nav.requests'),
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="wrench" size={size + 1} color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{ title: t('nav.alerts'), tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile'), tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }}
      />
    </Tabs>
  );
}
