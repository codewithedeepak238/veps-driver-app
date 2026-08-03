import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/i18n/LanguageContext';
import { LANGUAGES } from '@/i18n/languages';

/**
 * Full-screen language picker. Reachable from the sidebar and from the home
 * header (globe icon) on both the driver and mechanic apps. Languages
 * without a translation file yet are still listed (marked "pending") so the
 * driver can see the full set of Indian languages the app plans to support.
 */
export default function LanguagePicker({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.flex1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.flex1}>
              <Text style={styles.title}>{t('languagePicker.title')}</Text>
              <Text style={styles.subtitle}>{t('languagePicker.subtitle')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(l) => l.code}
            style={styles.list}
            renderItem={({ item }) => {
              const active = item.code === language;
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => {
                    setLanguage(item.code);
                    onClose();
                  }}
                >
                  <View style={styles.flex1}>
                    <Text style={[styles.native, active && styles.nativeActive]}>{item.nativeName}</Text>
                    <Text style={styles.english}>
                      {item.englishName}
                      {!item.hasTranslations ? ` · ${t('languagePicker.pendingNote')}` : ''}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={22} color="#2563eb" />}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingTop: 18 },
  head: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12.5, color: '#64748b', marginTop: 3 },
  list: { paddingHorizontal: 12, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 12 },
  rowActive: { backgroundColor: '#eff6ff' },
  native: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  nativeActive: { color: '#1d4ed8' },
  english: { fontSize: 12.5, color: '#94a3b8', marginTop: 1 },
});
