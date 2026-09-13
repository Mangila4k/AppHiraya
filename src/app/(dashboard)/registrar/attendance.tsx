import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

type SectionSummary = {
  section_id: string;
  section_name: string;
  grade_level: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  rate: number;
};

export default function RegistrarAttendance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summaries, setSummaries] = useState<SectionSummary[]>([]);
  const [calendarVisible, setCalendarVisible] = useState(false);

  useEffect(() => { loadAttendance(); }, [date]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const { data: sections } = await supabase
        .from('sections').select('id, name, grade_level').order('name');

      if (!sections || sections.length === 0) {
        setSummaries([]); setLoading(false); return;
      }

      const results: SectionSummary[] = await Promise.all(
        sections.map(async (sec: any) => {
          const { data: students } = await supabase
            .from('students').select('id').eq('section_id', sec.id);

          const studentIds = (students || []).map((s: any) => s.id);
          if (studentIds.length === 0) {
            return {
              section_id: sec.id, section_name: sec.name, grade_level: sec.grade_level,
              total_students: 0, present: 0, absent: 0, late: 0, rate: 0,
            };
          }

          const { data: att } = await supabase
            .from('attendance').select('status')
            .eq('date', date).in('student_id', studentIds);

          const present = (att || []).filter((a: any) => String(a.status).toLowerCase() === 'present').length;
          const absent = (att || []).filter((a: any) => String(a.status).toLowerCase() === 'absent').length;
          const late = (att || []).filter((a: any) => String(a.status).toLowerCase() === 'late').length;
          const total = att?.length || 0;

          return {
            section_id: sec.id, section_name: sec.name, grade_level: sec.grade_level,
            total_students: studentIds.length, present, absent, late,
            rate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
          };
        })
      );

      setSummaries(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const rateColor = (r: number) => {
    if (r >= 95) return '#4CAF50';
    if (r >= 85) return '#8BC34A';
    if (r >= 75) return '#FF9800';
    return '#F44336';
  };

  const changeDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (iso: string) => {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const goToToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setCalendarVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Attendance Coordination</Text>
          <TouchableOpacity onPress={loadAttendance} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Date Picker — tap center to open calendar */}
        <View style={styles.datePicker}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateCenter}
            onPress={() => setCalendarVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : summaries.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No sections found</Text>
          </View>
        ) : (
          <>
            <View style={styles.overallCard}>
              <Text style={styles.overallLabel}>Overall Attendance — {formatDate(date)}</Text>
              <View style={styles.overallStats}>
                <View style={styles.overallStat}>
                  <Text style={styles.overallNumber}>{summaries.reduce((s, x) => s + x.present, 0)}</Text>
                  <Text style={styles.overallLabel2}>Present</Text>
                </View>
                <View style={styles.overallStat}>
                  <Text style={styles.overallNumber}>{summaries.reduce((s, x) => s + x.absent, 0)}</Text>
                  <Text style={styles.overallLabel2}>Absent</Text>
                </View>
                <View style={styles.overallStat}>
                  <Text style={styles.overallNumber}>{summaries.reduce((s, x) => s + x.late, 0)}</Text>
                  <Text style={styles.overallLabel2}>Late</Text>
                </View>
              </View>
            </View>

            {summaries.map(s => (
              <View key={s.section_id} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionName}>{s.section_name}</Text>
                    <Text style={styles.sectionGrade}>Grade {s.grade_level}</Text>
                  </View>
                  <View style={[styles.rateBadge, { backgroundColor: rateColor(s.rate) + '20' }]}>
                    <Text style={[styles.rateText, { color: rateColor(s.rate) }]}>{s.rate}%</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>{s.present}</Text>
                    <Text style={styles.statLabel}>Present</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#F44336' }]}>{s.absent}</Text>
                    <Text style={styles.statLabel}>Absent</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#FF9800' }]}>{s.late}</Text>
                    <Text style={styles.statLabel}>Late</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: '#666' }]}>{s.total_students}</Text>
                    <Text style={styles.statLabel}>Enrolled</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a Date</Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Calendar
              current={date}
              maxDate={new Date().toISOString().split('T')[0]}
              onDayPress={(day) => {
                setDate(day.dateString);
                setCalendarVisible(false);
              }}
              markedDates={{
                [date]: {
                  selected: true,
                  selectedColor: colors.primary,
                  selectedTextColor: '#fff',
                },
              }}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.primary,
                dayTextColor: '#2d4150',
                textDisabledColor: '#d9e1e8',
                dotColor: colors.primary,
                selectedDotColor: '#ffffff',
                arrowColor: colors.primary,
                monthTextColor: colors.text,
                indicatorColor: colors.primary,
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
              enableSwipeMonths
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnOutline]}
                onPress={() => setCalendarVisible(false)}
              >
                <Text style={styles.modalBtnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary]}
                onPress={goToToday}
              >
                <Ionicons name="today" size={16} color="#fff" />
                <Text style={styles.modalBtnPrimaryText}>Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: 10,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    marginBottom: spacing.md, elevation: 2,
  },
  dateBtn: { padding: spacing.sm },
  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    marginHorizontal: spacing.sm,
  },
  dateText: { fontSize: typography.sizes.sm, fontWeight: '600', color: colors.text },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyBox: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },

  overallCard: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: spacing.md, marginBottom: spacing.md, elevation: 2,
  },
  overallLabel: { fontSize: typography.sizes.xs, color: colors.white, opacity: 0.9, marginBottom: spacing.md },
  overallStats: { flexDirection: 'row', justifyContent: 'space-around' },
  overallStat: { alignItems: 'center' },
  overallNumber: { fontSize: typography.sizes.xxl, fontWeight: 'bold', color: colors.white },
  overallLabel2: { fontSize: typography.sizes.xs, color: colors.white, opacity: 0.9, marginTop: 2 },

  sectionCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  sectionName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  sectionGrade: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  rateBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12 },
  rateText: { fontSize: typography.sizes.md, fontWeight: 'bold' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.sizes.lg, fontWeight: 'bold' },
  statLabel: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: colors.border },

  // Calendar modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  modalBtnOutline: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnOutlineText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: '500',
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary,
  },
  modalBtnPrimaryText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});