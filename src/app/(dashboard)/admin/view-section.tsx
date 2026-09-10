import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SectionDetail = {
  id: string;
  name: string;
  grade_level: string;
  strand: string;
  adviser_name: string;
  adviser_id: string;
  adviser_email: string;
  room: string;
  student_count: number;
  created_at: string;
};

type Student = {
  id: string;
  lrn: string;
  full_name: string;
  email: string;
  gender: string;
  grade_level: string;
  strand: string;
  section_id: string;
};

type AvailableStudent = {
  id: string;
  email: string;
  full_name: string;
  lrn: string;
  grade_level: string;
  strand: string;
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
  description: string;
};

type Schedule = {
  id: string;
  day: string;
  time_start: string;
  time_end: string;
  subject_name: string;
  subject_id: string;
  teacher_name: string;
  teacher_id: string;
  room: string;
};

export default function ViewSection() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [section, setSection] = useState<SectionDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      loadSectionData();
    }
  }, [id]);

  useEffect(() => {
    if (modalVisible && section) {
      loadAvailableStudents();
    }
  }, [modalVisible, section]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const loadSectionData = async () => {
    setLoading(true);
    try {
      // 1. Get section data with adviser
      const { data: sectionData, error: sectionError } = await supabase
        .from('sections')
        .select(`
          *,
          teachers:adviser_id (
            id,
            user_id,
            users:user_id (
              id,
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('id', id)
        .single();

      if (sectionError) throw sectionError;

      if (sectionData) {
        const teacher = sectionData.teachers;
        const user = teacher?.users;
        const adviserName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'No Adviser';
        const adviserEmail = user?.email || 'No email';

        setSection({
          id: sectionData.id,
          name: sectionData.name || 'Unknown',
          grade_level: sectionData.grade_level || 'N/A',
          strand: sectionData.strand || 'N/A',
          adviser_name: adviserName || 'No Adviser',
          adviser_id: sectionData.adviser_id || '',
          adviser_email: adviserEmail,
          room: sectionData.room || 'N/A',
          student_count: 0,
          created_at: sectionData.created_at,
        });
      }

      // 2. Get students in this section directly from students table
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          email,
          gender,
          grade_level,
          strand,
          section_id
        `)
        .eq('section_id', id)
        .order('created_at', { ascending: false });

      if (!studentsError && studentsData) {
        const formattedStudents = studentsData.map((item: any) => ({
          id: item.id,
          lrn: item.lrn || 'N/A',
          full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email || 'No email',
          gender: item.gender || 'N/A',
          grade_level: item.grade_level || '',
          strand: item.strand || '',
          section_id: item.section_id || '',
        }));
        setStudents(formattedStudents);
        if (section) {
          setSection(prev => prev ? { ...prev, student_count: formattedStudents.length } : null);
        }
      }

      // 3. Get subjects for this grade level and strand
      const sectionGrade = sectionData?.grade_level || '';
      const sectionStrand = sectionData?.strand || '';
      const gradeNum = parseInt(sectionGrade);
      const isSeniorHigh = gradeNum >= 11;

      let subjectsQuery = supabase
        .from('subjects')
        .select('*')
        .eq('grade_level', sectionGrade);

      if (isSeniorHigh && sectionStrand && sectionStrand !== 'N/A' && sectionStrand !== '') {
        subjectsQuery = subjectsQuery.eq('strand', sectionStrand);
      }

      const { data: subjectsData, error: subjectsError } = await subjectsQuery
        .order('semester', { ascending: true })
        .order('quarter', { ascending: true });

      if (!subjectsError && subjectsData) {
        setSubjects(subjectsData);
        // Auto-expand first section
        const groupedKeys = subjectsData.reduce((acc: string[], subject: Subject) => {
          const key = isSeniorHigh ? (subject.semester || 'No Semester') : (subject.quarter || 'No Quarter');
          if (!acc.includes(key)) {
            acc.push(key);
          }
          return acc;
        }, []);
        
        if (groupedKeys.length > 0) {
          setExpandedSections({ [groupedKeys[0]]: true });
        }
      } else {
        setSubjects([]);
      }

      // 4. Get schedules for this section with teacher info
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('schedules')
        .select(`
          *,
          subjects:subject_id (name),
          teachers:teacher_id (
            id,
            users:user_id (
              id,
              first_name,
              last_name
            )
          )
        `)
        .eq('section_id', id)
        .order('day', { ascending: true });

      if (!schedulesError && schedulesData) {
        const formattedSchedules = schedulesData.map((item: any) => {
          const teacher = item.teachers;
          const user = teacher?.users;
          return {
            id: item.id,
            day: item.day || 'N/A',
            time_start: item.time_start || 'N/A',
            time_end: item.time_end || 'N/A',
            subject_name: item.subjects?.name || 'Unknown',
            subject_id: item.subject_id || '',
            teacher_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
            teacher_id: item.teacher_id || '',
            room: item.room || 'N/A',
          };
        });
        setSchedules(formattedSchedules);
      }

    } catch (error) {
      console.error('Error loading section:', error);
      Alert.alert('Error', 'Failed to load section details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStudents = async () => {
    if (!section) return;

    try {
      const sectionGrade = section.grade_level;
      const sectionStrand = section.strand;
      const gradeNum = parseInt(sectionGrade);
      const isSeniorHigh = gradeNum >= 11;

      let gradeFilter = sectionGrade;
      if (sectionGrade && !sectionGrade.includes('Grade') && !isNaN(Number(sectionGrade))) {
        gradeFilter = `Grade ${sectionGrade}`;
      }

      let query = supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          email,
          grade_level,
          strand
        `)
        .is('section_id', null);

      if (sectionGrade && sectionGrade !== 'N/A') {
        const gradeNum = sectionGrade.replace('Grade ', '');
        const gradeFormats = [sectionGrade, `Grade ${gradeNum}`, gradeNum];
        query = query.in('grade_level', gradeFormats);
      }

      if (isSeniorHigh && sectionStrand && sectionStrand !== 'N/A' && sectionStrand !== '') {
        query = query.eq('strand', sectionStrand);
      }

      const { data: studentsData, error: studentsError } = await query;

      if (studentsError) {
        console.error('❌ Error loading available students:', studentsError);
        throw studentsError;
      }

      if (studentsData) {
        const available = studentsData.map((s: any) => ({
          id: s.id,
          email: s.email || 'No email',
          full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          lrn: s.lrn || 'N/A',
          grade_level: s.grade_level || 'N/A',
          strand: s.strand || 'N/A',
        }));

        setAvailableStudents(available);
      } else {
        setAvailableStudents([]);
      }
    } catch (error) {
      console.error('Error loading available students:', error);
      Alert.alert('Error', 'Failed to load available students');
    }
  };

  const addStudentToSection = async (student: AvailableStudent) => {
    setAddingStudent(true);
    try {
      const { data: checkStudent, error: checkError } = await supabase
        .from('students')
        .select('section_id')
        .eq('id', student.id)
        .single();

      if (checkError) throw checkError;

      if (checkStudent?.section_id) {
        Alert.alert('Error', 'This student is already assigned to a section.');
        setAddingStudent(false);
        return;
      }

      const { error } = await supabase
        .from('students')
        .update({ section_id: section?.id })
        .eq('id', student.id);

      if (error) throw error;

      Alert.alert('✅ Success', `${student.full_name} has been added to ${section?.name}`);
      
      await loadSectionData();
      setModalVisible(false);
      setSearchQuery('');
    } catch (error: any) {
      console.error('Error adding student:', error);
      Alert.alert('Error', error.message || 'Failed to add student');
    } finally {
      setAddingStudent(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const num = parseInt(grade);
    if (num >= 11) return '#9C27B0';
    if (num >= 7) return '#2196F3';
    return '#4CAF50';
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const filteredAvailableStudents = availableStudents.filter((student) =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.lrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group subjects based on grade level
  const gradeNum = section ? parseInt(section.grade_level) : 0;
  const isSeniorHigh = gradeNum >= 11;

  const groupedSubjects: Record<string, Subject[]> = {};
  
  subjects.forEach((subject: Subject) => {
    let key = '';
    if (isSeniorHigh) {
      key = subject.semester || 'No Semester';
    } else {
      key = subject.quarter || 'No Quarter';
    }
    
    if (!groupedSubjects[key]) {
      groupedSubjects[key] = [];
    }
    groupedSubjects[key].push(subject);
  });

  const getSortOrder = (key: string) => {
    if (isSeniorHigh) {
      const order: Record<string, number> = {
        '1st Semester': 1,
        '2nd Semester': 2,
        'No Semester': 3,
      };
      return order[key] || 99;
    } else {
      const order: Record<string, number> = {
        '1st Quarter': 1,
        '2nd Quarter': 2,
        '3rd Quarter': 3,
        '4th Quarter': 4,
        'No Quarter': 5,
      };
      return order[key] || 99;
    }
  };

  const sortedKeys = Object.keys(groupedSubjects).sort((a, b) => getSortOrder(a) - getSortOrder(b));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading section details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!section) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Section not found</Text>
          <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const gradeColor = getGradeColor(section.grade_level);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Section Details</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => router.push(`./edit-section?id=${section.id}`)}>
            <Ionicons name="create" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Section Info Card */}
        <View style={[styles.infoCard, { borderLeftColor: gradeColor, borderLeftWidth: 4 }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: gradeColor + '20' }]}>
              <Text style={[styles.sectionLetter, { color: gradeColor }]}>
                {section.name.split(' - ')[1] || section.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionSubtitle}>
                Grade {section.grade_level} {section.strand !== 'N/A' ? `• ${section.strand}` : ''}
              </Text>
            </View>
          </View>
          
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="person" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Adviser</Text>
              <Text style={styles.infoValue}>{section.adviser_name}</Text>
              <Text style={styles.infoSubValue}>{section.adviser_email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Room</Text>
              <Text style={styles.infoValue}>{section.room}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Students</Text>
              <Text style={styles.infoValue}>{section.student_count}</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="book" size={18} color={colors.primary} />
              <Text style={styles.infoLabel}>Subjects</Text>
              <Text style={styles.infoValue}>{subjects.length}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'students' && styles.tabActive]}
            onPress={() => setActiveTab('students')}
          >
            <Ionicons name="people" size={16} color={activeTab === 'students' ? colors.white : '#666'} />
            <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
              Students ({students.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'subjects' && styles.tabActive]}
            onPress={() => setActiveTab('subjects')}
          >
            <Ionicons name="book" size={16} color={activeTab === 'subjects' ? colors.white : '#666'} />
            <Text style={[styles.tabText, activeTab === 'subjects' && styles.tabTextActive]}>
              Subjects ({subjects.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'schedule' && styles.tabActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <Ionicons name="calendar" size={16} color={activeTab === 'schedule' ? colors.white : '#666'} />
            <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>
              Schedule ({schedules.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderTitle}>Enrolled Students ({students.length})</Text>
              <TouchableOpacity 
                style={styles.addStudentButton} 
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.addStudentText}>Add Student</Text>
              </TouchableOpacity>
            </View>
            {students.length > 0 ? (
              students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentItem}
                  onPress={() => router.push(`./view-student?id=${student.id}`)}
                >
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentInitial}>
                      {getInitials(student.full_name)}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.studentLrn}>LRN: {student.lrn}</Text>
                    <Text style={styles.studentEmail}>
                      <Ionicons name="mail" size={12} color="#666" /> {student.email}
                    </Text>
                    <Text style={styles.studentGrade}>
                      Grade {student.grade_level} {student.strand ? `• ${student.strand}` : ''}
                    </Text>
                  </View>
                  <View style={styles.studentGender}>
                    <Text style={styles.studentGenderText}>{student.gender}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyTabContent}>
                <Ionicons name="people" size={40} color="#ccc" />
                <Text style={styles.emptyTabText}>No students in this section</Text>
                <TouchableOpacity 
                  style={styles.addStudentButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="add" size={18} color={colors.white} />
                  <Text style={styles.addStudentText}>Add Student</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Subjects Tab - Dropdown Version */}
        {activeTab === 'subjects' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderTitle}>
                Subjects for Grade {section.grade_level}
                {section.strand !== 'N/A' ? ` - ${section.strand}` : ''}
              </Text>
            </View>
            {subjects.length > 0 ? (
              sortedKeys.map((key) => {
                const isExpanded = expandedSections[key] || false;
                const subjectCount = groupedSubjects[key].length;
                
                return (
                  <View key={key} style={styles.dropdownSection}>
                    <TouchableOpacity
                      style={styles.dropdownHeader}
                      onPress={() => toggleSection(key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dropdownHeaderLeft}>
                        <Ionicons 
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'} 
                          size={20} 
                          color={colors.primary} 
                        />
                        <Text style={styles.dropdownTitle}>
                          {isSeniorHigh ? `📚 ${key}` : `📖 ${key}`}
                        </Text>
                      </View>
                      <View style={styles.dropdownBadge}>
                        <Text style={styles.dropdownBadgeText}>{subjectCount}</Text>
                      </View>
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <View style={styles.dropdownContent}>
                        {groupedSubjects[key].map((subject: Subject) => (
                          <View key={subject.id} style={styles.subjectItem}>
                            <View style={styles.subjectIcon}>
                              <Ionicons name="book" size={20} color={colors.primary} />
                            </View>
                            <View style={styles.subjectInfo}>
                              <Text style={styles.subjectName}>{subject.name}</Text>
                              <Text style={styles.subjectCode}>{subject.code}</Text>
                              {subject.subject_type && (
                                <View style={styles.subjectTypeBadge}>
                                  <Text style={styles.subjectTypeText}>{subject.subject_type}</Text>
                                </View>
                              )}
                              {subject.description && (
                                <Text style={styles.subjectDescription}>{subject.description}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyTabContent}>
                <Ionicons name="book" size={40} color="#ccc" />
                <Text style={styles.emptyTabText}>No subjects found for this grade level</Text>
                <Text style={styles.emptySubText}>
                  {section.strand !== 'N/A' ? `Try adding subjects for Grade ${section.grade_level} - ${section.strand}` : `Try adding subjects for Grade ${section.grade_level}`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabHeaderTitle}>Class Schedule</Text>
            </View>
            {schedules.length > 0 ? (
              schedules.map((schedule) => (
                <View key={schedule.id} style={styles.scheduleItem}>
                  <View style={[styles.scheduleDay, { backgroundColor: gradeColor + '10' }]}>
                    <Text style={[styles.dayText, { color: gradeColor }]}>
                      {schedule.day.substring(0, 3)}
                    </Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleSubject}>{schedule.subject_name}</Text>
                    <Text style={styles.scheduleTeacher}>
                      <Ionicons name="person" size={12} color="#666" /> {schedule.teacher_name}
                    </Text>
                    <View style={styles.scheduleMeta}>
                      <Text style={styles.scheduleTime}>
                        <Ionicons name="time" size={12} color="#666" /> {schedule.time_start} - {schedule.time_end}
                      </Text>
                      {schedule.room !== 'N/A' && (
                        <Text style={styles.scheduleRoom}>
                          <Ionicons name="location" size={12} color="#666" /> {schedule.room}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyTabContent}>
                <Ionicons name="calendar" size={40} color="#ccc" />
                <Text style={styles.emptyTabText}>No schedule for this section</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Student Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student to {section?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Grade {section?.grade_level} {section?.strand !== 'N/A' ? `• ${section?.strand}` : ''}
            </Text>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView style={styles.modalList}>
              {filteredAvailableStudents.length > 0 ? (
                filteredAvailableStudents.map((student) => (
                  <View key={student.id} style={styles.modalStudentItem}>
                    <View style={styles.modalStudentAvatar}>
                      <Text style={styles.modalStudentInitial}>
                        {getInitials(student.full_name)}
                      </Text>
                    </View>
                    <View style={styles.modalStudentInfo}>
                      <Text style={styles.modalStudentName}>{student.full_name}</Text>
                      <Text style={styles.modalStudentDetails}>
                        LRN: {student.lrn} • {student.grade_level}
                        {student.strand !== 'N/A' ? ` • ${student.strand}` : ''}
                      </Text>
                      <Text style={styles.modalStudentEmail}>
                        <Ionicons name="mail" size={12} color="#666" /> {student.email}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalAddButton}
                      onPress={() => addStudentToSection(student)}
                      disabled={addingStudent}
                    >
                      <Text style={styles.modalAddButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.modalEmpty}>
                  <Ionicons name="people" size={40} color="#ccc" />
                  <Text style={styles.modalEmptyText}>
                    {searchQuery ? 'No matching students found' : 'No available students to add'}
                  </Text>
                  <Text style={styles.modalEmptySubtext}>
                    Students must have the same grade level{section?.strand !== 'N/A' ? ` and strand (${section?.strand})` : ''} and not be in another section.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  editButton: {
    padding: spacing.sm,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sectionLetter: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.sm,
    color: '#666',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    alignItems: 'center',
    width: '48%',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  infoValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  infoSubValue: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: typography.sizes.sm,
    color: '#666',
    fontWeight: typography.weights.medium,
  },
  tabTextActive: {
    color: colors.white,
  },
  tabContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabHeaderTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  dropdownSection: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray,
  },
  dropdownHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropdownTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  dropdownBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  dropdownBadgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  dropdownContent: {
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  addStudentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    gap: spacing.xs,
  },
  addStudentText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  studentInitial: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  studentLrn: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  studentEmail: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  studentGrade: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  studentGender: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: colors.gray,
  },
  studentGenderText: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  subjectCode: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  subjectTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: colors.primary + '10',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  subjectTypeText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  subjectHours: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  subjectDescription: {
    fontSize: typography.sizes.xs,
    color: '#999',
    marginTop: 2,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scheduleDay: {
    width: 50,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dayText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleSubject: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  scheduleTeacher: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  scheduleMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  scheduleTime: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  scheduleRoom: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  emptyTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTabText: {
    fontSize: typography.sizes.sm,
    color: '#999',
    marginTop: spacing.sm,
  },
  emptySubText: {
    fontSize: typography.sizes.xs,
    color: '#bbb',
    marginTop: spacing.xs,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  modalList: {
    maxHeight: 400,
  },
  modalStudentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalStudentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalStudentInitial: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  modalStudentInfo: {
    flex: 1,
  },
  modalStudentName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  modalStudentDetails: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  modalStudentEmail: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  modalAddButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  modalAddButtonText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  modalEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalEmptyText: {
    fontSize: typography.sizes.md,
    color: '#999',
    marginTop: spacing.sm,
  },
  modalEmptySubtext: {
    fontSize: typography.sizes.xs,
    color: '#999',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});