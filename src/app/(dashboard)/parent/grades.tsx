import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Child = { id: string; full_name: string; grade_level: string; strand: string };
type SubjectGroup = {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  quarters: Record<number, number>;
  average: number;
  remarks: string;
};

export default function ParentGrades() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadChildren(); }, []);
  useEffect(() => { if (selectedChild) loadGrades(selectedChild); }, [selectedChild]);

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
        .select('id, first_name, last_name, grade_level, strand')
        .eq('parent_id', userData.id);

      if (kids && kids.length > 0) {
        const list = kids.map((k: any) => ({
          id: k.id,
          full_name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || 'Unknown',
          grade_level: k.grade_level || 'N/A',
          strand: k.strand || 'N/A',
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

  const loadGrades = async (child: Child) => {
    setLoading(true);
    try {
      const { data: gradesData } = await supabase
        .from('grades')
        .select('id, subject_id, quarter, grade, remarks')
        .eq('student_id', child.id);

      if (!gradesData || gradesData.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const subjectIds = [...new Set(gradesData.map((g: any) => g.subject_id).filter(Boolean))];
      const subjectMap: Record<string, any> = {};
      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code').in('id', subjectIds);
        (subs || []).forEach((s: any) => { subjectMap[s.id] = s; });
      }

      const grouped: Record<string, SubjectGroup> = {};
      gradesData.forEach((g: any) => {
        const sid = g.subject_id || 'no_subject';
        const sub = subjectMap[sid];
        if (!grouped[sid]) {
          grouped[sid] = {
            subject_id: sid,
            subject_name: sub?.name || 'Unknown Subject',
            subject_code: sub?.code || '',
            quarters: {},
            average: 0,
            remarks: '',
          };
        }
        grouped[sid].quarters[g.quarter] = g.grade;
      });

      const result = Object.values(grouped).map(g => {
        const values = Object.values(g.quarters);
        const avg = values.length > 0
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
          : 0;
        return { ...g, average: avg, remarks: avg >= 75 ? 'Passed' : 'Failed' };
      });

      result.sort((a, b) => a.subject_name.localeCompare(b.subject_name));
      setGroups(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = (g: number) => {
    if (g >= 90) return '#4CAF50';
    if (g >= 85) return '#8BC34A';
    if (g >= 75) return '#FF9800';
    return '#F44336';
  };

  if (loading && children.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading grades...</Text>
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
          <Text style={styles.title}>Grades</Text>
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
              <Text style={styles.childMeta}>
                Grade {selectedChild.grade_level}
                {selectedChild.strand !== 'N/A' ? ` • ${selectedChild.strand}` : ''}
              </Text>
            </View>
          </View>
        )}

        {groups.length > 0 ? (
          groups.map(g => {
            const isOpen = expanded === g.subject_id;
            const c = gradeColor(g.average);
            return (
              <View key={g.subject_id} style={styles.subjectCard}>
                <TouchableOpacity
                  style={styles.subjectHeader}
                  onPress={() => setExpanded(isOpen ? null : g.subject_id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{g.subject_name}</Text>
                    <Text style={styles.subjectCode}>{g.subject_code}</Text>
                  </View>
                  <View style={[styles.avgBadge, { backgroundColor: c + '20' }]}>
                    <Text style={[styles.avgText, { color: c }]}>{g.average}</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={20} color="#999" />
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.quartersContainer}>
                    {[1, 2, 3, 4].map(q => {
                      const val = g.quarters[q];
                      return (
                        <View key={q} style={styles.quarterRow}>
                          <Text style={styles.quarterLabel}>Quarter {q}</Text>
                          <Text style={[styles.quarterValue, { color: val ? gradeColor(val) : '#ccc' }]}>
                            {val ?? '—'}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={styles.remarksRow}>
                      <Text style={styles.remarksLabel}>Remarks</Text>
                      <Text style={[styles.remarksValue, { color: g.remarks === 'Passed' ? '#4CAF50' : '#F44336' }]}>
                        {g.remarks}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No grades available yet</Text>
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
  avgBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 10 },
  avgText: { fontSize: typography.sizes.md, fontWeight: 'bold' },

  quartersContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  quarterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quarterLabel: { fontSize: typography.sizes.sm, color: '#666' },
  quarterValue: { fontSize: typography.sizes.md, fontWeight: 'bold' },
  remarksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  remarksLabel: { fontSize: typography.sizes.sm, color: '#666' },
  remarksValue: { fontSize: typography.sizes.sm, fontWeight: 'bold' },

  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: 16,
  },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
});