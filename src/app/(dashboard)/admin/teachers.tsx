import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Teacher = {
  id: string;
  user_id: string;
  employee_id: string;
  specialization: string;
  full_name: string;
  email: string;
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
      // Fetch from teachers table (has employee_id + specialization)
      // join users for name and email
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          employee_id,
          specialization,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Count sections assigned to each teacher
        const teacherIds = data.map((t: any) => t.id);
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('adviser_id')
          .in('adviser_id', teacherIds);

        const countMap: Record<string, number> = {};
        (sectionsData || []).forEach((s: any) => {
          if (s.adviser_id) {
            countMap[s.adviser_id] = (countMap[s.adviser_id] || 0) + 1;
          }
        });

        const formatted: Teacher[] = data.map((t: any) => {
          const user = t.users;
          return {
            id: t.id,
            user_id: t.user_id,
            employee_id: t.employee_id || 'N/A',
            specialization: t.specialization || 'Not specified',
            full_name: user
              ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            email: user?.email || 'No email',
            sections_count: countMap[t.id] || 0,
          };
        });
        setTeachers(formatted);
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
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSpecializationColor = (spec: string) => {
    switch (spec.toLowerCase()) {
      case 'science': return '#4CAF50';
      case 'english': return '#2196F3';
      case 'mathematics': return '#FF9800';
      case 'esp': return '#9C27B0';
      case 'filipino': return '#E91E63';
      case 'mapeh': return '#00BCD4';
      case 'tle': return '#795548';
      default: return colors.primary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading teachers...</Text>
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
          <Text style={styles.title}>Teachers</Text>
          <TouchableOpacity onPress={() => router.push('./add-teacher')} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="person" size={24} color={colors.primary} />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Teachers</Text>
            <Text style={styles.summaryValue}>{teachers.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or specialization..."
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

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((teacher) => {
              const specColor = getSpecializationColor(teacher.specialization);
              return (
                <TouchableOpacity
                  key={teacher.id}
                  style={styles.teacherCard}
                  onPress={() => router.push(`./view-teacher?id=${teacher.id}`)}
                >
                  <View style={[styles.teacherAvatar, { backgroundColor: specColor + '20' }]}>
                    <Text style={[styles.teacherInitial, { color: specColor }]}>
                      {teacher.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.teacherInfo}>
                    <Text style={styles.teacherName}>{teacher.full_name}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.teacherId}>{teacher.employee_id}</Text>
                      <View style={[styles.specBadge, { backgroundColor: specColor + '20' }]}>
                        <Text style={[styles.specText, { color: specColor }]}>
                          {teacher.specialization}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.teacherEmail}>{teacher.email}</Text>
                  </View>
                  {teacher.sections_count > 0 ? (
                    <View style={styles.sectionCount}>
                      <Text style={styles.sectionCountText}>{teacher.sections_count}</Text>
                      <Text style={styles.sectionCountLabel}>
                        Section{teacher.sections_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching teachers' : 'No teachers found'}
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
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  list: { flex: 1 },
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
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  teacherInitial: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  teacherInfo: { flex: 1 },
  teacherName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  teacherId: { fontSize: typography.sizes.xs, color: '#666' },
  specBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  specText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  teacherEmail: { fontSize: typography.sizes.xs, color: '#999', marginTop: 4 },
  sectionCount: {
    alignItems: 'center',
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    minWidth: 60,
  },
  sectionCountText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  sectionCountLabel: { fontSize: typography.sizes.xs, color: '#666' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
});