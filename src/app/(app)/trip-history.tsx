import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import api from '@/lib/api';

type Trip = {
  id: string;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  totalKm: number | null;
  vehiclePlate: string | null;
  zone?: { name: string } | null;
  route?: { name: string } | null;
  _count?: { media: number; breakdowns: number };
};

const STATUS: Record<Trip['status'], { label: string; cls: string; color: string }> = {
  IN_PROGRESS: { label: 'In Progress', cls: '#eff6ff', color: '#1d4ed8' },
  PAUSED: { label: 'Paused', cls: '#fffbeb', color: '#b45309' },
  COMPLETED: { label: 'Completed', cls: '#ecfdf5', color: '#047857' },
};
const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true } as any);

export default function TripHistoryScreen() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api
        .get('/driver/trips')
        .then((r) => setTrips(r.data.data.trips))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No trips yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const s = STATUS[item.status];
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/trip-detail/${item.id}`)}>
              <View style={styles.rowTop}>
                <Text style={styles.date}>{fmt(item.startedAt)}</Text>
                <View style={[styles.pill, { backgroundColor: s.cls }]}>
                  <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.vehicle}>{item.vehiclePlate || '—'}</Text>
              <Text style={styles.meta}>
                {(item.zone?.name || '—')}{item.route?.name ? ` · ${item.route.name}` : ''}
              </Text>
              <View style={styles.rowBottom}>
                <Text style={styles.stat}>{item.totalKm != null ? `${item.totalKm} km` : '—'}</Text>
                <Text style={styles.stat}>{item._count?.breakdowns ?? 0} breakdowns</Text>
                <Text style={styles.stat}>{item._count?.media ?? 0} media</Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fc' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef0f4', gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12.5, color: '#64748b' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  vehicle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 2 },
  meta: { fontSize: 13, color: '#64748b' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 },
  stat: { fontSize: 12, color: '#94a3b8' },
});
