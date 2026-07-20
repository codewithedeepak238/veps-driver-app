import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AlertsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <Ionicons name="notifications-outline" size={48} color="#cbd5e1" />
        <Text style={styles.title}>Alerts</Text>
        <Text style={styles.text}>Notifications from the operations team will appear here.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  text: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});
