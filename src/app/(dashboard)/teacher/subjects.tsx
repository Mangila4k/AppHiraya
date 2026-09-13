import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Subject = {
  id: string;
  name: string;
  code: string;
  section_name: string;
  section_id: string;
  subject_type: string;
  schedule_count: number;
};

export default function TeacherSubjects() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from('users').select('*').eq('email', email).single();
      if (!userData) { setLoading(false); return; }

      const { data: teacherData } = await supabase
        .from('teachers').select('id').eq('user_id', userData.id).maybeSingle();
      if (!teacherData) { setLoading(false); return; }

      const { data: scheds } = await supabase
        .from('schedules').select('subject_id, section_id').eq('teacher_id', teacherData.id);
      if (!scheds) { setLoading(false); return; }

      // Count schedules per subject+section
      const keyMap: Record<string, { subject_id: string; section_id: string; count: number }> = {};
      scheds.forEach((s: any) => {
        const key = `${s.subject_id}_${s.section_id}`;
        if (!keyMap[key]) keyMap[key] = { subject_id: s.subject_id, section_id: s.section_id, count: 0 };
        keyMap[key].count++;
      });

      const subjectIds = [...new Set(Object.values(keyMap).map(v => v.subject_id).filter(Boolean))];
      const sectionIds = [...new Set(Object.values(keyMap).map(v => v.section_id).filter(Boolean))];

      const subjectData: Record<string, any> = {};
      const sectionData: Record<string, any> = {};

      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code, subject_type').in('id', subjectIds);
        (subs || []).forEach((s: any) => { subjectData[s.id] = s; });
      }
      if (sectionIds.length > 0) {
        const { data: secs } = await supabase
          .from('sections').select('id, name').in('id', sectionIds);
        (secs || []).forEach((s: any) => { sectionData[s.id] = s; });
      }

      const list: Subject[] = Object.values(keyMap).map(({ subject_id, section_id, count }) => ({
        id: subject_id,
        name: subjectData[subject_id]?.name || 'Unknown',
        code: subjectData[subject_id]?.code || 'N/A',
        subject_type: subjectData[subject_id]?.subject_type || 'N/A',
        section_name: sectionData[section_id]?.name || 'No Section',
        section_id: section_id,
        schedule_count: count,
      }));

      setSubjects(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'Core': return '#4CAF50';
      case 'Applied': return '#2196F3';
      case 'Specialized': return '#9C27B0';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subjects...</Text>
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
          <Text style={styles.title}>My Subjects</Text>
          <TouchableOpacity onPress={loadSubjects} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="book" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.summaryLabel}>Subjects Assigned</Text>
            <Text style={styles.summaryValue}>{subjects.length}</Text>
          </View>
        </View>

        {subjects.length > 0 ? (
          subjects.map(s => (
            <TouchableOpacity
              key={`${s.id}_${s.section_id}`}
              style={styles.subjectCard}
              onPress={() => router.push(`/teacher/grades?subject=${s.id}&section=${s.section_id}`)}
            >
              <View style={[styles.subjectIcon, { backgroundColor: getTypeColor(s.subject_type) + '20' }]}>
                <Ionicons name="book" size={22} color={getTypeColor(s.subject_type)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName}>{s.name}</Text>
                <Text style={styles.subjectCode}>{s.code}</Text>
                <Text style={styles.subjectSection}>
                  <Ionicons name="school" size={12} color="#666" /> {s.section_name}
                </Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(s.subject_type) + '20' }]}>
                <Text style={[styles.typeText, { color: getTypeColor(s.subject_type) }]}>{s.subject_type}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No subjects assigned</Text>
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
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, elevation: 2,
  },
  summaryLabel: { fontSize: typography.sizes.sm, color: '#666' },
  summaryValue: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  subjectCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, elevation: 2,
  },
  subjectIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  subjectName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  subjectCode: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  subjectSection: { fontSize: typography.sizes.xs, color: '#666', marginTop: 4 },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 10, marginRight: spacing.xs },
  typeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  emptyContainer: { alignItems: 'center', padding: spacing.xxxl, backgroundColor: colors.white, borderRadius: 16 },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
});