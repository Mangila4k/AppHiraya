import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      // 1. Get email from AsyncStorage
      const email = await AsyncStorage.getItem('userEmail');
      console.log('📧 Email from storage:', email);

      if (!email) {
        Alert.alert('Not Logged In', 'Please log in again.');
        setLoading(false);
        return;
      }

      // 2. Get user record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle();

      console.log('👤 User data:', userData, 'Error:', userError);

      if (userError || !userData) {
        Alert.alert('Error', 'User account not found.');
        setLoading(false);
        return;
      }

      // 3. Get student record BY EMAIL (students table has no user_id column)
      const { data: studentRows, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, last_name, email')
        .eq('email', email)
        .limit(1);

      console.log('🎓 Student rows:', studentRows, 'Error:', studentError);

      if (studentError || !studentRows || studentRows.length === 0) {
        Alert.alert('Error', 'Student profile not found.');
        setLoading(false);
        return;
      }

      const studentData = studentRows[0];
      console.log('🎓 Using student.id =', studentData.id);

      // 4. Get attendance records for this student
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('id, date, status, remarks, subject_id, student_id')
        .eq('student_id', studentData.id)
        .order('date', { ascending: false });

      console.log('📥 Attendance from DB:', attendanceData);
      console.log('❌ Attendance error:', attendanceError);

      if (attendanceError) {
        Alert.alert('Error', `Failed to load attendance: ${attendanceError.message}`);
        setLoading(false);
        return;
      }

      if (!attendanceData || attendanceData.length === 0) {
        console.warn('⚠️ No attendance rows found for student_id:', studentData.id);
        setGroups([]);
        setLoading(false);
        return;
      }

      // 5. Get subject details
      const subjectIds = [...new Set(
        attendanceData.map((a: any) => a.subject_id).filter(Boolean)
      )];
      console.log('📚 Subject IDs found:', subjectIds);

      const subjectMap: Record<string, any> = {};
      if (subjectIds.length > 0) {
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('id, name, code, subject_type')
          .in('id', subjectIds);

        console.log('📖 Subjects data:', subjectsData, 'Error:', subjectsError);

        (subjectsData || []).forEach((s: any) => {
          subjectMap[s.id] = s;
        });
      }

      // 6. Group by subject
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

        // Normalize status: trim + lowercase
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

      const result: SubjectGroup[] = Object.values(grouped).map(g => ({
        ...g,
        attendanceRate: g.total > 0
          ? Math.round(((g.present + g.late) / g.total) * 100)
          : 0,
      }));

      result.sort((a, b) => {
        if (a.subject_id === 'no_subject') return 1;
        if (b.subject_id === 'no_subject') return -1;
        return a.subject_name.localeCompare(b.subject_name);
      });

      console.log('✅ Grouped attendance:', result);
      setGroups(result);

    } catch (e: any) {
      console.error('💥 Error loading attendance:', e);
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubject(prev => prev === subjectId ? null : subjectId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'late': return '#FF9800';
      case 'excused': return '#2196F3';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return 'checkmark-circle';
      case 'absent': return 'close-circle';
      case 'late': return 'time';
      case 'excused': return 'information-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 95) return '#4CAF50';
    if (rate >= 85) return '#8BC34A';
    if (rate >= 75) return '#FF9800';
    return '#F44336';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Core': return '#4CAF50';
      case 'Applied': return '#2196F3';
      case 'Specialized': return '#9C27B0';
      default: return '#666';
    }
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
          <Text style={styles.title}>My Attendance</Text>
          <TouchableOpacity onPress={loadAttendance} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Ionicons name="calendar" size={24} color={colors.primary} />
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

        {/* Per-subject groups */}
        {groups.length > 0 ? (
          groups.map(group => {
            const isExpanded = expandedSubject === group.subject_id;
            const rateColor = getRateColor(group.attendanceRate);
            const typeColor = getTypeColor(group.subject_type);

            return (
              <View key={group.subject_id} style={styles.subjectGroup}>
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => toggleSubject(group.subject_id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.subjectIcon, { backgroundColor: typeColor + '20' }]}>
                    <Ionicons name="book" size={20} color={typeColor} />
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
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>

                <View style={styles.subjectStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                      {group.present}
                    </Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#F44336' }]}>
                      {group.absent}
                    </Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FF9800' }]}>
                      {group.late}
                    </Text>
                    <Text style={styles.statLabel}>Late</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#666' }]}>
                      {group.total}
                    </Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>

                {isExpanded ? (
                  <View style={styles.recordsContainer}>
                    {group.records.map(record => (
                      <View key={record.id} style={styles.recordItem}>
                        <View style={[
                          styles.recordIcon,
                          { backgroundColor: getStatusColor(record.status) + '20' }
                        ]}>
                          <Ionicons
                            name={getStatusIcon(record.status) as any}
                            size={16}
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
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(record.status) + '20' }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: getStatusColor(record.status) }
                          ]}>
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
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No attendance records yet</Text>
            <Text style={styles.emptySubtext}>
              Your attendance will appear here once teachers mark you present.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAttendance}>
              <Ionicons name="refresh" size={16} color={colors.white} />
              <Text style={styles.retryButtonText}>Refresh</Text>
            </TouchableOpacity>
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
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  summaryLabel: { fontSize: typography.sizes.xs, color: '#666' },
  summaryValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: 2,
  },

  subjectGroup: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
    elevation: 2,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  subjectCode: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  rateBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: spacing.xs,
  },
  rateText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },

  subjectStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#fafafa',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },

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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordDate: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  recordRemarks: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },

  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: typography.sizes.md,
    color: '#999',
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: '#ccc',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
  },
});