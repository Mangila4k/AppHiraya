import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const NEU = {
  bg: '#E8EDF2',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  accent: '#4C6FFF',
  danger: '#EF4444',
  warning: '#F59E0B',
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'meeting';
  priority: 'normal' | 'important' | 'urgent';
  read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
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

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userData.id)
        .order('created_at', { ascending: false });

      setItems(data || []);
    } catch (e) {
      console.error('Notifications load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true, is_read: true })
      .eq('id', id);
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
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

    setItems(prev => prev.map(n => ({ ...n, read: true })));
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const accent =
      item.priority === 'urgent'
        ? NEU.danger
        : item.priority === 'important'
        ? NEU.warning
        : NEU.accent;

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
          <Ionicons
            name={item.type === 'meeting' ? 'people-outline' : 'megaphone-outline'}
            size={20}
            color={accent}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.dot} />}
          </View>
          <Text style={styles.message} numberOfLines={4}>
            {item.message}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {new Date(item.created_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            {item.priority !== 'normal' && (
              <View style={[styles.pill, { backgroundColor: accent }]}>
                <Text style={styles.pillText}>{item.priority.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={NEU.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.backBtn}>
          <Ionicons name="checkmark-done" size={22} color={NEU.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={NEU.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={50} color={NEU.textMuted} />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={NEU.accent}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NEU.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: NEU.text },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: NEU.textMuted, marginTop: 12 },

  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: NEU.bg,
    marginBottom: 10,
    shadowColor: NEU.darkShadow,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: NEU.accent,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '700', color: NEU.text, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NEU.accent },
  message: { fontSize: 12, color: NEU.textMuted, marginTop: 4, lineHeight: 17 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  meta: { fontSize: 11, color: NEU.textMuted },
  pill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pillText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
});