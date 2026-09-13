import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Subject = {
  id: string;
  name: string;
  code: string;
  grade_level: string;
  strand: string;
  semester: string;
  quarter: string;
  subject_type: string;
  hours: number;
};

export default function AdminSubjects() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('grade_level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      if (data) setSubjects(data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const typeColor = (t: string) => {
    switch (t) {
      case 'Core': return '#4CAF50';
      case 'Applied': return '#2196F3';
      case 'Specialized': return '#9C27B0';
      default: return '#666';
    }
  };

  const filtered = subjects.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase())
      || s.code.toLowerCase().includes(search.toLowerCase());
    const matchGrade = filterGrade ? s.grade_level === filterGrade : true;
    return matchSearch && matchGrade;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subjects...</Text>
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
          <Text style={styles.title}>Subjects</Text>
          <TouchableOpacity onPress={loadSubjects} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Ionicons name="book" size={24} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.summaryLabel}>Total Subjects</Text>
            <Text style={styles.summaryValue}>{subjects.length}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or code..."
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter chips */}
        <View style={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, !filterGrade && styles.chipActive]}
            onPress={() => setFilterGrade('')}
          >
            <Text style={[styles.chipText, !filterGrade && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {['11', '12'].map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, filterGrade === g && styles.chipActive]}
              onPress={() => setFilterGrade(g)}
            >
              <Text style={[styles.chipText, filterGrade === g && styles.chipTextActive]}>Grade {g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 3 }]}>Subject</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Code</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>Type</Text>
          </View>
          {filtered.length > 0 ? (
            filtered.map(s => (
              <View key={s.id} style={styles.tableRow}>
                <View style={{ flex: 3 }}>
                  <Text style={styles.cellBold}>{s.name}</Text>
                  <Text style={styles.cellSub}>
                    Grade {s.grade_level}
                    {s.strand && s.strand !== 'N/A' ? ` • ${s.strand}` : ''}
                    {s.semester ? ` • ${s.semester}` : ''}
                  </Text>
                </View>
                <Text style={[styles.cell, { flex: 1.5 }]}>{s.code}</Text>
                <View style={{ flex: 1.5 }}>
                  <View style={[styles.typeBadge, { backgroundColor: typeColor(s.subject_type) + '20' }]}>
                    <Text style={[styles.typeText, { color: typeColor(s.subject_type) }]}>
                      {s.subject_type}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No subjects found</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  summary: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.md, elevation: 2,
  },
  summaryLabel: { fontSize: typography.sizes.sm, color: '#666' },
  summaryValue: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, color: colors.text },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 10,
    paddingHorizontal: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
    elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, color: colors.text, fontSize: typography.sizes.sm },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 20, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: typography.sizes.xs, color: '#666' },
  chipTextActive: { color: colors.white },
  table: {
    backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden', elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row', backgroundColor: colors.primary + '10',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  th: { fontSize: typography.sizes.xs, color: colors.primary, fontWeight: typography.weights.semibold },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cell: { fontSize: typography.sizes.sm, color: colors.text },
  cellBold: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },
  cellSub: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' },
  typeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  emptyText: { padding: spacing.lg, textAlign: 'center', color: '#999', fontSize: typography.sizes.sm },
});