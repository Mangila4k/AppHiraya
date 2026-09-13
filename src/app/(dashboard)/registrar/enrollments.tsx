import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Enrollment = {
  id: string;
  student_id: string;
  student_name: string;
  lrn: string;
  grade_level: string;
  strand: string;
  status: string;
  documents_status: string;
  enrolled_date: string;
  student_type: string;
};

export default function RegistrarEnrollments() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'Enrolled' | 'Rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'New Student' | 'Transferee' | 'Old Student'>('all');

  useEffect(() => { loadEnrollments(); }, []);

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      // ✅ Removed school_year from select — not in your schema
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id, status, enrolled_date, student_type,
          students:student_id (
            id, lrn, first_name, last_name,
            grade_level, strand, documents_status
          )
        `)
        .order('enrolled_date', { ascending: false });

      if (error) throw error;

      const formatted: Enrollment[] = (data || []).map((e: any) => {
        const s = e.students;
        return {
          id: e.id,
          student_id: s?.id || '',
          student_name: s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
          lrn: s?.lrn || 'N/A',
          grade_level: s?.grade_level || 'N/A',
          strand: s?.strand || 'N/A',
          status: e.status || 'pending',
          documents_status: s?.documents_status || 'pending',
          enrolled_date: e.enrolled_date ? new Date(e.enrolled_date).toLocaleDateString() : 'N/A',
          student_type: e.student_type || 'New Student',
        };
      });

      setEnrollments(formatted);
    } catch (e) {
      console.error('Error loading enrollments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (enrollment: Enrollment) => {
    Alert.alert('Approve Enrollment', `Approve ${enrollment.student_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          const { error } = await supabase
            .from('enrollments').update({ status: 'Enrolled' }).eq('id', enrollment.id);

          if (error) { Alert.alert('Error', error.message); return; }

          await supabase
            .from('students')
            .update({ documents_status: 'complete' })
            .eq('id', enrollment.student_id);

          Alert.alert('Success', 'Enrollment approved!');
          loadEnrollments();
        },
      },
    ]);
  };

  const handleReject = async (enrollment: Enrollment) => {
    Alert.alert('Reject Enrollment', `Reject ${enrollment.student_name}'s enrollment?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('enrollments').update({ status: 'Rejected' }).eq('id', enrollment.id);
          if (error) { Alert.alert('Error', error.message); return; }
          Alert.alert('Done', 'Enrollment rejected.');
          loadEnrollments();
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    const s = String(status).toLowerCase();
    if (s === 'enrolled') return '#4CAF50';
    if (s === 'pending') return '#FF9800';
    if (s === 'rejected') return '#F44336';
    return '#999';
  };

  const getTypeColor = (type: string) => {
    if (type === 'New Student') return '#2196F3';
    if (type === 'Transferee') return '#FF9800';
    if (type === 'Old Student') return '#4CAF50';
    return '#999';
  };

  const filtered = enrollments.filter(e => {
    const matchesSearch =
      e.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.lrn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && String(e.status).toLowerCase() === 'pending') ||
      String(e.status).toLowerCase() === String(filter).toLowerCase();
    const matchesType = typeFilter === 'all' || e.student_type === typeFilter;
    return matchesSearch && matchesFilter && matchesType;
  });

  const renderItem = ({ item }: { item: Enrollment }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.student_name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemName}>{item.student_name}</Text>
          <Text style={styles.itemMeta}>LRN: {item.lrn}</Text>
          <Text style={styles.itemMeta}>
            Grade {item.grade_level}
            {item.strand !== 'N/A' ? ` • ${item.strand}` : ''}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.typeRow}>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.student_type) + '20' }]}>
          <Text style={[styles.typeBadgeText, { color: getTypeColor(item.student_type) }]}>
            {item.student_type}
          </Text>
        </View>
        <View style={styles.docsRow}>
          <Ionicons
            name={item.documents_status === 'complete' ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={item.documents_status === 'complete' ? '#4CAF50' : '#FF9800'}
          />
          <Text style={styles.docsText}>Docs: {item.documents_status}</Text>
        </View>
      </View>

      {String(item.status).toLowerCase() === 'pending' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(item)}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleReject(item)}>
            <Ionicons name="close" size={16} color={colors.white} />
            <Text style={styles.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Enrollees & Admissions</Text>
          <TouchableOpacity onPress={loadEnrollments} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or LRN..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterRow}>
          {(['all', 'pending', 'Enrolled', 'Rejected'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'New Student', 'Transferee', 'Old Student'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.filterChip, typeFilter === t && styles.filterChipActive]}
              onPress={() => setTypeFilter(t)}
            >
              <Text style={[styles.filterText, typeFilter === t && styles.filterTextActive]}>
                {t === 'all' ? 'All Types' : t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="school-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No enrollments found</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.sizes.xs, color: '#666' },
  filterTextActive: { color: colors.white, fontWeight: '600' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  item: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, elevation: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.primary },
  itemName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  itemMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  docsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docsText: { fontSize: typography.sizes.xs, color: '#666' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.sm, borderRadius: 8, gap: 4,
  },
  approveBtn: { backgroundColor: '#4CAF50' },
  rejectBtn: { backgroundColor: '#F44336' },
  actionBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '600' },
});