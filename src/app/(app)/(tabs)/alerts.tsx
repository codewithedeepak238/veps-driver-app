import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationsList from '@/components/NotificationsList';

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NotificationsList endpoint="/driver/notifications" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
});
