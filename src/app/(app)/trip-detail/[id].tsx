import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import MediaViewer, { type ViewableMedia } from '@/components/MediaViewer';
import { reasonLabel } from '@/lib/reasons';

const t12 = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true } as any) : '—';
const fmtMins = (m?: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

function Row({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value == null || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

export default function TripDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ViewableMedia | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/driver/trips/${id}`)
      .then((r) => {
        setTrip(r.data.data.trip);
        setSummary(r.data.data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }
  if (!trip || !summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{t('tripDetail.notFound')}</Text>
      </View>
    );
  }

  const breakdowns = trip.breakdowns ?? [];
  const media = trip.media ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tripDetail.summaryTitle')}</Text>
          <Row label={t('tripDetail.driver')} value={summary.driverName} />
          <Row label={t('tripDetail.helper')} value={summary.helperName} />
          <Row label={t('tripDetail.vehicle')} value={summary.vehicleNumber} />
          <Row label={t('tripDetail.machine')} value={summary.machineNumber} />
          <Row label={t('tripDetail.zone')} value={summary.zone} />
          <Row label={t('tripDetail.route')} value={summary.route} />
          <Row label={t('tripDetail.startTime')} value={t12(summary.startTime)} />
          <Row label={t('tripDetail.endTime')} value={t12(summary.endTime)} />
          <Row label={t('tripDetail.startLocation')} value={summary.startLocationName} />
          <Row label={t('tripDetail.endLocation')} value={summary.endLocationName} />
          <Row label={t('tripDetail.startOdometer')} value={summary.startOdometer} />
          <Row label={t('tripDetail.endOdometer')} value={summary.endOdometer} />
          <Row label={t('tripDetail.totalKm')} value={summary.totalKmRun} />
          <Row label={t('tripDetail.engineHours')} value={summary.totalEngineRunningHours} />
          <Row label={t('tripDetail.totalDuration')} value={fmtMins(summary.tripDurationMinutes)} />
          <Row label={t('tripDetail.activeDuration')} value={fmtMins(summary.activeDurationMinutes)} />
          <Row label={t('tripDetail.breakdownTime')} value={fmtMins(summary.breakdownMinutes)} />
          <Row label={t('tripDetail.remarks')} value={summary.remarks} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tripDetail.breakdownsTemplate', { count: breakdowns.length })}</Text>
          {breakdowns.length === 0 ? (
            <Text style={styles.muted}>{t('tripDetail.noBreakdowns')}</Text>
          ) : (
            breakdowns.map((b: any) => (
              <View key={b.id} style={styles.bd}>
                <View style={styles.bdDot} />
                <View style={styles.flex1}>
                  <Text style={styles.bdReason}>{reasonLabel(b.reason, t)}</Text>
                  {b.note ? <Text style={styles.bdNote}>{b.note}</Text> : null}
                  <Text style={styles.bdTime}>
                    {t12(b.startedAt)}{b.resolvedAt ? ` → ${t12(b.resolvedAt)}` : ` · ${t('tripDetail.ongoing')}`}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tripDetail.mediaTemplate', { count: media.length })}</Text>
          {media.length === 0 ? (
            <Text style={styles.muted}>{t('tripDetail.noMedia')}</Text>
          ) : (
            <View style={styles.mediaGrid}>
              {media.map((m: any) => (
                <Pressable key={m.id} style={styles.thumb} onPress={() => setViewing({ type: m.type, url: m.url })}>
                  {m.type === 'PHOTO' ? (
                    <Image source={{ uri: m.url }} style={styles.thumbImg} />
                  ) : (
                    <View style={styles.thumbVideo}>
                      <Ionicons name="play-circle" size={26} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <MediaViewer item={viewing} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fc' },
  muted: { color: '#94a3b8', fontSize: 13 },
  flex1: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#eef0f4' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 12 },
  rowLabel: { fontSize: 14, color: '#64748b' },
  rowValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  bd: { flexDirection: 'row', gap: 10, paddingVertical: 8 },
  bdDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b', marginTop: 6 },
  bdReason: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  bdNote: { fontSize: 13, color: '#64748b', marginTop: 1 },
  bdTime: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 88, height: 88, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  thumbImg: { width: '100%', height: '100%' },
  thumbVideo: { width: '100%', height: '100%', backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
});
