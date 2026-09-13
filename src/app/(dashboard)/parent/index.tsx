import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Child = {
  id: string;
  full_name: string;
  grade_level: string;
  strand: string;
  section_id: string | null;
  section_name: string;
};

type ChildSummary = {
  child: Child;
  gradeAverage: number | null;
  attendanceRate: number | null;
  todayClasses: number;
  nextClass: { subject: string; time: string; room: string } | null;
};

export default function ParentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = user?.user_metadata?.first_name || 'Parent';

  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<ChildSummary[]>([]);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from('users').select('id').eq('email', email).maybeSingle();
      if (!userData) { setLoading(false); return; }

      const { data: kids } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, grade_level, strand, section_id,
          sections:section_id (name)
        `)
        .eq('parent_id', userData.id);

      if (!kids || kids.length === 0) {
        setSummaries([]);
        setLoading(false);
        return;
      }

      const childList: Child[] = kids.map((k: any) => ({
        id: k.id,
        full_name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || 'Unknown',
        grade_level: k.grade_level || 'N/A',
        strand: k.strand || 'N/A',
        section_id: k.section_id || null,
        section_name: k.sections?.name || 'No Section',
      }));

      const summaryList: ChildSummary[] = await Promise.all(
        childList.map(async (child) => {
          const { data: gradesData } = await supabase
            .from('grades').select('grade').eq('student_id', child.id);

          const gradeAverage =
            gradesData && gradesData.length > 0
              ? Math.round(
                  (gradesData.reduce((s: number, g: any) => s + (g.grade || 0), 0) /
                    gradesData.length) * 100
                ) / 100
              : null;

          const { data: attData } = await supabase
            .from('attendance').select('status').eq('student_id', child.id);

          let attendanceRate: number | null = null;
          if (attData && attData.length > 0) {
            const present = attData.filter((a: any) => String(a.status).toLowerCase() === 'present').length;
            const late = attData.filter((a: any) => String(a.status).toLowerCase() === 'late').length;
            attendanceRate = Math.round(((present + late) / attData.length) * 100);
          }

          const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          let todayClasses = 0;
          let nextClass: ChildSummary['nextClass'] = null;

          if (child.section_id) {
            const { data: scheds } = await supabase
              .from('schedules')
              .select('start_time, room, subject_id')
              .eq('section_id', child.section_id)
              .eq('day', today)
              .order('start_time');

            if (scheds && scheds.length > 0) {
              todayClasses = scheds.length;

              const subjectIds = [...new Set(scheds.map((s: any) => s.subject_id).filter(Boolean))];
              const subjectMap: Record<string, any> = {};
              if (subjectIds.length > 0) {
                const { data: subs } = await supabase
                  .from('subjects').select('id, name').in('id', subjectIds);
                (subs || []).forEach((s: any) => { subjectMap[s.id] = s; });
              }

              const now = new Date();
              const nowMin = now.getHours() * 60 + now.getMinutes();
              const upcoming =
                scheds.find((s: any) => {
                  if (!s.start_time) return false;
                  const [h, m] = s.start_time.split(':').map(Number);
                  return h * 60 + m >= nowMin;
                }) || scheds[0];

              nextClass = {
                subject: subjectMap[upcoming.subject_id]?.name || 'Class',
                time: formatTime(upcoming.start_time),
                room: upcoming.room || 'TBA',
              };
            }
          }

          return { child, gradeAverage, attendanceRate, todayClasses, nextClass };
        })
      );

      setSummaries(summaryList);
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

  const gradeColor = (g: number | null) => {
    if (g === null) return '#999';
    if (g >= 90) return '#4CAF50';
    if (g >= 85) return '#8BC34A';
    if (g >= 75) return '#FF9800';
    return '#F44336';
  };

  const rateColor = (r: number | null) => {
    if (r === null) return '#999';
    if (r >= 95) return '#4CAF50';
    if (r >= 85) return '#8BC34A';
    if (r >= 75) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Parent Dashboard</Text>
            <Text style={styles.welcome}>Welcome, {firstName}!</Text>
          </View>
        </View>

        {summaries.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No children linked yet</Text>
            <Text style={styles.emptySubtext}>
              Please contact the registrar to link your children.
            </Text>
          </View>
        ) : (
          summaries.map(s => (
            <View key={s.child.id} style={styles.childCard}>
              <View style={styles.childHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {s.child.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{s.child.full_name}</Text>
                  <Text style={styles.childMeta}>
                    Grade {s.child.grade_level}
                    {s.child.strand !== 'N/A' ? ` • ${s.child.strand}` : ''} • {s.child.section_name}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: gradeColor(s.gradeAverage) }]}>
                    {s.gradeAverage ?? '—'}
                  </Text>
                  <Text style={styles.statLabel}>Avg Grade</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: rateColor(s.attendanceRate) }]}>
                    {s.attendanceRate !== null ? `${s.attendanceRate}%` : '—'}
                  </Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: colors.text }]}>
                    {s.todayClasses}
                  </Text>
                  <Text style={styles.statLabel}>Today</Text>
                </View>
              </View>

              {s.nextClass && (
                <View style={styles.nextClassBox}>
                  <Text style={styles.nextClassLabel}>NEXT CLASS</Text>
                  <Text style={styles.nextClassSubject}>{s.nextClass.subject}</Text>
                  <Text style={styles.nextClassMeta}>
                    🕐 {s.nextClass.time} • 📍 {s.nextClass.room}
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/(dashboard)/parent/grades')}
                >
                  <Text style={styles.actionBtnText}>Grades</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={() => router.push('/(dashboard)/parent/attendance')}
                >
                  <Text style={styles.actionBtnText}>Attendance</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#9C27B0' }]}
                  onPress={() => router.push('/(dashboard)/parent/schedule')}
                >
                  <Text style={styles.actionBtnText}>Schedule</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles.quickLinksCard}>
          <Text style={styles.quickLinksTitle}>Quick Links</Text>
          <View style={styles.quickLinksGrid}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(dashboard)/parent/grades')}
            >
              <Ionicons name="school" size={28} color={colors.primary} />
              <Text style={styles.quickLinkText}>Grades</Text>
              <Text style={styles.quickLinkSub}>All subjects</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(dashboard)/parent/attendance')}
            >
              <Ionicons name="calendar" size={28} color="#4CAF50" />
              <Text style={styles.quickLinkText}>Attendance</Text>
              <Text style={styles.quickLinkSub}>Daily records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(dashboard)/parent/schedule')}
            >
              <Ionicons name="time" size={28} color="#9C27B0" />
              <Text style={styles.quickLinkText}>Schedule</Text>
              <Text style={styles.quickLinkSub}>Weekly classes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(dashboard)/parent/profile')}
            >
              <Ionicons name="person" size={28} color="#666" />
              <Text style={styles.quickLinkText}>Profile</Text>
              <Text style={styles.quickLinkSub}>Account settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: '#666' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  welcome: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  childCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  childName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  childMeta: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },

  nextClassBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  nextClassLabel: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  nextClassSubject: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 2,
  },
  nextClassMeta: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },

  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: '#ccc',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  quickLinksCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  quickLinksTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickLink: {
    width: '48%',
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLinkText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  quickLinkSub: {
    fontSize: typography.sizes.xs,
    color: '#999',
    marginTop: 2,
  },
});