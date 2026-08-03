import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/ctx';
import api from '@/lib/api';
import Skeleton from '@/components/Skeleton';
import SideDrawer from '@/components/SideDrawer';
import { MechRequest, getStatusMeta, reasonLabel, RepairStatus } from '@/lib/requests';

const SK_ON_BANNER = 'rgba(255,255,255,0.3)';

const greeting = (t: (key: string) => string) => {
  const h = new Date().getHours();
  if (h < 12) return t('greeting.morning');
  if (h < 17) return t('greeting.afternoon');
  return t('greeting.evening');
};

type Ctx = { mechanic: { name: string; city?: { name: string } | null }; counts: { pending: number; accepted: number; fixedToday: number } };

export default function MechanicHome() {
  const { t } = useTranslation();
  const { user } = useSession();
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [pending, setPending] = useState<MechRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const STATUS_META = getStatusMeta(t);

  const load = useCallback(async () => {
    try {
      const [c, p, u] = await Promise.all([
        api.get('/mechanic/context'),
        api.get('/mechanic/requests?status=PENDING&limit=5'),
        api.get('/mechanic/notifications/unread-count').catch(() => null),
      ]);
      setCtx(c.data.data);
      setPending(p.data.data.requests);
      if (u) setUnread(u.data.data.count ?? 0);
    } catch {
      /* keep last */
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on focus + poll while focused so the queue stays live.
  useFocusEffect(
    useCallback(() => {
      load();
      const interval = setInterval(load, 12000);
      return () => clearInterval(interval);
    }, [load]),
  );

  const counts = ctx?.counts ?? { pending: 0, accepted: 0, fixedToday: 0 };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} roleLabel={t('sideDrawer.mechanicRole')} />

      {/* App bar — same as driver */}
      <View style={styles.appbar}>
        <View style={styles.appbarSide}>
          <Pressable hitSlop={8} onPress={() => setDrawerOpen(true)}>
            <Ionicons name="menu" size={26} color="#334155" />
          </Pressable>
        </View>
        <Image source={require('../../../../assets/images/veps-logo.png')} style={styles.appbarLogo} resizeMode="contain" />
        <View style={styles.appbarRight}>
          <Pressable hitSlop={8} onPress={() => router.push('/alerts')} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#334155" />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </Pressable>
          <Pressable hitSlop={8} onPress={() => router.push('/profile')} style={styles.avatarBtn}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner — same style as driver (truck image) */}
        <LinearGradient colors={['#4f67e4', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <Image source={require('../../../../assets/images/truck2.png')} style={styles.truck} resizeMode="contain" resizeMethod="scale" />
          <Text style={styles.greeting}>{greeting(t)}</Text>
          <Text style={styles.name}>{user?.name ?? t('mechanicHome.mechanicRole')}</Text>
          <Text style={styles.role}>{t('mechanicHome.mechanicRole')}</Text>

          <View style={styles.bannerFooter}>
            <View style={styles.bannerIconWrap}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.footLabel}>{t('mechanicHome.city')}</Text>
              {loading ? (
                <Skeleton width={80} height={15} color={SK_ON_BANNER} style={{ marginTop: 3 }} />
              ) : (
                <Text style={styles.footValue}>{ctx?.mechanic?.city?.name ?? t('common.dash')}</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Stat cards */}
        <View style={styles.stats}>
          <Stat icon={<Ionicons name="alert-circle-outline" size={22} color="#d97706" />} tint="#fef3c7" value={counts.pending} label={t('mechanicHome.pending')} loading={loading} />
          <Stat icon={<MaterialCommunityIcons name="wrench-outline" size={22} color="#2563eb" />} tint="#dbeafe" value={counts.accepted} label={t('mechanicHome.accepted')} loading={loading} />
          <Stat icon={<Ionicons name="checkmark-circle-outline" size={22} color="#16a34a" />} tint="#dcfce7" value={counts.fixedToday} label={t('mechanicHome.fixedToday')} loading={loading} />
        </View>

        {/* Pending requests */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('mechanicHome.pendingRequestsTitle')}</Text>
          <Pressable onPress={() => router.push('/requests')} style={styles.viewAll}>
            <Text style={styles.viewAllText}>{t('mechanicHome.viewAll')}</Text>
            <Ionicons name="chevron-forward" size={14} color="#2563eb" />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.card}><Skeleton width="100%" height={48} radius={12} /></View>
        ) : pending.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={34} color="#cbd5e1" />
            <Text style={styles.emptyText}>{t('mechanicHome.allCaughtUp')}</Text>
          </View>
        ) : (
          pending.map((r) => {
            const isVehicle = r.reason === 'VEHICLE_ISSUE';
            const asset = isVehicle ? r.trip?.vehiclePlate : r.trip?.machineNumber;
            const st = STATUS_META[(r.repairStatus ?? 'PENDING') as RepairStatus];
            return (
              <Pressable key={r.id} style={styles.reqCard} onPress={() => router.push(`/request-detail/${r.id}`)}>
                <View style={[styles.reqIcon, { backgroundColor: isVehicle ? '#eff6ff' : '#ecfdf5' }]}>
                  <MaterialCommunityIcons name={isVehicle ? 'truck' : 'engine'} size={20} color={isVehicle ? '#2563eb' : '#047857'} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.reqTitle}>{reasonLabel(r.reason, t)}</Text>
                  <Text style={styles.reqSub} numberOfLines={1}>{r.trip?.driver?.name ?? t('mechanicHome.driverFallback')}{asset ? ` · ${asset}` : ''}</Text>
                </View>
                <View style={[styles.badge2, { backgroundColor: st.bg, borderColor: st.border }]}>
                  <Text style={[styles.badge2Text, { color: st.color }]}>{st.label}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, tint, value, label, loading }: { icon: React.ReactNode; tint: string; value: number; label: string; loading?: boolean }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tint }]}>{icon}</View>
      {loading ? <Skeleton width={28} height={20} style={{ marginVertical: 2 }} /> : <Text style={styles.statValue}>{value}</Text>}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  flex1: { flex: 1 },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eef0f4',
  },
  appbarLogo: { width: 190, height: 50, marginLeft: 14 },
  appbarSide: { flex: 1, alignItems: 'flex-start' },
  appbarRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  bellBtn: { padding: 2 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  avatarBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16, paddingBottom: 28, gap: 16 },
  banner: { borderRadius: 20, padding: 18, overflow: 'hidden', minHeight: 168 },
  truck: { position: 'absolute', right: -18, top: 30, width: 220, height: 156, opacity: 0.96 },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
  role: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 1 },
  bannerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 26,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 10,
    alignSelf: 'flex-start',
    paddingRight: 24,
  },
  bannerIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  footLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  footValue: { color: '#fff', fontSize: 14, fontWeight: '700' },

  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#eef0f4', alignItems: 'center', gap: 4 },
  statIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eef0f4' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#eef0f4', alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13.5, color: '#94a3b8', textAlign: 'center' },
  reqCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef0f4' },
  reqIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reqTitle: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  reqSub: { fontSize: 13, color: '#64748b', marginTop: 1 },
  badge2: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badge2Text: { fontSize: 11, fontWeight: '700' },
});
