import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api, { apiErrorMessage } from '@/lib/api';
import { capturePhoto, pickMedia, uploadRepairMedia, type PickedAsset } from '@/lib/media';
import MediaViewer, { type ViewableMedia } from '@/components/MediaViewer';
import { MechRequest, getStatusMeta, reasonLabel, RepairStatus, timeStr } from '@/lib/requests';

function Row({ label, value }: { label: string; value?: string | null }) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || t('common.dash')}</Text>
    </View>
  );
}

export default function RequestDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [req, setReq] = useState<MechRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showFix, setShowFix] = useState(false);
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<ViewableMedia | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/mechanic/requests/${id}`);
      setReq(r.data.data.request);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const accept = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/mechanic/requests/${id}/accept`);
      setReq(r.data.data.request);
    } catch (e: any) {
      Alert.alert(t('requestDetail.couldNotAcceptTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
    } finally {
      setBusy(false);
    }
  };

  const markFixed = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/mechanic/requests/${id}/fix`, { note: note.trim() || undefined });
      setReq(r.data.data.request);
      setShowFix(false);
      setNote('');
    } catch (e: any) {
      Alert.alert(t('requestDetail.couldNotSubmitTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async (assets: PickedAsset[]) => {
    setUploading(true);
    try {
      for (const a of assets) await uploadRepairMedia(String(id), a);
      await load();
    } catch (e: any) {
      Alert.alert(t('requestDetail.uploadFailedTitle'), apiErrorMessage(e, t('requestDetail.couldNotUploadPhoto')));
    } finally {
      setUploading(false);
    }
  };
  const choosePhoto = () => {
    Alert.alert(t('requestDetail.addRepairPhotoTitle'), undefined, [
      { text: t('common.takePhoto'), onPress: () => capturePhoto().then((a) => a && addPhotos(a)).catch((e) => Alert.alert(t('common.camera'), e?.message || t('common.couldNotOpenCamera'))) },
      { text: t('common.chooseFromGallery'), onPress: () => pickMedia(true).then((a) => a && addPhotos(a)).catch((e) => Alert.alert(t('common.gallery'), e?.message || t('common.couldNotOpenGallery'))) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }
  if (!req) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('requestDetail.notFound')}</Text>
      </View>
    );
  }

  const STATUS_META = getStatusMeta(t);
  const st = STATUS_META[(req.repairStatus ?? 'PENDING') as RepairStatus];
  const isVehicle = req.reason === 'VEHICLE_ISSUE';
  const asset = isVehicle ? req.trip?.vehiclePlate : req.trip?.machineNumber;
  const phone = req.trip?.driver?.phone;
  const lat = req.trip?.startLatitude;
  const lng = req.trip?.startLongitude;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.headerRow}>
          <View style={styles.reasonWrap}>
            <View style={[styles.reasonIcon, { backgroundColor: isVehicle ? '#eff6ff' : '#ecfdf5' }]}>
              <MaterialCommunityIcons name={isVehicle ? 'truck' : 'engine'} size={20} color={isVehicle ? '#2563eb' : '#047857'} />
            </View>
            <Text style={styles.reason}>{reasonLabel(req.reason, t)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
            <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Row label={t('requestDetail.driver')} value={req.trip?.driver?.name} />
          <Row label={t('requestDetail.phone')} value={phone} />
          <Row label={isVehicle ? t('requestDetail.vehicle') : t('requestDetail.machine')} value={asset} />
          <Row label={t('requestDetail.zone')} value={req.trip?.zone?.name} />
          <Row label={t('requestDetail.reportedAt')} value={timeStr(req.startedAt)} />
          <Row label={t('requestDetail.location')} value={req.trip?.startLocationName} />
          {req.note ? <Row label={t('requestDetail.driversNote')} value={req.note} /> : null}
        </View>

        {(phone || (lat != null && lng != null)) && (
          <View style={styles.quickRow}>
            {phone ? (
              <Pressable style={styles.quickBtn} onPress={() => Linking.openURL(`tel:${phone}`)}>
                <Ionicons name="call" size={16} color="#2563eb" />
                <Text style={styles.quickText}>{t('requestDetail.callDriver')}</Text>
              </Pressable>
            ) : null}
            {lat != null && lng != null ? (
              <Pressable style={styles.quickBtn} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)}>
                <Ionicons name="location" size={16} color="#2563eb" />
                <Text style={styles.quickText}>{t('requestDetail.directions')}</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* Status timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('requestDetail.progressTitle')}</Text>
          <TimelineRow done label={t('requestDetail.reported')} time={req.startedAt} />
          <TimelineRow done={!!req.acceptedAt} label={t('requestDetail.acceptedByYou')} time={req.acceptedAt} />
          <TimelineRow done={!!req.fixedAt} label={t('requestDetail.fixed')} time={req.fixedAt} last />
          {req.mechanicNote ? (
            <View style={styles.mechNote}>
              <Text style={styles.mechNoteLabel}>{t('requestDetail.yourNote')}</Text>
              <Text style={styles.mechNoteText}>{req.mechanicNote}</Text>
            </View>
          ) : null}
        </View>

        {/* Repair photos (visible once accepted) */}
        {(req.repairStatus === 'ACCEPTED' || req.repairStatus === 'FIXED') && (
          <View style={styles.card}>
            <View style={styles.photoHead}>
              <Text style={styles.cardTitle}>{t('requestDetail.repairPhotosTemplate', { count: req.repairMedia?.length ?? 0 })}</Text>
              {req.repairStatus === 'ACCEPTED' && (
                <Pressable style={styles.addPhotoBtn} onPress={choosePhoto} disabled={uploading}>
                  {uploading ? <ActivityIndicator size="small" color="#6366f1" /> : <Ionicons name="camera" size={16} color="#6366f1" />}
                  <Text style={styles.addPhotoText}>{uploading ? t('requestDetail.uploading') : t('requestDetail.addPhoto')}</Text>
                </Pressable>
              )}
            </View>
            {req.repairMedia && req.repairMedia.length > 0 ? (
              <View style={styles.photoGrid}>
                {req.repairMedia.map((m) => (
                  <Pressable key={m.id} style={styles.thumb} onPress={() => setViewing({ type: 'PHOTO', url: m.url })}>
                    <Image source={{ uri: m.url }} style={styles.thumbImg} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>{req.repairStatus === 'ACCEPTED' ? t('requestDetail.addPhotosHint') : t('requestDetail.noPhotosAdded')}</Text>
            )}
          </View>
        )}

        {req.repairStatus === 'PENDING' && (
          <Pressable onPress={accept} disabled={busy} style={styles.pbWrap}>
            <LinearGradient colors={['#3b6ef6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pb}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.pbText}>{t('requestDetail.acceptRequest')}</Text></>}
            </LinearGradient>
          </Pressable>
        )}
        {req.repairStatus === 'ACCEPTED' && (
          <Pressable onPress={() => setShowFix(true)} style={styles.pbWrap}>
            <LinearGradient colors={['#16a34a', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pb}>
              <Ionicons name="construct" size={16} color="#fff" />
              <Text style={styles.pbText}>{t('requestDetail.markAsFixed')}</Text>
            </LinearGradient>
          </Pressable>
        )}
        {req.repairStatus === 'FIXED' && (
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.doneText}>{req.fixedAt ? t('requestDetail.fixedAtTemplate', { time: timeStr(req.fixedAt) }) : t('requestDetail.fixedNoTime')}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showFix} transparent animationType="slide" onRequestClose={() => setShowFix(false)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
              <View style={styles.modalHead}>
                <Text style={styles.modalTitle}>{t('requestDetail.modalTitle')}</Text>
                <Pressable onPress={() => setShowFix(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#64748b" />
                </Pressable>
              </View>
              <Text style={styles.label}>{t('requestDetail.feedbackLabel')}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t('requestDetail.feedbackPlaceholder')}
                placeholderTextColor="#9aa3b2"
                multiline
                style={styles.input}
              />
              <Pressable onPress={markFixed} disabled={busy} style={styles.pbWrap}>
                <LinearGradient colors={['#16a34a', '#15803d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pb}>
                  {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark" size={16} color="#fff" /><Text style={styles.pbText}>{t('requestDetail.submit')}</Text></>}
                </LinearGradient>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <MediaViewer item={viewing} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}

function TimelineRow({ done, label, time, last }: { done?: boolean; label: string; time?: string | null; last?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlLeft}>
        <View style={[styles.tlDot, done ? styles.tlDotDone : styles.tlDotPending]} />
        {!last && <View style={styles.tlLine} />}
      </View>
      <View style={styles.tlBody}>
        <Text style={[styles.tlLabel, done && styles.tlLabelDone]}>{label}</Text>
        {time ? <Text style={styles.tlTime}>{timeStr(time)}</Text> : <Text style={styles.tlPending}>{t('requestDetail.pending')}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fc' },
  muted: { color: '#94a3b8', fontSize: 14 },
  scroll: { padding: 16, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reasonWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reasonIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  reason: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eef0f4' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  rowLabel: { fontSize: 14, color: '#64748b' },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe' },
  quickText: { color: '#2563eb', fontSize: 14, fontWeight: '700' },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlLeft: { alignItems: 'center', width: 16 },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  tlDotDone: { backgroundColor: '#16a34a' },
  tlDotPending: { backgroundColor: '#cbd5e1' },
  tlLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: 14 },
  tlLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  tlLabelDone: { color: '#0f172a' },
  tlTime: { fontSize: 12, color: '#64748b', marginTop: 1 },
  tlPending: { fontSize: 12, color: '#cbd5e1', marginTop: 1 },
  photoHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#eef2ff' },
  addPhotoText: { color: '#6366f1', fontSize: 12.5, fontWeight: '700' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  thumbImg: { width: '100%', height: '100%' },
  mechNote: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginTop: 4 },
  mechNoteLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
  mechNoteText: { fontSize: 14, color: '#334155', marginTop: 3 },
  pbWrap: { borderRadius: 12, overflow: 'hidden' },
  pb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
  pbText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  doneBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 12, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0' },
  doneText: { color: '#047857', fontSize: 15, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#f6f8fc', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#0f172a', minHeight: 90, textAlignVertical: 'top' },
});
