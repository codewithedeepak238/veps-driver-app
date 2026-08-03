import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api, { apiErrorMessage } from '@/lib/api';
import { captureSlip, pickSlip, uploadFuelSlip, type PickedAsset } from '@/lib/media';

type Target = 'VEHICLE' | 'MACHINE';
const CAPS: Record<Target, number> = { VEHICLE: 50, MACHINE: 35 };

type Entry = { liters: number | null; slip: PickedAsset | null };
const EMPTY: Entry = { liters: null, slip: null };

/**
 * FuelFillingModal — the shared "Add Fuel Filling" popup. The driver can fill
 * Vehicle, Machine, or BOTH in one go; each filled target is saved as its own
 * fuel-filling record. Used from the Fuel screen and the Start Trip toggle.
 */
export default function FuelFillingModal({
  visible,
  onClose,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [veh, setVeh] = useState<Entry>(EMPTY);
  const [mac, setMac] = useState<Entry>(EMPTY);
  const [litersFor, setLitersFor] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  const reset = () => {
    setVeh(EMPTY);
    setMac(EMPTY);
    setBusy(false);
  };

  const chooseSlip = (set: (a: PickedAsset) => void) => {
    Alert.alert(t('fuel.fuelSlipTitle'), undefined, [
      { text: t('common.takePhoto'), onPress: () => captureSlip().then((a) => a && set(a)).catch((e) => Alert.alert(t('common.camera'), e?.message || t('common.couldNotOpenCamera'))) },
      { text: t('common.chooseFromGallery'), onPress: () => pickSlip().then((a) => a && set(a)).catch((e) => Alert.alert(t('common.gallery'), e?.message || t('common.couldNotOpenGallery'))) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const litersOptions = useMemo(() => (litersFor ? Array.from({ length: CAPS[litersFor] }, (_, i) => i + 1) : []), [litersFor]);

  const submit = async () => {
    const entries: { target: Target; liters: number; slip: PickedAsset }[] = [];
    const collect = (target: Target, e: Entry): string | null => {
      if (e.liters == null && !e.slip) return null; // not started
      if (e.liters == null || !e.slip) return t('fuelModal.missingFieldsTemplate', { target: target === 'VEHICLE' ? t('fuelModal.vehicle').toLowerCase() : t('fuelModal.machine').toLowerCase() });
      entries.push({ target, liters: e.liters, slip: e.slip });
      return null;
    };
    const err = collect('VEHICLE', veh) || collect('MACHINE', mac);
    if (err) {
      Alert.alert(t('fuelModal.missingDetailsTitle'), err);
      return;
    }
    if (entries.length === 0) {
      Alert.alert(t('fuelModal.nothingToSaveTitle'), t('fuelModal.nothingToSaveMessage'));
      return;
    }
    setBusy(true);
    try {
      for (const en of entries) {
        const uploaded = await uploadFuelSlip(en.slip);
        await api.post('/driver/fuel-fillings', { target: en.target, liters: en.liters, slipS3Key: uploaded.key, slipUrl: uploaded.url });
      }
      reset();
      onDone();
    } catch (e: any) {
      Alert.alert(t('fuelModal.couldNotSaveTitle'), apiErrorMessage(e, t('common.pleaseTryAgain')));
      setBusy(false);
    }
  };

  const renderSection = (target: Target, e: Entry, setE: React.Dispatch<React.SetStateAction<Entry>>) => {
    const isVehicle = target === 'VEHICLE';
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={[styles.sectionIcon, { backgroundColor: isVehicle ? '#eff6ff' : '#ecfdf5' }]}>
            <MaterialCommunityIcons name={isVehicle ? 'truck' : 'engine'} size={18} color={isVehicle ? '#2563eb' : '#059669'} />
          </View>
          <Text style={styles.sectionTitle}>{isVehicle ? t('fuelModal.vehicle') : t('fuelModal.machine')}</Text>
          <Text style={styles.sectionCap}>{t('fuelModal.maxLiters', { n: CAPS[target] })}</Text>
        </View>

        <Pressable style={styles.dropdown} onPress={() => setLitersFor(target)}>
          <Text style={e.liters != null ? styles.ddValue : styles.ddPlaceholder}>
            {e.liters != null ? `${e.liters} L` : t('fuelModal.selectLiters')}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#94a3b8" />
        </Pressable>

        {e.slip ? (
          <View style={styles.slipWrap}>
            <Image source={{ uri: e.slip.uri }} style={styles.slipImg} />
            <Pressable style={styles.slipChange} onPress={() => chooseSlip((a) => setE((s) => ({ ...s, slip: a })))}>
              <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
              <Text style={styles.slipChangeText}>{t('fuelModal.change')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.slipAdd} onPress={() => chooseSlip((a) => setE((s) => ({ ...s, slip: a })))}>
            <Ionicons name="camera-outline" size={20} color="#6366f1" />
            <Text style={styles.slipAddText}>{t('fuelModal.addSlip')}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t('fuelModal.title')}</Text>
            <Pressable onPress={() => { reset(); onClose(); }} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 560 }}>
            <Text style={styles.hint}>{t('fuelModal.hint')}</Text>
            {renderSection('VEHICLE', veh, setVeh)}
            <View style={{ height: 12 }} />
            {renderSection('MACHINE', mac, setMac)}

            <View style={{ height: 18 }} />
            <Pressable onPress={submit} disabled={busy} style={styles.pbWrap}>
              <LinearGradient colors={busy ? ['#cbd5e1', '#cbd5e1'] : ['#3b6ef6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pb}>
                {busy ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.pbText}>{t('fuelModal.save')}</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* liters picker */}
      <Modal visible={litersFor != null} transparent animationType="fade" onRequestClose={() => setLitersFor(null)}>
        <Pressable style={styles.ddBackdrop} onPress={() => setLitersFor(null)}>
          <Pressable style={styles.ddSheet} onPress={() => {}}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>{litersFor ? t('fuelModal.selectLitersWithMax', { n: CAPS[litersFor] }) : t('fuelModal.selectLiters')}</Text>
              <Pressable onPress={() => setLitersFor(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 360 }}>
              {litersOptions.map((n) => (
                <Pressable
                  key={n}
                  style={styles.ddItem}
                  onPress={() => {
                    const target = litersFor;
                    if (target === 'VEHICLE') setVeh((s) => ({ ...s, liters: n }));
                    else if (target === 'MACHINE') setMac((s) => ({ ...s, liters: n }));
                    setLitersFor(null);
                  }}
                >
                  <Text style={styles.ddItemText}>{n} L</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12.5, color: '#94a3b8', marginBottom: 12 },
  section: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eef0f4', borderRadius: 16, padding: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', flex: 1 },
  sectionCap: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600' },

  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  ddValue: { fontSize: 15, color: '#0f172a' },
  ddPlaceholder: { fontSize: 15, color: '#9aa3b2' },
  ddBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  ddSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  ddItemText: { fontSize: 15, color: '#334155' },

  slipAdd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, height: 76, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#c7d2fe', backgroundColor: '#eef2ff' },
  slipAddText: { color: '#6366f1', fontSize: 13.5, fontWeight: '600' },
  slipWrap: { marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 150, backgroundColor: '#e2e8f0' },
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
});
