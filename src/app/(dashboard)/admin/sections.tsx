import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Section = {
  id: string;
  name: string;
  grade_level: string;
  strand: string;
  adviser_name: string;
  room: string;
  student_count: number;
  created_at: string;
};

export default function AdminSections() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      // Get sections with adviser info
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('sections')
        .select(`
          id,
          name,
          grade_level,
          strand,
          room,
          created_at,
          adviser_id,
          teachers:adviser_id (
            id,
            user_id,
            users:user_id (
              first_name,
              last_name
            )
          )
        `)
        .order('grade_level', { ascending: true })
        .order('name', { ascending: true });

      if (sectionsError) throw sectionsError;

      if (sectionsData) {
        // Get student counts for each section separately
        const sectionsWithCounts = await Promise.all(
          sectionsData.map(async (item: any) => {
            // Count students in this section
            const { count, error: countError } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('section_id', item.id);

            if (countError) {
              console.error('Error counting students:', countError);
            }

            const teacher = item.teachers;
            const user = teacher?.users;
            const adviserName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'No Adviser';
            
            return {
              id: item.id,
              name: item.name || 'Unknown',
              grade_level: item.grade_level || 'N/A',
              strand: item.strand || 'N/A',
              adviser_name: adviserName || 'No Adviser',
              room: item.room || 'N/A',
              student_count: count || 0,
              created_at: item.created_at,
            };
          })
        );
        
        setSections(sectionsWithCounts);
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      Alert.alert('Error', 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const num = parseInt(grade);
    if (num >= 11) return '#9C27B0';
    if (num >= 7) return '#2196F3';
    return '#4CAF50';
  };

  const getGradeBadgeColor = (grade: string) => {
    const num = parseInt(grade);
    if (num >= 11) return '#9C27B0' + '20';
    if (num >= 7) return '#2196F3' + '20';
    return '#4CAF50' + '20';
  };

  const filteredSections = sections.filter((section) => {
    const matchesSearch = section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          section.adviser_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          section.room.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGrade = filterGrade ? section.grade_level === filterGrade : true;
    return matchesSearch && matchesGrade;
  });

  // Group sections by grade level
  const groupedSections: Record<string, Section[]> = {};
  filteredSections.forEach((section) => {
    if (!groupedSections[section.grade_level]) {
      groupedSections[section.grade_level] = [];
    }
    groupedSections[section.grade_level].push(section);
  });

  const sortedGradeLevels = Object.keys(groupedSections).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Sections</Text>
          <TouchableOpacity onPress={() => router.push('./create-section')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sections..."
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
          {sortedGradeLevels.length > 0 ? (
            sortedGradeLevels.map((gradeLevel) => (
              <View key={gradeLevel} style={styles.gradeSection}>
                <View style={styles.gradeHeader}>
                  <Text style={styles.gradeTitle}>Grade {gradeLevel}</Text>
                  <Text style={styles.gradeCount}>
                    {groupedSections[gradeLevel].length} section{groupedSections[gradeLevel].length > 1 ? 's' : ''}
                  </Text>
                </View>
                {groupedSections[gradeLevel].map((section) => (
                  <TouchableOpacity
                    key={section.id}
                    style={styles.sectionCard}
                    onPress={() => router.push(`./view-section?id=${section.id}`)}
                  >
                    <View style={[styles.sectionIcon, { backgroundColor: getGradeColor(section.grade_level) + '20' }]}>
                      <Text style={[styles.sectionLetter, { color: getGradeColor(section.grade_level) }]}>
                        {section.name.split(' - ')[1] || section.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={styles.sectionInfo}>
                      <View style={styles.sectionNameRow}>
                        <Text style={styles.sectionName}>{section.name}</Text>
                        {section.strand !== 'N/A' && (
                          <View style={[styles.strandBadge, { backgroundColor: getGradeBadgeColor(section.grade_level) }]}>
                            <Text style={[styles.strandBadgeText, { color: getGradeColor(section.grade_level) }]}>
                              {section.strand}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.sectionMeta}>
                        <Text style={styles.metaText}>
                          <Ionicons name="person" size={12} color="#666" /> {section.adviser_name}
                        </Text>
                        <Text style={styles.metaText}>
                          <Ionicons name="location" size={12} color="#666" /> {section.room}
                        </Text>
                        <Text style={styles.metaText}>
                          <Ionicons name="people" size={12} color="#666" /> {section.student_count} students
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="grid" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No sections found</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => router.push('./create-section')}
              >
                <Text style={styles.emptyButtonText}>Create New Section</Text>
              </TouchableOpacity>
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
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  gradeSection: {
    marginBottom: spacing.md,
  },
  gradeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  gradeTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  gradeCount: {
    fontSize: typography.sizes.sm,
    color: '#666',
  },
  sectionCard: {
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
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sectionLetter: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  strandBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  strandBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  sectionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: 2,
  },
  metaText: {
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
  emptyButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});