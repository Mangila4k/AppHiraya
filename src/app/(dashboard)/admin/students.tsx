import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  created_at: string;
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
      // Fetch students directly from students table
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
          created_at,
          sections:section_id (name)
        `)
        .order('created_at', { ascending: false });

      if (studentsError) {
        console.error('Students error:', studentsError);
        throw studentsError;
      }

      if (studentsData && studentsData.length > 0) {
        const formattedStudents = studentsData.map((item: any) => ({
          id: item.id,
          lrn: item.lrn || 'N/A',
          full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email || 'No email',
          grade_level: item.grade_level || 'N/A',
          strand: item.strand || 'N/A',
          gender: item.gender || 'N/A',
          section_id: item.section_id || '',
          section_name: item.sections?.name || '',
          created_at: item.created_at,
        }));
        setStudents(formattedStudents);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.lrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade ? student.grade_level === filterGrade : true;
    return matchesSearch && matchesGrade;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Students</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search students by name, LRN, or email..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity 
            style={[styles.filterChip, !filterGrade && styles.filterChipActive]}
            onPress={() => setFilterGrade('')}
          >
            <Text style={[styles.filterChipText, !filterGrade && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {['7', '8', '9', '10', '11', '12'].map((grade) => (
            <TouchableOpacity
              key={grade}
              style={[styles.filterChip, filterGrade === grade && styles.filterChipActive]}
              onPress={() => setFilterGrade(filterGrade === grade ? '' : grade)}
            >
              <Text style={[styles.filterChipText, filterGrade === grade && styles.filterChipTextActive]}>
                Grade {grade}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={styles.list}>
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <TouchableOpacity
                key={student.id}
                style={styles.studentCard}
                onPress={() => router.push(`./view-student?id=${student.id}`)}
              >
                <View style={styles.studentAvatar}>
                  <Text style={styles.studentInitial}>
                    {student.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.full_name}</Text>
                  <Text style={styles.studentDetails}>
                    LRN: {student.lrn} • Grade {student.grade_level}
                  </Text>
                  {student.strand !== 'N/A' && student.strand !== '' && (
                    <Text style={styles.studentStrand}>
                      Strand: {student.strand}
                    </Text>
                  )}
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
                <View style={styles.studentGender}>
                  <Text style={styles.studentGenderText}>{student.gender}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No students found</Text>
              <Text style={styles.emptySubText}>
                {searchQuery ? 'Try adjusting your search' : 'Students will appear here once enrolled'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
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
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.sizes.xs,
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  list: {
    flex: 1,
  },
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
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  studentInitial: {
    fontSize: typography.sizes.lg,
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
  studentDetails: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  studentStrand: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  studentSection: {
    fontSize: typography.sizes.xs,
    color: '#4CAF50',
    marginTop: 2,
  },
  studentNoSection: {
    fontSize: typography.sizes.xs,
    color: '#999',
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: '#999',
    marginTop: spacing.md,
  },
  emptySubText: {
    fontSize: typography.sizes.sm,
    color: '#bbb',
    marginTop: spacing.xs,
  },
});