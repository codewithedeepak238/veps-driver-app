import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useInfiniteList } from '@/lib/useInfiniteList';
import FuelFillingModal from '@/components/FuelFillingModal';

type Target = 'VEHICLE' | 'MACHINE';
type Fuel = {
  id: string;
  target: Target;
  liters: number;
  vehiclePlate: string | null;
  machineNumber: string | null;
  slipUrl: string;
  filledAt: string;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short', hour12: true } as any);

export default function FuelScreen() {
  const { t } = useTranslation();
  const { items, loading, loadingMore, refreshing, reload, loadMore } = useInfiniteList<Fuel>(
    '/driver/fuel-fillings',
    'fuelFillings',
  );
  const [showAdd, setShowAdd] = useState(false);
  const [preview, setPreview] = useState<Fuel | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(f) => f.id}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={reload}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="fuel" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t('fuel.noneYet')}</Text>
              <Text style={styles.emptySub}>{t('fuel.tapToAdd')}</Text>
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
            const isVehicle = item.target === 'VEHICLE';
            return (
              <Pressable style={styles.card} onPress={() => setPreview(item)}>
                <View style={[styles.cardIcon, { backgroundColor: isVehicle ? '#eff6ff' : '#ecfdf5' }]}>
                  <MaterialCommunityIcons
                    name={isVehicle ? 'truck' : 'engine'}
                    size={22}
                    color={isVehicle ? '#2563eb' : '#059669'}
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.cardTitle}>
                    {item.liters} L · {isVehicle ? t('fuel.vehicle') : t('fuel.machine')}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {(isVehicle ? item.vehiclePlate : item.machineNumber) || t('common.dash')}
                  </Text>
                  <Text style={styles.cardDate}>{fmt(item.filledAt)}</Text>
                </View>
                {item.slipUrl ? <Image source={{ uri: item.slipUrl }} style={styles.thumb} /> : null}
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
        <LinearGradient colors={['#3b6ef6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>

      <FuelFillingModal visible={showAdd} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload(); }} />
      <SlipPreview fuel={preview} onClose={() => setPreview(null)} />
    </SafeAreaView>
  );
}

// ── slip preview ─────────────────────────────────────────────────────────────
function SlipPreview({ fuel, onClose }: { fuel: Fuel | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal visible={!!fuel} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.previewBackdrop} onPress={onClose}>
        <Pressable style={styles.previewCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t('fuel.fuelSlipTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>
          {fuel && (
            <>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('fuel.filledIn')}</Text>
                <Text style={styles.previewValue}>{fuel.target === 'VEHICLE' ? t('fuel.vehicle') : t('fuel.machine')}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('fuel.quantity')}</Text>
                <Text style={styles.previewValue}>{fuel.liters} L</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{t('fuel.when')}</Text>
                <Text style={styles.previewValue}>{fmt(fuel.filledAt)}</Text>
              </View>
              {fuel.slipUrl ? (
                <Image source={{ uri: fuel.slipUrl }} style={styles.previewImg} resizeMode="contain" />
              ) : null}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 96 },
  empty: { alignItems: 'center', paddingTop: 90, gap: 6 },
  emptyText: { color: '#64748b', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#94a3b8', fontSize: 13 },
  footer: { paddingVertical: 16 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#eef0f4' },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15.5, fontWeight: '800', color: '#0f172a' },
  cardMeta: { fontSize: 13, color: '#475569', marginTop: 1 },
  cardDate: { fontSize: 11.5, color: '#94a3b8', marginTop: 2 },
  thumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#e2e8f0' },

  fab: { position: 'absolute', right: 20, bottom: 24, borderRadius: 30, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabInner: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },

  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  targetRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  targetChip: { flex: 1, alignItems: 'center', gap: 3, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 14 },
  targetChipActive: { borderColor: '#a5b4fc', backgroundColor: '#eef2ff' },
  targetText: { fontSize: 14, fontWeight: '700', color: '#475569', marginTop: 2 },
  targetTextActive: { color: '#4f46e5' },
  targetCap: { fontSize: 11, color: '#94a3b8' },

  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 50, marginTop: 8 },
  ddValue: { fontSize: 15, color: '#0f172a' },
  ddPlaceholder: { fontSize: 15, color: '#9aa3b2' },
  ddBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  ddSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  ddItemText: { fontSize: 15, color: '#334155' },
  ddItemActive: { color: '#2563eb', fontWeight: '700' },

  slipAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, height: 90, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  slipAddText: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  slipWrap: { marginTop: 8, borderRadius: 12, overflow: 'hidden', height: 180, backgroundColor: '#e2e8f0' },
  slipImg: { width: '100%', height: '100%' },
  slipChange: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(15,23,42,0.7)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  slipChangeText: { color: '#fff', fontSize: 12.5, fontWeight: '600' },

  pbWrap: { borderRadius: 12, overflow: 'hidden' },
  pb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52 },
  pbText: { color: '#fff', fontSize: 15.5, fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#f6f8fc', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },

  previewBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  previewCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  previewLabel: { fontSize: 13.5, color: '#64748b' },
  previewValue: { fontSize: 13.5, color: '#0f172a', fontWeight: '700' },
  previewImg: { width: '100%', height: 320, borderRadius: 12, marginTop: 12, backgroundColor: '#f1f5f9' },
});
