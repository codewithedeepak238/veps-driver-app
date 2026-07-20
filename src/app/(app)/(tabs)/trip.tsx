import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api, { apiErrorMessage } from '@/lib/api';
import { getCurrentLocation, type GeoPoint } from '@/lib/location';
import { pickMedia, captureMedia, uploadAsset, type PickedAsset } from '@/lib/media';
import FadeIn from '@/components/FadeIn';

// ── types ────────────────────────────────────────────────────────────────────
type Opt = { id: string; name: string };
type Ctx = {
  vehicle?: { plateNumber: string; modelName: string } | null;
  machine?: { machineNumber: string } | null;
  assignedZone?: Opt | null;
  zones?: Opt[];
  routes?: Opt[];
  hasActiveDay: boolean;
  hasActiveTrip: boolean;
  activeTripId?: string | null;
};
type Breakdown = { id: string; reason: string; note: string | null; isResolved: boolean };
type Media = { id: string; type: 'PHOTO' | 'VIDEO'; phase: string; url: string };
type TripDetail = {
  id: string;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  startOdometer: number;
  startLocationName: string | null;
  vehiclePlate: string | null;
  machineNumber: string | null;
  zone?: { name: string } | null;
  route?: { name: string } | null;
  breakdowns: Breakdown[];
  media: Media[];
};
type Summary = Record<string, any>;
type Thumb = { uri: string; type: 'PHOTO' | 'VIDEO'; pending?: boolean };

const REASONS = [
  { key: 'VEHICLE_ISSUE', label: 'Vehicle Issue' },
  { key: 'MACHINE_ISSUE', label: 'Machine Issue' },
  { key: 'LUNCH_BREAK', label: 'Lunch Break' },
  { key: 'OTHER', label: 'Others' },
];

const timeStr = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtMins = (m?: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

// ── auto location (captures on mount, shows a card, supports refresh) ─────────
function useLocationCapture() {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const capture = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await getCurrentLocation();
      setPoint(p);
      return p;
    } catch (e: any) {
      setError(e?.message || 'Could not get location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    capture();
  }, [capture]);
  const ensure = useCallback(async () => point ?? (await capture()), [point, capture]);
  return { point, loading, error, capture, ensure };
}

function LocationRow({
  point,
  loading,
  error,
  onRefresh,
}: {
  point: GeoPoint | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.locCard}>
      <View style={styles.locIcon}>
        <Ionicons name="location" size={18} color="#2563eb" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.label}>Current Location (auto)</Text>
        {loading ? (
          <Text style={styles.locText}>Locating…</Text>
        ) : error ? (
          <Text style={styles.locError}>{error}</Text>
        ) : point ? (
          <>
            <Text style={styles.locText}>{point.name ?? 'Location captured'}</Text>
            <Text style={styles.locCoords}>
              {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
            </Text>
          </>
        ) : (
          <Text style={styles.locText}>—</Text>
        )}
      </View>
      <Pressable onPress={onRefresh} hitSlop={8} style={styles.locRefresh}>
        {loading ? <ActivityIndicator size="small" color="#64748b" /> : <Ionicons name="refresh" size={18} color="#64748b" />}
      </Pressable>
    </View>
  );
}

