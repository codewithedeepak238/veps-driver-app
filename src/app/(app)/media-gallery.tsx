import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import MediaViewer, { type ViewableMedia } from '@/components/MediaViewer';

type Media = { id: string; type: 'PHOTO' | 'VIDEO'; phase: string; url: string; uploadedAt: string };

export default function MediaGalleryScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<ViewableMedia | null>(null);

  useEffect(() => {
    api
      .get('/driver/media')
      .then((r) => setItems(r.data.data.media))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>{t('mediaGallery.noneToday')}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.grid}>
            {items.map((m) => (
              <Pressable key={m.id} style={styles.tile} onPress={() => setViewing({ type: m.type, url: m.url })}>
                {m.type === 'PHOTO' ? (
                  <Image source={{ uri: m.url }} style={styles.img} />
                ) : (
                  <View style={styles.video}>
                    <Ionicons name="play-circle" size={30} color="#fff" />
                  </View>
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{m.phase}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      <MediaViewer item={viewing} onClose={() => setViewing(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fc' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  scroll: { padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e8f0' },
  img: { width: '100%', height: '100%' },
  video: { width: '100%', height: '100%', backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 10, textAlign: 'center', fontWeight: '600' },
});
