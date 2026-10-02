import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'meeting';
  priority: 'normal' | 'important' | 'urgent';
  read: boolean;
  is_read: boolean;
  created_at: string;
};

const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  accent: '#4C6FFF',
  danger: '#EF4444',
  warning: '#F59E0B',
};

type Props = {
  /** Optional custom color for the bell icon */
  iconColor?: string;
};

export default function NotificationBell({ iconColor = NEU.text }: Props) {
  const [count, setCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const mountedRef = useRef(true);

  // ===== Fetch unread count =====
  const loadUnreadCount = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userData?.id) return;

      const { count: unread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id)
        .eq('read', false);

      if (mountedRef.current) setCount(unread || 0);
    } catch (e) {
      console.error('NotificationBell count error:', e);
    }
  };

  // ===== Fetch notification list for the modal =====
  const loadNotifications = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userData?.id) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (mountedRef.current) setItems(data || []);
    } catch (e) {
      console.error('NotificationBell list error:', e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // ===== Initial load + polling every 30s =====
  useEffect(() => {
    mountedRef.current = true;
    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // ===== Realtime subscription (badge updates instantly) =====
  useEffect(() => {
    let localChannel: any = null;
    let cancelled = false;

    (async () => {
      try {
        const email = await AsyncStorage.getItem('userEmail');
        if (!email || cancelled) return;

        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!userData?.id || cancelled) return;

        localChannel = supabase
          .channel(`notif-bell-${userData.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userData.id}`,
            },
            () => loadUnreadCount()
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${userData.id}`,
            },
            () => loadUnreadCount()
          )
          .subscribe();
      } catch (e) {
        console.error('NotificationBell subscribe error:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (localChannel) supabase.removeChannel(localChannel);
    };
  }, []);

  // ===== Open the modal and load fresh list =====
  const handlePress = () => {
    setModalOpen(true);
    loadNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, is_read: true })
        .eq('id', id);

      setItems(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true, is_read: true } : n))
      );
      loadUnreadCount();
    } catch (e) {
      console.error('markAsRead error:', e);
    }
  };

  const markAllRead = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (!userData?.id) return;

      await supabase
        .from('notifications')
        .update({ read: true, is_read: true })
        .eq('user_id', userData.id)
        .eq('read', false);

      setItems(prev => prev.map(n => ({ ...n, read: true, is_read: true })));
      loadUnreadCount();
    } catch (e) {
      console.error('markAllRead error:', e);
    }
  };

  const priorityStyle = (p: Notification['priority']) => {
    if (p === 'urgent') return { borderLeftColor: NEU.danger, borderLeftWidth: 4 };
    if (p === 'important') return { borderLeftColor: NEU.warning, borderLeftWidth: 4 };
    return {};
  };

  return (
    <>
      {/* Bell Button */}
      <TouchableOpacity style={styles.iconBtn} onPress={handlePress} activeOpacity={0.7}>
        <Ionicons name="notifications-outline" size={20} color={iconColor} />
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Inline Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalOpen(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Notifications</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={markAllRead}>
                <Ionicons name="checkmark-done" size={22} color={NEU.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={22} color={NEU.text} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 30 }} color={NEU.accent} />
          ) : items.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={40} color={NEU.textMuted} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const accent =
                  item.priority === 'urgent'
                    ? NEU.danger
                    : item.priority === 'important'
                    ? NEU.warning
                    : NEU.accent;

                return (
                  <TouchableOpacity
                    style={[styles.notifRow, priorityStyle(item.priority)]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.notifIconWrap, { backgroundColor: `${accent}18` }]}>
                      <Ionicons
                        name={item.type === 'meeting' ? 'people-outline' : 'megaphone-outline'}
                        size={18}
                        color={accent}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.notifTitle,
                          !item.read && { fontWeight: '800' },
                        ]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.notifMsg} numberOfLines={3}>
                        {item.message}
                      </Text>
                      <Text style={styles.notifTime}>
                        {new Date(item.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    {!item.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderRightColor: 'rgba(163,177,198,0.4)',
    borderBottomColor: 'rgba(163,177,198,0.4)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: NEU.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: NEU.bg,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46,58,77,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    backgroundColor: NEU.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: NEU.text },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: NEU.textMuted, marginTop: 12, fontSize: 13 },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: NEU.bg,
    marginBottom: 8,
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 13,
    color: NEU.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  notifMsg: { fontSize: 12, color: NEU.textMuted, lineHeight: 16 },
  notifTime: { fontSize: 10, color: NEU.textMuted, marginTop: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NEU.accent,
    marginTop: 6,
  },
});