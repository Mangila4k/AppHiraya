import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Classmate = {
  id: string;
  full_name: string;
  lrn: string;
  gender: string;
};

type SectionInfo = {
  id: string;
  name: string;
  grade_level: string;
  strand: string;
  adviser_name: string;
  adviser_email: string;
  adviser_specialization: string;
  room: string;
  student_count: number;
};

export default function StudentSection() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<SectionInfo | null>(null);
  const [classmates, setClassmates] = useState<Classmate[]>([]);

  useEffect(() => {
    loadSection();
  }, []);

  const loadSection = async () => {
    setLoading(true);
    try {
      // 1. Get logged-in user email from AsyncStorage
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
        const { data } = await supabase
          .from('students')
          .select('id, section_id')
          .eq('id', userData.student_id)
          .maybeSingle();
        studentData = data;
      }

      // Fallback: match by email
      if (!studentData) {
        const { data } = await supabase
          .from('students')
          .select('id, section_id')
          .eq('email', email)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData?.section_id) {
        console.log('No section assigned to this student');
        setLoading(false);
        return;
      }

      // 4. Get section details WITH adviser join through teachers → users
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select(`
          id,
          name,
          grade_level,
          strand,
          room,
          adviser_id,
          adviser_name,
          teachers:adviser_id (
            id,
            user_id,
            employee_id,
            specialization,
            users:user_id (
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('id', studentData.section_id)
        .single();

      if (sectionError) {
        console.error('Error fetching section:', sectionError);
      }

      // 5. Extract adviser info from the nested join
      let adviserName = 'No Adviser';
      let adviserEmail = '';
      let adviserSpecialization = '';

      if (sectionData?.teachers) {
        const teacher = sectionData.teachers as any;
        const teacherUser = teacher.users;

        if (teacherUser) {
          adviserName = `${teacherUser.first_name || ''} ${teacherUser.last_name || ''}`.trim() || 'No Adviser';
          adviserEmail = teacherUser.email || '';
        }
        adviserSpecialization = teacher.specialization || '';
      }

      // Fallback to adviser_name column
      if ((!adviserName || adviserName === 'No Adviser') && sectionData?.adviser_name) {
        adviserName = sectionData.adviser_name;
      }

      if (sectionData) {
        setSection({
          id: sectionData.id,
          name: sectionData.name || 'Unknown',
          grade_level: sectionData.grade_level || 'N/A',
          strand: sectionData.strand || 'N/A',
          adviser_name: adviserName,
          adviser_email: adviserEmail,
          adviser_specialization: adviserSpecialization,
          room: sectionData.room || 'N/A',
          student_count: 0,
        });
      }

      // 6. Get classmates from students table
      const { data: classmatesData, error: classmatesError } = await supabase
        .from('students')
        .select(`
          id,
          lrn,
          gender,
          first_name,
          last_name,
          middle_name
        `)
        .eq('section_id', studentData.section_id)
        .order('last_name', { ascending: true });

      if (classmatesError) {
        console.error('Error fetching classmates:', classmatesError);
      }

      if (classmatesData) {
        const list: Classmate[] = classmatesData.map((s: any) => {
          const middle = s.middle_name ? ` ${s.middle_name.charAt(0)}.` : '';
          return {
            id: s.id,
            full_name: `${s.first_name || ''}${middle} ${s.last_name || ''}`.trim() || 'Unknown',
            lrn: s.lrn || 'N/A',
            gender: s.gender || 'N/A',
          };
        });
        setClassmates(list);
        setSection(prev => prev ? { ...prev, student_count: list.length } : null);
      }
    } catch (error) {
      console.error('Error loading section:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading section...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Section</Text>
          <TouchableOpacity onPress={loadSection} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {section ? (
          <>
            {/* Section Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="school" size={40} color={colors.primary} />
              </View>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionDetails}>
                Grade {section.grade_level}
                {section.strand !== 'N/A' ? ` • ${section.strand}` : ''}
              </Text>

              <View style={styles.sectionMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={18} color={colors.primary} />
                  <Text style={styles.metaLabel}>Room</Text>
                  <Text style={styles.metaValue}>{section.room}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={18} color={colors.primary} />
                  <Text style={styles.metaLabel}>Students</Text>
                  <Text style={styles.metaValue}>{section.student_count}</Text>
                </View>
              </View>
            </View>

            {/* Adviser Card */}
            <View style={styles.adviserCard}>
              <View style={styles.adviserHeader}>
                <Ionicons name="person-circle" size={24} color={colors.primary} />
                <Text style={styles.adviserTitle}>Class Adviser</Text>
              </View>
              <View style={styles.adviserContent}>
                <View style={styles.adviserAvatar}>
                  <Text style={styles.adviserAvatarText}>
                    {(section.adviser_name || 'N').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.adviserInfo}>
                  <Text style={styles.adviserName}>{section.adviser_name}</Text>
                  {section.adviser_specialization ? (
                    <Text style={styles.adviserSpecialization}>
                      {section.adviser_specialization}
                    </Text>
                  ) : null}
                  {section.adviser_email ? (
                    <Text style={styles.adviserEmail}>{section.adviser_email}</Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Classmates */}
            <View style={styles.classmatesSection}>
              <Text style={styles.classmatesTitle}>
                <Ionicons name="people" size={18} color={colors.primary} /> Classmates ({classmates.length})
              </Text>
              {classmates.length > 0 ? (
                classmates.map((mate, index) => (
                  <View key={mate.id} style={styles.classmateItem}>
                    <View style={styles.classmateNumber}>
                      <Text style={styles.classmateNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.classmateInfo}>
                      <Text style={styles.classmateName}>{mate.full_name}</Text>
                      <Text style={styles.classmateDetails}>LRN: {mate.lrn}</Text>
                    </View>
                    <View style={[
                      styles.genderBadge,
                      { backgroundColor: mate.gender === 'Male' ? '#2196F320' : '#E91E6320' }
                    ]}>
                      <Text style={[
                        styles.genderText,
                        { color: mate.gender === 'Male' ? '#2196F3' : '#E91E63' }
                      ]}>
                        {mate.gender}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noClassmatesContainer}>
                  <Text style={styles.noClassmatesText}>No classmates yet</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>You are not enrolled in a section yet</Text>
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
  sectionCard: {
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
  sectionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  sectionName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  sectionDetails: { fontSize: typography.sizes.sm, color: '#666', marginTop: 4 },
  sectionMeta: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: '100%',
    justifyContent: 'space-around',
  },
  metaItem: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  metaLabel: { fontSize: typography.sizes.xs, color: '#666', marginTop: 4 },
  metaValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginTop: 2,
    textAlign: 'center',
  },
  adviserCard: {
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
  adviserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  adviserTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  adviserContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adviserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  adviserAvatarText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  adviserInfo: { flex: 1 },
  adviserName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  adviserSpecialization: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    marginTop: 2,
    fontWeight: typography.weights.medium,
  },
  adviserEmail: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  classmatesSection: { marginBottom: spacing.lg },
  classmatesTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  classmateItem: {
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
  classmateNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  classmateNumberText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  classmateInfo: { flex: 1 },
  classmateName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  classmateDetails: { fontSize: typography.sizes.xs, color: '#666' },
  genderBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  genderText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  noClassmatesContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
  },
  noClassmatesText: { fontSize: typography.sizes.sm, color: '#999' },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: '#999',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});