import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AttendanceRecord = {
  id: string;
  teacher_id: string;
  teacher_name: string;
  employee_id: string;
  specialization: string;
  date: string;
  time_in: string | null;
  time_out: string | null;
  in_status: string | null;
  out_status: string | null;
};

type FilterRange = 'today' | 'week' | 'month' | 'all';

export default function AdminAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filterRange, setFilterRange] = useState<FilterRange>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useEffect(() => { loadAttendance(); }, [filterRange]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      // 1. Fetch all teacher attendance
      let query = supabase
        .from('teacher_attendance')
        .select('*')
        .order('date', { ascending: false })
        .order('time_in', { ascending: false });

      // Apply date range filter
      const now = new Date();
      if (filterRange === 'today') {
        const today = now.toISOString().split('T')[0];
        query = query.eq('date', today);
      } else if (filterRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (filterRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setDate(monthAgo.getDate() - 30);
        query = query.gte('date', monthAgo.toISOString().split('T')[0]);
      }

      const { data: attendanceData, error } = await query;
      if (error) throw error;

      if (!attendanceData || attendanceData.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // 2. Fetch teacher details
      const teacherIds = [...new Set(attendanceData.map((a: any) => a.teacher_id).filter(Boolean))];
      const { data: teachersData } = await supabase
        .from('teachers')
        .select(`
          id, user_id, employee_id, specialization,
          users:user_id (first_name, last_name)
        `)
        .in('id', teacherIds);

      const teacherMap: Record<string, any> = {};
      (teachersData || []).forEach((t: any) => {
        const u = t.users;
        teacherMap[t.id] = {
          name: u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
          employee_id: t.employee_id || 'N/A',
          specialization: t.specialization || 'N/A',
        };
      });

      // 3. Combine
      const combined: AttendanceRecord[] = attendanceData.map((a: any) => {
        const teacher = teacherMap[a.teacher_id];
        return {
          id: a.id,
          teacher_id: a.teacher_id,
          teacher_name: teacher?.name || 'Unknown',
          employee_id: teacher?.employee_id || 'N/A',
          specialization: teacher?.specialization || 'N/A',
          date: a.date,
          time_in: a.time_in,
          time_out: a.time_out,
          in_status: a.in_status,
          out_status: a.out_status,
        };
      });

      setRecords(combined);
    } catch (e) {
      console.error('Error loading attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = records.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.teacher_name.toLowerCase().includes(q) ||
      r.employee_id.toLowerCase().includes(q) ||
      r.specialization.toLowerCase().includes(q)
    );
  });

  const formatTime = (t: string | null) => {
    if (!t) return '--:--';
    const date = new Date(t);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'Present': return '#4CAF50';
      case 'Late': return '#FF9800';
      case 'Completed': return '#4CAF50';
      case 'Overnight Out': return '#2196F3';
      case 'Early Out': return '#F44336';
      case 'Absent': return '#F44336';
      default: return '#999';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Stats
  const stats = {
    total: filtered.length,
    present: filtered.filter(r => r.in_status === 'Present').length,
    late: filtered.filter(r => r.in_status === 'Late').length,
    completed: filtered.filter(r => r.out_status === 'Completed').length,
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading attendance...</Text>
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
          <Text style={styles.title}>Teacher Attendance</Text>
          <TouchableOpacity onPress={loadAttendance} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { borderLeftColor: '#2196F3' }]}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.statValue}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#FF9800' }]}>
            <Text style={styles.statValue}>{stats.late}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#9C27B0' }]}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
        </View>

        {/* Range Filter */}
        <View style={styles.filterRow}>
          {(['today', 'week', 'month', 'all'] as const).map(range => (
            <TouchableOpacity
              key={range}
              style={[styles.filterChip, filterRange === range && styles.filterChipActive]}
              onPress={() => setFilterRange(range)}
            >
              <Text style={[styles.filterText, filterRange === range && styles.filterTextActive]}>
                {range === 'today' ? 'Today' :
                 range === 'week' ? '7 Days' :
                 range === 'month' ? '30 Days' : 'All'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, employee ID..."
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

        {/* Records List */}
        {filtered.length > 0 ? (
          filtered.map(record => (
            <TouchableOpacity
              key={record.id}
              style={styles.recordCard}
              onPress={() => {
                setSelectedRecord(record);
                setDetailModalVisible(true);
              }}
            >
              <View style={styles.recordAvatar}>
                <Text style={styles.recordAvatarText}>
                  {getInitials(record.teacher_name)}
                </Text>
              </View>
              <View style={styles.recordInfo}>
                <Text style={styles.recordName}>{record.teacher_name}</Text>
                <Text style={styles.recordMeta}>
                  {record.employee_id} • {record.specialization}
                </Text>
                <Text style={styles.recordDate}>{formatDate(record.date)}</Text>
              </View>
              <View style={styles.recordTimes}>
                <View style={styles.timeRow}>
                  <Ionicons name="log-in" size={12} color="#4CAF50" />
                  <Text style={styles.timeText}>
                    {formatTime(record.time_in)}
                  </Text>
                </View>
                <View style={styles.timeRow}>
                  <Ionicons name="log-out" size={12} color="#F44336" />
                  <Text style={styles.timeText}>
                    {formatTime(record.time_out)}
                  </Text>
                </View>
                {record.in_status ? (
                  <View style={[styles.statusPill, {
                    backgroundColor: getStatusColor(record.in_status) + '20'
                  }]}>
                    <Text style={[styles.statusPillText, {
                      color: getStatusColor(record.in_status)
                    }]}>
                      {record.in_status}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No attendance records</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Records will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attendance Detail</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedRecord ? (
              <ScrollView>
                <View style={styles.detailProfile}>
                  <View style={styles.detailAvatar}>
                    <Text style={styles.detailAvatarText}>
                      {getInitials(selectedRecord.teacher_name)}
                    </Text>
                  </View>
                  <Text style={styles.detailName}>{selectedRecord.teacher_name}</Text>
                  <Text style={styles.detailMeta}>
                    {selectedRecord.employee_id} • {selectedRecord.specialization}
                  </Text>
                  <Text style={styles.detailDate}>
                    {formatDate(selectedRecord.date)}
                  </Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailBox}>
                    <Ionicons name="log-in" size={24} color="#4CAF50" />
                    <Text style={styles.detailBoxLabel}>Time In</Text>
                    <Text style={styles.detailBoxValue}>
                      {formatTime(selectedRecord.time_in)}
                    </Text>
                    {selectedRecord.in_status ? (
                      <View style={[styles.statusPill, {
                        backgroundColor: getStatusColor(selectedRecord.in_status) + '20'
                      }]}>
                        <Text style={[styles.statusPillText, {
                          color: getStatusColor(selectedRecord.in_status)
                        }]}>
                          {selectedRecord.in_status}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.detailBox}>
                    <Ionicons name="log-out" size={24} color="#F44336" />
                    <Text style={styles.detailBoxLabel}>Time Out</Text>
                    <Text style={styles.detailBoxValue}>
                      {formatTime(selectedRecord.time_out)}
                    </Text>
                    {selectedRecord.out_status ? (
                      <View style={[styles.statusPill, {
                        backgroundColor: getStatusColor(selectedRecord.out_status) + '20'
                      }]}>
                        <Text style={[styles.statusPillText, {
                          color: getStatusColor(selectedRecord.out_status)
                        }]}>
                          {selectedRecord.out_status}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.statusPending}>Pending</Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
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
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },

  // Stats
  statsRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  statBox: {
    flex: 1, backgroundColor: colors.white, borderRadius: 10,
    padding: spacing.sm, borderLeftWidth: 4, elevation: 1,
  },
  statValue: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  statLabel: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },

  // Filters
  filterRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  filterChip: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 8,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.sizes.xs, color: colors.text },
  filterTextActive: { color: colors.white, fontWeight: typography.weights.semibold },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: 10,
    paddingHorizontal: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: {
    flex: 1, paddingVertical: spacing.sm,
    fontSize: typography.sizes.sm, color: colors.text,
  },

  // Record card
  recordCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 12,
    padding: spacing.md, marginBottom: spacing.sm, elevation: 2,
  },
  recordAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  recordAvatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  recordInfo: { flex: 1 },
  recordName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  recordMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  recordDate: { fontSize: typography.sizes.xs, color: '#999', marginTop: 2 },
  recordTimes: { alignItems: 'flex-end', gap: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: typography.sizes.xs, color: colors.text, fontWeight: typography.weights.medium },
  statusPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: 10, marginTop: 2,
  },
  statusPillText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  statusPending: { fontSize: typography.sizes.xs, color: '#999', fontStyle: 'italic' },

  // Empty
  emptyContainer: {
    alignItems: 'center', padding: spacing.xxxl,
    backgroundColor: colors.white, borderRadius: 16,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  emptySubtext: { fontSize: typography.sizes.sm, color: '#bbb', marginTop: spacing.xs },

  // Modal
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

  detailProfile: { alignItems: 'center', marginBottom: spacing.lg },
  detailAvatar: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailAvatarText: {
    fontSize: 24, fontWeight: typography.weights.bold, color: colors.white,
  },
  detailName: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  detailMeta: { fontSize: typography.sizes.sm, color: '#666', marginTop: 2 },
  detailDate: { fontSize: typography.sizes.xs, color: '#999', marginTop: 4 },

  detailGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  detailBox: {
    flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12,
    padding: spacing.md, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  detailBoxLabel: { fontSize: typography.sizes.xs, color: '#666', marginTop: 4 },
  detailBoxValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },

  closeBtn: {
    padding: spacing.md, borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center', marginBottom: spacing.md,
  },
  closeBtnText: { color: '#fff', fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});