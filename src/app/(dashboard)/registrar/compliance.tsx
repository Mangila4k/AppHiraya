import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ComplianceReport = {
  id: string;
  report_type: string;
  period: string;
  due_date: string;
  status: 'Pending' | 'Submitted' | 'Approved' | 'Overdue';
  submitted_date: string | null;
  notes: string;
};

const TEMPLATE_REPORTS = [
  { report_type: 'Enrollment Summary', period: 'Monthly', icon: 'people' },
  { report_type: 'Attendance Report', period: 'Monthly', icon: 'calendar' },
  { report_type: 'Student Transfer Report', period: 'Quarterly', icon: 'swap-horizontal' },
  { report_type: 'Dropout Report', period: 'Quarterly', icon: 'warning' },
  { report_type: 'Grade Level Report', period: 'Quarterly', icon: 'school' },
  { report_type: 'Faculty & Staff Report', period: 'Yearly', icon: 'briefcase' },
  { report_type: 'Facilities Report', period: 'Yearly', icon: 'business' },
  { report_type: 'Annual Statistical Report', period: 'Yearly', icon: 'stats-chart' },
];

export default function RegistrarCompliance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ComplianceReport[]>([]);

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('compliance_reports').select('*').order('due_date', { ascending: true });

      if (error) {
        setReports(
          TEMPLATE_REPORTS.map((t, i) => ({
            id: `template-${i}`,
            report_type: t.report_type,
            period: t.period,
            due_date: new Date(Date.now() + (i + 1) * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'Pending',
            submitted_date: null,
            notes: '',
          }))
        );
        setLoading(false);
        return;
      }

      setReports(
        (data || []).map((r: any) => ({
          id: r.id,
          report_type: r.report_type || 'Report',
          period: r.period || 'N/A',
          due_date: r.due_date || 'N/A',
          status: r.status || 'Pending',
          submitted_date: r.submitted_date || null,
          notes: r.notes || '',
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markSubmitted = (report: ComplianceReport) => {
    Alert.alert('Mark as Submitted', `Mark "${report.report_type}" as submitted?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          if (report.id.startsWith('template-')) {
            Alert.alert('Info', 'This is a template report. Create the "compliance_reports" table to save status.');
            return;
          }
          const { error } = await supabase
            .from('compliance_reports')
            .update({ status: 'Submitted', submitted_date: new Date().toISOString().split('T')[0] })
            .eq('id', report.id);

          if (error) { Alert.alert('Error', error.message); return; }
          loadReports();
        },
      },
    ]);
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return '#4CAF50';
    if (status === 'Submitted') return '#2196F3';
    if (status === 'Pending') return '#FF9800';
    if (status === 'Overdue') return '#F44336';
    return '#999';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>District & State Compliance</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Track mandatory reports submitted to the district and state education offices.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          reports.map(r => (
            <View key={r.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportIcon}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>{r.report_type}</Text>
                  <Text style={styles.reportMeta}>Period: {r.period}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getStatusColor(r.status) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getStatusColor(r.status) }]}>{r.status}</Text>
                </View>
              </View>

              <View style={styles.datesRow}>
                <View style={styles.dateItem}>
                  <Ionicons name="calendar" size={14} color="#666" />
                  <Text style={styles.dateText}>Due: {r.due_date}</Text>
                </View>
                {r.submitted_date && (
                  <View style={styles.dateItem}>
                    <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                    <Text style={styles.dateText}>Submitted: {r.submitted_date}</Text>
                  </View>
                )}
              </View>

              {r.status === 'Pending' && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => markSubmitted(r)}>
                  <Ionicons name="cloud-upload" size={16} color={colors.white} />
                  <Text style={styles.submitBtnText}>Mark as Submitted</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
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
  title: {
    fontSize: typography.sizes.lg, fontWeight: typography.weights.bold,
    color: colors.text, flex: 1, textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '10',
    borderRadius: 10, padding: spacing.md, marginBottom: spacing.md, gap: spacing.md,
  },
  infoText: { flex: 1, fontSize: typography.sizes.xs, color: colors.primary, lineHeight: 18 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  reportCard: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.sm, elevation: 2,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  reportIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  reportTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  reportMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  datesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
    paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: typography.sizes.xs, color: '#666' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: spacing.sm,
    borderRadius: 8, marginTop: spacing.md, gap: spacing.sm,
  },
  submitBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '600' },
});