import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { reasonLabel } from '@/lib/reasons';

const t12 = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';

type Breakdown = {
  id: string;
  reason: string;
  note: string | null;
  startedAt: string;
  resolvedAt: string | null;
  isResolved: boolean;
  trip?: { vehiclePlate: string | null; zone?: { name: string } | null; route?: { name: string } | null } | null;
};

export default function BreakdownsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/driver/breakdowns')
      .then((r) => setItems(r.data.data.breakdowns))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
        data={items}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>{t('breakdowns.noneToday')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <View style={styles.reasonWrap}>
                <Ionicons name="warning" size={16} color="#d97706" />
                <Text style={styles.reason}>{reasonLabel(item.reason, t)}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: item.isResolved ? '#ecfdf5' : '#fffbeb' }]}>
                <Text style={[styles.pillText, { color: item.isResolved ? '#047857' : '#b45309' }]}>
                  {item.isResolved ? t('breakdowns.resolved') : t('breakdowns.ongoing')}
                </Text>
              </View>
            </View>
            {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            <Text style={styles.meta}>
              {item.trip?.vehiclePlate || t('common.dash')}
              {item.trip?.zone?.name ? ` · ${item.trip.zone.name}` : ''}
            </Text>
            <Text style={styles.time}>
              {t12(item.startedAt)}{item.resolvedAt ? ` → ${t12(item.resolvedAt)}` : ''}
            </Text>
          </View>
        )}
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
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef0f4', gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reasonWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reason: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11.5, fontWeight: '700' },
  note: { fontSize: 13.5, color: '#475569', marginTop: 2 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 2 },
  time: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
});
