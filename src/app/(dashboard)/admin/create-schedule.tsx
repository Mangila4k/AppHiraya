import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = {
  id: string;
  name: string;
  grade_level: string;
  strand: string;
  adviser_name: string;
  room: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  grade_level: string;
  strand: string;
  semester: string;
  quarter: string;
  subject_type: string;
};

type Teacher = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  specialization: string;
};

export default function CreateSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

  const [sectionSchedules, setSectionSchedules] = useState<any[]>([]);
  const [teacherSchedules, setTeacherSchedules] = useState<any[]>([]);

  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);

  // Toggle only unlocks Room editing
  const [isMajorSubject, setIsMajorSubject] = useState(false);

  const [form, setForm] = useState({
    section_id: '',
    section_name: '',
    section_grade: '',
    section_strand: '',
    subject: '',
    subject_id: '',
    subject_type: '',
    teacher_id: '',
    teacher_name: '',
    day: '',
    time_start: '',
    time_end: '',
    db_start: '',
    db_end: '',
    room: '',
    school_year: '2025-2026',
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const timeSlots = [
    { start: '7:00 AM', end: '8:00 AM', dbStart: '07:00:00', dbEnd: '08:00:00' },
    { start: '8:00 AM', end: '9:00 AM', dbStart: '08:00:00', dbEnd: '09:00:00' },
    { start: '9:00 AM', end: '10:00 AM', dbStart: '09:00:00', dbEnd: '10:00:00' },
    { start: '10:00 AM', end: '11:00 AM', dbStart: '10:00:00', dbEnd: '11:00:00' },
    { start: '11:00 AM', end: '12:00 PM', dbStart: '11:00:00', dbEnd: '12:00:00' },
    { start: '1:00 PM', end: '2:00 PM', dbStart: '13:00:00', dbEnd: '14:00:00' },
    { start: '2:00 PM', end: '3:00 PM', dbStart: '14:00:00', dbEnd: '15:00:00' },
    { start: '3:00 PM', end: '4:00 PM', dbStart: '15:00:00', dbEnd: '16:00:00' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setFetching(true);
    try {
      const { data: sectionsData, error: secErr } = await supabase
        .from('sections')
        .select(`
          id, name, grade_level, strand, room, adviser_id, adviser_name,
          teachers:adviser_id (
            id, user_id,
            users:user_id (first_name, last_name)
          )
        `)
        .order('grade_level', { ascending: true });

      if (secErr) console.error('Sections error:', secErr);

      if (sectionsData) {
        setSections(sectionsData.map((s: any) => {
          const u = s.teachers?.users;
          const adviserName = u
            ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
            : (s.adviser_name || 'No Adviser');
          return {
            id: s.id,
            name: s.name || 'Unknown',
            grade_level: s.grade_level || 'N/A',
            strand: s.strand || 'N/A',
            adviser_name: adviserName,
            room: s.room || 'N/A',
          };
        }));
      }

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('grade_level', { ascending: true });

      if (subjectsData) setSubjects(subjectsData);

      const { data: teachersData } = await supabase
        .from('teachers')
        .select(`
          id, user_id, employee_id, specialization,
          users:user_id (first_name, last_name, email)
        `);

      if (teachersData) {
        setTeachers(teachersData.map((t: any) => {
          const u = t.users;
          return {
            id: t.id,
            user_id: t.user_id,
            full_name: u
              ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
              : 'Unknown',
            email: u?.email || 'No email',
            specialization: t.specialization || 'N/A',
          };
        }));
      }
    } catch (err) {
      console.error('Fetch error:', err);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setFetching(false);
    }
  };

  const loadTeacherSchedules = async (teacherId: string) => {
    if (!teacherId) return;
    try {
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('teacher_id', teacherId);
      setTeacherSchedules(data || []);
    } catch (err) {
      console.error('Teacher schedules error:', err);
    }
  };

  const selectSection = async (section: Section) => {
    const { data: secData } = await supabase
      .from('schedules')
      .select('*')
      .eq('section_id', section.id);

    const schedules = secData || [];
    setSectionSchedules(schedules);

    // Determine school year from existing schedules (most common)
    let schoolYear = '2025-2026';
    if (schedules.length > 0) {
      const yearCounts: Record<string, number> = {};
      schedules.forEach((s: any) => {
        if (s.school_year) {
          yearCounts[s.school_year] = (yearCounts[s.school_year] || 0) + 1;
        }
      });
      schoolYear = Object.keys(yearCounts).sort(
        (a, b) => yearCounts[b] - yearCounts[a]
      )[0] || '2025-2026';
    }

    setForm({
      section_id: section.id,
      section_name: section.name,
      section_grade: section.grade_level,
      section_strand: section.strand || 'N/A',
      subject: '',
      subject_id: '',
      subject_type: '',
      teacher_id: '',
      teacher_name: '',
      day: '',
      time_start: '',
      time_end: '',
      db_start: '',
      db_end: '',
      room: section.room !== 'N/A' ? section.room : '',
      school_year: schoolYear,
    });

    setIsMajorSubject(false);
    setSectionModalVisible(false);

    // Filter subjects by grade + strand
    const gradeNum = parseInt(section.grade_level);
    const isSeniorHigh = gradeNum >= 11;
    let filtered = subjects.filter(s => s.grade_level === section.grade_level);
    if (isSeniorHigh && section.strand !== 'N/A') {
      filtered = filtered.filter(s => s.strand === section.strand);
    }
    filtered.sort((a, b) =>
      (a.semester || a.quarter || '').localeCompare(b.semester || b.quarter || '')
    );
    setFilteredSubjects(filtered);
  };

  const selectSubject = (subject: Subject) => {
    setForm({
      ...form,
      subject: subject.name,
      subject_id: subject.id,
      subject_type: subject.subject_type,
    });
    setSubjectModalVisible(false);
  };

  const selectTeacher = async (teacher: Teacher) => {
    setForm({ ...form, teacher_id: teacher.id, teacher_name: teacher.full_name });
    setTeacherModalVisible(false);
    await loadTeacherSchedules(teacher.id);
  };

  // Check if a time slot is already used on the selected day in this section
  const isSlotTaken = (day: string, dbStart: string) => {
    return sectionSchedules.some(
      (s: any) => s.day === day && s.start_time === dbStart
    );
  };

  const takenSlotsForDay = form.day
    ? timeSlots.filter(ts => isSlotTaken(form.day, ts.dbStart)).map(ts => ts.dbStart)
    : [];

  const handleSubmit = async () => {
    if (!form.section_id || !form.subject_id || !form.teacher_id || !form.day || !form.db_start || !form.db_end) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Subject already in section
      const subjectInSection = sectionSchedules.find(
        (s: any) => s.subject_id === form.subject_id
      );
      if (subjectInSection) {
        Alert.alert(
          'Subject Already Scheduled',
          `${form.subject} is already assigned to ${form.section_name}.`
        );
        setLoading(false);
        return;
      }

      // 2. Teacher already handles subject elsewhere
      const teacherHasSubject = teacherSchedules.find(
        (s: any) => s.subject_id === form.subject_id
      );
      if (teacherHasSubject) {
        Alert.alert(
          'Teacher Already Assigned',
          `${form.teacher_name} already handles this subject in another section.`
        );
        setLoading(false);
        return;
      }

      // 3. Section time conflict
      const sectionConflict = sectionSchedules.find(
        (s: any) => s.day === form.day && s.start_time === form.db_start
      );
      if (sectionConflict) {
        Alert.alert(
          'Time Conflict',
          `${form.section_name} already has a class at ${form.time_start} on ${form.day}.`
        );
        setLoading(false);
        return;
      }

      // 4. Teacher time conflict
      const teacherConflict = teacherSchedules.find(
        (s: any) => s.day === form.day && s.start_time === form.db_start
      );
      if (teacherConflict) {
        Alert.alert(
          'Teacher Busy',
          `${form.teacher_name} already has a class at ${form.time_start} on ${form.day}.`
        );
        setLoading(false);
        return;
      }

      // 5. Teacher load warning
      const uniqueSubjects = new Set(
        teacherSchedules.map((s: any) => s.subject_id)
      );
      if (uniqueSubjects.size >= 2) {
        Alert.alert(
          'Teacher Load Warning',
          `${form.teacher_name} already handles ${uniqueSubjects.size} subjects. Continue?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Continue', onPress: doInsert },
          ]
        );
        return;
      }

      await doInsert();
    } catch (err: any) {
      console.error('Submit error:', err);
      Alert.alert('Error', err.message || 'Failed to create schedule');
      setLoading(false);
    }
  };

  const doInsert = async () => {
    try {
      // ✅ Insert only columns that exist in the schedules table
      const { error } = await supabase.from('schedules').insert([{
        section_id: form.section_id,
        teacher_id: form.teacher_id,
        subject_id: form.subject_id,
        day: form.day,
        start_time: form.db_start,
        end_time: form.db_end,
        room: form.room || null,
      }]);

      if (error) throw error;

      Alert.alert('Success', 'Schedule created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Insert error:', err);
      Alert.alert('Error', err.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const groupSubjects = () => {
    const g: Record<string, Subject[]> = {};
    filteredSubjects.forEach(s => {
      const k = s.semester || s.quarter || 'General';
      if (!g[k]) g[k] = [];
      g[k].push(s);
    });
    return g;
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const grouped = groupSubjects();
  const groupKeys = Object.keys(grouped).sort();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Schedule</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Class Schedule</Text>

          {/* Section */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Section <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setSectionModalVisible(true)}>
              <Text style={[styles.selectorText, !form.section_name && styles.placeholder]}>
                {form.section_name || 'Select Section'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {form.section_name ? (
              <Text style={styles.hintText}>
                {form.section_grade}{form.section_strand !== 'N/A' ? ` • ${form.section_strand}` : ''}
              </Text>
            ) : null}
          </View>

          {/* Subject */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => {
                if (!form.section_id) return Alert.alert('Error', 'Select a section first');
                if (filteredSubjects.length === 0) return Alert.alert('No Subjects', 'No subjects for this section');
                setSubjectModalVisible(true);
              }}
            >
              <Text style={[styles.selectorText, !form.subject && styles.placeholder]}>
                {form.subject || 'Select Subject'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {form.subject_type ? (
              <Text style={styles.hintText}>Type: {form.subject_type}</Text>
            ) : null}
          </View>

          {/* Teacher */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teacher <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity style={styles.selectorButton} onPress={() => setTeacherModalVisible(true)}>
              <Text style={[styles.selectorText, !form.teacher_name && styles.placeholder]}>
                {form.teacher_name || 'Select Teacher'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Major Toggle — only unlocks Room */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Major / Specialized Subject</Text>
              <Text style={styles.toggleSubLabel}>
                Turn on to use a different room
              </Text>
            </View>
            <Switch
              value={isMajorSubject}
              onValueChange={setIsMajorSubject}
              trackColor={{ false: '#ccc', true: colors.primary + '80' }}
              thumbColor={isMajorSubject ? colors.primary : '#fff'}
            />
          </View>

          {/* Day */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Day <Text style={styles.required}>*</Text></Text>
            <View style={styles.row}>
              {days.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayOption, form.day === d && styles.dayActive]}
                  onPress={() => setForm({
                    ...form,
                    day: d,
                    db_start: '',
                    db_end: '',
                    time_start: '',
                    time_end: '',
                  })}
                >
                  <Text style={[styles.dayText, form.day === d && styles.dayTextActive]}>
                    {d.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Slot — disables taken slots */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Time Slot <Text style={styles.required}>*</Text></Text>
            {!form.day ? (
              <Text style={styles.hintText}>Please select a day first</Text>
            ) : null}
            <View style={styles.timeWrap}>
              {timeSlots.map((s, i) => {
                const active = form.db_start === s.dbStart && form.db_end === s.dbEnd;
                const taken = form.day ? takenSlotsForDay.includes(s.dbStart) : false;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.timeOption,
                      active && styles.timeActive,
                      taken && styles.timeDisabled,
                    ]}
                    onPress={() => {
                      if (!form.day) {
                        Alert.alert('Select Day First', 'Please pick a day before choosing a time slot.');
                        return;
                      }
                      if (taken) {
                        Alert.alert(
                          'Time Already Taken',
                          `${form.section_name} already has a class at ${s.start} on ${form.day}.`
                        );
                        return;
                      }
                      setForm({
                        ...form,
                        time_start: s.start,
                        time_end: s.end,
                        db_start: s.dbStart,
                        db_end: s.dbEnd,
                      });
                    }}
                  >
                    <Text style={[
                      styles.timeText,
                      active && styles.timeTextActive,
                      taken && styles.timeTextDisabled,
                    ]}>
                      {s.start} - {s.end}{taken ? ' • Taken' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* School Year — locked / info only */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>School Year</Text>
            <View style={styles.lockedField}>
              <Ionicons name="lock-closed" size={16} color="#666" />
              <Text style={styles.lockedText}>{form.school_year}</Text>
            </View>
            <Text style={styles.hintText}>Inherited from section</Text>
          </View>

          {/* Room — editable only for major subjects */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Room</Text>
            <TextInput
              style={[styles.input, !isMajorSubject && styles.inputDisabled]}
              placeholder="e.g., Room 101"
              placeholderTextColor="#999"
              value={form.room}
              onChangeText={(t) => setForm({ ...form, room: t })}
              editable={isMajorSubject}
            />
            {!isMajorSubject ? (
              <Text style={styles.hintText}>Turn on "Major Subject" to change room</Text>
            ) : null}
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Ionicons name="save" size={20} color={colors.white} />
            <Text style={styles.submitText}>{loading ? 'Creating...' : 'Create Schedule'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Section Modal */}
      <Modal animationType="slide" transparent visible={sectionModalVisible} onRequestClose={() => setSectionModalVisible(false)}>
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
                  style={[styles.modalItem, form.section_id === s.id && styles.modalItemActive]}
                  onPress={() => selectSection(s)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{s.name}</Text>
                    <Text style={styles.modalItemSub}>
                      {s.grade_level}{s.strand !== 'N/A' ? ` • ${s.strand}` : ''} • {s.adviser_name}
                    </Text>
                  </View>
                  {form.section_id === s.id ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subject Modal */}
      <Modal animationType="slide" transparent visible={subjectModalVisible} onRequestClose={() => setSubjectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {groupKeys.map(k => (
                <View key={k}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupHeaderText}>{k}</Text>
                  </View>
                  {grouped[k].map(sub => {
                    const alreadyInSection = sectionSchedules.some(
                      (s: any) => s.subject_id === sub.id
                    );
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.modalItem,
                          form.subject_id === sub.id && styles.modalItemActive,
                          alreadyInSection && styles.modalItemDisabled,
                        ]}
                        onPress={() => {
                          if (alreadyInSection) {
                            Alert.alert(
                              'Subject Already Scheduled',
                              `${sub.name} is already assigned to ${form.section_name}.`
                            );
                            return;
                          }
                          selectSubject(sub);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[
                            styles.modalItemTitle,
                            alreadyInSection && styles.modalItemTitleDisabled,
                          ]}>
                            {sub.name}
                          </Text>
                          <Text style={styles.modalItemSub}>
                            {sub.code} • {sub.subject_type}
                            {alreadyInSection ? ' • Already scheduled' : ''}
                          </Text>
                        </View>
                        {form.subject_id === sub.id ? (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        ) : null}
                        {alreadyInSection ? (
                          <Ionicons name="close-circle" size={18} color="#ccc" />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Teacher Modal */}
      <Modal animationType="slide" transparent visible={teacherModalVisible} onRequestClose={() => setTeacherModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Teacher</Text>
              <TouchableOpacity onPress={() => setTeacherModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {teachers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.modalItem, form.teacher_id === t.id && styles.modalItemActive]}
                  onPress={() => selectTeacher(t)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{t.full_name}</Text>
                    <Text style={styles.modalItemSub}>{t.specialization} • {t.email}</Text>
                  </View>
                  {form.teacher_id === t.id ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
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
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text, marginBottom: spacing.lg },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text, marginBottom: spacing.xs },
  required: { color: colors.error },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: spacing.md,
    fontSize: typography.sizes.sm, color: colors.text, backgroundColor: colors.gray,
  },
  inputDisabled: { backgroundColor: '#efefef', color: '#999' },
  lockedField: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: spacing.md, backgroundColor: '#efefef',
  },
  lockedText: { fontSize: typography.sizes.sm, color: '#666', fontWeight: typography.weights.medium },
  selectorButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: spacing.md, backgroundColor: colors.gray,
  },
  selectorText: { fontSize: typography.sizes.sm, color: colors.text },
  placeholder: { color: '#999' },
  hintText: { fontSize: typography.sizes.xs, color: '#666', marginTop: 4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9f9f9', borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  toggleLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.text },
  toggleSubLabel: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
  dayOption: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.gray, alignItems: 'center',
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: typography.sizes.xs, color: colors.text },
  dayTextActive: { color: colors.white },
  timeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeOption: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.gray,
  },
  timeActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  timeDisabled: { backgroundColor: '#f0f0f0', borderColor: '#e0e0e0', opacity: 0.6 },
  timeText: { fontSize: typography.sizes.xs, color: colors.text },
  timeTextActive: { color: colors.white },
  timeTextDisabled: { color: '#999' },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10,
    gap: spacing.sm, marginTop: spacing.md,
  },
  submitText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
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
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalItemActive: { backgroundColor: colors.primary + '10' },
  modalItemDisabled: { backgroundColor: '#f9f9f9', opacity: 0.6 },
  modalItemTitle: { fontSize: typography.sizes.md, color: colors.text, fontWeight: typography.weights.medium },
  modalItemTitleDisabled: { color: '#999' },
  modalItemSub: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  groupHeader: { backgroundColor: '#f5f5f5', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: 8, marginTop: spacing.sm },
  groupHeaderText: { fontSize: typography.sizes.sm, color: colors.primary, fontWeight: typography.weights.semibold },
});