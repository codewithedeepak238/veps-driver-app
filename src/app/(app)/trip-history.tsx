import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useInfiniteList } from '@/lib/useInfiniteList';

type Trip = {
  id: string;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  totalKm: number | null;
  vehiclePlate: string | null;
  zone?: { name: string } | null;
  route?: { name: string } | null;
  routes?: { id: string; name: string }[];
  _count?: { media: number; breakdowns: number };
};

const statusMeta = (t: TFunction): Record<Trip['status'], { label: string; cls: string; color: string }> => ({
  IN_PROGRESS: { label: t('tripStatus.inProgress'), cls: '#eff6ff', color: '#1d4ed8' },
  PAUSED: { label: t('tripStatus.paused'), cls: '#fffbeb', color: '#b45309' },
  COMPLETED: { label: t('tripStatus.completed'), cls: '#ecfdf5', color: '#047857' },
});
const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true } as any);
const routeText = (t: Trip) =>
  t.routes && t.routes.length ? t.routes.map((r) => r.name).join(', ') : t.route?.name ?? '';

export default function TripHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { items: trips, loading, loadingMore, refreshing, reload, loadMore } = useInfiniteList<Trip>('/driver/trips', 'trips');
  const STATUS = statusMeta(t);

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
        keyExtractor={(tr) => tr.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshing={refreshing}
        onRefresh={reload}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>{t('tripHistory.noneYet')}</Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color="#94a3b8" />
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const s = STATUS[item.status];
          const routes = routeText(item);
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/trip-detail/${item.id}`)}>
              <View style={styles.rowTop}>
                <Text style={styles.date}>{fmt(item.startedAt)}</Text>
                <View style={[styles.pill, { backgroundColor: s.cls }]}>
                  <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
                </View>
              </View>
              <Text style={styles.vehicle}>{item.vehiclePlate || t('common.dash')}</Text>
              <Text style={styles.meta}>
                {(item.zone?.name || t('common.dash'))}{routes ? ` · ${routes}` : ''}
              </Text>
              <View style={styles.rowBottom}>
                <Text style={styles.stat}>{item.totalKm != null ? `${item.totalKm} ${t('tripHistory.kmSuffix')}` : t('common.dash')}</Text>
                <Text style={styles.stat}>{item._count?.breakdowns ?? 0} {t('tripHistory.breakdownsSuffix')}</Text>
                <Text style={styles.stat}>{item._count?.media ?? 0} {t('tripHistory.mediaSuffix')}</Text>
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
  footer: { paddingVertical: 16 },
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
