import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

type StudentInfo = {
  id: string;
  lrn: string;
  first_name: string;
  last_name: string;
  full_name: string;
  grade_level: string;
  strand: string;
  section_name: string;
  section_id: string;
  documents_status: string;
  enrollment_status: string;
};

type Stats = {
  averageGrade: number | null;
  totalSubjects: number;
  attendanceRate: number;
  daysPresent: number;
  daysAbsent: number;
};

export default function StudentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    averageGrade: null,
    totalSubjects: 0,
    attendanceRate: 0,
    daysPresent: 0,
    daysAbsent: 0,
  });

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // 1. Get logged-in user email
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      // 2. Get user record (to access student_id FK)
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

      // 3. Get student record via users.student_id → students.id
      let studentData: any = null;

      if (userData.student_id) {
        const { data } = await supabase
          .from('students')
          .select(`
            id,
            lrn,
            first_name,
            last_name,
            middle_name,
            suffix,
            grade_level,
            strand,
            section_id,
            documents_status,
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
            middle_name,
            suffix,
            grade_level,
            strand,
            section_id,
            documents_status,
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

      // 4. Determine enrollment status
      let enrollmentStatus = 'Not Enrolled';
      if (studentData.documents_status === 'complete') enrollmentStatus = 'Enrolled';
      else if (studentData.documents_status === 'Pending') enrollmentStatus = 'Pending';
      else if (studentData.documents_status) enrollmentStatus = studentData.documents_status;

      // 5. Build full name
      const middle = studentData.middle_name ? ` ${studentData.middle_name.charAt(0)}.` : '';
      const suffix = studentData.suffix ? ` ${studentData.suffix}` : '';
      const fullName = `${studentData.first_name || ''}${middle} ${studentData.last_name || ''}${suffix}`.trim() || 'Student';

      setStudent({
        id: studentData.id,
        lrn: studentData.lrn || 'N/A',
        first_name: studentData.first_name || '',
        last_name: studentData.last_name || '',
        full_name: fullName,
        grade_level: studentData.grade_level || 'N/A',
        strand: studentData.strand || 'N/A',
        section_name: studentData.sections?.name || 'No Section',
        section_id: studentData.section_id || '',
        documents_status: studentData.documents_status || 'N/A',
        enrollment_status: enrollmentStatus,
      });

      // 6. Get average grade from grades table
      const { data: gradesData } = await supabase
        .from('grades')
        .select('grade')
        .eq('student_id', studentData.id);

      let avgGrade: number | null = null;
      if (gradesData && gradesData.length > 0) {
        const sum = gradesData.reduce((acc, g) => acc + (g.grade || 0), 0);
        avgGrade = Math.round((sum / gradesData.length) * 100) / 100;
      }

      // 7. Get subject count for this grade level & strand
      const gradeNum = parseInt(studentData.grade_level);
      const isSeniorHigh = gradeNum >= 11;

      let subjectsQuery = supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('grade_level', studentData.grade_level);

      if (isSeniorHigh && studentData.strand && studentData.strand !== 'N/A') {
        subjectsQuery = subjectsQuery.eq('strand', studentData.strand);
      }

      const { count: subjectsCount } = await subjectsQuery;

      // 8. Get attendance summary
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', studentData.id);

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      if (attendanceData) {
        attendanceData.forEach((a: any) => {
          if (a.status === 'Present') presentCount++;
          if (a.status === 'Absent') absentCount++;
          if (a.status === 'Late') lateCount++;
        });
      }
      const totalDays = presentCount + absentCount + lateCount;
      const attendanceRate = totalDays > 0
        ? Math.round(((presentCount + lateCount) / totalDays) * 100)
        : 0;

      setStats({
        averageGrade: avgGrade,
        totalSubjects: subjectsCount || 0,
        attendanceRate,
        daysPresent: presentCount,
        daysAbsent: absentCount,
      });
    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, onPress, suffix }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={isSmallScreen ? 16 : 20} color={color} />
        </View>
      </View>
      <Text style={styles.statNumber}>
        {value}{suffix || ''}
      </Text>
    </TouchableOpacity>
  );

  const ActionCard = ({ title, subtitle, icon, onPress }: any) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={isSmallScreen ? 20 : 24} color={colors.primary} />
      </View>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled': return '#4CAF50';
      case 'Pending': return '#FF9800';
      case 'Rejected': return '#F44336';
      default: return '#999';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              Hello, {student?.first_name || 'Student'}!
            </Text>
            <Text style={styles.subGreeting}>
              {student?.grade_level && student.grade_level !== 'N/A' ? student.grade_level : ''}
{student?.strand && student.strand !== 'N/A' ? ` • ${student.strand}` : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/student/profile')}>
            <Ionicons name="person-circle" size={36} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Student Info Card */}
        {student && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{student.full_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="card" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>LRN</Text>
              <Text style={styles.infoValue}>{student.lrn}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="school" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Section</Text>
              <Text style={styles.infoValue}>{student.section_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(student.enrollment_status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(student.enrollment_status) }]}>
                  {student.enrollment_status}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="stats-chart" size={18} color={colors.primary} /> My Stats
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Average Grade"
              value={stats.averageGrade !== null ? stats.averageGrade : 'N/A'}
              icon="star"
              color="#FF9800"
              onPress={() => router.push('/student/grades')}
            />
            <StatCard
              title="Attendance"
              value={stats.attendanceRate}
              suffix="%"
              icon="calendar"
              color="#4CAF50"
              onPress={() => router.push('/student/attendance')}
            />
            <StatCard
              title="Subjects"
              value={stats.totalSubjects}
              icon="book"
              color="#9C27B0"
              onPress={() => router.push('/student/schedule')}
            />
            <StatCard
              title="Days Present"
              value={stats.daysPresent}
              icon="checkmark-done"
              color="#2196F3"
              onPress={() => router.push('/student/attendance')}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="flash" size={18} color={colors.primary} /> Quick Actions
          </Text>
          <View style={styles.actionsGrid}>
            <ActionCard
              title="My Grades"
              subtitle="View your grades per subject"
              icon="star"
              onPress={() => router.push('/student/grades')}
            />
            <ActionCard
              title="My Attendance"
              subtitle="View attendance record"
              icon="calendar"
              onPress={() => router.push('/student/attendance')}
            />
            <ActionCard
              title="My Schedule"
              subtitle="View class schedule"
              icon="time"
              onPress={() => router.push('/student/schedule')}
            />
            <ActionCard
              title="My Section"
              subtitle="View section info & classmates"
              icon="people"
              onPress={() => router.push('/student/section')}
            />
            <ActionCard
              title="My Profile"
              subtitle="View and edit your profile"
              icon="person"
              onPress={() => router.push('/student/profile')}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.bottomProfileBtn}
          onPress={() => router.push('/student/profile')}
        >
          <Ionicons name="person-circle" size={24} color={colors.white} />
          <Text style={styles.bottomProfileText}>My Profile</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  headerLeft: { flex: 1, marginRight: spacing.sm },
  greeting: {
    fontSize: isSmallScreen ? typography.sizes.lg : typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subGreeting: { fontSize: typography.sizes.sm, color: '#666', marginTop: 2 },
  profileBtn: {
    padding: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  infoLabel: { fontSize: typography.sizes.sm, color: '#666', width: 70 },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    flex: 1,
  },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    width: '48%',
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTitle: {
    fontSize: typography.sizes.xs,
    color: '#666',
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  statNumber: {
    fontSize: isSmallScreen ? typography.sizes.xl : typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 4,
  },
  actionsGrid: { gap: spacing.sm },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionInfo: { flex: 1 },
  actionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  actionSubtitle: { fontSize: typography.sizes.xs, color: '#666' },
  bottomProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  bottomProfileText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});