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

type TeacherInfo = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  specialization: string;
};

type Stats = {
  totalSubjects: number;
  totalSections: number;
  totalStudents: number;
  todayClasses: number;
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalSubjects: 0,
    totalSections: 0,
    totalStudents: 0,
    todayClasses: 0,
  });

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
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

      const { data: teacherData } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          employee_id,
          specialization,
          users:user_id (first_name, last_name, email)
        `)
        .eq('user_id', userData.id)
        .maybeSingle();

      if (!teacherData) {
        setLoading(false);
        return;
      }

      const tu = (teacherData as any).users;

      setTeacher({
        id: teacherData.id,
        employee_id: teacherData.employee_id || 'N/A',
        full_name: `${tu?.first_name || ''} ${tu?.last_name || ''}`.trim() || 'Teacher',
        email: tu?.email || email,
        specialization: teacherData.specialization || 'N/A',
      });

      // Fetch teacher's schedules
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, section_id, subject_id, day, start_time, end_time')
        .eq('teacher_id', teacherData.id);

      // Unique subjects & sections
      const uniqueSubjects = new Set(
        (schedulesData || []).map((s: any) => s.subject_id).filter(Boolean)
      );
      const uniqueSections = new Set(
        (schedulesData || []).map((s: any) => s.section_id).filter(Boolean)
      );

      // Count students in those sections
      let totalStudents = 0;
      if (uniqueSections.size > 0) {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .in('section_id', [...uniqueSections]);
        totalStudents = count || 0;
      }

      // Today's classes
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      const todayClasses = (schedulesData || []).filter(
        (s: any) => s.day === today
      ).length;

      setStats({
        totalSubjects: uniqueSubjects.size,
        totalSections: uniqueSections.size,
        totalStudents,
        todayClasses,
      });
    } catch (error) {
      console.error('Error loading teacher data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={isSmallScreen ? 16 : 20} color={color} />
        </View>
      </View>
      <Text style={styles.statNumber}>{value}</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, {teacher?.full_name?.split(' ')[0] || 'Teacher'}!</Text>
            <Text style={styles.subGreeting}>{teacher?.specialization}</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/teacher/profile')}>
            <Ionicons name="person-circle" size={36} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Teacher Info */}
        {teacher && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{teacher.employee_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{teacher.email}</Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="stats-chart" size={18} color={colors.primary} /> My Stats
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="My Subjects"
              value={stats.totalSubjects}
              icon="book"
              color="#9C27B0"
              onPress={() => router.push('/teacher/subjects')}
            />
            <StatCard
              title="My Sections"
              value={stats.totalSections}
              icon="grid"
              color="#4CAF50"
              onPress={() => router.push('/teacher/schedule')}
            />
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon="people"
              color="#2196F3"
              onPress={() => router.push('/teacher/attendance')}
            />
            <StatCard
              title="Today's Classes"
              value={stats.todayClasses}
              icon="time"
              color="#FF9800"
              onPress={() => router.push('/teacher/schedule')}
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
              title="Face Attendance"
              subtitle="Mark attendance via face recognition"
              icon="scan"
              onPress={() => router.push('/teacher/face-attendance')}
            />
            <ActionCard
              title="Manual Attendance"
              subtitle="Mark attendance manually"
              icon="checkbox"
              onPress={() => router.push('/teacher/attendance')}
            />
            <ActionCard
              title="My Schedule"
              subtitle="View your teaching schedule"
              icon="time"
              onPress={() => router.push('/teacher/schedule')}
            />
            <ActionCard
              title="My Subjects"
              subtitle="View subjects you handle"
              icon="book"
              onPress={() => router.push('/teacher/subjects')}
            />
            <ActionCard
              title="Grades"
              subtitle="Enter and manage student grades"
              icon="star"
              onPress={() => router.push('/teacher/grades')}
            />
            <ActionCard
              title="My Profile"
              subtitle="View and edit your profile"
              icon="person"
              onPress={() => router.push('/teacher/profile')}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.bottomProfileBtn}
          onPress={() => router.push('/teacher/profile')}
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
  infoLabel: { fontSize: typography.sizes.sm, color: '#666', width: 90 },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    flex: 1,
  },
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