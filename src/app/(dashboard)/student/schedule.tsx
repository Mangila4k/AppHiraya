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
      // 1. Get logged-in email
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      // 2. Get user record
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (!userData) {
        setLoading(false);
        return;
      }

      // 3. Get student record
      let studentData: any = null;

      if (userData.student_id) {
        const { data } = await supabase
          .from('students')
          .select(`
            id,
            lrn,
            first_name,
            last_name,
            grade_level,
            strand,
            section_id,
            sections:section_id (name)
          `)
          .eq('id', userData.student_id)
          .maybeSingle();
        studentData = data;
      }

      // Fallback: match by email
      if (!studentData) {
        const { data } = await supabase
          .from('students')
          .select(`
            id,
            lrn,
            first_name,
            last_name,
            grade_level,
            strand,
            section_id,
            sections:section_id (name)
          `)
          .eq('email', email)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        console.log('No student record found');
        setLoading(false);
        return;
      }

      setStudentInfo(studentData);
      setSectionName(studentData.sections?.name || 'Your Section');

      // 4. Fetch SUBJECTS for this student's grade level + strand
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

      if (subjectsData) {
        setSubjects(subjectsData);
      }

      // 5. Fetch SCHEDULES for this section
      if (studentData.section_id) {
        const { data: schedulesData, error: schedulesError } = await supabase
          .from('schedules')
          .select('*')
          .eq('section_id', studentData.section_id)
          .order('day', { ascending: true });

        if (schedulesError) {
          console.log('⚠️ Schedules fetch failed:', schedulesError.message);
        }

        if (schedulesData && schedulesData.length > 0) {
          // Get unique IDs
          const teacherIds = [...new Set(
            schedulesData.map((s: any) => s.teacher_id).filter(Boolean)
          )];
          const subjectIds = [...new Set(
            schedulesData.map((s: any) => s.subject_id).filter(Boolean)
          )];

          // Fetch teachers
          let teacherMap: Record<string, string> = {};
          if (teacherIds.length > 0) {
            const { data: teacherList } = await supabase
              .from('teachers')
              .select('id, user_id, users:user_id (first_name, last_name)')
              .in('id', teacherIds);

            if (teacherList) {
              teacherList.forEach((t: any) => {
                const user = t.users;
                teacherMap[t.id] = user
                  ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Teacher'
                  : 'No Teacher';
              });
            }
          }

          // Fetch subjects
          let subjectMap: Record<string, any> = {};
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

          // Format schedules
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

  // Format time from "HH:MM:SS" (Supabase time) to "7:00 AM"
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
    dayOrder.forEach(day => { grouped[day] = []; });
    schedules.forEach(s => {
      if (!grouped[s.day]) grouped[s.day] = [];
      grouped[s.day].push(s);
    });
    return grouped;
  };

  const groupSubjectsByTerm = () => {
    const grouped: Record<string, Subject[]> = {};
    subjects.forEach(s => {
      const key = s.semester || s.quarter || 'General';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  };

  const getSubjectTypeColor = (type: string) => {
    switch (type) {
      case 'Core': return '#4CAF50';
      case 'Applied': return '#2196F3';
      case 'Specialized': return '#9C27B0';
      default: return '#666';
    }
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
  const daysWithClasses = Object.keys(grouped).filter(day => grouped[day].length > 0);
  const groupedSubjects = groupSubjectsByTerm();
  const subjectTerms = Object.keys(groupedSubjects).sort();

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

        {/* Section Info */}
        <View style={styles.infoCard}>
          <Ionicons name="school" size={20} color={colors.primary} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoText}>{sectionName}</Text>
            {studentInfo && (
              <Text style={styles.infoSubtext}>
                {studentInfo.grade_level}
                {studentInfo.strand && studentInfo.strand !== 'N/A' ? ` • ${studentInfo.strand}` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* SCHEDULE - By Day */}
        {daysWithClasses.length > 0 ? (
          <>
            <Text style={styles.sectionHeading}>
              <Ionicons name="time" size={18} color={colors.primary} /> Class Schedule
            </Text>
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
                          <Ionicons name="person" size={12} color="#666" /> {schedule.teacher_name}
                        </Text>
                        {schedule.room !== 'N/A' && (
                          <Text style={styles.roomText}>
                            <Ionicons name="location" size={12} color="#666" /> {schedule.room}
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
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No schedule assigned yet</Text>
            <Text style={styles.emptySubtext}>
              Your class schedule will appear here once created.
            </Text>
          </View>
        )}

        {/* SUBJECTS - By Term */}
        {subjectTerms.length > 0 && (
          <>
            <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>
              <Ionicons name="book" size={18} color={colors.primary} /> My Subjects ({subjects.length})
            </Text>
            {subjectTerms.map((term) => (
              <View key={term} style={styles.subjectSection}>
                <View style={styles.termHeader}>
                  <Text style={styles.termTitle}>{term}</Text>
                  <View style={styles.termBadge}>
                    <Text style={styles.termBadgeText}>
                      {groupedSubjects[term].length} subject{groupedSubjects[term].length !== 1 ? 's' : ''}
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
                      <View style={[
                        styles.subjectTypeBadge,
                        { backgroundColor: getSubjectTypeColor(subject.subject_type) + '20' }
                      ]}>
                        <Text style={[
                          styles.subjectTypeText,
                          { color: getSubjectTypeColor(subject.subject_type) }
                        ]}>
                          {subject.subject_type}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTextContainer: { flex: 1 },
  infoText: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  infoSubtext: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  sectionHeading: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  daySection: { marginBottom: spacing.md },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dayTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  dayBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  dayBadgeText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.medium },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing.md,
    borderRightWidth: 2,
    borderRightColor: colors.primary + '20',
    minWidth: 80,
  },
  timeStart: { fontSize: typography.sizes.sm, fontWeight: typography.weights.bold, color: colors.primary },
  timeEnd: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  scheduleInfo: { flex: 1, marginLeft: spacing.md },
  subjectName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  teacherName: { fontSize: typography.sizes.xs, color: '#666', marginTop: 4 },
  roomText: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  subjectSection: { marginBottom: spacing.md },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  termTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  termBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  termBadgeText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.medium },
  subjectItem: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectInfo: { flex: 1 },
  subjectItemName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  subjectItemCode: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  subjectTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  subjectTypeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  emptySubtext: { fontSize: typography.sizes.sm, color: '#ccc', textAlign: 'center', marginTop: spacing.xs },
});