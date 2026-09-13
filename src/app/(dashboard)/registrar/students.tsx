import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Student = {
  id: string;
  full_name: string;
  lrn: string;
  grade_level: string;
  strand: string;
  section_name: string;
  gender: string;
  student_type: string;
};

type StrandGroup = {
  strand: string;
  students: Student[];
};

type GradeGroup = {
  grade_level: string;
  strands: StrandGroup[];
  total: number;
};

export default function RegistrarStudents() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [expandedStrands, setExpandedStrands] = useState<Record<string, boolean>>({});

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, lrn, first_name, last_name, gender,
          grade_level, strand, student_type,
          sections:section_id (name)
        `)
        .order('grade_level')
        .order('strand')
        .order('last_name');

      if (error) throw error;

      const formatted: Student[] = (data || []).map((s: any) => ({
        id: s.id,
        full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
        lrn: s.lrn || 'N/A',
        grade_level: s.grade_level || 'N/A',
        strand: s.strand || 'N/A',
        section_name: s.sections?.name || 'No Section',
        gender: s.gender || 'N/A',
        student_type: s.student_type || 'New Student',
      }));

      setStudents(formatted);

      // Auto-expand the first grade
      const gradeSet = [...new Set(formatted.map(s => s.grade_level))];
      if (gradeSet.length > 0) {
        setExpandedGrades({ [gradeSet[0]]: true });
      }
    } catch (e) {
      console.error('Error loading students:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleGrade = (grade: string) => {
    setExpandedGrades(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const toggleStrand = (key: string) => {
    setExpandedStrands(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const gradeOrder = ['7', '8', '9', '10', '11', '12'];

  const getGradeColor = (grade: string) => {
    const num = parseInt(grade.replace('Grade ', ''));
    if (num >= 11) return '#9C27B0';
    if (num >= 7) return '#2196F3';
    return '#4CAF50';
  };

  const getTypeColor = (type: string) => {
    if (type === 'New Student') return '#2196F3';
    if (type === 'Transferee') return '#FF9800';
    if (type === 'Old Student') return '#4CAF50';
    return '#999';
  };

  const filtered = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.lrn.toLowerCase().includes(q) ||
      s.strand.toLowerCase().includes(q) ||
      s.grade_level.toLowerCase().includes(q)
    );
  });

  // Group by grade → strand
  const grouped: GradeGroup[] = (() => {
    const gradeMap: Record<string, Record<string, Student[]>> = {};

    filtered.forEach(s => {
      const g = s.grade_level || 'N/A';
      const str = s.strand || 'N/A';
      if (!gradeMap[g]) gradeMap[g] = {};
      if (!gradeMap[g][str]) gradeMap[g][str] = [];
      gradeMap[g][str].push(s);
    });

    const sortedGrades = Object.keys(gradeMap).sort((a, b) => {
      const numA = parseInt(String(a).replace('Grade ', ''));
      const numB = parseInt(String(b).replace('Grade ', ''));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return String(a).localeCompare(String(b));
    });

    return sortedGrades.map(grade => {
      const strands = Object.keys(gradeMap[grade])
        .sort()
        .map(strand => ({
          strand,
          students: gradeMap[grade][strand],
        }));
      return {
        grade_level: grade,
        strands,
        total: strands.reduce((sum, s) => sum + s.students.length, 0),
      };
    });
  })();

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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Students</Text>
          <TouchableOpacity onPress={loadStudents} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, LRN, grade or strand..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <Ionicons name="people" size={22} color={colors.primary} />
          <Text style={styles.summaryText}>
            <Text style={styles.summaryNumber}>{filtered.length}</Text> student{filtered.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {grouped.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No students found</Text>
          </View>
        ) : (
          grouped.map(gradeGroup => {
            const gradeColor = getGradeColor(gradeGroup.grade_level);
            const gradeExpanded = expandedGrades[gradeGroup.grade_level] || false;

            return (
              <View key={gradeGroup.grade_level} style={styles.gradeSection}>
                {/* Grade Header */}
                <TouchableOpacity
                  style={[styles.gradeHeader, { borderLeftColor: gradeColor }]}
                  onPress={() => toggleGrade(gradeGroup.grade_level)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={gradeExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={20}
                    color={gradeColor}
                  />
                  <Text style={[styles.gradeTitle, { color: gradeColor }]}>
                    {gradeGroup.grade_level}
                  </Text>
                  <View style={[styles.gradeBadge, { backgroundColor: gradeColor + '20' }]}>
                    <Text style={[styles.gradeBadgeText, { color: gradeColor }]}>
                      {gradeGroup.total}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Strands */}
                {gradeExpanded &&
                  gradeGroup.strands.map(strandGroup => {
                    const strandKey = `${gradeGroup.grade_level}::${strandGroup.strand}`;
                    const strandExpanded = expandedStrands[strandKey] ?? true;

                    return (
                      <View key={strandKey} style={styles.strandBlock}>
                        <TouchableOpacity
                          style={styles.strandHeader}
                          onPress={() => toggleStrand(strandKey)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={strandExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color="#666"
                          />
                          <Text style={styles.strandTitle}>
                            {strandGroup.strand === 'N/A' ? 'No Strand' : strandGroup.strand}
                          </Text>
                          <View style={styles.strandBadge}>
                            <Text style={styles.strandBadgeText}>
                              {strandGroup.students.length}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        {strandExpanded &&
                          strandGroup.students.map(student => (
                            <View key={student.id} style={styles.studentItem}>
                              <View style={[styles.studentAvatar, { backgroundColor: gradeColor + '20' }]}>
                                <Text style={[styles.studentInitial, { color: gradeColor }]}>
                                  {student.full_name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.studentName}>{student.full_name}</Text>
                                <Text style={styles.studentMeta}>LRN: {student.lrn}</Text>
                                <Text style={styles.studentMeta}>
                                  {student.section_name}
                                  {student.gender !== 'N/A' ? ` • ${student.gender}` : ''}
                                </Text>
                              </View>
                              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(student.student_type) + '20' }]}>
                                <Text style={[styles.typeBadgeText, { color: getTypeColor(student.student_type) }]}>
                                  {student.student_type}
                                </Text>
                              </View>
                            </View>
                          ))}
                      </View>
                    );
                  })}
              </View>
            );
          })
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.sm, gap: spacing.sm, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary + '10', borderRadius: 10,
    padding: spacing.md, marginBottom: spacing.md,
  },
  summaryText: { fontSize: typography.sizes.sm, color: colors.text },
  summaryNumber: { fontWeight: '700', color: colors.primary },
  emptyBox: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },

  // Grade section
  gradeSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
    elevation: 2,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderLeftWidth: 4,
    gap: spacing.sm,
  },
  gradeTitle: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
  gradeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },

  // Strand block
  strandBlock: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  strandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  strandTitle: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: '#444',
  },
  strandBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  strandBadgeText: { fontSize: typography.sizes.xs, color: '#666', fontWeight: '600' },

  // Student item
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
    gap: spacing.md,
  },
  studentAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  studentInitial: { fontSize: typography.sizes.md, fontWeight: '700' },
  studentName: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.text,
  },
  studentMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 1 },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
});