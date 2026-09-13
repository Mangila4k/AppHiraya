import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Child = { id: string; full_name: string; grade_level: string; section_id: string | null };
type Schedule = {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ParentSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  useEffect(() => { loadChildren(); }, []);
  useEffect(() => { if (selectedChild) loadSchedule(selectedChild); }, [selectedChild]);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from('users').select('id').eq('email', email).maybeSingle();
      if (!userData) { setLoading(false); return; }

      const { data: kids } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, section_id')
        .eq('parent_id', userData.id);

      if (kids && kids.length > 0) {
        const list = kids.map((k: any) => ({
          id: k.id,
          full_name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || 'Unknown',
          grade_level: k.grade_level || 'N/A',
          section_id: k.section_id || null,
        }));
        setChildren(list);
        setSelectedChild(list[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async (child: Child) => {
    setLoading(true);
    try {
      if (!child.section_id) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const { data: scheds } = await supabase
        .from('schedules')
        .select('id, day, start_time, end_time, room, subject_id, teacher_id')
        .eq('section_id', child.section_id)
        .order('start_time');

      if (!scheds || scheds.length === 0) {
        setSchedules([]);
        setLoading(false);
        return;
      }

      const subjectIds = [...new Set(scheds.map((s: any) => s.subject_id).filter(Boolean))];
      const teacherIds = [...new Set(scheds.map((s: any) => s.teacher_id).filter(Boolean))];

      const subjectMap: Record<string, any> = {};
      const teacherMap: Record<string, any> = {};

      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code').in('id', subjectIds);
        (subs || []).forEach((s: any) => { subjectMap[s.id] = s; });
      }

      if (teacherIds.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select(`
            id,
            users:user_id (first_name, last_name)
          `)
          .in('id', teacherIds);

        (teachers || []).forEach((t: any) => {
          const u = t.users;
          teacherMap[t.id] = u
            ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
            : 'TBA';
        });
      }

      const formatted: Schedule[] = scheds.map((s: any) => ({
        id: s.id,
        day: s.day || 'Monday',
        start_time: s.start_time || '',
        end_time: s.end_time || '',
        room: s.room || 'TBA',
        subject_name: subjectMap[s.subject_id]?.name || 'Unknown Subject',
        subject_code: subjectMap[s.subject_id]?.code || '',
        teacher_name: teacherMap[s.teacher_id] || 'TBA',
      }));

      setSchedules(formatted);

      const firstDay = DAYS.find(d => formatted.some(s => s.day === d));
      if (firstDay) setSelectedDay(firstDay);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  };

  const daySchedules = schedules.filter(s => s.day === selectedDay);

  if (loading && children.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Schedule</Text>
          <View style={{ width: 40 }} />
        </View>

        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPicker}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, selectedChild?.id === c.id && styles.childChipActive]}
                onPress={() => setSelectedChild(c)}
              >
                <Text style={[styles.childChipText, selectedChild?.id === c.id && styles.childChipTextActive]}>
                  {c.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedChild && (
          <View style={styles.childInfoCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{selectedChild.full_name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{selectedChild.full_name}</Text>
              <Text style={styles.childMeta}>Grade {selectedChild.grade_level}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.smallLabel}>Classes</Text>
              <Text style={styles.smallValue}>{schedules.length}</Text>
            </View>
          </View>
        )}

        {/* Day Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
          {DAYS.map(d => {
            const count = schedules.filter(s => s.day === d).length;
            const isActive = selectedDay === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, isActive && styles.dayChipActive]}
                onPress={() => setSelectedDay(d)}
              >
                <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                  {d.slice(0, 3)}
                </Text>
                <Text style={[styles.dayChipCount, isActive && styles.dayChipCountActive]}>
                  {count} {count === 1 ? 'class' : 'classes'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {daySchedules.length > 0 ? (
          daySchedules.map(s => (
            <View key={s.id} style={styles.scheduleCard}>
              <View style={styles.scheduleBar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName}>{s.subject_name}</Text>
                {s.subject_code ? <Text style={styles.subjectCode}>{s.subject_code}</Text> : null}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    🕐 {formatTime(s.start_time)} – {formatTime(s.end_time)}
                  </Text>
                  <Text style={styles.metaText}>📍 {s.room}</Text>
                  <Text style={styles.metaText}>👤 {s.teacher_name}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No classes on {selectedDay}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },

  childPicker: { marginBottom: spacing.sm },
  childChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  childChipText: { fontSize: typography.sizes.sm, color: '#666' },
  childChipTextActive: { color: '#fff', fontWeight: '600' },

  childInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    gap: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.primary },
  childName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  childMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  smallLabel: { fontSize: typography.sizes.xs, color: '#666' },
  smallValue: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },

  dayPicker: { marginBottom: spacing.md },
  dayChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 8,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 78,
  },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: typography.sizes.sm, fontWeight: '600', color: '#666' },
  dayChipTextActive: { color: '#fff' },
  dayChipCount: { fontSize: typography.sizes.xs, color: '#999', marginTop: 2 },
  dayChipCountActive: { color: '#fff' },

  scheduleCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
    gap: spacing.md,
  },
  scheduleBar: {
    width: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  subjectName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  subjectCode: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  metaRow: { marginTop: spacing.sm, gap: 2 },
  metaText: { fontSize: typography.sizes.xs, color: '#666' },

  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
});