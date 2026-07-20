import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSession } from '@/ctx';
import api from '@/lib/api';
import Skeleton from '@/components/Skeleton';

const SK_ON_BANNER = 'rgba(255,255,255,0.3)';

// ── types ────────────────────────────────────────────────────────────────────
type Ctx = {
  vehicle?: { plateNumber: string; modelName: string } | null;
  machine?: { machineNumber: string } | null;
  assignedZone?: { name: string } | null;
  routes?: { id: string; name: string }[];
};
type Trip = {
  id: string;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  totalKm: number | null;
  totalEngineHours: number | null;
  durationMinutes: number | null;
  zone?: { name: string } | null;
  route?: { name: string } | null;
  _count?: { media: number };
};

// ── helpers ──────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};
const hhmm = (mins: number | null | undefined) => {
  const m = mins ?? 0;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const timeStr = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

export default function HomeScreen() {
  const { driver } = useSession();
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx>({});
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([
        api.get('/driver/trips/context'),
        api.get('/driver/trips'),
      ]);
      setCtx(c.data.data);
      setTrips(t.data.data.trips);
    } catch {
      /* keep last data on transient errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeTrip = trips.find((t) => t.status === 'IN_PROGRESS' || t.status === 'PAUSED') || null;
  const todayTrip = trips.find((t) => isToday(t.startedAt)) || null;
  const routes = ctx.routes ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* App bar */}
      <View style={styles.appbar}>
        <Pressable hitSlop={8} onPress={() => router.push('/profile')}>
          <Ionicons name="menu" size={26} color="#334155" />
        </Pressable>
        <Image
          source={require('../../../../assets/images/veps-logo.png')}
          style={styles.appbarLogo}
          resizeMode="contain"
        />
        <View style={styles.appbarRight}>
          <Pressable hitSlop={8} onPress={() => router.push('/alerts')} style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color="#334155" />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => router.push('/profile')} style={styles.avatarBtn}>
            <Ionicons name="person" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Driver banner */}
        <LinearGradient
          colors={['#4f67e4', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <Image
            source={require('../../../../assets/images/truck.png')}
            style={styles.truck}
            resizeMode="contain"
          />
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.driverName}>{driver?.name ?? 'Driver'}</Text>
          <Text style={styles.role}>Driver</Text>

          <View style={styles.bannerFooter}>
            <View style={styles.bannerIconWrap}>
              <MaterialCommunityIcons name="truck" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.footLabel}>Vehicle No.</Text>
              {loading ? (
                <Skeleton width={92} height={15} color={SK_ON_BANNER} style={styles.footSk} />
              ) : (
                <Text style={styles.footValue}>{ctx.vehicle?.plateNumber ?? '—'}</Text>
              )}
            </View>
            <View style={styles.footDivider} />
            <View>
              <Text style={styles.footLabel}>Machine No.</Text>
              {loading ? (
                <Skeleton width={72} height={15} color={SK_ON_BANNER} style={styles.footSk} />
              ) : (
                <Text style={styles.footValue}>{ctx.machine?.machineNumber ?? '—'}</Text>
              )}
            </View>
          </View>
        </LinearGradient>

        {/* Assignment */}
        <View style={styles.card}>
          <View style={styles.assignRow}>
            <View style={styles.assignIcon}>
              <Ionicons name="location-outline" size={16} color="#2563eb" />
            </View>
            <Text style={styles.assignLabel}>Zone</Text>
            {loading ? (
              <Skeleton width={120} height={15} />
            ) : (
              <Text style={styles.assignValue}>{ctx.assignedZone?.name ?? '—'}</Text>
            )}
          </View>
          <Text style={styles.assignRoutesLabel}>Available Routes</Text>
          <View style={styles.chips}>
            {loading ? (
              <>
                <Skeleton width={80} height={26} radius={999} />
                <Skeleton width={104} height={26} radius={999} />
              </>
            ) : routes.length === 0 ? (
              <Text style={styles.muted}>None</Text>
            ) : (
              routes.map((r) => (
                <View key={r.id} style={styles.chip}>
                  <Text style={styles.chipText}>{r.name}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Trip status */}
        {loading ? (
          <View style={styles.card}>
            <View style={styles.noTripTop}>
              <Skeleton width={52} height={52} radius={16} />
              <View style={styles.flex1}>
                <Skeleton width={130} height={17} />
                <Skeleton width={200} height={13} style={{ marginTop: 8 }} />
              </View>
            </View>
            <Skeleton width="100%" height={48} radius={12} style={{ marginTop: 14 }} />
          </View>
        ) : activeTrip ? (
          <View style={styles.activeCard}>
            <View style={styles.activeTop}>
              <View
                style={[
                  styles.statusPill,
                  activeTrip.status === 'PAUSED' ? styles.pillPaused : styles.pillActive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: activeTrip.status === 'PAUSED' ? '#d97706' : '#2563eb' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: activeTrip.status === 'PAUSED' ? '#b45309' : '#1d4ed8' },
                  ]}
                >
                  {activeTrip.status === 'PAUSED' ? 'Paused' : 'In Progress'}
                </Text>
              </View>
              <Text style={styles.mutedSmall}>Started {timeStr(activeTrip.startedAt)}</Text>
            </View>
            <Text style={styles.activeMeta}>
              {(activeTrip.zone?.name ?? '—')}
              {activeTrip.route?.name ? ` · ${activeTrip.route.name}` : ''}
            </Text>
            <Pressable style={styles.viewTripBtn} onPress={() => router.push('/trip')}>
              <Text style={styles.viewTripText}>View Trip</Text>
              <Ionicons name="chevron-forward" size={16} color="#2563eb" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.noTripCard}>
            <View style={styles.noTripTop}>
              <View style={styles.noTripIcon}>
                <Ionicons name="navigate-outline" size={26} color="#6366f1" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.noTripTitle}>No Trip Started</Text>
                <Text style={styles.noTripSub}>Start your trip to capture operation details</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/trip')} style={styles.startWrap}>
              <LinearGradient
                colors={['#3b6ef6', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startBtn}
              >
                <Text style={styles.startText}>Start Trip</Text>
                <Ionicons name="play" size={15} color="#fff" />
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Quick actions */}
        <View style={styles.actionsGrid}>
          <ActionCard
            icon={<Ionicons name="time-outline" size={22} color="#16a34a" />}
            tint="#dcfce7"
            title="Trip History"
            sub="View your previous trips"
            onPress={() => router.push('/trip-history')}
          />
          <ActionCard
            icon={<Ionicons name="warning-outline" size={22} color="#d97706" />}
            tint="#fef3c7"
            title="Breakdown"
            sub="Report vehicle issue"
            onPress={() => router.push('/breakdowns')}
          />
          <ActionCard
            icon={<Ionicons name="images-outline" size={22} color="#7c3aed" />}
            tint="#ede9fe"
            title="Media Gallery"
            sub="View uploaded photos & videos"
            onPress={() => router.push('/media-gallery')}
          />
        </View>

        {/* Today's summary */}
        <View style={styles.card}>
          <View style={styles.summaryHead}>
            <Text style={styles.summaryTitle}>Today&apos;s Summary</Text>
            <Pressable
              onPress={() => (todayTrip ? router.push(`/trip-detail/${todayTrip.id}`) : Alert.alert('No trip today', 'No trip has been recorded today yet.'))}
              hitSlop={6}
              style={styles.viewDetails}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563eb" />
            </Pressable>
          </View>
          <View style={styles.stats}>
            <Stat
              icon={<Ionicons name="speedometer-outline" size={20} color="#2563eb" />}
              value={(todayTrip?.totalKm ?? 0).toFixed(1)}
              label="KM Run"
              loading={loading}
            />
            <Stat
              icon={<MaterialCommunityIcons name="engine-outline" size={20} color="#16a34a" />}
              value={(todayTrip?.totalEngineHours ?? 0).toFixed(1)}
              label="Engine Hours"
              loading={loading}
            />
            <Stat
              icon={<Ionicons name="time-outline" size={20} color="#d97706" />}
              value={hhmm(todayTrip?.durationMinutes)}
              label="Duration"
              loading={loading}
            />
            <Stat
              icon={<Ionicons name="camera-outline" size={20} color="#7c3aed" />}
              value={String(todayTrip?._count?.media ?? 0)}
              label="Photos/Videos"
              loading={loading}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── sub-components ───────────────────────────────────────────────────────────
function ActionCard({
  icon,
  tint,
  title,
  sub,
  onPress,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: tint }]}>{icon}</View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSub}>{sub}</Text>
      <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={styles.actionChevron} />
    </Pressable>
  );
}

