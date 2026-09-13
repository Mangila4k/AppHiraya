import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Student = {
  id: string;
  lrn: string;
  full_name: string;
  email: string;
  grade_level: string;
  strand: string;
  gender: string;
  section_id: string;
  section_name: string;
  documents_status: string;
};

export default function AdminStudents() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          lrn,
          first_name,
          last_name,
          email,
          grade_level,
          strand,
          gender,
          section_id,
          documents_status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (studentsError) throw studentsError;

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch sections separately (avoid join errors)
      const sectionIds = [...new Set(
        studentsData.map((s: any) => s.section_id).filter(Boolean)
      )];

      const sectionMap: Record<string, string> = {};
      if (sectionIds.length > 0) {
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, name')
          .in('id', sectionIds);

        (sectionsData || []).forEach((sec: any) => {
          sectionMap[sec.id] = sec.name;
        });
      }

      const formatted: Student[] = studentsData.map((item: any) => ({
        id: item.id,
        lrn: item.lrn || 'N/A',
        full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
        email: item.email || 'No email',
        grade_level: item.grade_level || 'N/A',
        strand: item.strand || 'N/A',
        gender: item.gender || 'N/A',
        section_id: item.section_id || '',
        section_name: item.section_id ? (sectionMap[item.section_id] || '') : '',
        documents_status: item.documents_status || 'N/A',
      }));

      setStudents(formatted);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      student.full_name.toLowerCase().includes(query) ||
      student.lrn.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query);

    // Handle grade match — student.grade_level can be "11" or "Grade 11"
    const studentGrade = student.grade_level.replace(/[^0-9]/g, '');
    const matchesGrade = filterGrade
      ? studentGrade === filterGrade
      : true;

    return matchesSearch && matchesGrade;
  });

  const getGradeColor = (grade: string) => {
    const num = parseInt(grade.replace(/[^0-9]/g, ''));
    if (num >= 11) return '#9C27B0';
    if (num >= 9) return '#2196F3';
    if (num >= 7) return '#4CAF50';
    return '#666';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return '#4CAF50';
      case 'Pending': return '#FF9800';
      default: return '#999';
    }
  };

  // Count students per grade
  const gradeCounts = students.reduce((acc: Record<string, number>, s) => {
    const g = s.grade_level.replace(/[^0-9]/g, '');
    if (g) acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const grades = ['7', '8', '9', '10', '11', '12'];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading students...</Text>
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
          <Text style={styles.title}>Students</Text>
          <TouchableOpacity onPress={loadStudents} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Card — reflects active filter */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons
              name={filterGrade ? 'filter' : 'school'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>
              {filterGrade ? `Grade ${filterGrade} Students` : 'Total Students'}
            </Text>
            <Text style={styles.summaryValue}>
              {filterGrade
                ? filteredStudents.length
                : students.length}
            </Text>
          </View>
          {filterGrade ? (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => setFilterGrade('')}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, LRN, or email..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Grade Filter — 7 to 12 with counts */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Grade</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, !filterGrade && styles.filterChipActive]}
              onPress={() => setFilterGrade('')}
            >
              <Text style={[styles.filterChipText, !filterGrade && styles.filterChipTextActive]}>
                All ({students.length})
              </Text>
            </TouchableOpacity>

            {grades.map((grade) => {
              const count = gradeCounts[grade] || 0;
              const active = filterGrade === grade;
              return (
                <TouchableOpacity
                  key={grade}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilterGrade(active ? '' : grade)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    Grade {grade} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active filter indicator */}
        {filterGrade ? (
          <View style={styles.activeFilterBanner}>
            <Ionicons name="funnel" size={16} color={colors.primary} />
            <Text style={styles.activeFilterText}>
              Showing <Text style={styles.activeFilterBold}>Grade {filterGrade}</Text> students ({filteredStudents.length})
            </Text>
          </View>
        ) : null}

        {/* List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => {
              const gradeColor = getGradeColor(student.grade_level);
              return (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentCard}
                  onPress={() => router.push(`./view-student?id=${student.id}`)}
                >
                  <View style={[styles.studentAvatar, { backgroundColor: gradeColor + '20' }]}>
                    <Text style={[styles.studentInitial, { color: gradeColor }]}>
                      {student.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.full_name}</Text>
                    <Text style={styles.studentDetails}>
                      LRN: {student.lrn} • Grade {student.grade_level.replace(/[^0-9]/g, '')}
                      {student.strand !== 'N/A' && student.strand ? ` • ${student.strand}` : ''}
                    </Text>
                    {student.section_name ? (
                      <Text style={styles.studentSection}>
                        <Ionicons name="people" size={12} color="#4CAF50" /> {student.section_name}
                      </Text>
                    ) : (
                      <Text style={styles.studentNoSection}>
                        <Ionicons name="people" size={12} color="#999" /> No Section
                      </Text>
                    )}
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(student.documents_status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(student.documents_status) }
                    ]}>
                      {student.documents_status === 'complete' ? 'Enrolled' : student.documents_status}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {filterGrade ? `No Grade ${filterGrade} students found` : 'No students found'}
              </Text>
              <Text style={styles.emptySubText}>
                {searchQuery || filterGrade
                  ? 'Try adjusting your search or filter'
                  : 'Students will appear here once enrolled'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  summaryInfo: { flex: 1 },
  summaryLabel: { fontSize: typography.sizes.sm, color: '#666' },
  summaryValue: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  clearFilterText: { fontSize: typography.sizes.xs, color: '#666' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterSection: { marginBottom: spacing.md },
  filterLabel: {
    fontSize: typography.sizes.xs,
    color: '#666',
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  filterContent: { gap: spacing.sm, paddingRight: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    height: 34,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: typography.sizes.xs, color: colors.text },
  filterChipTextActive: { color: colors.white, fontWeight: typography.weights.semibold },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  activeFilterText: { fontSize: typography.sizes.sm, color: colors.primary, flex: 1 },
  activeFilterBold: { fontWeight: typography.weights.bold },
  list: { flex: 1 },
  studentCard: {
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
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  studentInitial: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  studentInfo: { flex: 1 },
  studentName: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text },
  studentDetails: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  studentSection: { fontSize: typography.sizes.xs, color: '#4CAF50', marginTop: 2 },
  studentNoSection: { fontSize: typography.sizes.xs, color: '#999', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: spacing.xs,
  },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  emptySubText: { fontSize: typography.sizes.sm, color: '#bbb', marginTop: spacing.xs, textAlign: 'center' },
});