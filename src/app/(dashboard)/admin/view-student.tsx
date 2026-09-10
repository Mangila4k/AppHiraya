import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StudentDetail = {
  id: string;
  lrn: string;
  full_name: string;
  email: string;
  grade_level: string;
  strand: string;
  section: string;
  birth_date: string;
  gender: string;
  address: string;
  parent_name: string;
  parent_contact: string;
  civil_status: string;
  nationality: string;
  religion: string;
  contact_number: string;
  created_at: string;
};

export default function ViewStudent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadStudent();
    }
  }, [id]);

  const loadStudent = async () => {
    setLoading(true);
    try {
      // Get student data with section info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          sections:section_id (name)
        `)
        .eq('id', id)
        .single();

      if (studentError) throw studentError;

      if (studentData) {
        // Get section name
        let sectionName = 'No Section';
        if (studentData.section_id && studentData.sections) {
          sectionName = studentData.sections.name || 'No Section';
        }

        setStudent({
          id: studentData.id,
          lrn: studentData.lrn || 'N/A',
          full_name: `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() || 'Unknown',
          email: studentData.email || 'No email',
          grade_level: studentData.grade_level || 'N/A',
          strand: studentData.strand || 'N/A',
          section: sectionName,
          birth_date: studentData.birth_date || studentData.date_of_birth || 'N/A',
          gender: studentData.gender || 'N/A',
          address: studentData.address || 'N/A',
          parent_name: studentData.parent_name || 'N/A',
          parent_contact: studentData.parent_contact || 'N/A',
          civil_status: studentData.civil_status || 'N/A',
          nationality: studentData.nationality || 'N/A',
          religion: studentData.religion || 'N/A',
          contact_number: studentData.contact_number || 'N/A',
          created_at: studentData.created_at,
        });
      }
    } catch (error) {
      console.error('Error loading student:', error);
      Alert.alert('Error', 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading student details...</Text>
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Student not found</Text>
        <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
          <Text style={styles.title}>Student Profile</Text>
          <TouchableOpacity style={styles.headerEditButton} onPress={() => router.push(`./edit-student?id=${student.id}`)}>
            <Ionicons name="create" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(student.full_name)}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{student.full_name}</Text>
          <Text style={styles.profileEmail}>{student.email}</Text>
          <View style={styles.studentBadge}>
            <Text style={styles.studentBadgeText}>LRN: {student.lrn}</Text>
          </View>
          <View style={styles.studentBadge}>
            <Text style={styles.studentBadgeText}>
              Grade {student.grade_level} {student.strand !== 'N/A' ? `• ${student.strand}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>LRN (Learner Reference Number)</Text>
              <Text style={styles.infoValue}>{student.lrn}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Grade Level</Text>
              <Text style={styles.infoValue}>Grade {student.grade_level}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Strand</Text>
              <Text style={styles.infoValue}>{student.strand}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Section</Text>
              <Text style={styles.infoValue}>{student.section}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Birth Date</Text>
              <Text style={styles.infoValue}>{student.birth_date}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{student.gender}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Civil Status</Text>
              <Text style={styles.infoValue}>{student.civil_status}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nationality</Text>
              <Text style={styles.infoValue}>{student.nationality}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Religion</Text>
              <Text style={styles.infoValue}>{student.religion}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{student.contact_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{student.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Parent/Guardian Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Parent Name</Text>
              <Text style={styles.infoValue}>{student.parent_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Parent Contact</Text>
              <Text style={styles.infoValue}>{student.parent_contact}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitEditButton}
          onPress={() => router.push(`./edit-student?id=${student.id}`)}
        >
          <Ionicons name="create" size={20} color={colors.white} />
          <Text style={styles.editButtonText}>Edit Student</Text>
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
    padding: spacing.xxxl,
  },
  loadingText: {
    fontSize: typography.sizes.md,
    color: '#666',
  },
  backButtonLarge: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  backButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
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
  headerEditButton: {
    padding: spacing.sm,
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
  profileEmail: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginTop: 2,
  },
  studentBadge: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.xs,
  },
  studentBadgeText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  infoSection: {
    marginBottom: spacing.md,
  },
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
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: '#666',
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  submitEditButton: {
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