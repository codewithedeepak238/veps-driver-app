import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useInfiniteList } from '@/lib/useInfiniteList';
import { MechRequest, getStatusMeta, reasonLabel, RepairStatus } from '@/lib/requests';

const relTime = (iso: string, t: TFunction) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return t('common.justNow');
  if (m < 60) return t('common.minutesAgo', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('common.hoursAgo', { h });
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' } as any);
};

export default function RequestsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [filter, setFilter] = useState<'PENDING' | 'ACCEPTED' | 'FIXED' | 'ALL'>('PENDING');
  const FILTERS: { key: 'PENDING' | 'ACCEPTED' | 'FIXED' | 'ALL'; label: string }[] = [
    { key: 'PENDING', label: t('mechanicRequests.filterPending') },
    { key: 'ACCEPTED', label: t('mechanicRequests.filterAccepted') },
    { key: 'FIXED', label: t('mechanicRequests.filterFixed') },
    { key: 'ALL', label: t('mechanicRequests.filterAll') },
  ];
  const STATUS_META = getStatusMeta(t);
  const url = filter === 'ALL' ? '/mechanic/requests' : `/mechanic/requests?status=${filter}`;
  const { items, loading, loadingMore, refreshing, reload, loadMore } = useInfiniteList<MechRequest>(url, 'requests');

  // Keep the queue live while the mechanic is looking at it.
  useFocusEffect(
    useCallback(() => {
      reload(true);
      const interval = setInterval(() => reload(true), 12000);
      return () => clearInterval(interval);
    }, [reload]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.h1}>{t('mechanicRequests.title')}</Text>
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={reload}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="wrench-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {t('mechanicRequests.noRequestsTemplate', { filter: filter === 'ALL' ? '' : FILTERS.find((f) => f.key === filter)?.label.toLowerCase() })}
              </Text>
            </View>
          }
          ListFooterComponent={loadingMore ? <View style={styles.footer}><ActivityIndicator size="small" color="#94a3b8" /></View> : null}
          renderItem={({ item }) => {
            const st = STATUS_META[(item.repairStatus ?? 'PENDING') as RepairStatus];
            const isVehicle = item.reason === 'VEHICLE_ISSUE';
            const asset = isVehicle ? item.trip?.vehiclePlate : item.trip?.machineNumber;
            return (
              <Pressable style={styles.card} onPress={() => router.push(`/request-detail/${item.id}`)}>
                <View style={styles.cardTop}>
                  <View style={styles.reasonWrap}>
                    <View style={[styles.reasonIcon, { backgroundColor: isVehicle ? '#eff6ff' : '#ecfdf5' }]}>
                      <MaterialCommunityIcons name={isVehicle ? 'truck' : 'engine'} size={16} color={isVehicle ? '#2563eb' : '#047857'} />
                    </View>
                    <Text style={styles.reason}>{reasonLabel(item.reason, t)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.driver}>{item.trip?.driver?.name ?? t('mechanicRequests.driverFallback')}{asset ? ` · ${asset}` : ''}</Text>
                {item.note ? <Text style={styles.note} numberOfLines={1}>{item.note}</Text> : null}
                <View style={styles.cardBottom}>
                  <Text style={styles.time}>{relTime(item.startedAt, t)}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  head: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  h1: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  footer: { paddingVertical: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef0f4', gap: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reasonWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  reason: { fontSize: 14.5, fontWeight: '800', color: '#0f172a' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11.5, fontWeight: '700' },
  driver: { fontSize: 14, color: '#334155', fontWeight: '600' },
  note: { fontSize: 13, color: '#64748b' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  time: { fontSize: 12, color: '#94a3b8' },
});
