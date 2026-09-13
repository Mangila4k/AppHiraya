import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditTeacher() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_id: '',
    specialization: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (id) loadTeacher();
  }, [id]);

  const loadTeacher = async () => {
    setFetching(true);
    try {
      // 1. Query teachers table by id (teachers.id)
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          employee_id,
          specialization,
          phone,
          address,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (teacherError) {
        console.error('Teacher lookup error:', teacherError);
        throw teacherError;
      }

      if (!teacherData) {
        console.log('No teacher found with id:', id);
        setFetching(false);
        return;
      }

      const user = (teacherData as any).users;
      setUserId(teacherData.user_id);

      setForm({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        employee_id: teacherData.employee_id || '',
        specialization: teacherData.specialization || '',
        phone: teacherData.phone || '',
        address: teacherData.address || '',
      });
    } catch (error) {
      console.error('Error loading teacher:', error);
      Alert.alert('Error', 'Failed to load teacher');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!userId) {
      Alert.alert('Error', 'Cannot update — missing user ID');
      return;
    }

    setLoading(true);
    try {
      // 1. Update users table (via user_id)
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (userError) throw userError;

      // 2. Update teachers table (via teachers.id)
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          employee_id: form.employee_id.trim() || null,
          specialization: form.specialization.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (teacherError) throw teacherError;

      Alert.alert('Success', 'Teacher updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Update error:', error);
      Alert.alert('Error', error.message || 'Failed to update teacher');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading teacher...</Text>
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
          <Text style={styles.title}>Edit Teacher</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Teacher Information</Text>

          {/* Name */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor="#999"
                value={form.first_name}
                onChangeText={(text) => setForm({ ...form, first_name: text })}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor="#999"
                value={form.last_name}
                onChangeText={(text) => setForm({ ...form, last_name: text })}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Employee ID */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Employee ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., PLSNHS-TCH-502602"
              placeholderTextColor="#999"
              value={form.employee_id}
              onChangeText={(text) => setForm({ ...form, employee_id: text })}
            />
          </View>

          {/* Specialization */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Specialization</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mathematics, Science, English"
              placeholderTextColor="#999"
              value={form.specialization}
              onChangeText={(text) => setForm({ ...form, specialization: text })}
            />
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="09123456789"
              placeholderTextColor="#999"
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              keyboardType="phone-pad"
            />
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter address"
              placeholderTextColor="#999"
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
              multiline
              numberOfLines={2}
            />
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Ionicons name="save" size={20} color={colors.white} />
            <Text style={styles.submitText}>{loading ? 'Saving...' : 'Update Teacher'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  halfWidth: { flex: 1 },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text, marginBottom: spacing.xs },
  required: { color: colors.error },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.text,
    backgroundColor: colors.gray,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  submitText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});