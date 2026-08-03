import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import NotificationsList, { type Notif } from '@/components/NotificationsList';

export default function MechanicAlertsScreen() {
  const router = useRouter();
  const onPress = (n: Notif) => {
    if (n.breakdownId) router.push(`/request-detail/${n.breakdownId}`);
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NotificationsList endpoint="/mechanic/notifications" onPressItem={onPress} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
});
