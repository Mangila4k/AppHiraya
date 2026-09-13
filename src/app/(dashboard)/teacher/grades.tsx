import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = { id: string; name: string; grade_level: string };
type Subject = { id: string; name: string; code: string; subject_type: string };
type Student = {
  id: string;
  lrn: string;
  full_name: string;
  grade: string;
  existingGradeId?: string;
};

export default function TeacherGrades() {
  const router = useRouter();
  const params = useLocalSearchParams<{ subject?: string; section?: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [students, setStudents] = useState<Student[]>([]);

  const [subjectModal, setSubjectModal] = useState(false);
  const [sectionModal, setSectionModal] = useState(false);

  useEffect(() => { loadTeacherData(); }, []);

  const loadTeacherData = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }
      const { data: userData } = await supabase.from('users').select('*').eq('email', email).single();
      const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', userData?.id).maybeSingle();
      if (!teacherData) { setLoading(false); return; }

      const { data: scheds } = await supabase
        .from('schedules').select('subject_id, section_id').eq('teacher_id', teacherData.id);

      const subjectIds = [...new Set((scheds || []).map((s: any) => s.subject_id).filter(Boolean))];
      const sectionIds = [...new Set((scheds || []).map((s: any) => s.section_id).filter(Boolean))];

      const { data: subs } = await supabase.from('subjects').select('id, name, code, subject_type').in('id', subjectIds);
      const { data: secs } = await supabase.from('sections').select('id, name, grade_level').in('id', sectionIds);

      setSubjects(subs || []);
      setSections(secs || []);

      // Pre-select from URL params
      if (params.subject && params.section) {
        const s = (subs || []).find((x: any) => x.id === params.subject);
        const sec = (secs || []).find((x: any) => x.id === params.section);
        if (s && sec) {
          setSelectedSubject(s);
          setSelectedSection(sec);
          await loadStudents(sec.id, s.id, 1);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadStudents = async (sectionId: string, subjectId: string, quarter: number) => {
    setLoading(true);
    try {
      const { data: studs } = await supabase
        .from('students')
        .select('id, lrn, first_name, last_name')
        .eq('section_id', sectionId)
        .order('last_name');

      if (!studs) { setLoading(false); return; }

      const { data: existingGrades } = await supabase
        .from('grades')
        .select('id, student_id, grade')
        .in('student_id', studs.map(s => s.id))
        .eq('subject_id', subjectId)
        .eq('quarter', quarter);

      const gradeMap: Record<string, any> = {};
      (existingGrades || []).forEach((g: any) => { gradeMap[g.student_id] = g; });

      setStudents(studs.map((s: any) => ({
        id: s.id,
        lrn: s.lrn || 'N/A',
        full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
        grade: gradeMap[s.id]?.grade?.toString() || '',
        existingGradeId: gradeMap[s.id]?.id,
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateGrade = (studentId: string, grade: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, grade } : s));
  };

  const handleSave = async () => {
    if (!selectedSection || !selectedSubject) return;
    const valid = students.filter(s => s.grade.trim() !== '');
    if (valid.length === 0) {
      Alert.alert('Error', 'No grades to save');
      return;
    }
    setSaving(true);
    try {
      const rows = valid.map(s => ({
        student_id: s.id,
        subject_id: selectedSubject.id,
        section_id: selectedSection.id,
        quarter: selectedQuarter,
        grade: parseFloat(s.grade),
      }));

      // Delete existing + insert
      await supabase
        .from('grades')
        .delete()
        .eq('subject_id', selectedSubject.id)
        .eq('section_id', selectedSection.id)
        .eq('quarter', selectedQuarter)
        .in('student_id', students.map(s => s.id));

      const { error } = await supabase.from('grades').insert(rows);
      if (error) throw error;

      Alert.alert('Success', 'Grades saved!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const getGradeColor = (g: string) => {
    const n = parseFloat(g);
    if (isNaN(n)) return '#999';
    if (n >= 90) return '#4CAF50';
    if (n >= 85) return '#8BC34A';
    if (n >= 80) return '#FFC107';
    if (n >= 75) return '#FF9800';
    return '#F44336';
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Grades</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Section + Subject selectors */}
        <View style={styles.selectorRow}>
          <TouchableOpacity style={styles.selector} onPress={() => setSectionModal(true)}>
            <Text style={styles.selectorLabel}>Section</Text>
            <Text style={[styles.selectorValue, !selectedSection && styles.placeholder]}>
              {selectedSection?.name || 'Select'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selector} onPress={() => setSubjectModal(true)}>
            <Text style={styles.selectorLabel}>Subject</Text>
            <Text style={[styles.selectorValue, !selectedSubject && styles.placeholder]}>
              {selectedSubject?.name || 'Select'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quarter selector */}
        {selectedSection && selectedSubject ? (
          <View style={styles.quarterRow}>
            {[1, 2, 3, 4].map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.quarterBtn, selectedQuarter === q && styles.quarterActive]}
                onPress={() => {
                  setSelectedQuarter(q);
                  loadStudents(selectedSection.id, selectedSubject.id, q);
                }}
              >
                <Text style={[styles.quarterText, selectedQuarter === q && styles.quarterTextActive]}>
                  Q{q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Students */}
        {selectedSection && selectedSubject ? (
          <>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {students.map(s => (
                <View key={s.id} style={styles.studentCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studentName}>{s.full_name}</Text>
                    <Text style={styles.studentLrn}>LRN: {s.lrn}</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.gradeInput,
                      s.grade && { borderColor: getGradeColor(s.grade), color: getGradeColor(s.grade) },
                    ]}
                    value={s.grade}
                    onChangeText={(t) => updateGrade(s.id, t)}
                    keyboardType="numeric"
                    placeholder="--"
                    placeholderTextColor="#999"
                    maxLength={5}
                  />
                </View>
              ))}
              {students.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No students in this section</Text>
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Ionicons name="save" size={20} color={colors.white} />
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Grades'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="star-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Select section and subject to enter grades</Text>
          </View>
        )}
      </View>

      {/* Section Modal */}
      <Modal animationType="slide" transparent visible={sectionModal} onRequestClose={() => setSectionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Section</Text>
              <TouchableOpacity onPress={() => setSectionModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {sections.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedSection(s);
                    setSectionModal(false);
                    if (selectedSubject) loadStudents(s.id, selectedSubject.id, selectedQuarter);
                  }}
                >
                  <Text style={styles.modalItemTitle}>{s.name} • Grade {s.grade_level}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subject Modal */}
      <Modal animationType="slide" transparent visible={subjectModal} onRequestClose={() => setSubjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {subjects.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedSubject(s);
                    setSubjectModal(false);
                    if (selectedSection) loadStudents(selectedSection.id, s.id, selectedQuarter);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{s.name}</Text>
                    <Text style={styles.modalItemSub}>{s.code} • {s.subject_type}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  selectorRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  selector: {
    flex: 1, backgroundColor: colors.white, borderRadius: 10,
    padding: spacing.md, elevation: 2,
  },
  selectorLabel: { fontSize: typography.sizes.xs, color: '#666' },
  selectorValue: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text, marginTop: 2 },
  placeholder: { color: '#999', fontWeight: 'normal' },
  quarterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  quarterBtn: {
    flex: 1, padding: spacing.sm, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
    alignItems: 'center',
  },
  quarterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quarterText: { fontSize: typography.sizes.sm, color: colors.text },
  quarterTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  list: { flex: 1 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 12,
    padding: spacing.md, marginBottom: spacing.sm, elevation: 2,
  },
  studentName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  studentLrn: { fontSize: typography.sizes.xs, color: '#666' },
  gradeInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    padding: spacing.sm, minWidth: 70, textAlign: 'center',
    fontSize: typography.sizes.md, fontWeight: typography.weights.bold,
    color: colors.text, backgroundColor: colors.gray,
  },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10,
    gap: spacing.sm, marginTop: spacing.sm,
  },
  saveText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  emptyContainer: { alignItems: 'center', padding: spacing.xxxl, backgroundColor: colors.white, borderRadius: 16 },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  modalItem: {
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalItemTitle: { fontSize: typography.sizes.md, color: colors.text, fontWeight: typography.weights.medium },
  modalItemSub: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
});