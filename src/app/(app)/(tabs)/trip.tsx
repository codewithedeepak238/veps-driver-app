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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import api, { apiErrorMessage } from '@/lib/api';
import { getCurrentLocation, type GeoPoint } from '@/lib/location';
import { pickMedia, capturePhoto, captureVideo, captureSlip, pickSlip, uploadMeterImage, uploadAsset, type PickedAsset } from '@/lib/media';
import { reasonLabel } from '@/lib/reasons';
import FadeIn from '@/components/FadeIn';
import FuelFillingModal from '@/components/FuelFillingModal';

// ── types ────────────────────────────────────────────────────────────────────
type Opt = { id: string; name: string };
type Ctx = {
  vehicle?: { plateNumber: string; modelName: string } | null;
  machine?: { machineNumber: string } | null;
  helper?: { name: string } | null;
  assignedZone?: Opt | null;
  zones?: Opt[];
  routes?: Opt[];
  hasActiveDay: boolean;
  hasActiveTrip: boolean;
  activeTripId?: string | null;
};
type Breakdown = { id: string; reason: string; note: string | null; isResolved: boolean };
type Media = { id: string; type: 'PHOTO' | 'VIDEO'; phase: string; url: string };
type TripRoute = { id: string; name: string };
type TripDetail = {
  id: string;
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  startedAt: string;
  startOdometer: number | null;
  startEngineHours: number | null;
  startOdometerImageUrl: string | null;
  startEngineImageUrl: string | null;
  startLocationName: string | null;
  vehiclePlate: string | null;
  machineNumber: string | null;
  driver?: { name: string; helper?: { name: string } | null } | null;
  zone?: { name: string } | null;
  route?: { name: string } | null;
  routes?: TripRoute[];
  breakdowns: Breakdown[];
  media: Media[];
};
type Summary = Record<string, any>;
type Thumb = { uri: string; type: 'PHOTO' | 'VIDEO'; pending?: boolean };

const REASON_KEYS = ['VEHICLE_ISSUE', 'MACHINE_ISSUE', 'LUNCH_BREAK', 'OTHER'];
const getReasons = (t: TFunction) => REASON_KEYS.map((key) => ({ key, label: reasonLabel(key, t) }));

