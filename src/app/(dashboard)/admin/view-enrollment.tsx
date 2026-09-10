import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type EnrollmentDetail = {
  id: string;
  student_name: string;
  student_id: string;
  grade_level: string;
  strand: string;
  previous_school: string;
  previous_grade: string;
  last_school_year: string;
  general_average: number;
  status: string;
  created_at: string;
};

export default function ViewEnrollment() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [enrollment, setEnrollment] = useState<EnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEnrollment();
    }
  }, [id]);

  const loadEnrollment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Get student info
        let studentName = 'Unknown';
        let studentId = 'N/A';
        if (data.student_id) {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('student_id, user_id')
            .eq('id', data.student_id)
            .single();
          
          if (!studentError && studentData) {
            studentId = studentData.student_id || 'N/A';
            if (studentData.user_id) {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', studentData.user_id)
                .single();
              
              if (!userError && userData) {
                studentName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown';
              }
            }
          }
        }

        setEnrollment({
          id: data.id,
          student_name: studentName,
          student_id: studentId,
          grade_level: data.grade_level || 'N/A',
          strand: data.strand || 'N/A',
          previous_school: data.previous_school || 'N/A',
          previous_grade: data.previous_grade || 'N/A',
          last_school_year: data.last_school_year || 'N/A',
          general_average: data.general_average || 0,
          status: data.status || 'Pending',
          created_at: data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A',
        });
      }
    } catch (error) {
      console.error('Error loading enrollment:', error);
      Alert.alert('Error', 'Failed to load enrollment details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled': return '#4CAF50';
      case 'Pending': return '#FF9800';
      case 'Rejected': return '#F44336';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!enrollment) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Enrollment not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Enrollment Details</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {enrollment.student_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{enrollment.student_name}</Text>
          <Text style={styles.profileId}>ID: {enrollment.student_id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(enrollment.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(enrollment.status) }]}>
              {enrollment.status}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Enrollment Information</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Grade Level</Text>
            <Text style={styles.infoValue}>{enrollment.grade_level}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Strand</Text>
            <Text style={styles.infoValue}>{enrollment.strand}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Previous School</Text>
            <Text style={styles.infoValue}>{enrollment.previous_school}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Previous Grade</Text>
            <Text style={styles.infoValue}>{enrollment.previous_grade}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last School Year</Text>
            <Text style={styles.infoValue}>{enrollment.last_school_year}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>General Average</Text>
            <Text style={styles.infoValue}>{enrollment.general_average.toFixed(2)}</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date Applied</Text>
            <Text style={styles.infoValue}>{enrollment.created_at}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`./edit-enrollment?id=${enrollment.id}`)}
        >
          <Ionicons name="create" size={20} color={colors.white} />
          <Text style={styles.editButtonText}>Edit Enrollment</Text>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
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
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  profileName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  profileId: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  infoCard: {
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
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: '#666',
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
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
  editButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});