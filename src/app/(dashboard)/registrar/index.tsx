import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Stats = {
  pendingEnrollments: number;
  approvedEnrollments: number;
  rejectedEnrollments: number;
};

export default function RegistrarDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrarName, setRegistrarName] = useState('Registrar');
  const [stats, setStats] = useState<Stats>({
    pendingEnrollments: 0,
    approvedEnrollments: 0,
    rejectedEnrollments: 0,
  });

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      // 1. Get registrar name
      const { data: userData } = await supabase
        .from('users').select('first_name, last_name').eq('email', email).maybeSingle();

      if (userData) {
        setRegistrarName(
          `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Registrar'
        );
      }

      // 2. Fetch all enrollments (just status) and count client-side
      //    — case-insensitive so 'pending' / 'Pending' / 'PENDING' all work
      const { data: allEnrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('status');

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
      }

      let pendingCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;

      (allEnrollments || []).forEach((e: any) => {
        const s = String(e.status || '').trim().toLowerCase();
        if (s === 'pending') pendingCount++;
        else if (s === 'enrolled' || s === 'approved') approvedCount++;
        else if (s === 'rejected') rejectedCount++;
      });

      // Debug log — visible in Metro console
      console.log('📊 Enrollment counts:', {
        total: allEnrollments?.length || 0,
        pending: pendingCount,
        enrolled: approvedCount,
        rejected: rejectedCount,
        rawStatuses: [...new Set((allEnrollments || []).map((e: any) => e.status))],
      });

      setStats({
        pendingEnrollments: pendingCount,
        approvedEnrollments: approvedCount,
        rejectedEnrollments: rejectedCount,
      });
    } catch (e) {
      console.error('Dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </View>
      <Text style={styles.statNumber}>{value}</Text>
    </TouchableOpacity>
  );

  const ActionCard = ({ title, subtitle, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.actionInfo}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
          <View>
            <Text style={styles.title}>Registrar Dashboard</Text>
            <Text style={styles.welcome}>Welcome, {registrarName}!</Text>
          </View>
        </View>

        {/* ===== Enrollment Stats — Pending / Enrolled / Rejected ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="stats-chart" size={18} color={colors.primary} /> Enrollment Stats
          </Text>
          <View style={styles.statsRow}>
            <StatCard
              title="Pending"
              value={stats.pendingEnrollments}
              icon="time"
              color="#FF9800"
              onPress={() => router.push('/(dashboard)/registrar/enrollments')}
            />
            <StatCard
              title="Enrolled"
              value={stats.approvedEnrollments}
              icon="checkmark-circle"
              color="#4CAF50"
              onPress={() => router.push('/(dashboard)/registrar/enrollments')}
            />
            <StatCard
              title="Rejected"
              value={stats.rejectedEnrollments}
              icon="close-circle"
              color="#F44336"
              onPress={() => router.push('/(dashboard)/registrar/enrollments')}
            />
          </View>
        </View>

        {/* ===== Main Responsibilities ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="briefcase" size={18} color={colors.primary} /> Main Responsibilities
          </Text>

          <ActionCard
            title="Enrollees & Admissions"
            subtitle="Process new student applications"
            icon="person-add"
            color="#2196F3"
            onPress={() => router.push('/(dashboard)/registrar/enrollments')}
          />
          <ActionCard
            title="Students by Grade & Strand"
            subtitle="Browse students by grade level and strand"
            icon="school"
            color="#9C27B0"
            onPress={() => router.push('/(dashboard)/registrar/students')}
          />
          <ActionCard
            title="School Transfers"
            subtitle="Handle incoming and outgoing transfers"
            icon="swap-horizontal"
            color="#FF9800"
            onPress={() => router.push('/(dashboard)/registrar/transfers')}
          />
          <ActionCard
            title="Attendance Coordination"
            subtitle="Monitor class attendance reports"
            icon="calendar"
            color="#4CAF50"
            onPress={() => router.push('/(dashboard)/registrar/attendance')}
          />
          <ActionCard
            title="District & State Compliance"
            subtitle="Submit required reports"
            icon="shield-checkmark"
            color="#9C27B0"
            onPress={() => router.push('/(dashboard)/registrar/compliance')}
          />
          <ActionCard
            title="Report Cards & Permanent Files"
            subtitle="Generate report cards and records"
            icon="document-text"
            color="#00BCD4"
            onPress={() => router.push('/(dashboard)/registrar/report-cards')}
          />
        </View>

        {/* ===== Quick Actions ===== */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="flash" size={18} color={colors.primary} /> Quick Actions
          </Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(dashboard)/registrar/enrollments')}
            >
              <Ionicons name="add-circle" size={28} color={colors.primary} />
              <Text style={styles.quickBtnText}>Enrollments</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(dashboard)/registrar/students')}
            >
              <Ionicons name="people" size={28} color="#9C27B0" />
              <Text style={styles.quickBtnText}>Students</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(dashboard)/registrar/transfers')}
            >
              <Ionicons name="airplane" size={28} color="#FF9800" />
              <Text style={styles.quickBtnText}>Transfers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => router.push('/(dashboard)/registrar/profile')}
            >
              <Ionicons name="person" size={28} color="#666" />
              <Text style={styles.quickBtnText}>My Profile</Text>
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
  header: { marginBottom: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  welcome: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: spacing.xs },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statTitle: { fontSize: typography.sizes.xs, color: '#666' },
  statIcon: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  statNumber: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    elevation: 2,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  actionInfo: { flex: 1 },
  actionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  actionSubtitle: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickBtn: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    elevation: 2,
  },
  quickBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});