import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
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

type GroupedGrades = {
  [key: string]: Grade[];
};

type StudentInfo = {
  full_name: string;
  grade_level: string;
  strand: string;
  section: string;
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
      // 1. Get logged-in user email
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      // 2. Get user record (to access student_id)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setLoading(false);
        return;
      }

      // 3. Get student record from students table
      let studentData: any = null;

      if (userData.student_id) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            lrn,
            first_name,
            last_name,
            middle_name,
            grade_level,
            strand,
            sections:section_id (name)
          `)
          .eq('id', userData.student_id)
          .maybeSingle();

        if (error) console.error('Error fetching student:', error);
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
            middle_name,
            grade_level,
            strand,
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

      // 4. Set student info for display
      setStudentInfo({
        full_name: `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || 'Student',
        grade_level: studentData.grade_level || 'N/A',
        strand: studentData.strand || 'N/A',
        section: studentData.sections?.name || 'No Section',
      });

      // 5. Fetch grades for this student
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select(`
          id,
          semester,
          quarter,
          grade,
          remarks,
          subjects:subject_id (name, code)
        `)
        .eq('student_id', studentData.id)
        .order('quarter', { ascending: true });

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        setLoading(false);
        return;
      }

      if (gradesData) {
        const formatted: Grade[] = gradesData.map((g: any) => ({
          id: g.id,
          subject_name: g.subjects?.name || 'Unknown Subject',
          subject_code: g.subjects?.code || 'N/A',
          semester: g.semester || '',
          quarter: g.quarter || 1,
          grade: g.grade || 0,
          remarks: g.remarks || '',
        }));
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
    grades.forEach(g => {
      const key = `Quarter ${g.quarter}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(g);
    });
    return grouped;
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return '#4CAF50';
    if (grade >= 85) return '#8BC34A';
    if (grade >= 80) return '#FFC107';
    if (grade >= 75) return '#FF9800';
    return '#F44336';
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading grades...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const grouped = groupByQuarter();
  const quarters = Object.keys(grouped).sort((a, b) => {
    const numA = parseInt(a.replace('Quarter ', ''));
    const numB = parseInt(b.replace('Quarter ', ''));
    return numA - numB;
  });
  const average = calculateAverage();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Grades</Text>
          <TouchableOpacity onPress={loadGrades} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Student Info */}
        {studentInfo && (
          <View style={styles.infoCard}>
            <Text style={styles.infoName}>{studentInfo.full_name}</Text>
            <Text style={styles.infoDetails}>
              {studentInfo.grade_level}
              {studentInfo.strand !== 'N/A' ? ` • ${studentInfo.strand}` : ''}
              {' • '}{studentInfo.section}
            </Text>
          </View>
        )}

        {/* Average Card */}
        <View style={styles.averageCard}>
          <View style={[styles.averageIcon, { backgroundColor: getGradeColor(average) + '20' }]}>
            <Ionicons name="star" size={32} color={getGradeColor(average)} />
          </View>
          <View style={styles.averageInfo}>
            <Text style={styles.averageLabel}>General Average</Text>
            <Text style={[styles.averageValue, { color: getGradeColor(average) }]}>
              {average || 'N/A'}
            </Text>
            {average > 0 && (
              <Text style={styles.averageRemarks}>{getGradeRemarks(average)}</Text>
            )}
          </View>
        </View>

        {/* Grades by Quarter */}
        {quarters.length > 0 ? (
          quarters.map((quarter) => (
            <View key={quarter} style={styles.quarterSection}>
              <View style={styles.quarterHeader}>
                <Ionicons name="book" size={18} color={colors.primary} />
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
                      {grade.remarks ? (
                        <Text style={styles.gradeRemarks}>{grade.remarks}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(grade.grade) + '20' }]}>
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
            <Ionicons name="star-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No grades available yet</Text>
            <Text style={styles.emptySubtext}>
              Your grades will appear here once your teachers submit them.
            </Text>
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
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoName: { fontSize: typography.sizes.md, fontWeight: typography.weights.bold, color: colors.text },
  infoDetails: { fontSize: typography.sizes.sm, color: '#666', marginTop: 2 },
  averageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  averageIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  averageInfo: { flex: 1 },
  averageLabel: { fontSize: typography.sizes.sm, color: '#666' },
  averageValue: { fontSize: 40, fontWeight: typography.weights.bold, marginTop: 4 },
  averageRemarks: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  quarterSection: { marginBottom: spacing.md },
  quarterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  quarterTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text, flex: 1 },
  quarterBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  quarterBadgeText: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.medium },
  gradeItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  gradeInfo: { flex: 1 },
  gradeSubject: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  gradeCode: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  gradeRemarks: { fontSize: typography.sizes.xs, color: '#999', marginTop: 2, fontStyle: 'italic' },
  gradeBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  emptyContainer: { alignItems: 'center', padding: spacing.xxxl, backgroundColor: colors.white, borderRadius: 16 },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  emptySubtext: { fontSize: typography.sizes.sm, color: '#ccc', textAlign: 'center', marginTop: spacing.xs },
});