function Stat({
  icon,
  value,
  label,
  loading,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      {loading ? (
        <Skeleton width={36} height={16} style={{ marginVertical: 2 }} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  flex1: { flex: 1 },
  pressed: { opacity: 0.85 },
  muted: { color: '#94a3b8', fontSize: 13 },
  mutedSmall: { color: '#94a3b8', fontSize: 12 },

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
  appbarLogo: { width: 132, height: 34 },
  appbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bellBtn: { padding: 2 },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: 16, paddingBottom: 28, gap: 16 },

  banner: {
    borderRadius: 20,
    padding: 18,
    overflow: 'hidden',
    minHeight: 168,
  },
  truck: { position: 'absolute', right: -18, top: 30, width: 220, height: 156, opacity: 0.96 },
  greeting: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  driverName: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 },
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
    paddingRight: 20,
  },
  bannerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  footValue: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footSk: { marginTop: 3 },
  footDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.28)' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  assignRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assignIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignLabel: { fontSize: 14, color: '#64748b', flex: 1 },
  assignValue: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  assignRoutesLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#eef2ff', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: '#4f46e5', fontSize: 12.5, fontWeight: '600' },

  noTripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c7d2fe',
  },
  noTripTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  noTripIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTripTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  noTripSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  startWrap: { borderRadius: 12, overflow: 'hidden' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
  },
  startText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillActive: { backgroundColor: '#eff6ff' },
  pillPaused: { backgroundColor: '#fffbeb' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  activeMeta: { fontSize: 14, color: '#334155', marginTop: 12, fontWeight: '600' },
  viewTripBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  viewTripText: { color: '#2563eb', fontSize: 14, fontWeight: '700' },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef0f4',
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: { fontSize: 14.5, fontWeight: '700', color: '#0f172a' },
  actionSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  actionChevron: { position: 'absolute', top: 14, right: 12 },

  summaryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  viewDetails: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailsText: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1, gap: 5 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 10.5, color: '#94a3b8', textAlign: 'center' },
});
