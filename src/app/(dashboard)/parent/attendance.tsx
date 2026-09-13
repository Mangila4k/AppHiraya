import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Child = { id: string; full_name: string; grade_level: string };
type RawAttendance = {
  id: string;
  date: string;
  status: string;
  remarks: string;
  subject_id: string | null;
};
type SubjectGroup = {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  present: number;
  absent: number;
  late: number;
  total: number;
  rate: number;
  records: RawAttendance[];
};

export default function ParentAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadChildren(); }, []);
  useEffect(() => { if (selectedChild) loadAttendance(selectedChild); }, [selectedChild]);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from('users').select('id').eq('email', email).maybeSingle();
      if (!userData) { setLoading(false); return; }

      const { data: kids } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level')
        .eq('parent_id', userData.id);

      if (kids && kids.length > 0) {
        const list = kids.map((k: any) => ({
          id: k.id,
          full_name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || 'Unknown',
          grade_level: k.grade_level || 'N/A',
        }));
        setChildren(list);
        setSelectedChild(list[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (child: Child) => {
    setLoading(true);
    try {
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id, date, status, remarks, subject_id')
        .eq('student_id', child.id)
        .order('date', { ascending: false });

      if (!attendanceData || attendanceData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const subjectIds = [...new Set(attendanceData.map((a: any) => a.subject_id).filter(Boolean))];
      const subjectMap: Record<string, any> = {};
      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code').in('id', subjectIds);
        (subs || []).forEach((s: any) => { subjectMap[s.id] = s; });
      }

      const grouped: Record<string, SubjectGroup> = {};
      attendanceData.forEach((a: any) => {
        const sid = a.subject_id || 'no_subject';
        const sub = subjectMap[sid];
        if (!grouped[sid]) {
          grouped[sid] = {
            subject_id: sid,
            subject_name: sub?.name || 'General Attendance',
            subject_code: sub?.code || '',
            present: 0, absent: 0, late: 0, total: 0, rate: 0, records: [],
          };
        }
        const st = String(a.status || '').toLowerCase();
        grouped[sid].records.push({
          id: a.id, date: a.date, status: st,
          remarks: a.remarks || '', subject_id: a.subject_id,
        });
        grouped[sid].total++;
        if (st === 'present') grouped[sid].present++;
        else if (st === 'absent') grouped[sid].absent++;
        else if (st === 'late') grouped[sid].late++;
      });

      const result = Object.values(grouped).map(g => ({
        ...g,
        rate: g.total > 0 ? Math.round(((g.present + g.late) / g.total) * 100) : 0,
      }));

      result.sort((a, b) => {
        if (a.subject_id === 'no_subject') return 1;
        if (b.subject_id === 'no_subject') return -1;
        return a.subject_name.localeCompare(b.subject_name);
      });

      setGroups(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'present') return '#4CAF50';
    if (s === 'absent') return '#F44336';
    if (s === 'late') return '#FF9800';
    if (s === 'excused') return '#2196F3';
    return '#999';
  };

  const rateColor = (r: number) => {
    if (r >= 95) return '#4CAF50';
    if (r >= 85) return '#8BC34A';
    if (r >= 75) return '#FF9800';
    return '#F44336';
  };

  if (loading && children.length === 0) {
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
          <Text style={styles.title}>Attendance</Text>
          <View style={{ width: 40 }} />
        </View>

        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childPicker}>
            {children.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.childChip, selectedChild?.id === c.id && styles.childChipActive]}
                onPress={() => setSelectedChild(c)}
              >
                <Text style={[styles.childChipText, selectedChild?.id === c.id && styles.childChipTextActive]}>
                  {c.full_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedChild && (
          <View style={styles.childInfoCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{selectedChild.full_name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.childName}>{selectedChild.full_name}</Text>
              <Text style={styles.childMeta}>Grade {selectedChild.grade_level}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.smallLabel}>Subjects</Text>
              <Text style={styles.smallValue}>{groups.length}</Text>
            </View>
          </View>
        )}

        {groups.length > 0 ? (
          groups.map(g => {
            const isOpen = expanded === g.subject_id;
            const rc = rateColor(g.rate);
            return (
              <View key={g.subject_id} style={styles.subjectCard}>
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => setExpanded(isOpen ? null : g.subject_id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{g.subject_name}</Text>
                    {g.subject_code ? <Text style={styles.subjectCode}>{g.subject_code}</Text> : null}
                  </View>
                  <View style={[styles.rateBadge, { backgroundColor: rc + '20' }]}>
                    <Text style={[styles.rateText, { color: rc }]}>{g.rate}%</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{g.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#F44336' }]}>{g.absent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FF9800' }]}>{g.late}</Text>
                    <Text style={styles.statLabel}>Late</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#666' }]}>{g.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.recordsContainer}>
                    {g.records.map(r => (
                      <View key={r.id} style={styles.recordItem}>
                        <View style={[styles.recordIcon, { backgroundColor: statusColor(r.status) + '20' }]}>
                          <Ionicons
                            name={
                              r.status === 'present' ? 'checkmark-circle'
                              : r.status === 'absent' ? 'close-circle'
                              : r.status === 'late' ? 'time'
                              : 'information-circle'
                            }
                            size={16}
                            color={statusColor(r.status)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recordDate}>
                            {new Date(r.date).toLocaleDateString('en-US', {
                              weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </Text>
                          {r.remarks ? <Text style={styles.recordRemarks}>{r.remarks}</Text> : null}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor(r.status) + '20' }]}>
                          <Text style={[styles.statusText, { color: statusColor(r.status) }]}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },

  childPicker: { marginBottom: spacing.sm },
  childChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  childChipText: { fontSize: typography.sizes.sm, color: '#666' },
  childChipTextActive: { color: '#fff', fontWeight: '600' },

  childInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
    gap: spacing.md,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.primary },
  childName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  childMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  smallLabel: { fontSize: typography.sizes.xs, color: '#666' },
  smallValue: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },

  subjectCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  subjectName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  subjectCode: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  rateBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 10 },
  rateText: { fontSize: typography.sizes.md, fontWeight: 'bold' },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fafafa',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes.lg, fontWeight: 'bold' },
  statLabel: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },

  recordsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  recordIcon: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  recordDate: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  recordRemarks: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },

  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
});