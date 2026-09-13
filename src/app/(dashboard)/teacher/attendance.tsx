import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = { id: string; name: string; grade_level: string };
type Subject = { id: string; name: string; code: string };
type StatusValue = 'present' | 'absent' | 'late';
type Student = {
  id: string;
  lrn: string;
  full_name: string;
  gender: string;
  status: StatusValue | null;
  attendance_id?: string;
};

export default function TeacherAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  useEffect(() => { loadSections(); }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase.from('users').select('*').eq('email', email).single();
      if (!userData) { setLoading(false); return; }

      const { data: teacherData } = await supabase
        .from('teachers').select('id').eq('user_id', userData.id).maybeSingle();
      if (!teacherData) { setLoading(false); return; }

      const { data: scheds } = await supabase
        .from('schedules').select('section_id, subject_id').eq('teacher_id', teacherData.id);
      if (!scheds) { setLoading(false); return; }

      const sectionIds = [...new Set(scheds.map((s: any) => s.section_id).filter(Boolean))];
      const subjectIds = [...new Set(scheds.map((s: any) => s.subject_id).filter(Boolean))];

      if (sectionIds.length > 0) {
        const { data: secs } = await supabase
          .from('sections').select('id, name, grade_level').in('id', sectionIds);
        setSections(secs || []);
      }

      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code').in('id', subjectIds);
        setSubjects(subs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (section: Section, subject: Subject) => {
    setSelectedSection(section);
    setSelectedSubject(subject);
    setSectionModalVisible(false);
    setSubjectModalVisible(false);
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: studs } = await supabase
        .from('students')
        .select('id, lrn, first_name, last_name, gender')
        .eq('section_id', section.id)
        .order('last_name');

      if (!studs) { setLoading(false); return; }

      const { data: att } = await supabase
        .from('attendance')
        .select('id, student_id, status')
        .in('student_id', studs.map(s => s.id))
        .eq('date', today)
        .eq('subject_id', subject.id);

      const attMap: Record<string, any> = {};
      (att || []).forEach((a: any) => { attMap[a.student_id] = a; });

      setStudents(studs.map((s: any) => ({
        id: s.id,
        lrn: s.lrn || 'N/A',
        full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
        gender: s.gender || 'N/A',
        status: (attMap[s.id]?.status as StatusValue) || null,
        attendance_id: attMap[s.id]?.id,  // 🔒 presence = locked for that student
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 🔒 helper — a student is locked if a saved attendance_id exists
  const isStudentLocked = (s: Student) => !!s.attendance_id;

  const markStudent = (studentId: string, status: StatusValue) => {
    const target = students.find(s => s.id === studentId);
    if (target && isStudentLocked(target)) {
      Alert.alert(
        'Already Submitted',
        `${target.full_name}'s attendance has already been saved and can no longer be changed.`
      );
      return;
    }
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  // Bulk: only applies to unlocked students
  const markAll = (status: StatusValue) => {
    setStudents(prev =>
      prev.map(s => isStudentLocked(s) ? s : { ...s, status })
    );
  };

  const handleSave = async () => {
    if (!selectedSection || !selectedSubject) {
      Alert.alert('Error', 'Please select section and subject first');
      return;
    }

    // Only consider students who are NOT already locked
    const editable = students.filter(s => !isStudentLocked(s));

    if (editable.length === 0) {
      Alert.alert('Nothing to Save', 'All students already have saved attendance.');
      return;
    }

    const unmarked = editable.filter(s => !s.status);
    if (unmarked.length > 0) {
      Alert.alert('Incomplete', `${unmarked.length} student(s) still unmarked.`);
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const rows = editable.map(s => ({
        student_id: s.id,
        subject_id: selectedSubject.id,
        date: today,
        status: (s.status || '').toLowerCase(),
      }));

      console.log('📤 Inserting attendance rows:', JSON.stringify(rows, null, 2));

      const allowed = ['present', 'absent', 'late', 'excused'];
      const invalid = rows.filter(r => !allowed.includes(r.status));
      if (invalid.length > 0) {
        console.error('❌ Invalid status values found:', invalid);
        Alert.alert(
          'Invalid Status',
          `${invalid.length} student(s) have an invalid status. Please re-mark them.`
        );
        setSaving(false);
        return;
      }

      // ⚠️ Only delete & re-insert rows for UNLOCKED students
      const { error: deleteError } = await supabase
        .from('attendance')
        .delete()
        .eq('subject_id', selectedSubject.id)
        .eq('date', today)
        .in('student_id', editable.map(s => s.id));

      if (deleteError) {
        console.warn('Delete warning:', deleteError);
      }

      const { error } = await supabase.from('attendance').insert(rows);
      if (error) {
        console.error('❌ Insert error:', error);
        throw error;
      }

      Alert.alert('Success', 'Attendance saved!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (s: string | null) => {
    if (s === 'present') return '#4CAF50';
    if (s === 'absent') return '#F44336';
    if (s === 'late') return '#FF9800';
    return '#ccc';
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
          <Text style={styles.title}>Attendance</Text>
          <View style={styles.headerSpacer} />
        </View>

        <TouchableOpacity style={styles.selectorButton} onPress={() => setSectionModalVisible(true)}>
          <Ionicons name="school" size={18} color={colors.primary} />
          <Text style={[styles.selectorText, !selectedSection && styles.placeholder]}>
            {selectedSection ? `${selectedSection.name} • Grade ${selectedSection.grade_level}` : 'Select Section'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorButton, !selectedSection && { opacity: 0.5 }]}
          onPress={() => {
            if (!selectedSection) {
              Alert.alert('Select Section', 'Please pick a section first');
              return;
            }
            setSubjectModalVisible(true);
          }}
          disabled={!selectedSection}
        >
          <Ionicons name="book" size={18} color={colors.primary} />
          <Text style={[styles.selectorText, !selectedSubject && styles.placeholder]}>
            {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code})` : 'Select Subject'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>

        {selectedSection && selectedSubject && students.length > 0 ? (
          <>
            <View style={styles.bulkRow}>
              <TouchableOpacity
                style={[styles.bulkBtn, { borderColor: '#4CAF50' }]}
                onPress={() => markAll('present')}
              >
                <Text style={[styles.bulkText, { color: '#4CAF50' }]}>All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, { borderColor: '#FF9800' }]}
                onPress={() => markAll('late')}
              >
                <Text style={[styles.bulkText, { color: '#FF9800' }]}>All Late</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, { borderColor: '#F44336' }]}
                onPress={() => markAll('absent')}
              >
                <Text style={[styles.bulkText, { color: '#F44336' }]}>All Absent</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {students.map(st => {
                const locked = isStudentLocked(st);
                return (
                  <View
                    key={st.id}
                    style={[styles.studentCard, locked && styles.studentCardLocked]}
                  >
                    <View style={styles.studentInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.studentName}>{st.full_name}</Text>
                        {locked && (
                          <Ionicons name="lock-closed" size={12} color="#999" />
                        )}
                      </View>
                      <Text style={styles.studentLrn}>LRN: {st.lrn}</Text>
                    </View>
                    <View style={styles.statusRow}>
                      {(['present', 'late', 'absent'] as const).map(status => (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.statusBtn,
                            st.status === status && {
                              backgroundColor: getStatusColor(status) + '20',
                              borderColor: getStatusColor(status),
                            },
                            locked && styles.statusBtnLocked,
                          ]}
                          onPress={() => markStudent(st.id, status)}
                          disabled={locked}
                        >
                          <Text style={[
                            styles.statusText,
                            st.status === status && {
                              color: getStatusColor(status),
                              fontWeight: '600',
                            },
                            locked && styles.statusTextLocked,
                          ]}>
                            {status.charAt(0).toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              <Ionicons name="save" size={20} color={colors.white} />
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Attendance'}</Text>
            </TouchableOpacity>
          </>
        ) : selectedSection && selectedSubject ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No students in this section</Text>
          </View>
        ) : selectedSection && !selectedSubject ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="book-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>Please select a subject to continue</Text>
          </View>
        ) : null}
      </View>

      {/* Section Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={sectionModalVisible}
        onRequestClose={() => setSectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Section</Text>
              <TouchableOpacity onPress={() => setSectionModalVisible(false)}>
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
                    setSelectedSubject(null);
                    setStudents([]);
                    setSectionModalVisible(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{s.name}</Text>
                    <Text style={styles.modalItemSub}>Grade {s.grade_level}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subject Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={subjectModalVisible}
        onRequestClose={() => setSubjectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {subjects.map(sub => (
                <TouchableOpacity
                  key={sub.id}
                  style={styles.modalItem}
                  onPress={() => {
                    if (selectedSection) {
                      loadStudents(selectedSection, sub);
                    }
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{sub.name}</Text>
                    <Text style={styles.modalItemSub}>{sub.code}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  headerSpacer: { width: 40, height: 40 },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
  },
  selectorText: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  placeholder: { color: '#999' },
  bulkRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, marginTop: spacing.sm },
  bulkBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  bulkText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  list: { flex: 1 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    elevation: 2,
  },
  studentCardLocked: { backgroundColor: '#f0f0f0', opacity: 0.85 },
  studentInfo: { flex: 1 },
  studentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  studentLrn: { fontSize: typography.sizes.xs, color: '#666' },
  statusRow: { flexDirection: 'row', gap: 4 },
  statusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnLocked: { borderColor: '#e0e0e0' },
  statusText: { fontSize: typography.sizes.sm, color: '#999' },
  statusTextLocked: { color: '#bbb' },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  saveText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemTitle: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  modalItemSub: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
});