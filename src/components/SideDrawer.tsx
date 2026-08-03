import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/ctx';
import { useLanguage } from '@/i18n/LanguageContext';
import { LANGUAGES } from '@/i18n/languages';
import LanguagePicker from './LanguagePicker';

const { width } = Dimensions.get('window');
const PANEL = Math.min(320, width * 0.82);

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color="#6366f1" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

/**
 * SideDrawer — a slide-in left sidebar showing the signed-in driver's details
 * and a sign-out button. Opened from the home hamburger button.
 */
export default function SideDrawer({
  visible,
  onClose,
  vehicle,
  machine,
  roleLabel,
}: {
  visible: boolean;
  onClose: () => void;
  vehicle?: { plateNumber: string; modelName: string } | null;
  machine?: { machineNumber: string } | null;
  roleLabel?: string;
}) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { driver, signOut } = useSession();
  const tx = useRef(new Animated.Value(-PANEL)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const label = roleLabel ?? t('sideDrawer.driverRole');
  const currentLanguageName = LANGUAGES.find((l) => l.code === language)?.nativeName ?? 'English';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(tx, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, tx, fade]);

  const close = () => {
    Animated.parallel([
      Animated.timing(tx, { toValue: -PANEL, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 190, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const confirmSignOut = () => {
    Alert.alert(t('sideDrawer.signOutConfirmTitle'), t('sideDrawer.signOutConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('sideDrawer.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const initials = (driver?.name || 'D')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable style={styles.flex1} onPress={close} />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX: tx }] }]}>
          <SafeAreaView style={styles.flex1} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.name}>{driver?.name ?? label}</Text>
              <Text style={styles.role}>{label}{driver?.phone ? ` · ${driver.phone}` : ''}</Text>
            </View>

            {/* Details */}
            <View style={styles.body}>
              <Text style={styles.sectionLabel}>{t('sideDrawer.yourDetails')}</Text>
              <DetailRow icon="call-outline" label={t('sideDrawer.phone')} value={driver?.phone} />
              <DetailRow icon="location-outline" label={t('sideDrawer.address')} value={driver?.address} />
            </View>

            {/* Assignment (driver only) */}
            {(vehicle || machine) && (
              <View style={styles.body}>
                <Text style={styles.sectionLabel}>{t('sideDrawer.assignment')}</Text>
                <DetailRow
                  icon="car-outline"
                  label={t('sideDrawer.vehicleNo')}
                  value={vehicle ? `${vehicle.plateNumber}${vehicle.modelName ? ` · ${vehicle.modelName}` : ''}` : null}
                />
                <DetailRow icon="cog-outline" label={t('sideDrawer.machineNo')} value={machine?.machineNumber} />
              </View>
            )}

            {/* Language */}
            <Pressable style={styles.langRow} onPress={() => setLangPickerOpen(true)}>
              <View style={styles.rowIcon}>
                <Ionicons name="language-outline" size={16} color="#6366f1" />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.rowLabel}>{t('sideDrawer.language')}</Text>
                <Text style={styles.rowValue}>{currentLanguageName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </Pressable>

            <View style={styles.flex1} />

            {/* Sign out */}
            <Pressable onPress={confirmSignOut} style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <Text style={styles.signOutText}>{t('sideDrawer.signOut')}</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>

      <LanguagePicker visible={langPickerOpen} onClose={() => setLangPickerOpen(false)} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  flex1: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  panel: {
    width: PANEL,
    backgroundColor: '#fff',
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
    elevation: 12,
  },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  name: { fontSize: 19, fontWeight: '800', color: '#0f172a', marginTop: 12 },
  role: { fontSize: 13, color: '#64748b', marginTop: 2 },

  body: { paddingHorizontal: 20, paddingTop: 18 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginTop: 18, paddingVertical: 10 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 11.5, color: '#94a3b8', fontWeight: '600' },
  rowValue: { fontSize: 14.5, color: '#0f172a', fontWeight: '600', marginTop: 1 },

  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  signOutPressed: { backgroundColor: '#fee2e2' },
  signOutText: { color: '#dc2626', fontSize: 15, fontWeight: '700' },
});
