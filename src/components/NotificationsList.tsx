import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import api from '@/lib/api';
import { useInfiniteList } from '@/lib/useInfiniteList';

export type Notif = {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  tripId: string | null;
  breakdownId: string | null;
  createdAt: string;
};

function iconFor(type: string): { name: any; lib: 'ion' | 'mci'; color: string; bg: string } {
  switch (type) {
    case 'BREAKDOWN_RAISED':
      return { name: 'alert-circle', lib: 'ion', color: '#b45309', bg: '#fffbeb' };
    case 'BREAKDOWN_ACCEPTED':
      return { name: 'wrench', lib: 'mci', color: '#2563eb', bg: '#eff6ff' };
    case 'BREAKDOWN_FIXED':
      return { name: 'checkmark-circle', lib: 'ion', color: '#16a34a', bg: '#ecfdf5' };
    case 'TRIP_STARTED':
    case 'TRIP_ENDED':
      return { name: 'navigate', lib: 'ion', color: '#4f46e5', bg: '#eef2ff' };
    default:
      return { name: 'notifications', lib: 'ion', color: '#64748b', bg: '#f1f5f9' };
  }
}

const relTime = (iso: string, t: TFunction) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('common.justNow');
  if (m < 60) return t('common.minutesAgo', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('common.hoursAgo', { h });
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' } as any);
};

export default function NotificationsList({
  endpoint,
  onPressItem,
}: {
  endpoint: string;
  onPressItem?: (n: Notif) => void;
}) {
  const { t } = useTranslation();
  const { items, loading, loadingMore, refreshing, reload, loadMore } = useInfiniteList<Notif>(endpoint, 'notifications');

  // Live updates: silent refresh on focus, poll every 12s while focused, and
  // refresh immediately when a notification arrives in the foreground.
  useFocusEffect(
    useCallback(() => {
      reload(true);
      const interval = setInterval(() => reload(true), 12000);
      const sub = Notifications.addNotificationReceivedListener(() => reload(true));
      return () => {
        clearInterval(interval);
        sub.remove();
      };
    }, [reload]),
  );

  const markAll = async () => {
    try {
      await api.patch(`${endpoint}/read-all`);
      reload();
    } catch {
      /* noop */
    }
  };

  const onItem = (n: Notif) => {
    if (!n.isRead) api.patch(`${endpoint}/${n.id}/read`).catch(() => {});
    onPressItem?.(n);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const anyUnread = items.some((n) => !n.isRead);

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      refreshing={refreshing}
      onRefresh={reload}
      ListHeaderComponent={
        anyUnread ? (
          <Pressable onPress={markAll} style={styles.markAll}>
            <Ionicons name="checkmark-done" size={16} color="#2563eb" />
            <Text style={styles.markAllText}>{t('notifications.markAllAsRead')}</Text>
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>{t('notifications.noneYet')}</Text>
        </View>
      }
      ListFooterComponent={loadingMore ? <View style={styles.footer}><ActivityIndicator size="small" color="#94a3b8" /></View> : null}
      renderItem={({ item }) => {
        const ic = iconFor(item.type);
        return (
          <Pressable onPress={() => onItem(item)} style={[styles.row, !item.isRead && styles.rowUnread]}>
            <View style={[styles.icon, { backgroundColor: ic.bg }]}>
              {ic.lib === 'ion' ? (
                <Ionicons name={ic.name} size={18} color={ic.color} />
              ) : (
                <MaterialCommunityIcons name={ic.name} size={18} color={ic.color} />
              )}
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.message, !item.isRead && styles.messageUnread]}>{item.message}</Text>
              <Text style={styles.time}>{relTime(item.createdAt, t)}</Text>
            </View>
            {!item.isRead && <View style={styles.dot} />}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6f8fc' },
  list: { padding: 16, gap: 10 },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 4, marginBottom: 2 },
  markAllText: { color: '#2563eb', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 90, gap: 8 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  footer: { paddingVertical: 16 },
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#eef0f4' },
  rowUnread: { borderColor: '#dbeafe', backgroundColor: '#f8fbff' },
  icon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 14, color: '#334155', lineHeight: 19 },
  messageUnread: { color: '#0f172a', fontWeight: '600' },
  time: { fontSize: 11.5, color: '#94a3b8', marginTop: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
});