const timeStr = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtMins = (m?: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

// ── auto location (captures on mount, shows a card, supports refresh) ─────────
function useLocationCapture() {
  const { t } = useTranslation();
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
      setError(e?.message || t('trip.location.couldNotGet'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [t]);
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
  const { t } = useTranslation();
  return (
    <View style={styles.locCard}>
      <View style={styles.locIcon}>
        <Ionicons name="location" size={18} color="#2563eb" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.label}>{t('trip.location.label')}</Text>
        {loading ? (
          <Text style={styles.locText}>{t('trip.location.locating')}</Text>
        ) : error ? (
          <Text style={styles.locError}>{error}</Text>
        ) : point ? (
          <>
            <Text style={styles.locText}>{point.name ?? t('trip.location.captured')}</Text>
            <Text style={styles.locCoords}>
              {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
            </Text>
          </>
        ) : (
          <Text style={styles.locText}>{t('common.dash')}</Text>
        )}
      </View>
      <Pressable onPress={onRefresh} hitSlop={8} style={styles.locRefresh}>
        {loading ? <ActivityIndicator size="small" color="#64748b" /> : <Ionicons name="refresh" size={18} color="#64748b" />}
      </Pressable>
    </View>
  );
}

// ── media picker chooser ─────────────────────────────────────────────────────
// Photo and video capture are separate options: the native camera only records
// video when launched in video-only mode (and only takes photos in photo mode).
function chooseMedia(onAssets: (assets: PickedAsset[]) => void, t: TFunction) {
  Alert.alert(t('trip.mediaPicker.title'), undefined, [
    {
      text: t('common.takePhoto'),
      onPress: () =>
        capturePhoto()
          .then((a) => a && onAssets(a))
          .catch((e) => Alert.alert(t('common.camera'), e?.message || t('trip.mediaPicker.cameraError'))),
    },
    {
      text: t('common.recordVideo'),
      onPress: () =>
        captureVideo()
          .then((a) => a && onAssets(a))
          .catch((e) => Alert.alert(t('common.camera'), e?.message || t('trip.mediaPicker.recordError'))),
    },
    {
      text: t('common.chooseFromGallery'),
      onPress: () =>
        pickMedia(true)
          .then((a) => a && onAssets(a))
          .catch((e) => Alert.alert(t('common.gallery'), e?.message || t('trip.mediaPicker.galleryError'))),
    },
    { text: t('common.cancel'), style: 'cancel' },
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

// Single-image chooser for a meter photo (camera or gallery).
function chooseMeterPhoto(onAsset: (a: PickedAsset) => void, t: TFunction) {
  Alert.alert(t('trip.meterField.pickerTitle'), undefined, [
    { text: t('common.takePhoto'), onPress: () => captureSlip().then((a) => a && onAsset(a)).catch((e) => Alert.alert(t('common.camera'), e?.message || t('common.couldNotOpenCamera'))) },
    { text: t('common.chooseFromGallery'), onPress: () => pickSlip().then((a) => a && onAsset(a)).catch((e) => Alert.alert(t('common.gallery'), e?.message || t('common.couldNotOpenGallery'))) },
    { text: t('common.cancel'), style: 'cancel' },
  ]);
}

// A reading field: manual number AND/OR a photo of the meter (one required).
function MeterField({
  label,
  placeholder,
  value,
  onChangeText,
  image,
  onPickImage,
  onRemoveImage,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  image: PickedAsset | null;
  onPickImage: () => void;
  onRemoveImage: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa3b2"
        keyboardType="numeric"
        style={styles.input}
      />
      <Text style={styles.orText}>{t('trip.meterField.orUploadPhoto')}</Text>
      {image ? (
        <View style={styles.meterImgWrap}>
          <Image source={{ uri: image.uri }} style={styles.meterImg} />
          <Pressable style={styles.meterImgRemove} onPress={onRemoveImage} hitSlop={8}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.meterAdd} onPress={onPickImage}>
          <Ionicons name="camera-outline" size={20} color="#6366f1" />
          <Text style={styles.meterAddText}>{t('trip.meterField.addMeterPhoto')}</Text>
        </Pressable>
      )}
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

// ── manual route entry ───────────────────────────────────────────────────────
function AddRouteModal({
  visible,
  onClose,
  onSubmit,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onSubmit(n);
    setName('');
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.ddBackdrop} onPress={onClose}>
        <Pressable style={styles.ddSheet} onPress={() => {}}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t('trip.routes.addRouteModalTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('trip.routes.routeNamePlaceholder')}
            placeholderTextColor="#9aa3b2"
            style={styles.input}
            autoFocus
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <View style={{ height: 12 }} />
          <PrimaryButton title={t('trip.routes.addRoute')} onPress={submit} loading={busy} icon={<Ionicons name="add" size={16} color="#fff" />} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function RouteChips({ routes, onRemove }: { routes: string[]; onRemove?: (i: number) => void }) {
  const { t } = useTranslation();
  if (routes.length === 0) return <Text style={styles.muted}>{t('trip.routes.noRoutesYet')}</Text>;
  return (
    <View style={styles.chips}>
      {routes.map((r, i) => (
        <View key={`${r}-${i}`} style={styles.routeChip}>
          <Text style={styles.routeChipText}>{r}</Text>
          {onRemove && (
            <Pressable onPress={() => onRemove(i)} hitSlop={6}>
              <Ionicons name="close" size={14} color="#4f46e5" />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

/** Route editor used on the start form (local list, add + remove). */
function RouteEditor({
  routes,
  onAdd,
  onRemove,
}: {
  routes: string[];
  onAdd: (name: string) => void;
  onRemove: (i: number) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t('trip.routes.label')}</Text>
      <RouteChips routes={routes} onRemove={onRemove} />
      <Pressable style={styles.addRouteBtn} onPress={() => setOpen(true)}>
        <Ionicons name="add-circle-outline" size={18} color="#6366f1" />
        <Text style={styles.addRouteText}>{t('trip.routes.addRoute')}</Text>
      </Pressable>
      <AddRouteModal
        visible={open}
        onClose={() => setOpen(false)}
        onSubmit={(n) => {
          onAdd(n);
          setOpen(false);
        }}
      />
    </View>
  );
}

function MediaGrid({ items, onAdd, busy }: { items: Thumb[]; onAdd: () => void; busy?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t('trip.mediaGrid.label')}</Text>
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
          <Text style={styles.addTileText}>{t('trip.mediaGrid.add')}</Text>
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
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const startDay = async () => {
    setBusy(true);
    try {
      await api.post('/driver/day/start', {});
      onStarted(); // instant transition to the trip form
    } catch (e: any) {
      Alert.alert(t('trip.startDay.couldNotStartTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.dayCenter}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="weather-sunset-up" size={40} color="#f59e0b" />
        </View>
        <Text style={styles.h1}>{t('trip.startDay.title')}</Text>
        <Text style={styles.sub}>{t('trip.startDay.sub')}</Text>
        <View style={styles.dayBtn}>
          <PrimaryButton
            title={t('trip.startDay.button')}
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
  const { t } = useTranslation();
  const loc = useLocationCapture();
  const insets = useSafeAreaInsets();
  const [odometer, setOdometer] = useState('');
  const [engine, setEngine] = useState('');
  const [odometerImg, setOdometerImg] = useState<PickedAsset | null>(null);
  const [engineImg, setEngineImg] = useState<PickedAsset | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(ctx.assignedZone?.id ?? null);
  const [routeNames, setRouteNames] = useState<string[]>([]);
  const [remarks, setRemarks] = useState('');
  const [media, setMedia] = useState<PickedAsset[]>([]);
  const [busy, setBusy] = useState(false);
  const [fuelFilled, setFuelFilled] = useState(false);
  const [fuelModalOpen, setFuelModalOpen] = useState(false);
  const [fuelAdded, setFuelAdded] = useState(false);

  const startTrip = async () => {
    const missing: string[] = [];
    if (!odometer.trim() && !odometerImg) missing.push(t('trip.startForm.missingStartOdometer'));
    if (!engine.trim() && !engineImg) missing.push(t('trip.startForm.missingEngineStart'));
    if (!zoneId) missing.push(t('trip.startForm.missingZone'));
    if (routeNames.length === 0) missing.push(t('trip.startForm.missingRoute'));
    if (missing.length) {
      Alert.alert(t('trip.startForm.missingDetailsTitle'), t('trip.startForm.missingFieldsTemplate', { fields: missing.join(', ') }));
      return;
    }
    // A trip cannot start until the current location has been captured.
    let point = loc.point ?? (await loc.ensure());
    if (!point) {
      Alert.alert(
        t('trip.startForm.locationRequiredTitle'),
        t('trip.startForm.locationRequiredMessage'),
      );
      return;
    }
    setBusy(true);
    try {
      // Upload any meter photos first, then start the trip with numbers and/or image URLs.
      const [odoImg, engImg] = await Promise.all([
        odometerImg ? uploadMeterImage(odometerImg) : Promise.resolve(null),
        engineImg ? uploadMeterImage(engineImg) : Promise.resolve(null),
      ]);
      const res = await api.post('/driver/trips/start', {
        startOdometer: odometer.trim() ? Number(odometer) : undefined,
        startEngineHours: engine.trim() ? Number(engine) : undefined,
        startOdometerImageUrl: odoImg?.url,
        startOdometerImageKey: odoImg?.key,
        startEngineImageUrl: engImg?.url,
        startEngineImageKey: engImg?.key,
        zoneId,
        routeNames,
        startLatitude: point?.latitude,
        startLongitude: point?.longitude,
        startLocationName: point?.name,
        remarks: remarks.trim() || undefined,
      });
      onStarted(res.data.data.trip, media); // instant; media uploads in background
    } catch (e: any) {
      Alert.alert(t('trip.startForm.couldNotStartTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>{t('trip.startForm.title')}</Text>
          <Text style={styles.sub}>{t('trip.startForm.sub')}</Text>

          <View style={styles.autoRow}>
            <View style={styles.autoBox}>
              <Text style={styles.autoLabel}>{t('trip.startForm.vehicle')}</Text>
              <Text style={styles.autoValue} numberOfLines={1}>{ctx.vehicle?.plateNumber ?? t('common.dash')}</Text>
            </View>
            <View style={styles.autoBox}>
              <Text style={styles.autoLabel}>{t('trip.startForm.machine')}</Text>
              <Text style={styles.autoValue} numberOfLines={1}>{ctx.machine?.machineNumber ?? t('common.dash')}</Text>
            </View>
            <View style={styles.autoBox}>
              <Text style={styles.autoLabel}>{t('trip.startForm.helper')}</Text>
              <Text style={styles.autoValue} numberOfLines={1}>{ctx.helper?.name ?? t('common.dash')}</Text>
            </View>
          </View>

          <MeterField
            label={t('trip.startForm.startOdometerLabel')}
            value={odometer}
            onChangeText={setOdometer}
            placeholder={t('trip.startForm.startOdometerPlaceholder')}
            image={odometerImg}
            onPickImage={() => chooseMeterPhoto(setOdometerImg, t)}
            onRemoveImage={() => setOdometerImg(null)}
          />
          <MeterField
            label={t('trip.startForm.engineStartLabel')}
            value={engine}
            onChangeText={setEngine}
            placeholder={t('trip.startForm.engineStartPlaceholder')}
            image={engineImg}
            onPickImage={() => chooseMeterPhoto(setEngineImg, t)}
            onRemoveImage={() => setEngineImg(null)}
          />
          <Dropdown label={t('trip.startForm.zoneLabel')} placeholder={t('trip.startForm.zonePlaceholder')} options={ctx.zones ?? []} value={zoneId} onChange={setZoneId} empty={t('trip.startForm.noZones')} />
          <RouteEditor
            routes={routeNames}
            onAdd={(n) => setRouteNames((prev) => [...prev, n])}
            onRemove={(i) => setRouteNames((prev) => prev.filter((_, idx) => idx !== i))}
          />

          <View style={styles.field}>
            <Text style={styles.label}>{t('trip.startForm.fuelFilledLabel')}</Text>
            <View style={styles.yesNoRow}>
              <Pressable
                style={[styles.yesNo, fuelFilled && styles.yesNoActive]}
                onPress={() => {
                  setFuelFilled(true);
                  setFuelModalOpen(true);
                }}
              >
                <Text style={[styles.yesNoText, fuelFilled && styles.yesNoTextActive]}>{t('trip.startForm.yes')}</Text>
              </Pressable>
              <Pressable
                style={[styles.yesNo, !fuelFilled && styles.yesNoActive]}
                onPress={() => {
                  setFuelFilled(false);
                  setFuelAdded(false);
                }}
              >
                <Text style={[styles.yesNoText, !fuelFilled && styles.yesNoTextActive]}>{t('trip.startForm.no')}</Text>
              </Pressable>
            </View>
            {fuelFilled && fuelAdded && (
              <Pressable style={styles.fuelAddedRow} onPress={() => setFuelModalOpen(true)}>
                <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
                <Text style={styles.fuelAddedText}>{t('trip.startForm.fuelSavedTapAnother')}</Text>
              </Pressable>
            )}
          </View>

          <LocationRow point={loc.point} loading={loc.loading} error={loc.error} onRefresh={loc.capture} />

          <MediaGrid
            items={media.map((m) => ({ uri: m.uri, type: m.type }))}
            onAdd={() => chooseMedia((assets) => setMedia((prev) => [...prev, ...assets]), t)}
          />
          <LabeledInput label={t('trip.remarks.label')} value={remarks} onChangeText={setRemarks} placeholder={t('trip.remarks.placeholder')} />

          {!loc.point && !loc.loading && (
            <Text style={styles.locHint}>{t('trip.startForm.startEnabledHint')}</Text>
          )}
          <PrimaryButton
            title={loc.point ? t('trip.startForm.startButton') : t('trip.startForm.capturingLocation')}
            onPress={startTrip}
            loading={busy}
            disabled={!loc.point}
            icon={<Ionicons name="play" size={16} color="#fff" />}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <FuelFillingModal
        visible={fuelModalOpen}
        onClose={() => {
          setFuelModalOpen(false);
          if (!fuelAdded) setFuelFilled(false);
        }}
        onDone={() => {
          setFuelModalOpen(false);
          setFuelAdded(true);
          setFuelFilled(true);
        }}
      />
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
  const { t } = useTranslation();
  const paused = trip.status === 'PAUSED';
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [addingRoute, setAddingRoute] = useState(false);
  const [pending, setPending] = useState<Thumb[]>([]);

  const addRoute = async (name: string) => {
    setAddingRoute(true);
    try {
      const res = await api.post(`/driver/trips/${trip.id}/routes`, { name });
      onTripUpdate(res.data.data.trip);
      setShowAddRoute(false);
    } catch (e: any) {
      Alert.alert(t('trip.routes.couldNotAddTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
    } finally {
      setAddingRoute(false);
    }
  };

  const resume = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/driver/trips/${trip.id}/resume`);
      onTripUpdate(res.data.data.trip); // optimistic
    } catch (e: any) {
      Alert.alert(t('trip.active.couldNotResumeTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
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
    }, t);
  };

  const openBreakdown = trip.breakdowns.find((b) => !b.isResolved);
  const mediaThumbs: Thumb[] = [
    ...trip.media.map((m) => ({ uri: m.url, type: m.type })),
    ...pending,
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.statusHead}>
          <View style={[styles.statusPill, paused ? styles.pillPaused : styles.pillActive]}>
            <View style={[styles.statusDot, { backgroundColor: paused ? '#d97706' : '#2563eb' }]} />
            <Text style={[styles.statusText, { color: paused ? '#b45309' : '#1d4ed8' }]}>
              {paused ? t('home.paused') : t('home.inProgress')}
            </Text>
          </View>
          <Text style={styles.muted}>{t('trip.active.startedAt', { time: timeStr(trip.startedAt) })}</Text>
        </View>

        <View style={styles.card}>
          <DetailRow label={t('trip.active.vehicle')} value={trip.vehiclePlate} />
          <DetailRow label={t('trip.active.machine')} value={trip.machineNumber} />
          <DetailRow label={t('trip.active.helper')} value={trip.driver?.helper?.name} />
          <DetailRow label={t('trip.active.zone')} value={trip.zone?.name} />
          <DetailRow label={t('trip.active.startLocation')} value={trip.startLocationName} />
          <DetailRow label={t('trip.active.startOdometer')} value={trip.startOdometer != null ? String(trip.startOdometer) : trip.startOdometerImageUrl ? t('trip.active.photoLabel') : t('common.dash')} />
        </View>

        <View style={styles.card}>
          <View style={styles.routesHead}>
            <Text style={styles.label}>{t('trip.active.routesTemplate', { count: trip.routes?.length ?? 0 })}</Text>
            {trip.status !== 'COMPLETED' && (
              <Pressable style={styles.addRouteMini} onPress={() => setShowAddRoute(true)}>
                <Ionicons name="add-circle-outline" size={16} color="#6366f1" />
                <Text style={styles.addRouteText}>{t('trip.active.addRoute')}</Text>
              </Pressable>
            )}
          </View>
          <View style={{ height: 10 }} />
          <RouteChips routes={(trip.routes ?? []).map((r) => r.name)} />
        </View>

        {paused && openBreakdown && (
          <View style={styles.breakdownBanner}>
            <Ionicons name="warning" size={18} color="#b45309" />
            <Text style={styles.breakdownText}>
              {t('trip.active.pausedBannerTemplate', { reason: reasonLabel(openBreakdown.reason, t) })}
              {openBreakdown.note ? ` — ${openBreakdown.note}` : ''}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          <MediaGrid items={mediaThumbs} onAdd={addMedia} />
        </View>

        {paused ? (
          <PrimaryButton title={t('trip.active.resumeTrip')} onPress={resume} loading={busy} icon={<Ionicons name="play" size={16} color="#fff" />} />
        ) : (
          <Pressable onPress={() => setShowBreakdown(true)} style={styles.warnBtn}>
            <Ionicons name="warning-outline" size={18} color="#b45309" />
            <Text style={styles.warnBtnText}>{t('trip.active.raiseBreakdown')}</Text>
          </Pressable>
        )}

        <Pressable onPress={() => setShowEnd(true)} style={styles.endBtn}>
          <Ionicons name="stop-circle-outline" size={18} color="#dc2626" />
          <Text style={styles.endBtnText}>{t('trip.active.endTrip')}</Text>
        </Pressable>
      </ScrollView>

      <BreakdownModal
        visible={showBreakdown}
        tripId={trip.id}
        onClose={() => setShowBreakdown(false)}
        onDone={(updatedTrip) => {
          setShowBreakdown(false);
          onTripUpdate(updatedTrip);
        }}
      />
      <EndTripModal
        visible={showEnd}
        tripId={trip.id}
        startOdometer={trip.startOdometer}
        startEngineHours={trip.startEngineHours}
        onClose={() => setShowEnd(false)}
        onEnded={(s) => {
          setShowEnd(false);
          onEnded(s);
        }}
      />
      <AddRouteModal visible={showAddRoute} onClose={() => setShowAddRoute(false)} onSubmit={addRoute} busy={addingRoute} />
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  const { t } = useTranslation();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || t('common.dash')}</Text>
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
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const reasons = getReasons(t);

  const submit = async () => {
    if (!reason) {
      Alert.alert(t('trip.breakdownModal.selectReasonTitle'), t('trip.breakdownModal.selectReasonMessage'));
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
      Alert.alert(t('trip.breakdownModal.couldNotRaiseTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t('trip.breakdownModal.title')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>
          <Text style={styles.label}>{t('trip.breakdownModal.reasonLabel')}</Text>
          <View style={styles.chips}>
            {reasons.map((r) => {
              const active = reason === r.key;
              return (
                <Pressable key={r.key} onPress={() => setReason(r.key)} style={[styles.selChip, active && styles.selChipActive]}>
                  <Text style={[styles.selChipText, active && styles.selChipTextActive]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 12 }} />
          <LabeledInput label={t('trip.breakdownModal.noteLabel')} value={note} onChangeText={setNote} placeholder={t('trip.breakdownModal.notePlaceholder')} />
          <PrimaryButton title={t('trip.breakdownModal.submit')} onPress={submit} loading={busy} icon={<Ionicons name="warning" size={16} color="#fff" />} />
        </View>
      </View>
    </Modal>
  );
}

// ── end trip modal (silent location) ─────────────────────────────────────────
function EndTripModal({
  visible,
  tripId,
  startOdometer,
  startEngineHours,
  onClose,
  onEnded,
}: {
  visible: boolean;
  tripId: string;
  startOdometer: number | null;
  startEngineHours: number | null;
  onClose: () => void;
  onEnded: (summary: Summary) => void;
}) {
  const { t } = useTranslation();
  const loc = useLocationCapture();
  const insets = useSafeAreaInsets();
  const [odometer, setOdometer] = useState('');
  const [engine, setEngine] = useState('');
  const [odometerImg, setOdometerImg] = useState<PickedAsset | null>(null);
  const [engineImg, setEngineImg] = useState<PickedAsset | null>(null);
  const [remarks, setRemarks] = useState('');
  const [media, setMedia] = useState<PickedAsset[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!odometer.trim() && !odometerImg) {
      Alert.alert(t('trip.endModal.missingOdometerTitle'), t('trip.endModal.missingOdometerMessage'));
      return;
    }
    if (!engine.trim() && !engineImg) {
      Alert.alert(t('trip.endModal.missingOdometerTitle'), t('trip.endModal.missingEngineMessage'));
      return;
    }
    // Final readings can never be below what was entered at the start
    // (only when both numeric readings exist).
    if (startOdometer != null && odometer.trim() && Number(odometer) < startOdometer) {
      Alert.alert(t('trip.endModal.invalidOdometerTitle'), t('trip.endModal.invalidOdometerMessage', { n: startOdometer }));
      return;
    }
    if (startEngineHours != null && engine.trim() && Number(engine) < startEngineHours) {
      Alert.alert(t('trip.endModal.invalidEngineTitle'), t('trip.endModal.invalidEngineMessage', { n: startEngineHours }));
      return;
    }
    setBusy(true);
    try {
      const point = await loc.ensure();
      const [odoImg, engImg] = await Promise.all([
        odometerImg ? uploadMeterImage(odometerImg) : Promise.resolve(null),
        engineImg ? uploadMeterImage(engineImg) : Promise.resolve(null),
      ]);
      const res = await api.post(`/driver/trips/${tripId}/end`, {
        endOdometer: odometer.trim() ? Number(odometer) : undefined,
        endEngineHours: engine.trim() ? Number(engine) : undefined,
        endOdometerImageUrl: odoImg?.url,
        endOdometerImageKey: odoImg?.key,
        endEngineImageUrl: engImg?.url,
        endEngineImageKey: engImg?.key,
        endLatitude: point?.latitude,
        endLongitude: point?.longitude,
        endLocationName: point?.name,
        remarks: remarks.trim() || undefined,
      });
      // fire-and-forget end-phase media upload (trip already ended, media still attaches)
      media.forEach((a) => uploadAsset(tripId, 'END', a).catch(() => {}));
      onEnded(res.data.data.summary); // instant transition to summary
    } catch (e: any) {
      Alert.alert(t('trip.endModal.couldNotEndTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{t('trip.endModal.title')}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <MeterField
                label={t('trip.endModal.endOdometerLabel')}
                value={odometer}
                onChangeText={setOdometer}
                placeholder={startOdometer != null ? t('trip.endModal.endOdometerPlaceholderMin', { n: startOdometer }) : t('trip.endModal.endOdometerPlaceholder')}
                image={odometerImg}
                onPickImage={() => chooseMeterPhoto(setOdometerImg, t)}
                onRemoveImage={() => setOdometerImg(null)}
              />
              <MeterField
                label={t('trip.endModal.endEngineLabel')}
                value={engine}
                onChangeText={setEngine}
                placeholder={startEngineHours != null ? t('trip.endModal.endEnginePlaceholderMin', { n: startEngineHours }) : t('trip.endModal.endEnginePlaceholder')}
                image={engineImg}
                onPickImage={() => chooseMeterPhoto(setEngineImg, t)}
                onRemoveImage={() => setEngineImg(null)}
              />
              <LocationRow point={loc.point} loading={loc.loading} error={loc.error} onRefresh={loc.capture} />
              <MediaGrid
                items={media.map((m) => ({ uri: m.uri, type: m.type }))}
                onAdd={() => chooseMedia((assets) => setMedia((prev) => [...prev, ...assets]), t)}
              />
              <LabeledInput label={t('trip.remarks.label')} value={remarks} onChangeText={setRemarks} placeholder={t('trip.remarks.placeholder')} />
              <PrimaryButton title={t('trip.endModal.endButton')} onPress={submit} loading={busy} danger icon={<Ionicons name="stop-circle" size={16} color="#fff" />} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── phase: summary ───────────────────────────────────────────────────────────
function TripSummaryView({ summary, onDone }: { summary: Summary; onDone: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rows: [string, any][] = [
    [t('trip.summary.driver'), summary.driverName],
    [t('trip.summary.helper'), summary.helperName],
    [t('trip.summary.vehicle'), summary.vehicleNumber],
    [t('trip.summary.machine'), summary.machineNumber],
    [t('trip.summary.zone'), summary.zone],
    [t('trip.summary.route'), summary.route],
    [t('trip.summary.startTime'), summary.startTime ? timeStr(summary.startTime) : t('common.dash')],
    [t('trip.summary.endTime'), summary.endTime ? timeStr(summary.endTime) : t('common.dash')],
    [t('trip.summary.startLocation'), summary.startLocationName],
    [t('trip.summary.endLocation'), summary.endLocationName],
    [t('trip.summary.startOdometer'), summary.startOdometer],
    [t('trip.summary.endOdometer'), summary.endOdometer],
    [t('trip.summary.totalKm'), summary.totalKmRun],
    [t('trip.summary.engineHours'), summary.totalEngineRunningHours],
    [t('trip.summary.totalDuration'), fmtMins(summary.tripDurationMinutes)],
    [t('trip.summary.activeDuration'), fmtMins(summary.activeDurationMinutes)],
    [t('trip.summary.breakdownTime'), fmtMins(summary.breakdownMinutes)],
    [t('trip.summary.photosVideos'), `${summary.photosUploaded ?? 0} / ${summary.videosUploaded ?? 0}`],
    [t('trip.summary.remarks'), summary.remarks],
  ];
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.doneIcon}>
          <Ionicons name="checkmark-circle" size={44} color="#16a34a" />
        </View>
        <Text style={styles.h1}>{t('trip.summary.title')}</Text>
        <Text style={styles.sub}>{t('trip.summary.sub')}</Text>
        <View style={styles.card}>
          {rows.map(([label, value]) => (
            <DetailRow key={label} label={label} value={value == null ? t('common.dash') : String(value)} />
          ))}
        </View>
        <PrimaryButton title={t('trip.summary.done')} onPress={onDone} icon={<Ionicons name="checkmark" size={16} color="#fff" />} />
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

  routeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  routeChipText: { color: '#4f46e5', fontSize: 13, fontWeight: '600' },
  addRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  addRouteText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },
  routesHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addRouteMini: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  orText: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  meterAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6, height: 56, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  meterAddText: { color: '#6366f1', fontSize: 13.5, fontWeight: '600' },
  meterImgWrap: { marginTop: 6, borderRadius: 12, overflow: 'hidden', height: 150, backgroundColor: '#e2e8f0' },
  meterImg: { width: '100%', height: '100%' },
  meterImgRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.7)', alignItems: 'center', justifyContent: 'center' },
  yesNoRow: { flexDirection: 'row', gap: 10 },
  yesNo: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff' },
  yesNoActive: { borderColor: '#a5b4fc', backgroundColor: '#eef2ff' },
  yesNoText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
  yesNoTextActive: { color: '#4f46e5' },
  fuelAddedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  fuelAddedText: { fontSize: 13, color: '#16a34a', fontWeight: '600' },

  autoRow: { flexDirection: 'row', gap: 8 },
  autoBox: { flex: 1, backgroundColor: '#eef2ff', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 11 },
  autoLabel: { fontSize: 11, color: '#6366f1', fontWeight: '600' },
  autoValue: { fontSize: 14.5, color: '#312e81', fontWeight: '800', marginTop: 2 },
  locHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 2 },

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
