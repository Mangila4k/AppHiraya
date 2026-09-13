import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Schedule = {
  id: string;
  day: string;
  time_start: string;
  time_end: string;
  subject_name: string;
  subject_code: string;
  section_name: string;
  room: string;
};

export default function TeacherSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => { loadSchedule(); }, []);

  const formatTime = (t: string) => {
    if (!t) return 'N/A';
    if (t.includes('AM') || t.includes('PM')) return t;
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from('users').select('*').eq('email', email).single();
      if (!userData) { setLoading(false); return; }

      const { data: teacherData } = await supabase
        .from('teachers').select('id').eq('user_id', userData.id).maybeSingle();
      if (!teacherData) { setLoading(false); return; }

      const { data } = await supabase
        .from('schedules').select('*').eq('teacher_id', teacherData.id);
      if (!data) { setLoading(false); return; }

      // Enrich with subject/section names
      const subjectIds = [...new Set(data.map((s: any) => s.subject_id).filter(Boolean))];
      const sectionIds = [...new Set(data.map((s: any) => s.section_id).filter(Boolean))];

      const subjectMap: Record<string, any> = {};
      const sectionMap: Record<string, any> = {};

      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code').in('id', subjectIds);
        (subs || []).forEach((s: any) => { subjectMap[s.id] = s; });
      }
      if (sectionIds.length > 0) {
        const { data: secs } = await supabase
          .from('sections').select('id, name').in('id', sectionIds);
        (secs || []).forEach((s: any) => { sectionMap[s.id] = s; });
      }

      const formatted: Schedule[] = data.map((s: any) => ({
        id: s.id,
        day: s.day || 'N/A',
        time_start: formatTime(s.start_time),
        time_end: formatTime(s.end_time),
        subject_name: subjectMap[s.subject_id]?.name || 'Unknown',
        subject_code: subjectMap[s.subject_id]?.code || '',
        section_name: sectionMap[s.section_id]?.name || 'No Section',
        room: s.room || 'N/A',
      }));
      setSchedules(formatted);
    } catch (e) {
      console.error('Error loading schedule:', e);
    } finally {
      setLoading(false);
    }
  };

  const groupByDay = () => {
    const grouped: Record<string, Schedule[]> = {};
    ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].forEach(d => grouped[d] = []);
    schedules.forEach(s => {
      if (!grouped[s.day]) grouped[s.day] = [];
      grouped[s.day].push(s);
    });
    return grouped;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const grouped = groupByDay();
  const daysWithClasses = Object.keys(grouped).filter(d => grouped[d].length > 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Schedule</Text>
          <TouchableOpacity onPress={loadSchedule} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {daysWithClasses.length > 0 ? (
          daysWithClasses.map((day) => (
            <View key={day} style={styles.daySection}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{day}</Text>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>{grouped[day].length} class{grouped[day].length !== 1 ? 'es' : ''}</Text>
                </View>
              </View>
              {grouped[day].sort((a,b) => a.time_start.localeCompare(b.time_start)).map(s => (
                <View key={s.id} style={styles.scheduleItem}>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeStart}>{s.time_start}</Text>
                    <Text style={styles.timeEnd}>{s.time_end}</Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.subjectName}>{s.subject_name}</Text>
                    {s.subject_code ? <Text style={styles.subjectCode}>{s.subject_code}</Text> : null}
                    <Text style={styles.sectionText}>
                      <Ionicons name="school" size={12} color="#666" /> {s.section_name}
                    </Text>
                    {s.room !== 'N/A' ? (
                      <Text style={styles.roomText}>
                        <Ionicons name="location" size={12} color="#666" /> {s.room}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No schedule assigned</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  daySection: { marginBottom: spacing.md },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  dayTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  dayBadge: { backgroundColor: colors.primary + '10', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  dayBadgeText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.medium },
  scheduleItem: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12,
    padding: spacing.md, marginBottom: spacing.sm, elevation: 2,
  },
  timeContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingRight: spacing.md, borderRightWidth: 2,
    borderRightColor: colors.primary + '20', minWidth: 80,
  },
  timeStart: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.primary },
  timeEnd: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  scheduleInfo: { flex: 1, marginLeft: spacing.md },
  subjectName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  subjectCode: { fontSize: typography.sizes.xs, color: colors.primary, marginTop: 2 },
  sectionText: { fontSize: typography.sizes.xs, color: '#666', marginTop: 4 },
  roomText: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  emptyContainer: { alignItems: 'center', padding: spacing.xxxl, backgroundColor: colors.white, borderRadius: 16 },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
});