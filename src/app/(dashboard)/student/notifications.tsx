import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
};

type AppNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
};

const TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  grade_added: { icon: 'star', color: '#22C55E' },
  grade_updated: { icon: 'star-half', color: '#84CC16' },
  attendance_marked: { icon: 'calendar', color: '#4C6FFF' },
  schedule_changed: { icon: 'time', color: '#F59E0B' },
  announcement: { icon: 'megaphone', color: '#8B5CF6' },
  parent_linked: { icon: 'people', color: '#EC4899' },
};

export default function StudentNotifications() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userData?.id) {
        setLoading(false);
        return;
      }

      setUserId(userData.id);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setUnreadCount(0);
      } else {
        const list = (data || []) as AppNotification[];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    const screen = notification.data?.screen;
    if (screen && typeof screen === 'string') {
      // Cast to any to bypass strict typed-routes for dynamic strings
      router.push(screen as any);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color={NEU.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={NEU.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.iconBtn}>
            <Ionicons name="checkmark-done" size={18} color={NEU.accent} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={NEU.accent}
            colors={[NEU.accent]}
          />
        }
      >
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const typeInfo = TYPE_ICONS[notification.type] || {
              icon: 'notifications',
              color: NEU.accent,
            };

            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.notificationUnread,
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.notificationIcon,
                    { backgroundColor: typeInfo.color + '20' },
                  ]}
                >
                  <Ionicons
                    name={typeInfo.icon as any}
                    size={20}
                    color={typeInfo.color}
                  />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    {!notification.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationBody} numberOfLines={3}>
                    {notification.body}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTime(notification.created_at)}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={NEU.textFaint} />
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={44} color={NEU.textFaint} />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll see updates about your grades, attendance, and schedule here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  container: { flex: 1 },
  contentContainer: { padding: spacing.md, paddingBottom: spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOrb: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: spacing.sm,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: NEU.text },
  unreadBadge: {
    backgroundColor: NEU.accent,
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, minWidth: 20, alignItems: 'center',
  },
  unreadBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  notificationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, borderRadius: 16,
    padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
    gap: spacing.sm,
  },
  notificationUnread: {
    borderLeftWidth: 3,
    borderLeftColor: NEU.accent,
  },
  notificationIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notificationTitle: {
    fontSize: typography.sizes.sm, fontWeight: '700',
    color: NEU.text, flex: 1,
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: NEU.accent,
  },
  notificationBody: {
    fontSize: typography.sizes.xs, color: NEU.textMuted,
    marginTop: 4, lineHeight: 16,
  },
  notificationTime: {
    fontSize: 10, color: NEU.textFaint, marginTop: 6, fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center', padding: spacing.xxxl,
    backgroundColor: NEU.bg, borderRadius: 20, marginTop: spacing.lg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  emptyText: {
    fontSize: typography.sizes.md, color: NEU.textMuted,
    marginTop: spacing.md, fontWeight: '600',
  },
  emptySubtext: {
    fontSize: typography.sizes.sm, color: NEU.textFaint,
    textAlign: 'center', marginTop: spacing.xs,
  },
});