import ChatbotFab from '@/components/ChatbotFab';
import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Grade = {
  id: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  quarter: number;
  grade: number;
  remarks: string;
};

type GroupedGrades = { [key: string]: Grade[] };

type StudentInfo = {
  full_name: string;
  grade_level: string;
  strand: string;
  section: string;
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

export default function StudentGrades() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        setLoading(false);
        return;
      }

      let studentData: any = null;

      if (userData.student_id) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, first_name, last_name, middle_name,
            grade_level, strand,
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
            id, lrn, first_name, last_name, middle_name,
            grade_level, strand,
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

      const sectionRel = Array.isArray(studentData.sections)
        ? studentData.sections[0]
        : studentData.sections;

      setStudentInfo({
        full_name:
          `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || 'Student',
        grade_level: studentData.grade_level || 'N/A',
        strand: studentData.strand || 'N/A',
        section: sectionRel?.name || 'No Section',
      });

      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          id, semester, quarter, grade, remarks,
          subjects:subject_id (name, code)
        `)
        .eq('student_id', studentData.id)
        .order('quarter', { ascending: true });

      if (gradesError) {
        setLoading(false);
        return;
      }

      if (gradesData) {
        const formatted: Grade[] = gradesData.map((g: any) => {
          const subjRel = Array.isArray(g.subjects) ? g.subjects[0] : g.subjects;
          return {
            id: g.id,
            subject_name: subjRel?.name || 'Unknown Subject',
            subject_code: subjRel?.code || 'N/A',
            semester: g.semester || '',
            quarter: g.quarter || 1,
            grade: g.grade || 0,
            remarks: g.remarks || '',
          };
        });
        setGrades(formatted);
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByQuarter = (): GroupedGrades => {
    const grouped: GroupedGrades = {};
    grades.forEach((g) => {
      const key = `Quarter ${g.quarter}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(g);
    });
    return grouped;
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return '#22C55E';
    if (grade >= 85) return '#84CC16';
    if (grade >= 80) return '#F59E0B';
    if (grade >= 75) return '#F97316';
    return '#EF4444';
  };

  const getGradeRemarks = (grade: number) => {
    if (grade >= 90) return 'Outstanding';
    if (grade >= 85) return 'Very Satisfactory';
    if (grade >= 80) return 'Satisfactory';
    if (grade >= 75) return 'Fairly Satisfactory';
    return 'Did Not Meet Expectations';
  };

  const calculateAverage = () => {
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + g.grade, 0);
    return Math.round((sum / grades.length) * 100) / 100;
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

  const grouped = groupByQuarter();
  const quarters = Object.keys(grouped).sort((a, b) => {
    return parseInt(a.replace('Quarter ', '')) - parseInt(b.replace('Quarter ', ''));
  });
  const average = calculateAverage();

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
          <Text style={styles.title}>My Grades</Text>
          <TouchableOpacity onPress={loadGrades} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={NEU.text} />
          </TouchableOpacity>
        </View>

        {studentInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoName}>{studentInfo.full_name}</Text>
            <Text style={styles.infoDetails}>
              {studentInfo.grade_level}
              {studentInfo.strand !== 'N/A' ? ` • ${studentInfo.strand}` : ''}
              {' • '}
              {studentInfo.section}
            </Text>
          </View>
        )}

        <View style={styles.averageCard}>
          <View style={[styles.averageIcon, { backgroundColor: getGradeColor(average) + '20' }]}>
            <Ionicons name="star" size={28} color={getGradeColor(average)} />
          </View>
          <View style={styles.averageInfo}>
            <Text style={styles.averageLabel}>General Average</Text>
            <Text style={[styles.averageValue, { color: getGradeColor(average) }]}>
              {average || 'N/A'}
            </Text>
            {average > 0 && <Text style={styles.averageRemarks}>{getGradeRemarks(average)}</Text>}
          </View>
        </View>

        {quarters.length > 0 ? (
          quarters.map((quarter) => (
            <View key={quarter} style={styles.quarterSection}>
              <View style={styles.quarterHeader}>
                <Ionicons name="book" size={16} color={NEU.accent} />
                <Text style={styles.quarterTitle}>{quarter}</Text>
                <View style={styles.quarterBadge}>
                  <Text style={styles.quarterBadgeText}>
                    {grouped[quarter].length} subject{grouped[quarter].length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              {grouped[quarter]
                .sort((a, b) => a.subject_name.localeCompare(b.subject_name))
                .map((grade) => (
                  <View key={grade.id} style={styles.gradeItem}>
                    <View style={styles.gradeInfo}>
                      <Text style={styles.gradeSubject}>{grade.subject_name}</Text>
                      <Text style={styles.gradeCode}>
                        {grade.subject_code}
                        {grade.semester ? ` • ${grade.semester}` : ''}
                      </Text>
                      {grade.remarks ? <Text style={styles.gradeRemarks}>{grade.remarks}</Text> : null}
                    </View>
                    <View
                      style={[
                        styles.gradeBadge,
                        { backgroundColor: getGradeColor(grade.grade) + '20' },
                      ]}
                    >
                      <Text style={[styles.gradeValue, { color: getGradeColor(grade.grade) }]}>
                        {grade.grade}
                      </Text>
                    </View>
                  </View>
                ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={44} color={NEU.textFaint} />
            <Text style={styles.emptyText}>No grades available yet</Text>
            <Text style={styles.emptySubtext}>
              Your grades will appear here once your teachers submit them.
            </Text>
          </View>
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
    backgroundColor: NEU.bg, borderRadius: 20, padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  infoName: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  infoDetails: { fontSize: typography.sizes.sm, color: NEU.textMuted, marginTop: 2 },

  averageCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, borderRadius: 20, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  averageIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  averageInfo: { flex: 1 },
  averageLabel: { fontSize: typography.sizes.sm, color: NEU.textMuted },
  averageValue: { fontSize: 40, fontWeight: '800', marginTop: 4 },
  averageRemarks: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },

  quarterSection: { marginBottom: spacing.md },
  quarterHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.sm, gap: spacing.sm,
  },
  quarterTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text, flex: 1 },
  quarterBadge: {
    backgroundColor: NEU.bg,
    paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 1,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  quarterBadgeText: { fontSize: typography.sizes.xs, color: NEU.accent, fontWeight: '700' },

  gradeItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, borderRadius: 16, padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  gradeInfo: { flex: 1 },
  gradeSubject: { fontSize: typography.sizes.sm, fontWeight: '600', color: NEU.text },
  gradeCode: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },
  gradeRemarks: {
    fontSize: typography.sizes.xs, color: NEU.textFaint,
    marginTop: 2, fontStyle: 'italic',
  },
  gradeBadge: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  gradeValue: { fontSize: typography.sizes.lg, fontWeight: '800' },

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