import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/ctx';
import api from '@/lib/api';
import Skeleton from '@/components/Skeleton';

type Ctx = {
  vehicle?: { plateNumber: string; modelName: string } | null;
  machine?: { machineNumber: string } | null;
  assignedZone?: { name: string } | null;
};

function Row({
  label,
  value,
  loading,
}: {
  label: string;
  value?: string | null;
  loading?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {loading ? <Skeleton width={130} height={14} /> : <Text style={styles.rowValue}>{value || '—'}</Text>}
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { driver, signOut } = useSession();
  const [ctx, setCtx] = useState<Ctx>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/driver/trips/context')
      .then((r) => setCtx(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const initials = (driver?.name || 'D')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{driver?.name ?? t('profile.driverRole')}</Text>
          <Text style={styles.role}>{t('profile.driverRoleWithPhone', { phone: driver?.phone })}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.detailsTitle')}</Text>
          <Row label={t('profile.phone')} value={driver?.phone} />
          <Row label={t('profile.address')} value={driver?.address} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('profile.assignmentTitle')}</Text>
          <Row label={t('profile.vehicle')} value={ctx.vehicle ? `${ctx.vehicle.modelName} · ${ctx.vehicle.plateNumber}` : null} loading={loading} />
          <Row label={t('profile.machine')} value={ctx.machine?.machineNumber} loading={loading} />
          <Row label={t('profile.zone')} value={ctx.assignedZone?.name} loading={loading} />
        </View>

        <Pressable
          onPress={signOut}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        >
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  role: { fontSize: 13, color: '#64748b', marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  rowLabel: { fontSize: 14, color: '#64748b' },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: 12 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  signOutPressed: { backgroundColor: '#fee2e2' },
  signOutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});
