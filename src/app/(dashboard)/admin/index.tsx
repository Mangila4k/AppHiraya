import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

type Stats = {
  totalStudents: number;
  totalTeachers: number;
  totalRegistrars: number;
  totalParents: number;
  totalSections: number;
  totalSubjects: number;
  totalEnrollments: number;
  pendingEnrollments: number;
  enrolledCount: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalRegistrars: 0,
    totalParents: 0,
    totalSections: 0,
    totalSubjects: 0,
    totalEnrollments: 0,
    pendingEnrollments: 0,
    enrolledCount: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { count: studentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      const { count: teachersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher');

      const { count: registrarsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'registrar');

      const { count: parentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'parent');

      const { count: sectionsCount } = await supabase
        .from('sections')
        .select('*', { count: 'exact', head: true });

      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true });

      const { count: totalEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true });

      const { count: pendingEnrollments } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

      const { count: enrolledCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Enrolled');

      setStats({
        totalStudents: studentsCount || 0,
        totalTeachers: teachersCount || 0,
        totalRegistrars: registrarsCount || 0,
        totalParents: parentsCount || 0,
        totalSections: sectionsCount || 0,
        totalSubjects: subjectsCount || 0,
        totalEnrollments: totalEnrollments || 0,
        pendingEnrollments: pendingEnrollments || 0,
        enrolledCount: enrolledCount || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Hello, Admin!</Text>
            <Text style={styles.subGreeting}>Welcome to PLSNHS Dashboard</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/admin/profile')}
          >
            <Ionicons name="person-circle" size={36} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* User Role Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="people" size={18} color={colors.primary} /> User Statistics
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Students"
              value={stats.totalStudents}
              icon="school"
              color="#2196F3"
              onPress={() => router.push('/admin/students')}
            />
            <StatCard
              title="Teachers"
              value={stats.totalTeachers}
              icon="person"
              color="#4CAF50"
              onPress={() => router.push('/admin/teachers')}
            />
            <StatCard
              title="Registrars"
              value={stats.totalRegistrars}
              icon="clipboard"
              color="#FF9800"
              onPress={() => router.push('/admin/registrar')}
            />
            <StatCard
              title="Parents"
              value={stats.totalParents}
              icon="people"
              color="#9C27B0"
              onPress={() => router.push('/admin/parent')}
            />
          </View>
        </View>

        {/* School Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="business" size={18} color={colors.primary} /> School Statistics
          </Text>
          <View style={styles.statsGrid}>
            <StatCard
              title="Sections"
              value={stats.totalSections}
              icon="grid"
              color="#FF9800"
              onPress={() => router.push('/admin/sections')}
            />
            <StatCard
              title="Subjects"
              value={stats.totalSubjects}
              icon="book"
              color="#9C27B0"
              onPress={() => router.push('/admin/subjects')}
            />
            <StatCard
              title="Enrollments"
              value={stats.totalEnrollments}
              icon="document-text"
              color="#00BCD4"
              onPress={() => router.push('/admin/enrollments')}
            />
            <StatCard
              title="Pending"
              value={stats.pendingEnrollments}
              icon="time"
              color="#FF9800"
              onPress={() => router.push('/admin/enrollments')}
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
              title="Enroll Student"
              subtitle="Process enrollment"
              icon="school"
              onPress={() => router.push('/admin/enrollments')}
            />
            <ActionCard
              title="Add Teacher"
              subtitle="Hire faculty"
              icon="person-add"
              onPress={() => router.push('/admin/add-teacher')}
            />
            <ActionCard
              title="Create Section"
              subtitle="Add new class"
              icon="grid"
              onPress={() => router.push('/admin/create-section')}
            />
            <ActionCard
              title="Create Schedule"
              subtitle="Set schedule"
              icon="calendar"
              onPress={() => router.push('/admin/create-schedule')}
            />
            <ActionCard
              title="Register Face"
              subtitle="Scan teacher faces for verification"
              icon="scan"
              onPress={() => router.push('/admin/register-face')}
            />
            <ActionCard
              title="Manage Accounts"
              subtitle="User management"
              icon="people"
              onPress={() => router.push('/admin/accounts')}
            />
            <ActionCard
              title="Manage Subjects"
              subtitle="Add/Edit subjects"
              icon="book"
              onPress={() => router.push('/admin/subjects')}
            />
            <ActionCard
              title="Teacher Attendance"
              subtitle="View attendance records"
              icon="time"
              onPress={() => router.push('/admin/attendance')}
            />
          </View>
        </View>

        {/* System Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time" size={18} color={colors.primary} /> System Information
          </Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>School Year</Text>
              <Text style={styles.infoValue}>2026-2027</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="server" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoValue}>Active</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cloud-upload" size={20} color={colors.primary} />
              <Text style={styles.infoLabel}>Last Backup</Text>
              <Text style={styles.infoValue}>Today</Text>
            </View>
          </View>
        </View>

        {/* Profile Button at Bottom */}
        <TouchableOpacity
          style={styles.bottomProfileBtn}
          onPress={() => router.push('/admin/profile')}
        >
          <Ionicons name="person-circle" size={24} color={colors.white} />
          <Text style={styles.bottomProfileText}>My Profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  greeting: {
    fontSize: isSmallScreen ? typography.sizes.lg : typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  subGreeting: {
    fontSize: isSmallScreen ? typography.sizes.xs : typography.sizes.sm,
    color: '#666',
    marginTop: 2,
  },
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
  section: {
    marginBottom: spacing.lg,
  },
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
    width: isSmallScreen ? '48%' : '48%',
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
    fontSize: isSmallScreen ? typography.sizes.xs : typography.sizes.sm,
    color: '#666',
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  statIcon: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
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
  actionsGrid: {
    gap: spacing.sm,
  },
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
    width: isSmallScreen ? 36 : 44,
    height: isSmallScreen ? 36 : 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: isSmallScreen ? typography.sizes.xs : typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 4,
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 2,
  },
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