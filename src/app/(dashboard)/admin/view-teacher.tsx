import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TeacherDetail = {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  specialization: string;
  phone: string;
  address: string;
  created_at: string;
  sections: any[];
};

export default function ViewTeacher() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    setLoading(true);
    try {
      // 1. Query teachers table by id (this is teachers.id, not users.id)
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          employee_id,
          specialization,
          phone,
          address,
          created_at,
          users:user_id (
            id,
            first_name,
            last_name,
            email,
            created_at
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (teacherError) {
        console.error('Teacher lookup error:', teacherError);
        throw teacherError;
      }

      if (!teacherData) {
        console.log('No teacher found with id:', id);
        setLoading(false);
        return;
      }

      const user = (teacherData as any).users;

      // 2. Fetch sections where this teacher is adviser
      const { data: sectionsData } = await supabase
        .from('sections')
        .select('id, name, grade_level, strand, room')
        .eq('adviser_id', teacherData.id);

      setTeacher({
        id: teacherData.id,
        user_id: teacherData.user_id,
        employee_id: teacherData.employee_id || 'N/A',
        full_name: user
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        email: user?.email || 'No email',
        specialization: teacherData.specialization || 'Not specified',
        phone: teacherData.phone || 'N/A',
        address: teacherData.address || 'N/A',
        created_at: user?.created_at || teacherData.created_at,
        sections: sectionsData || [],
      });
    } catch (error) {
      console.error('Error loading teacher:', error);
      Alert.alert('Error', 'Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!teacher) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={50} color="#ccc" />
          <Text style={styles.loadingText}>Teacher not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTeacher}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getSpecializationColor = (spec: string) => {
    switch (spec.toLowerCase()) {
      case 'science': return '#4CAF50';
      case 'english': return '#2196F3';
      case 'mathematics': return '#FF9800';
      case 'esp': return '#9C27B0';
      case 'filipino': return '#E91E63';
      default: return colors.primary;
    }
  };

  const specColor = getSpecializationColor(teacher.specialization);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Teacher Profile</Text>
          <TouchableOpacity onPress={loadTeacher} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: specColor }]}>
            <Text style={styles.avatarText}>
              {teacher.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{teacher.full_name}</Text>
          <Text style={styles.profileEmail}>{teacher.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: specColor + '20' }]}>
            <Ionicons name="briefcase" size={14} color={specColor} />
            <Text style={[styles.roleText, { color: specColor }]}>
              {teacher.specialization}
            </Text>
          </View>
        </View>

        {/* Teacher Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Teacher Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{teacher.employee_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Specialization</Text>
              <Text style={styles.infoValue}>{teacher.specialization}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{teacher.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{teacher.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{teacher.address}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {teacher.created_at
                  ? new Date(teacher.created_at).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Assigned Sections */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="school" size={18} color={colors.primary} /> Assigned Sections ({teacher.sections.length})
          </Text>
          {teacher.sections.length > 0 ? (
            teacher.sections.map((section: any) => (
              <TouchableOpacity
                key={section.id}
                style={styles.sectionItem}
                onPress={() => router.push(`./view-section?id=${section.id}`)}
              >
                <View style={styles.sectionIcon}>
                  <Ionicons name="grid" size={20} color={colors.primary} />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionName}>{section.name}</Text>
                  <Text style={styles.sectionDetails}>
                    {section.grade_level}
                    {section.strand && section.strand !== 'N/A' ? ` • ${section.strand}` : ''}
                    {section.room ? ` • ${section.room}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#ccc" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.noSections}>
              <Text style={styles.noSectionsText}>No sections assigned</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`./edit-teacher?id=${teacher.id}`)}
        >
          <Ionicons name="create" size={20} color={colors.white} />
          <Text style={styles.editButtonText}>Edit Teacher</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: '#666' },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
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
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: typography.weights.bold, color: colors.white },
  profileName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.md },
  profileEmail: { fontSize: typography.sizes.sm, color: '#666', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  roleText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  infoSection: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: typography.sizes.sm, color: '#666' },
  infoValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text, flex: 1, textAlign: 'right' },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  sectionIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '10',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  sectionInfo: { flex: 1 },
  sectionName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  sectionDetails: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  noSections: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noSectionsText: { fontSize: typography.sizes.sm, color: '#999' },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  editButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});