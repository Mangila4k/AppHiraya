import ChatbotFab from '@/components/ChatbotFab';
import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
          .select('id, section_id')
          .eq('id', userData.student_id)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        const { data } = await supabase
          .from('students')
          .select('id, section_id')
          .eq('email', email)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData?.section_id) {
        setLoading(false);
        return;
      }

      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select(`
          id, name, grade_level, strand, room, adviser_id, adviser_name,
          teachers:adviser_id (
            id, user_id, employee_id, specialization,
            users:user_id (first_name, last_name, email)
          )
        `)
        .eq('id', studentData.section_id)
        .single();

      if (sectionError) console.error('Error fetching section:', sectionError);

      let adviserName = 'No Adviser';
      let adviserEmail = '';
      let adviserSpecialization = '';

      const teacherRel = sectionData?.teachers
        ? Array.isArray(sectionData.teachers)
          ? sectionData.teachers[0]
          : sectionData.teachers
        : null;

      if (teacherRel) {
        const teacherUser = Array.isArray(teacherRel.users)
          ? teacherRel.users[0]
          : teacherRel.users;
        if (teacherUser) {
          adviserName =
            `${teacherUser.first_name || ''} ${teacherUser.last_name || ''}`.trim() ||
            'No Adviser';
          adviserEmail = teacherUser.email || '';
        }
        adviserSpecialization = teacherRel.specialization || '';
      }

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

      const { data: classmatesData } = await supabase
        .from('students')
        .select('id, lrn, gender, first_name, last_name, middle_name')
        .eq('section_id', studentData.section_id)
        .order('last_name', { ascending: true });

      if (classmatesData) {
        const list: Classmate[] = classmatesData.map((s: any) => {
          const middle = s.middle_name ? ` ${s.middle_name.charAt(0)}.` : '';
          return {
            id: s.id,
            full_name:
              `${s.first_name || ''}${middle} ${s.last_name || ''}`.trim() || 'Unknown',
            lrn: s.lrn || 'N/A',
            gender: s.gender || 'N/A',
          };
        });
        setClassmates(list);
        setSection((prev) => (prev ? { ...prev, student_count: list.length } : null));
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
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color={NEU.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>My Section</Text>
          <TouchableOpacity onPress={loadSection} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={NEU.text} />
          </TouchableOpacity>
        </View>

        {section ? (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="school" size={32} color={NEU.accent} />
              </View>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionDetails}>
                Grade {section.grade_level}
                {section.strand !== 'N/A' ? ` • ${section.strand}` : ''}
              </Text>

              <View style={styles.sectionMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={16} color={NEU.accent} />
                  <Text style={styles.metaLabel}>Room</Text>
                  <Text style={styles.metaValue}>{section.room}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={16} color={NEU.accent} />
                  <Text style={styles.metaLabel}>Students</Text>
                  <Text style={styles.metaValue}>{section.student_count}</Text>
                </View>
              </View>
            </View>

            <View style={styles.adviserCard}>
              <View style={styles.adviserHeader}>
                <Ionicons name="person-circle" size={20} color={NEU.accent} />
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

            <View style={styles.classmatesSection}>
              <Text style={styles.classmatesTitle}>
                Classmates ({classmates.length})
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
                    <View style={styles.genderBadge}>
                      <Text style={styles.genderText}>{mate.gender}</Text>
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
            <Ionicons name="school-outline" size={44} color={NEU.textFaint} />
            <Text style={styles.emptyText}>You are not enrolled in a section yet</Text>
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

  sectionCard: {
    backgroundColor: NEU.bg, borderRadius: 20, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.md,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  sectionIconContainer: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  sectionName: { fontSize: typography.sizes.xl, fontWeight: '800', color: NEU.text },
  sectionDetails: { fontSize: typography.sizes.sm, color: NEU.textMuted, marginTop: 4 },
  sectionMeta: {
    flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: NEU.bgDark,
    width: '100%', justifyContent: 'space-around',
  },
  metaItem: { alignItems: 'center', flex: 1, paddingHorizontal: 4 },
  metaLabel: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 4 },
  metaValue: {
    fontSize: typography.sizes.sm, fontWeight: '700',
    color: NEU.text, marginTop: 2, textAlign: 'center',
  },

  adviserCard: {
    backgroundColor: NEU.bg, borderRadius: 20, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  adviserHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: NEU.bgDark,
  },
  adviserTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  adviserContent: { flexDirection: 'row', alignItems: 'center' },
  adviserAvatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  adviserAvatarText: { fontSize: typography.sizes.xl, fontWeight: '800', color: NEU.accent },
  adviserInfo: { flex: 1 },
  adviserName: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  adviserSpecialization: {
    fontSize: typography.sizes.xs, color: NEU.accent, marginTop: 2, fontWeight: '600',
  },
  adviserEmail: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },

  classmatesSection: { marginBottom: spacing.lg },
  classmatesTitle: {
    fontSize: typography.sizes.md, fontWeight: '700',
    color: NEU.text, marginBottom: spacing.md, paddingHorizontal: 4,
  },
  classmateItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, borderRadius: 16, padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  classmateNumber: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  classmateNumberText: { fontSize: typography.sizes.sm, fontWeight: '800', color: NEU.accent },
  classmateInfo: { flex: 1 },
  classmateName: { fontSize: typography.sizes.sm, fontWeight: '600', color: NEU.text },
  classmateDetails: { fontSize: typography.sizes.xs, color: NEU.textMuted },
  genderBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: 12, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 1,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  genderText: { fontSize: typography.sizes.xs, fontWeight: '700', color: NEU.accent },

  noClassmatesContainer: {
    backgroundColor: NEU.bg, borderRadius: 16, padding: spacing.lg,
    alignItems: 'center',
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  noClassmatesText: { fontSize: typography.sizes.sm, color: NEU.textMuted },

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
    marginTop: spacing.md, textAlign: 'center', fontWeight: '600',
  },
});