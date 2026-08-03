import { useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

export type ViewableMedia = { type: 'PHOTO' | 'VIDEO'; url: string };

/**
 * Full-screen in-app viewer for a photo or video. Opening media in a modal
 * keeps the driver inside the app instead of bouncing out to the browser.
 */
export default function MediaViewer({ item, onClose }: { item: ViewableMedia | null; onClose: () => void }) {
  const isVideo = item?.type === 'VIDEO';

  // The player is created once; we swap the source when a video is opened.
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (isVideo && item) {
      player.replace(item.url);
      player.play();
    } else {
      player.pause();
    }
  }, [item, isVideo, player]);

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>

        {/* Tapping the empty area closes; the media itself does not. */}
        <Pressable style={styles.fill} onPress={onClose}>
          {item ? (
            isVideo ? (
              <Pressable onPress={() => {}} style={styles.mediaWrap}>
                <VideoView player={player} style={styles.media} contentFit="contain" nativeControls allowsFullscreen />
              </Pressable>
            ) : (
              <Pressable onPress={() => {}} style={styles.mediaWrap}>
                <Image source={{ uri: item.url }} style={styles.media} resizeMode="contain" />
              </Pressable>
            )
          ) : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mediaWrap: { width: '100%', height: '80%' },
  media: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