// ── media picker chooser ─────────────────────────────────────────────────────
function chooseMedia(onAssets: (assets: PickedAsset[]) => void) {
  Alert.alert('Add Photo / Video', undefined, [
    {
      text: 'Take Photo / Video',
      onPress: () =>
        captureMedia()
          .then((a) => a && onAssets(a))
          .catch((e) => Alert.alert('Camera', e?.message || 'Could not open camera.')),
    },
    {
      text: 'Choose from Gallery',
      onPress: () =>
        pickMedia(true)
          .then((a) => a && onAssets(a))
          .catch((e) => Alert.alert('Gallery', e?.message || 'Could not open gallery.')),
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

// ── reusable UI ──────────────────────────────────────────────────────────────
function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa3b2"
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

function Dropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  empty,
}: {
  label: string;
  placeholder: string;
  options: Opt[];
  value: string | null;
  onChange: (id: string) => void;
  empty: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.muted}>{empty}</Text>
      ) : (
        <Pressable style={styles.dropdown} onPress={() => setOpen(true)}>
          <Text style={selected ? styles.ddValue : styles.ddPlaceholder} numberOfLines={1}>
            {selected ? selected.name : placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </Pressable>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.ddBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.ddSheet} onPress={() => {}}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{label.replace(' *', '')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {options.map((o) => {
                const active = value === o.id;
                return (
                  <Pressable
                    key={o.id}
                    style={styles.ddItem}
                    onPress={() => {
                      onChange(o.id);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.ddItemText, active && styles.ddItemActive]}>{o.name}</Text>
                    {active && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function MediaGrid({ items, onAdd, busy }: { items: Thumb[]; onAdd: () => void; busy?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Photos / Videos (optional)</Text>
      <View style={styles.mediaGrid}>
        {items.map((m, i) => (
          <View key={i} style={styles.thumb}>
            {m.type === 'PHOTO' ? (
              <Image source={{ uri: m.uri }} style={styles.thumbImg} />
            ) : (
              <View style={styles.thumbVideo}>
                <Ionicons name="videocam" size={22} color="#fff" />
              </View>
            )}
            {m.pending && (
              <View style={styles.thumbOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>
        ))}
        <Pressable onPress={onAdd} disabled={busy} style={styles.addTile}>
          <Ionicons name="camera" size={20} color="#6366f1" />
          <Text style={styles.addTileText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
  icon,
  danger,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={loading || disabled} style={styles.pbWrap}>
      <LinearGradient
        colors={disabled ? ['#cbd5e1', '#cbd5e1'] : danger ? ['#ef4444', '#dc2626'] : ['#3b6ef6', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.pb}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text style={styles.pbText}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function Loading() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    </SafeAreaView>
  );
}

// ── screen ───────────────────────────────────────────────────────────────────
export default function TripScreen() {
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [dayStarted, setDayStarted] = useState(false);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const refresh = useCallback(async () => {
    try {
      const c = await api.get('/driver/trips/context');
      const cx: Ctx = c.data.data;
      setCtx(cx);
      setDayStarted(cx.hasActiveDay);
      if (cx.hasActiveTrip && cx.activeTripId) {
        const t = await api.get(`/driver/trips/${cx.activeTripId}`);
        setTrip(t.data.data.trip);
      } else {
        setTrip(null);
      }
    } catch {
      /* keep previous */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setSummary(null);
      setLoading(true);
      refresh().finally(() => setLoading(false));
    }, [refresh]),
  );

  const reloadTrip = useCallback(async (tripId: string) => {
    try {
      const t = await api.get(`/driver/trips/${tripId}`);
      setTrip(t.data.data.trip);
    } catch {
      /* noop */
    }
  }, []);

  // background-upload the start-phase media, then refresh thumbnails
  const uploadStartMedia = useCallback(
    async (tripId: string, assets: PickedAsset[]) => {
      for (const a of assets) await uploadAsset(tripId, 'START', a).catch(() => {});
      reloadTrip(tripId);
    },
    [reloadTrip],
  );

  let key: string;
  let content: React.ReactNode;
  if (loading) {
    key = 'loading';
    content = <Loading />;
  } else if (summary) {
    key = 'summary';
    content = (
      <TripSummaryView
        summary={summary}
        onDone={() => {
          setSummary(null);
          setLoading(true);
          refresh().finally(() => setLoading(false));
        }}
      />
    );
  } else if (trip) {
    key = `trip-${trip.status}`;
    content = (
      <ActiveTripView
        trip={trip}
        onTripUpdate={setTrip}
        reloadTrip={reloadTrip}
        onEnded={(s) => {
          setTrip(null);
          setDayStarted(false);
          setSummary(s);
        }}
      />
    );
  } else if (dayStarted || ctx?.hasActiveDay) {
    key = 'form';
    content = (
      <StartTripFormView
        ctx={ctx as Ctx}
        onStarted={(t, media) => {
          setTrip(t); // instant transition (optimistic)
          if (media.length) uploadStartMedia(t.id, media);
        }}
      />
    );
  } else {
    key = 'startday';
    content = <StartDayView onStarted={() => setDayStarted(true)} />;
  }

  return (
    <FadeIn key={key} style={styles.flex1}>
      {content}
    </FadeIn>
  );
}

// ── phase: start day (no location) ───────────────────────────────────────────
function StartDayView({ onStarted }: { onStarted: () => void }) {
  const [busy, setBusy] = useState(false);
  const startDay = async () => {
    setBusy(true);
    try {
      await api.post('/driver/day/start', {});
      onStarted(); // instant transition to the trip form
    } catch (e: any) {
      Alert.alert('Could not start day', apiErrorMessage(e, 'Please try again.'));
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.dayCenter}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="weather-sunset-up" size={40} color="#f59e0b" />
        </View>
        <Text style={styles.h1}>Start Your Day</Text>
        <Text style={styles.sub}>Clock in to begin your shift.</Text>
        <View style={styles.dayBtn}>
          <PrimaryButton
            title="Start Day"
            onPress={startDay}
            loading={busy}
            icon={<Ionicons name="play" size={16} color="#fff" />}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── phase: trip start form (silent location) ─────────────────────────────────
function StartTripFormView({
  ctx,
  onStarted,
}: {
  ctx: Ctx;
  onStarted: (trip: TripDetail, media: PickedAsset[]) => void;
}) {
  const loc = useLocationCapture();
  const [odometer, setOdometer] = useState('');
  const [engine, setEngine] = useState('');
  const [zoneId, setZoneId] = useState<string | null>(ctx.assignedZone?.id ?? null);
  const [routeId, setRouteId] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [media, setMedia] = useState<PickedAsset[]>([]);
  const [busy, setBusy] = useState(false);

  const startTrip = async () => {
    const missing: string[] = [];
    if (!odometer.trim()) missing.push('Start Odometer');
    if (!engine.trim()) missing.push('Engine Start Hours');
    if (!zoneId) missing.push('Zone');
    if (!routeId) missing.push('Route');
    if (missing.length) {
      Alert.alert('Missing details', `Please fill: ${missing.join(', ')}.`);
      return;
    }
    setBusy(true);
    try {
      const point = await loc.ensure(); // auto location captured silently
      const res = await api.post('/driver/trips/start', {
        startOdometer: Number(odometer),
        startEngineHours: Number(engine),
        zoneId,
        routeId,
        startLatitude: point?.latitude,
        startLongitude: point?.longitude,
        startLocationName: point?.name,
        remarks: remarks.trim() || undefined,
      });
      onStarted(res.data.data.trip, media); // instant; media uploads in background
    } catch (e: any) {
      Alert.alert('Could not start trip', apiErrorMessage(e, 'Please try again.'));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Start Trip</Text>
          <Text style={styles.sub}>Fill the details, then start your trip.</Text>

          <View style={styles.autoRow}>
            <View style={styles.autoBox}>
              <Text style={styles.autoLabel}>Vehicle</Text>
              <Text style={styles.autoValue}>{ctx.vehicle?.plateNumber ?? '—'}</Text>
            </View>
            <View style={styles.autoBox}>
              <Text style={styles.autoLabel}>Machine</Text>
              <Text style={styles.autoValue}>{ctx.machine?.machineNumber ?? '—'}</Text>
            </View>
          </View>

          <LabeledInput label="Start Odometer (KM) *" value={odometer} onChangeText={setOdometer} placeholder="e.g. 12000" keyboardType="numeric" />
          <LabeledInput label="Engine Start Hours *" value={engine} onChangeText={setEngine} placeholder="e.g. 540.5" keyboardType="numeric" />
          <Dropdown label="Zone *" placeholder="Select a zone" options={ctx.zones ?? []} value={zoneId} onChange={setZoneId} empty="No zones — ask your admin to add one" />
          <Dropdown label="Route *" placeholder="Select a route" options={ctx.routes ?? []} value={routeId} onChange={setRouteId} empty="No routes — ask your admin to add one" />
          <LocationRow point={loc.point} loading={loc.loading} error={loc.error} onRefresh={loc.capture} />
          <MediaGrid
            items={media.map((m) => ({ uri: m.uri, type: m.type }))}
            onAdd={() => chooseMedia((assets) => setMedia((prev) => [...prev, ...assets]))}
          />
          <LabeledInput label="Remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="Any notes" />

          <PrimaryButton title="Start Trip" onPress={startTrip} loading={busy} icon={<Ionicons name="play" size={16} color="#fff" />} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── phase: active trip ───────────────────────────────────────────────────────
function ActiveTripView({
  trip,
  onTripUpdate,
  reloadTrip,
  onEnded,
}: {
  trip: TripDetail;
  onTripUpdate: (t: TripDetail) => void;
  reloadTrip: (id: string) => Promise<void>;
  onEnded: (summary: Summary) => void;
}) {
  const paused = trip.status === 'PAUSED';
  const [busy, setBusy] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [pending, setPending] = useState<Thumb[]>([]);

  const resume = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/driver/trips/${trip.id}/resume`);
      onTripUpdate(res.data.data.trip); // optimistic
    } catch (e: any) {
      Alert.alert('Could not resume', apiErrorMessage(e, 'Please try again.'));
      setBusy(false);
    }
  };

  const addMedia = () => {
    chooseMedia(async (assets) => {
      const thumbs: Thumb[] = assets.map((a) => ({ uri: a.uri, type: a.type, pending: true }));
      setPending((p) => [...p, ...thumbs]); // show thumbnails immediately
      for (const a of assets) await uploadAsset(trip.id, 'DURING', a).catch(() => {});
      await reloadTrip(trip.id); // server media now includes them
      setPending([]);
    });
  };

  const openBreakdown = trip.breakdowns.find((b) => !b.isResolved);
  const mediaThumbs: Thumb[] = [
    ...trip.media.map((m) => ({ uri: m.url, type: m.type })),
    ...pending,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusHead}>
          <View style={[styles.statusPill, paused ? styles.pillPaused : styles.pillActive]}>
            <View style={[styles.statusDot, { backgroundColor: paused ? '#d97706' : '#2563eb' }]} />
            <Text style={[styles.statusText, { color: paused ? '#b45309' : '#1d4ed8' }]}>
              {paused ? 'Paused' : 'In Progress'}
            </Text>
          </View>
          <Text style={styles.muted}>Started {timeStr(trip.startedAt)}</Text>
        </View>

        <View style={styles.card}>
          <DetailRow label="Vehicle" value={trip.vehiclePlate} />
          <DetailRow label="Machine" value={trip.machineNumber} />
          <DetailRow label="Zone" value={trip.zone?.name} />
          <DetailRow label="Route" value={trip.route?.name} />
          <DetailRow label="Start location" value={trip.startLocationName} />
          <DetailRow label="Start odometer" value={String(trip.startOdometer)} />
        </View>

        {paused && openBreakdown && (
          <View style={styles.breakdownBanner}>
            <Ionicons name="warning" size={18} color="#b45309" />
            <Text style={styles.breakdownText}>
              Paused: {REASONS.find((r) => r.key === openBreakdown.reason)?.label ?? openBreakdown.reason}
              {openBreakdown.note ? ` — ${openBreakdown.note}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <MediaGrid items={mediaThumbs} onAdd={addMedia} />
        </View>

        {paused ? (
          <PrimaryButton title="Resume Trip" onPress={resume} loading={busy} icon={<Ionicons name="play" size={16} color="#fff" />} />
        ) : (
          <Pressable onPress={() => setShowBreakdown(true)} style={styles.warnBtn}>
            <Ionicons name="warning-outline" size={18} color="#b45309" />
            <Text style={styles.warnBtnText}>Raise Breakdown</Text>
          </Pressable>
        )}

        <Pressable onPress={() => setShowEnd(true)} style={styles.endBtn}>
          <Ionicons name="stop-circle-outline" size={18} color="#dc2626" />
          <Text style={styles.endBtnText}>End Trip</Text>
        </Pressable>
      </ScrollView>

      <BreakdownModal
        visible={showBreakdown}
        tripId={trip.id}
        onClose={() => setShowBreakdown(false)}
        onDone={(t) => {
          setShowBreakdown(false);
          onTripUpdate(t);
        }}
      />
      <EndTripModal
        visible={showEnd}
        tripId={trip.id}
        onClose={() => setShowEnd(false)}
        onEnded={(s) => {
          setShowEnd(false);
          onEnded(s);
        }}
      />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

// ── breakdown modal ──────────────────────────────────────────────────────────
function BreakdownModal({
  visible,
  tripId,
  onClose,
  onDone,
}: {
  visible: boolean;
  tripId: string;
  onClose: () => void;
  onDone: (trip: TripDetail) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) {
      Alert.alert('Select a reason', 'Please choose a breakdown reason.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post(`/driver/trips/${tripId}/breakdown`, { reason, note: note.trim() || undefined });
      setReason(null);
      setNote('');
      setBusy(false);
      onDone(res.data.data.trip);
    } catch (e: any) {
      Alert.alert('Could not raise breakdown', apiErrorMessage(e, 'Please try again.'));
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>Raise Breakdown</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>
          <Text style={styles.label}>Reason</Text>
          <View style={styles.chips}>
            {REASONS.map((r) => {
              const active = reason === r.key;
              return (
                <Pressable key={r.key} onPress={() => setReason(r.key)} style={[styles.selChip, active && styles.selChipActive]}>
                  <Text style={[styles.selChipText, active && styles.selChipTextActive]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 12 }} />
          <LabeledInput label="Note (optional)" value={note} onChangeText={setNote} placeholder="What happened?" />
          <PrimaryButton title="Raise Breakdown & Pause" onPress={submit} loading={busy} icon={<Ionicons name="warning" size={16} color="#fff" />} />
        </View>
      </View>
    </Modal>
  );
}

// ── end trip modal (silent location) ─────────────────────────────────────────
function EndTripModal({
  visible,
  tripId,
  onClose,
  onEnded,
}: {
  visible: boolean;
  tripId: string;
  onClose: () => void;
  onEnded: (summary: Summary) => void;
}) {
  const loc = useLocationCapture();
  const [odometer, setOdometer] = useState('');
  const [engine, setEngine] = useState('');
  const [remarks, setRemarks] = useState('');
  const [media, setMedia] = useState<PickedAsset[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!odometer.trim() || !engine.trim()) {
      Alert.alert('Missing details', 'Enter the end odometer and engine hours.');
      return;
    }
    setBusy(true);
    try {
      const point = await loc.ensure();
      const res = await api.post(`/driver/trips/${tripId}/end`, {
        endOdometer: Number(odometer),
        endEngineHours: Number(engine),
        endLatitude: point?.latitude,
        endLongitude: point?.longitude,
        endLocationName: point?.name,
        remarks: remarks.trim() || undefined,
      });
      // fire-and-forget end-phase media upload (trip already ended, media still attaches)
      media.forEach((a) => uploadAsset(tripId, 'END', a).catch(() => {}));
      onEnded(res.data.data.summary); // instant transition to summary
    } catch (e: any) {
      Alert.alert('Could not end trip', apiErrorMessage(e, 'Please try again.'));
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>End Trip</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <LabeledInput label="End Odometer (KM) *" value={odometer} onChangeText={setOdometer} placeholder="e.g. 12085" keyboardType="numeric" />
              <LabeledInput label="Engine End Hours *" value={engine} onChangeText={setEngine} placeholder="e.g. 548" keyboardType="numeric" />
              <LocationRow point={loc.point} loading={loc.loading} error={loc.error} onRefresh={loc.capture} />
              <MediaGrid
                items={media.map((m) => ({ uri: m.uri, type: m.type }))}
                onAdd={() => chooseMedia((assets) => setMedia((prev) => [...prev, ...assets]))}
              />
              <LabeledInput label="Remarks (optional)" value={remarks} onChangeText={setRemarks} placeholder="Any notes" />
              <PrimaryButton title="End Trip" onPress={submit} loading={busy} danger icon={<Ionicons name="stop-circle" size={16} color="#fff" />} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── phase: summary ───────────────────────────────────────────────────────────
function TripSummaryView({ summary, onDone }: { summary: Summary; onDone: () => void }) {
  const rows: [string, any][] = [
    ['Driver', summary.driverName],
    ['Vehicle', summary.vehicleNumber],
    ['Machine', summary.machineNumber],
    ['Zone', summary.zone],
    ['Route', summary.route],
    ['Start time', summary.startTime ? timeStr(summary.startTime) : '—'],
    ['End time', summary.endTime ? timeStr(summary.endTime) : '—'],
    ['Start location', summary.startLocationName],
    ['End location', summary.endLocationName],
    ['Start odometer', summary.startOdometer],
    ['End odometer', summary.endOdometer],
    ['Total KM', summary.totalKmRun],
    ['Engine hours', summary.totalEngineRunningHours],
    ['Total duration', fmtMins(summary.tripDurationMinutes)],
    ['Active (excl. breakdowns)', fmtMins(summary.activeDurationMinutes)],
    ['Breakdown time', fmtMins(summary.breakdownMinutes)],
    ['Photos / Videos', `${summary.photosUploaded ?? 0} / ${summary.videosUploaded ?? 0}`],
    ['Remarks', summary.remarks],
  ];
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark-circle" size={44} color="#16a34a" />
        </View>
        <Text style={styles.h1}>Trip Completed</Text>
        <Text style={styles.sub}>Here is your trip summary. Your day has ended.</Text>
        <View style={styles.card}>
          {rows.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value == null ? '—' : String(value)} />
          ))}
        </View>
        <PrimaryButton title="Done" onPress={onDone} icon={<Ionicons name="checkmark" size={16} color="#fff" />} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40, gap: 14 },
  muted: { color: '#94a3b8', fontSize: 13 },

  dayCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  dayBtn: { alignSelf: 'stretch', marginTop: 16 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneIcon: { alignSelf: 'center', marginTop: 8 },
  h1: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginTop: 6 },
  sub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 6, paddingHorizontal: 10 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selChipActive: { backgroundColor: '#eef2ff', borderColor: '#a5b4fc' },
  selChipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  selChipTextActive: { color: '#4f46e5' },

  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  ddValue: { fontSize: 15, color: '#0f172a', flex: 1, marginRight: 8 },
  ddPlaceholder: { fontSize: 15, color: '#9aa3b2', flex: 1, marginRight: 8 },
  ddBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  ddSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  ddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  ddItemText: { fontSize: 15, color: '#334155' },
  ddItemActive: { color: '#2563eb', fontWeight: '700' },

  autoRow: { flexDirection: 'row', gap: 12 },
  autoBox: { flex: 1, backgroundColor: '#eef2ff', borderRadius: 12, padding: 12 },
  autoLabel: { fontSize: 11, color: '#6366f1', fontWeight: '600' },
  autoValue: { fontSize: 16, color: '#312e81', fontWeight: '800', marginTop: 2 },

  locCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  locIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff4ff', alignItems: 'center', justifyContent: 'center' },
  locText: { fontSize: 14, color: '#0f172a', fontWeight: '600', marginTop: 2 },
  locCoords: { fontSize: 11.5, color: '#94a3b8', marginTop: 1 },
  locError: { fontSize: 12.5, color: '#dc2626', marginTop: 2 },
  locRefresh: { padding: 4 },

  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 66, height: 66, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  thumbImg: { width: '100%', height: '100%' },
  thumbVideo: { width: '100%', height: '100%', backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTile: {
    width: 66,
    height: 66,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileText: { color: '#6366f1', fontSize: 11, fontWeight: '600', marginTop: 2 },

  pbWrap: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  pb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
  pbText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  statusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillActive: { backgroundColor: '#eff6ff' },
  pillPaused: { backgroundColor: '#fffbeb' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eef0f4' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  detailLabel: { fontSize: 14, color: '#64748b' },
  detailValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  breakdownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  breakdownText: { color: '#92400e', fontSize: 13, flex: 1 },

  warnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  warnBtnText: { color: '#b45309', fontSize: 15, fontWeight: '700' },
  endBtn: {
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
  endBtnText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#f6f8fc', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
});
