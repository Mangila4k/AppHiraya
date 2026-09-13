import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Student = {
  id: string;
  full_name: string;
  lrn: string;
  grade_level: string;
  strand: string;
  section_name: string;
};

export default function RegistrarReportCards() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('students')
        .select(`id, lrn, first_name, last_name, grade_level, strand,
          sections:section_id (name)`)
        .order('last_name');

      setStudents(
        (data || []).map((s: any) => ({
          id: s.id,
          full_name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          lrn: s.lrn || 'N/A',
          grade_level: s.grade_level || 'N/A',
          strand: s.strand || 'N/A',
          section_name: s.sections?.name || 'No Section',
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openReportCard = async (student: Student) => {
    setSelectedStudent(student);
    setModalVisible(true);
    setLoadingGrades(true);
    try {
      const { data: gradesData } = await supabase
        .from('grades')
        .select('id, subject_id, quarter, grade, remarks')
        .eq('student_id', student.id);

      const subjectIds = [...new Set((gradesData || []).map((g: any) => g.subject_id).filter(Boolean))];
      const subjectMap: Record<string, any> = {};
      if (subjectIds.length > 0) {
        const { data: subs } = await supabase
          .from('subjects').select('id, name, code').in('id', subjectIds);
        (subs || []).forEach((s: any) => { subjectMap[s.id] = s; });
      }

      const grouped: Record<string, any> = {};
      (gradesData || []).forEach((g: any) => {
        const sid = g.subject_id || 'no_subject';
        if (!grouped[sid]) {
          grouped[sid] = {
            subject_id: sid,
            subject_name: subjectMap[sid]?.name || 'Unknown',
            subject_code: subjectMap[sid]?.code || '',
            quarters: {},
            average: 0,
            remarks: '',
          };
        }
        grouped[sid].quarters[g.quarter] = g.grade;
      });

      const result = Object.values(grouped).map((g: any) => {
        const values = Object.values(g.quarters) as number[];
        const avg = values.length > 0
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
          : 0;
        return { ...g, average: avg, remarks: avg >= 75 ? 'Passed' : 'Failed' };
      });

      result.sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name));
      setGrades(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGrades(false);
    }
  };

  const gradeColor = (g: number) => {
    if (g >= 90) return '#4CAF50';
    if (g >= 85) return '#8BC34A';
    if (g >= 75) return '#FF9800';
    return '#F44336';
  };

  const filtered = students.filter(
    s =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: Student }) => (
    <TouchableOpacity style={styles.item} onPress={() => openReportCard(item)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemName}>{item.full_name}</Text>
        <Text style={styles.itemMeta}>LRN: {item.lrn}</Text>
        <Text style={styles.itemMeta}>
          Grade {item.grade_level}
          {item.strand !== 'N/A' ? ` • ${item.strand}` : ''} • {item.section_name}
        </Text>
      </View>
      <Ionicons name="document-text" size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Report Cards</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name or LRN..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
                <Ionicons name="document-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Card</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedStudent && (
                <View style={styles.studentInfo}>
                  <View style={styles.avatarLarge}>
                    <Text style={styles.avatarTextLarge}>
                      {selectedStudent.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.studentNameLarge}>{selectedStudent.full_name}</Text>
                  <Text style={styles.studentMetaLarge}>LRN: {selectedStudent.lrn}</Text>
                  <Text style={styles.studentMetaLarge}>
                    Grade {selectedStudent.grade_level}
                    {selectedStudent.strand !== 'N/A' ? ` • ${selectedStudent.strand}` : ''}
                  </Text>
                  <Text style={styles.studentMetaLarge}>{selectedStudent.section_name}</Text>
                </View>
              )}

              {loadingGrades ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : grades.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No grades recorded yet</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Grades by Subject</Text>
                  {grades.map(g => (
                    <View key={g.subject_id} style={styles.gradeCard}>
                      <Text style={styles.gradeSubject}>{g.subject_name}</Text>
                      <Text style={styles.gradeCode}>{g.subject_code}</Text>
                      <View style={styles.quartersGrid}>
                        {[1, 2, 3, 4].map(q => (
                          <View key={q} style={styles.quarterBox}>
                            <Text style={styles.quarterLabel}>Q{q}</Text>
                            <Text style={[styles.quarterValue,
                              { color: g.quarters[q] ? gradeColor(g.quarters[q]) : '#ccc' }]}>
                              {g.quarters[q] ?? '—'}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <View style={styles.avgRow}>
                        <Text style={styles.avgLabel}>Average</Text>
                        <Text style={[styles.avgValue, { color: gradeColor(g.average) }]}>{g.average}</Text>
                        <Text style={[styles.remarksText,
                          { color: g.remarks === 'Passed' ? '#4CAF50' : '#F44336' }]}>
                          {g.remarks}
                        </Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity
                style={styles.printBtn}
                onPress={() => Alert.alert('Info', 'Print/export feature requires PDF integration.')}
              >
                <Ionicons name="print" size={20} color={colors.white} />
                <Text style={styles.printBtnText}>Print Report Card</Text>
              </TouchableOpacity>
            </ScrollView>
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
  title: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md, gap: spacing.sm, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: typography.sizes.sm, color: colors.text },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  emptyBox: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm,
    gap: spacing.md, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.primary },
  itemName: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  itemMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },
  modalBody: { maxHeight: '90%' },
  studentInfo: {
    alignItems: 'center', paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: spacing.md,
  },
  avatarLarge: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarTextLarge: { fontSize: typography.sizes.xxl, fontWeight: 'bold', color: colors.primary },
  studentNameLarge: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },
  studentMetaLarge: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  gradeCard: {
    backgroundColor: '#fafafa', borderRadius: 10, padding: spacing.md,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: '#f0f0f0',
  },
  gradeSubject: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  gradeCode: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  quartersGrid: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  quarterBox: {
    flex: 1, backgroundColor: colors.white, borderRadius: 8,
    paddingVertical: spacing.sm, alignItems: 'center',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  quarterLabel: { fontSize: typography.sizes.xs, color: '#666' },
  quarterValue: { fontSize: typography.sizes.lg, fontWeight: 'bold', marginTop: 2 },
  avgRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing.sm, marginTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: '#e0e0e0',
  },
  avgLabel: { fontSize: typography.sizes.sm, color: '#666' },
  avgValue: { fontSize: typography.sizes.lg, fontWeight: 'bold', flex: 1, textAlign: 'right' },
  remarksText: { fontSize: typography.sizes.sm, fontWeight: '600', marginLeft: spacing.md },
  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: 10,
    gap: spacing.sm, marginTop: spacing.md,
  },
  printBtnText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '600' },
});