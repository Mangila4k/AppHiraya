import ChatbotFab from '@/components/ChatbotFab';
import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Schedule = {
  id: string;
  day: string;
  time_start: string;
  time_end: string;
  subject_name: string;
  teacher_name: string;
  room: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  grade_level: string;
  strand: string;
  semester: string;
  quarter: string;
  subject_type: string;
};

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

export default function StudentSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sectionName, setSectionName] = useState('');
  const [studentInfo, setStudentInfo] = useState<any>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!userData) {
        setLoading(false);
        return;
      }

      let studentData: any = null;

      if (userData.student_id) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, first_name, last_name, grade_level, strand, section_id,
            sections:section_id (name)
          `)
          .eq('id', userData.student_id)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, first_name, last_name, grade_level, strand, section_id,
            sections:section_id (name)
          `)
          .eq('email', email)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        setLoading(false);
        return;
      }

      setStudentInfo(studentData);
      const sectionRel = Array.isArray(studentData.sections)
        ? studentData.sections[0]
        : studentData.sections;
      setSectionName(sectionRel?.name || 'Your Section');

      const gradeNum = parseInt(studentData.grade_level);
      const isSeniorHigh = gradeNum >= 11;

      let subjectsQuery = supabase
        .from('subjects')
        .select('*')
        .eq('grade_level', studentData.grade_level);

      if (isSeniorHigh && studentData.strand && studentData.strand !== 'N/A') {
        subjectsQuery = subjectsQuery.eq('strand', studentData.strand);
      }

      const { data: subjectsData } = await subjectsQuery
        .order('semester', { ascending: true })
        .order('quarter', { ascending: true });

      if (subjectsData) setSubjects(subjectsData);

      if (studentData.section_id) {
        const { data: schedulesData } = await supabase
          .from('schedules')
          .select('*')
          .eq('section_id', studentData.section_id)
          .order('day', { ascending: true });

        if (schedulesData && schedulesData.length > 0) {
          const teacherIds = [
            ...new Set(schedulesData.map((s: any) => s.teacher_id).filter(Boolean)),
          ];
          const subjectIds = [
            ...new Set(schedulesData.map((s: any) => s.subject_id).filter(Boolean)),
          ];

          const teacherMap: Record<string, string> = {};
          if (teacherIds.length > 0) {
            const { data: teacherList } = await supabase
              .from('teachers')
              .select('id, user_id, users:user_id (first_name, last_name)')
              .in('id', teacherIds);

            if (teacherList) {
              teacherList.forEach((t: any) => {
                const user = Array.isArray(t.users) ? t.users[0] : t.users;
                teacherMap[t.id] = user
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Teacher'
                  : 'No Teacher';
              });
            }
          }

          const subjectMap: Record<string, any> = {};
          if (subjectIds.length > 0) {
            const { data: subjectList } = await supabase
              .from('subjects')
              .select('id, name, code')
              .in('id', subjectIds);

            if (subjectList) {
              subjectList.forEach((sub: any) => {
                subjectMap[sub.id] = sub;
              });
            }
          }

          const formatted: Schedule[] = schedulesData.map((s: any) => ({
            id: s.id,
            day: s.day || 'N/A',
            time_start: formatTime(s.start_time),
            time_end: formatTime(s.end_time),
            subject_name: subjectMap[s.subject_id]?.name || 'Unknown Subject',
            teacher_name: teacherMap[s.teacher_id] || 'No Teacher',
            room: s.room || 'N/A',
          }));
          setSchedules(formatted);
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    try {
      if (time.includes('AM') || time.includes('PM')) return time;
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  const groupByDay = () => {
    const grouped: Record<string, Schedule[]> = {};
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayOrder.forEach((day) => {
      grouped[day] = [];
    });
    schedules.forEach((s) => {
      if (!grouped[s.day]) grouped[s.day] = [];
      grouped[s.day].push(s);
    });
    return grouped;
  };

  const groupSubjectsByTerm = () => {
    const grouped: Record<string, Subject[]> = {};
    subjects.forEach((s) => {
      const key = s.semester || s.quarter || 'General';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
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

  const grouped = groupByDay();
  const daysWithClasses = Object.keys(grouped).filter((day) => grouped[day].length > 0);
  const groupedSubjects = groupSubjectsByTerm();
  const subjectTerms = Object.keys(groupedSubjects).sort();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={NEU.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Schedule</Text>
          <TouchableOpacity onPress={loadSchedule} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={NEU.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="school" size={18} color={NEU.accent} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>{sectionName}</Text>
            {studentInfo && (
              <Text style={styles.infoSubtext}>
                {studentInfo.grade_level}
                {studentInfo.strand && studentInfo.strand !== 'N/A'
                  ? ` • ${studentInfo.strand}`
                  : ''}
              </Text>
            )}
          </View>
        </View>

        {daysWithClasses.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>Class Schedule</Text>
            {daysWithClasses.map((day) => (
              <View key={day} style={styles.daySection}>
                <View style={styles.dayHeader}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeText}>
                      {grouped[day].length} class{grouped[day].length !== 1 ? 'es' : ''}
                    </Text>
                  </View>
                </View>
                {grouped[day]
                  .sort((a, b) => a.time_start.localeCompare(b.time_start))
                  .map((schedule) => (
                    <View key={schedule.id} style={styles.scheduleItem}>
                      <View style={styles.timeContainer}>
                        <Text style={styles.timeStart}>{schedule.time_start}</Text>
                        <Text style={styles.timeEnd}>{schedule.time_end}</Text>
                      </View>
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.subjectName}>{schedule.subject_name}</Text>
                        <Text style={styles.teacherName}>
                          <Ionicons name="person" size={11} color={NEU.textMuted} />{' '}
                          {schedule.teacher_name}
                        </Text>
                        {schedule.room !== 'N/A' && (
                          <Text style={styles.roomText}>
                            <Ionicons name="location" size={11} color={NEU.textMuted} />{' '}
                            {schedule.room}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={44} color={NEU.textFaint} />
            <Text style={styles.emptyText}>No schedule assigned yet</Text>
            <Text style={styles.emptySubtext}>
              Your class schedule will appear here once created.
            </Text>
          </View>
        )}

        {subjectTerms.length > 0 && (
          <>
            <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>
              My Subjects ({subjects.length})
            </Text>
            {subjectTerms.map((term) => (
              <View key={term} style={styles.subjectSection}>
                <View style={styles.termHeader}>
                  <Text style={styles.termTitle}>{term}</Text>
                  <View style={styles.termBadge}>
                    <Text style={styles.termBadgeText}>
                      {groupedSubjects[term].length} subject
                      {groupedSubjects[term].length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                {groupedSubjects[term].map((subject) => (
                  <View key={subject.id} style={styles.subjectItem}>
                    <View style={styles.subjectRow}>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectItemName}>{subject.name}</Text>
                        <Text style={styles.subjectItemCode}>{subject.code}</Text>
                      </View>
                      <View style={styles.subjectTypeBadge}>
                        <Text style={styles.subjectTypeText}>{subject.subject_type}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <ChatbotFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  container: { flex: 1, padding: spacing.md },
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
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: NEU.text },

  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, borderRadius: 20, padding: spacing.md,
    marginBottom: spacing.md, gap: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  infoIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  infoTextContainer: { flex: 1 },
  infoText: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  infoSubtext: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },

  sectionHeading: {
    fontSize: typography.sizes.md, fontWeight: '700',
    color: NEU.text, marginBottom: spacing.md, paddingHorizontal: 4,
  },

  daySection: { marginBottom: spacing.md },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, paddingHorizontal: 4,
  },
  dayTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  dayBadge: {
    backgroundColor: NEU.bg,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 1,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  dayBadgeText: { fontSize: typography.sizes.xs, color: NEU.accent, fontWeight: '700' },

  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: NEU.bg, borderRadius: 16, padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  timeContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingRight: spacing.md,
    borderRightWidth: 2, borderRightColor: NEU.bgDark,
    minWidth: 80,
  },
  timeStart: { fontSize: typography.sizes.sm, fontWeight: '800', color: NEU.accent },
  timeEnd: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },
  scheduleInfo: { flex: 1, marginLeft: spacing.md },
  subjectName: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  teacherName: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 4 },
  roomText: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },

  subjectSection: { marginBottom: spacing.md },
  termHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, paddingHorizontal: 4,
  },
  termTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.accent },
  termBadge: {
    backgroundColor: NEU.bg,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 1,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  termBadgeText: { fontSize: typography.sizes.xs, color: NEU.accent, fontWeight: '700' },

  subjectItem: {
    backgroundColor: NEU.bg, borderRadius: 14, padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  subjectRow: { flexDirection: 'row', alignItems: 'center' },
  subjectInfo: { flex: 1 },
  subjectItemName: { fontSize: typography.sizes.sm, fontWeight: '600', color: NEU.text },
  subjectItemCode: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },
  subjectTypeBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: 12, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 1,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  subjectTypeText: { fontSize: typography.sizes.xs, fontWeight: '700', color: NEU.accent },

  emptyContainer: {
    alignItems: 'center', padding: spacing.xxxl,
    backgroundColor: NEU.bg, borderRadius: 20,
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