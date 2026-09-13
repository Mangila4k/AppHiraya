import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Transfer = {
  id: string;
  student_id: string;
  student_name: string;
  lrn: string;
  type: 'incoming' | 'outgoing';
  from_school: string;
  to_school: string;
  reason: string;
  status: string;
  requested_date: string;
};

export default function RegistrarTransfers() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [newTransfer, setNewTransfer] = useState({
    student_id: '',
    type: 'incoming' as 'incoming' | 'outgoing',
    from_school: '',
    to_school: '',
    reason: '',
  });

  useEffect(() => { loadTransfers(); loadStudents(); }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('students').select('id, first_name, last_name, lrn').order('last_name');
    setStudents(data || []);
  };

  const loadTransfers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          id, type, from_school, to_school, reason, status, requested_date,
          students:student_id (id, lrn, first_name, last_name)
        `)
        .order('requested_date', { ascending: false });

      if (error) {
        // Table missing — show empty
        setTransfers([]);
        setLoading(false);
        return;
      }

      const formatted: Transfer[] = (data || []).map((t: any) => {
        const s = t.students;
        return {
          id: t.id,
          student_id: s?.id || '',
          student_name: s ? `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
          lrn: s?.lrn || 'N/A',
          type: t.type || 'incoming',
          from_school: t.from_school || 'N/A',
          to_school: t.to_school || 'N/A',
          reason: t.reason || 'N/A',
          status: t.status || 'Pending',
          requested_date: t.requested_date ? new Date(t.requested_date).toLocaleDateString() : 'N/A',
        };
      });

      setTransfers(formatted);
    } catch (e) {
      console.error(e);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    if (!newTransfer.student_id) { Alert.alert('Error', 'Please select a student'); return; }
    if (!newTransfer.from_school.trim() || !newTransfer.to_school.trim()) {
      Alert.alert('Error', 'From and To school are required'); return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('transfers').insert({
        student_id: newTransfer.student_id,
        type: newTransfer.type,
        from_school: newTransfer.from_school.trim(),
        to_school: newTransfer.to_school.trim(),
        reason: newTransfer.reason.trim() || null,
        status: 'Pending',
        requested_date: new Date().toISOString(),
      });

      if (error) throw error;
      Alert.alert('Success', 'Transfer request created!');
      setModalVisible(false);
      setNewTransfer({ student_id: '', type: 'incoming', from_school: '', to_school: '', reason: '' });
      loadTransfers();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateTransferStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('transfers').update({ status }).eq('id', id);
    if (error) { Alert.alert('Error', error.message); return; }
    loadTransfers();
  };

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return '#4CAF50';
    if (status === 'Completed') return '#2196F3';
    if (status === 'Pending') return '#FF9800';
    if (status === 'Rejected') return '#F44336';
    return '#999';
  };

  const filtered = transfers.filter(t => filter === 'all' || t.type === filter);

  const renderItem = ({ item }: { item: Transfer }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === 'incoming' ? '#2196F3' + '20' : '#FF9800' + '20' }]}>
          <Ionicons
            name={item.type === 'incoming' ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={14}
            color={item.type === 'incoming' ? '#2196F3' : '#FF9800'}
          />
          <Text style={[styles.typeText, { color: item.type === 'incoming' ? '#2196F3' : '#FF9800' }]}>
            {item.type.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.itemName}>{item.student_name}</Text>
      <Text style={styles.itemMeta}>LRN: {item.lrn}</Text>

      <View style={styles.transferInfo}>
        <View style={styles.transferRow}>
          <Ionicons name="business" size={14} color="#666" />
          <Text style={styles.transferText}>From: {item.from_school}</Text>
        </View>
        <View style={styles.transferRow}>
          <Ionicons name="business" size={14} color="#666" />
          <Text style={styles.transferText}>To: {item.to_school}</Text>
        </View>
        {item.reason !== 'N/A' && (
          <View style={styles.transferRow}>
            <Ionicons name="information-circle" size={14} color="#666" />
            <Text style={styles.transferText}>Reason: {item.reason}</Text>
          </View>
        )}
      </View>

      <Text style={styles.dateText}>Requested: {item.requested_date}</Text>

      {item.status === 'Pending' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
            onPress={() => updateTransferStatus(item.id, 'Approved')}>
            <Text style={styles.actionBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F44336' }]}
            onPress={() => updateTransferStatus(item.id, 'Rejected')}>
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
          <Text style={styles.title}>School Transfers</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'incoming', 'outgoing'] as const).map(f => (
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
                <Ionicons name="swap-horizontal-outline" size={50} color="#ccc" />
                <Text style={styles.emptyText}>No transfers recorded</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Transfer Request</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Transfer Type *</Text>
              <View style={styles.typeToggle}>
                {(['incoming', 'outgoing'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, newTransfer.type === t && styles.typeOptionActive]}
                    onPress={() => setNewTransfer({ ...newTransfer, type: t })}
                  >
                    <Text style={[styles.typeOptionText, newTransfer.type === t && styles.typeOptionTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Student *</Text>
                <ScrollView style={styles.studentPicker} nestedScrollEnabled>
                  {students.map(s => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.studentOption, newTransfer.student_id === s.id && styles.studentOptionActive]}
                      onPress={() => setNewTransfer({ ...newTransfer, student_id: s.id })}
                    >
                      <Text style={[styles.studentOptionText, newTransfer.student_id === s.id && styles.studentOptionTextActive]}>
                        {s.first_name} {s.last_name} • LRN: {s.lrn || 'N/A'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>From School *</Text>
                <TextInput
                  style={styles.input}
                  value={newTransfer.from_school}
                  onChangeText={text => setNewTransfer({ ...newTransfer, from_school: text })}
                  placeholder="Enter school name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>To School *</Text>
                <TextInput
                  style={styles.input}
                  value={newTransfer.to_school}
                  onChangeText={text => setNewTransfer({ ...newTransfer, to_school: text })}
                  placeholder="Enter school name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reason</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newTransfer.reason}
                  onChangeText={text => setNewTransfer({ ...newTransfer, reason: text })}
                  placeholder="Reason for transfer"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreateTransfer} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={colors.white} /> :
                    <Text style={styles.saveButtonText}>Create</Text>}
                </TouchableOpacity>
              </View>
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
  addButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: typography.sizes.xs, color: '#666' },
  filterTextActive: { color: colors.white, fontWeight: '600' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { alignItems: 'center', padding: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.md, color: '#999', marginTop: spacing.md },
  item: { backgroundColor: colors.white, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, elevation: 2 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 8,
  },
  typeText: { fontSize: typography.sizes.xs, fontWeight: '700' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: typography.sizes.xs, fontWeight: '600' },
  itemName: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, color: colors.text },
  itemMeta: { fontSize: typography.sizes.xs, color: '#666', marginTop: 2 },
  transferInfo: { marginTop: spacing.sm, gap: 4 },
  transferRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  transferText: { fontSize: typography.sizes.xs, color: '#666', flex: 1 },
  dateText: { fontSize: typography.sizes.xs, color: '#999', marginTop: spacing.sm, fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: colors.white, fontSize: typography.sizes.sm, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },
  modalBody: { maxHeight: '90%' },
  typeToggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeOption: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: colors.border,
  },
  typeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeOptionText: { fontSize: typography.sizes.sm, color: '#666' },
  typeOptionTextActive: { color: colors.white, fontWeight: '600' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md,
    fontSize: typography.sizes.md, color: colors.text, backgroundColor: '#f9f9f9',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  studentPicker: {
    maxHeight: 150, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, backgroundColor: '#f9f9f9',
  },
  studentOption: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  studentOptionActive: { backgroundColor: colors.primary + '15' },
  studentOptionText: { fontSize: typography.sizes.sm, color: '#666' },
  studentOptionTextActive: { color: colors.primary, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalButton: { flex: 1, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5' },
  cancelButtonText: { color: colors.text, fontSize: typography.sizes.md, fontWeight: '500' },
  saveButton: { backgroundColor: colors.primary },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '600' },
});