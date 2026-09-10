import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Teacher = {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  specialization: string;
  created_at: string;
  sections_count: number;
};

export default function AdminTeachers() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedTeachers = data.map((item: any) => ({
          id: item.id,
          employee_id: item.employee_id || 'N/A',
          full_name: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown',
          email: item.email || 'No email',
          specialization: item.specialization || 'Not specified',
          created_at: item.created_at,
          sections_count: 0,
        }));
        setTeachers(formattedTeachers);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      Alert.alert('Error', 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Teachers</Text>
          <TouchableOpacity onPress={() => router.push('./add-teacher')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView style={styles.list}>
          {filteredTeachers.map((teacher) => (
            <TouchableOpacity
              key={teacher.id}
              style={styles.teacherCard}
              onPress={() => router.push(`./view-teacher?id=${teacher.id}`)}
            >
              <View style={styles.teacherAvatar}>
                <Text style={styles.teacherInitial}>
                  {teacher.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{teacher.full_name}</Text>
                <Text style={styles.teacherDetails}>
                  {teacher.employee_id} • {teacher.specialization}
                </Text>
                <Text style={styles.teacherEmail}>{teacher.email}</Text>
              </View>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{teacher.sections_count}</Text>
                <Text style={styles.sectionCountLabel}>Sections</Text>
              </View>
            </TouchableOpacity>
          ))}
          {filteredTeachers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="person" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No teachers found</Text>
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
  list: {
    flex: 1,
  },
  teacherCard: {
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
  teacherAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  teacherInitial: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  teacherDetails: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  teacherEmail: {
    fontSize: typography.sizes.xs,
    color: '#999',
  },
  sectionCount: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  sectionCountText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  sectionCountLabel: {
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
});