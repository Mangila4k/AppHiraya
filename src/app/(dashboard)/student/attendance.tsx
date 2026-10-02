import ChatbotFab from '@/components/ChatbotFab';
import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RawAttendance = {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks: string;
  subject_id: string | null;
};

type SubjectGroup = {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  subject_type: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendanceRate: number;
  records: RawAttendance[];
};

const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
};

export default function StudentAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        Alert.alert('Not Logged In', 'Please log in again.');
        setLoading(false);
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();

      if (userError || !userData) {
        Alert.alert('Error', 'User account not found.');
        setLoading(false);
        return;
      }

      const { data: studentRows, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email')
        .eq('email', email)
        .limit(1);

      if (studentError || !studentRows || studentRows.length === 0) {
        Alert.alert('Error', 'Student profile not found.');
        setLoading(false);
        return;
      }

      const studentData = studentRows[0];

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, date, status, remarks, subject_id, student_id')
        .eq('student_id', studentData.id)
        .order('date', { ascending: false });

      if (attendanceError) {
        Alert.alert('Error', `Failed to load attendance: ${attendanceError.message}`);
        setLoading(false);
        return;
      }

      if (!attendanceData || attendanceData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const subjectIds = [
        ...new Set(attendanceData.map((a: any) => a.subject_id).filter(Boolean)),
      ];

      const subjectMap: Record<string, any> = {};
      if (subjectIds.length > 0) {
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('id, name, code, subject_type')
          .in('id', subjectIds);

        (subjectsData || []).forEach((s: any) => {
          subjectMap[s.id] = s;
        });
      }

      const grouped: Record<string, SubjectGroup> = {};

      attendanceData.forEach((a: any) => {
        const subjectId = a.subject_id || 'no_subject';
        const subject = subjectMap[subjectId];
        const subjectName = subject?.name || 'General Attendance';
        const subjectCode = subject?.code || '';
        const subjectType = subject?.subject_type || '';

        if (!grouped[subjectId]) {
          grouped[subjectId] = {
            subject_id: subjectId,
            subject_name: subjectName,
            subject_code: subjectCode,
            subject_type: subjectType,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            total: 0,
            attendanceRate: 0,
            records: [],
          };
        }

        const normalizedStatus = String(a.status || '')
          .trim()
          .toLowerCase() as 'present' | 'absent' | 'late' | 'excused';

        const record: RawAttendance = {
          id: a.id,
          date: a.date,
          status: normalizedStatus,
          remarks: a.remarks || '',
          subject_id: a.subject_id,
        };

        grouped[subjectId].records.push(record);
        grouped[subjectId].total++;

        if (normalizedStatus === 'present') grouped[subjectId].present++;
        else if (normalizedStatus === 'absent') grouped[subjectId].absent++;
        else if (normalizedStatus === 'late') grouped[subjectId].late++;
        else if (normalizedStatus === 'excused') grouped[subjectId].excused++;
      });

      const result: SubjectGroup[] = Object.values(grouped).map((g) => ({
        ...g,
        attendanceRate:
          g.total > 0 ? Math.round(((g.present + g.late) / g.total) * 100) : 0,
      }));

      result.sort((a, b) => {
        if (a.subject_id === 'no_subject') return 1;
        if (b.subject_id === 'no_subject') return -1;
        return a.subject_name.localeCompare(b.subject_name);
      });

      setGroups(result);
    } catch (e: any) {
      console.error('Error loading attendance:', e);
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubject((prev) => (prev === subjectId ? null : subjectId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return '#22C55E';
      case 'absent':
        return '#EF4444';
      case 'late':
        return '#F59E0B';
      case 'excused':
        return '#3B82F6';
      default:
        return NEU.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return 'checkmark-circle';
      case 'absent':
        return 'close-circle';
      case 'late':
        return 'time';
      case 'excused':
        return 'information-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 95) return '#22C55E';
    if (rate >= 85) return '#84CC16';
    if (rate >= 75) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color={NEU.accent} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={NEU.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Attendance</Text>
          <TouchableOpacity onPress={loadAttendance} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={NEU.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar" size={20} color={NEU.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.summaryLabel}>Total Subjects</Text>
            <Text style={styles.summaryValue}>{groups.length}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>Total Days</Text>
            <Text style={styles.summaryValue}>
              {groups.reduce((sum, g) => sum + g.total, 0)}
            </Text>
          </View>
        </View>

        {groups.length > 0 ? (
          groups.map((group) => {
            const isExpanded = expandedSubject === group.subject_id;
            const rateColor = getRateColor(group.attendanceRate);

            return (
              <View key={group.subject_id} style={styles.subjectGroup}>
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => toggleSubject(group.subject_id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.subjectIcon}>
                    <Ionicons name="book" size={18} color={NEU.accent} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{group.subject_name}</Text>
                    {group.subject_code ? (
                      <Text style={styles.subjectCode}>
                        {group.subject_code}
                        {group.subject_type ? ` • ${group.subject_type}` : ''}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.rateBadge, { backgroundColor: rateColor + '20' }]}>
                    <Text style={[styles.rateText, { color: rateColor }]}>
                      {group.attendanceRate}%
                    </Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={18}
                    color={NEU.textMuted}
                  />
                </TouchableOpacity>

                <View style={styles.subjectStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#22C55E' }]}>{group.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{group.absent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>{group.late}</Text>
                    <Text style={styles.statLabel}>Late</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: NEU.text }]}>{group.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>

                {isExpanded ? (
                  <View style={styles.recordsContainer}>
                    {group.records.map((record) => (
                      <View key={record.id} style={styles.recordItem}>
                        <View
                          style={[
                            styles.recordIcon,
                            { backgroundColor: getStatusColor(record.status) + '20' },
                          ]}
                        >
                          <Ionicons
                            name={getStatusIcon(record.status) as any}
                            size={14}
                            color={getStatusColor(record.status)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.recordDate}>
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                          {record.remarks ? (
                            <Text style={styles.recordRemarks}>{record.remarks}</Text>
                          ) : null}
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: getStatusColor(record.status) + '20' },
                          ]}
                        >
                          <Text
                            style={[styles.statusText, { color: getStatusColor(record.status) }]}
                          >
                            {getStatusLabel(record.status)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={44} color={NEU.textFaint} />
            <Text style={styles.emptyText}>No attendance records yet</Text>
            <Text style={styles.emptySubtext}>
              Your attendance will appear here once teachers mark you present.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAttendance}>
              <Ionicons name="refresh" size={16} color={NEU.accent} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <ChatbotFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOrb: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: NEU.text },

  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, borderRadius: 20,
    padding: spacing.md, marginBottom: spacing.md,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  summaryIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  summaryLabel: { fontSize: typography.sizes.xs, color: NEU.textMuted },
  summaryValue: {
    fontSize: typography.sizes.xl, fontWeight: '800', color: NEU.text, marginTop: 2,
  },

  subjectGroup: {
    backgroundColor: NEU.bg, borderRadius: 20,
    marginBottom: spacing.md, overflow: 'hidden',
    shadowColor: NEU.darkShadow, shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  subjectHeader: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, gap: spacing.sm,
  },
  subjectIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  subjectName: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  subjectCode: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },
  rateBadge: {
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: 10, marginRight: spacing.xs,
  },
  rateText: { fontSize: typography.sizes.sm, fontWeight: '700' },

  subjectStats: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: NEU.bgDark,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes.lg, fontWeight: '800' },
  statLabel: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: NEU.bgDark, opacity: 0.6 },

  recordsContainer: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    borderTopWidth: 1, borderTopColor: NEU.bgDark,
  },
  recordItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(209,217,230,0.5)',
    gap: spacing.sm,
  },
  recordIcon: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  recordDate: { fontSize: typography.sizes.sm, fontWeight: '600', color: NEU.text },
  recordRemarks: { fontSize: typography.sizes.xs, color: NEU.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: typography.sizes.xs, fontWeight: '600' },

  emptyContainer: {
    alignItems: 'center', padding: spacing.xxxl,
    backgroundColor: NEU.bg, borderRadius: 20,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  emptyText: {
    fontSize: typography.sizes.md, color: NEU.textMuted,
    marginTop: spacing.md, fontWeight: '600',
  },
  emptySubtext: {
    fontSize: typography.sizes.sm, color: NEU.textFaint,
    textAlign: 'center', marginTop: spacing.xs,
  },
  retryButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: NEU.bg, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: 12, marginTop: spacing.md, gap: spacing.xs,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  retryButtonText: { color: NEU.accent, fontSize: typography.sizes.sm, fontWeight: '700' },
});