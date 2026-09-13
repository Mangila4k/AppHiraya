import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  address: string;
  role: string;
};

export default function RegistrarProfile() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', email: '', contact_number: '', address: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) { setLoading(false); return; }

      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, contact_number, address')
        .eq('email', email).maybeSingle();

      if (!userData) { setLoading(false); return; }

      const profileData: Profile = {
        id: userData.id,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || email,
        contact_number: userData.contact_number || 'N/A',
        address: userData.address || 'N/A',
        role: userData.role || 'registrar',
      };

      setProfile(profileData);
      setEditForm({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        contact_number: profileData.contact_number === 'N/A' ? '' : profileData.contact_number,
        address: profileData.address === 'N/A' ? '' : profileData.address,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      Alert.alert('Error', 'First and last name are required'); return;
    }

    setSaving(true);
    try {
      const cleanEmail = editForm.email.trim().toLowerCase();

      const { error } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          email: cleanEmail,
          contact_number: editForm.contact_number.trim() || null,
          address: editForm.address.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) throw error;

      if (cleanEmail !== profile?.email) {
        await AsyncStorage.setItem('userEmail', cleanEmail);
      }

      Alert.alert('Success', 'Profile updated!');
      setEditModalVisible(false);
      await loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields'); return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match'); return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters'); return;
    }

    setChangingPassword(true);
    try {
      const { data: userData } = await supabase
        .from('users').select('password').eq('id', profile?.id).single();

      if (userData?.password !== passwordForm.currentPassword) {
        Alert.alert('Error', 'Current password is incorrect'); setChangingPassword(false); return;
      }

      const { error } = await supabase
        .from('users').update({ password: passwordForm.newPassword }).eq('id', profile?.id);

      if (error) throw error;

      Alert.alert('Success', 'Password changed!');
      setPasswordModalVisible(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('userEmail');
          if (signOut) await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initials = profile
    ? `${(profile.first_name || '').charAt(0)}${(profile.last_name || '').charAt(0)}`.toUpperCase() || 'R'
    : 'R';
  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || 'Registrar'
    : 'Registrar';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="clipboard" size={12} color={colors.primary} />
            <Text style={styles.roleText}>Registrar</Text>
          </View>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={16} color={colors.primary} /> Personal Information
            </Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
              <Ionicons name="create" size={16} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact Number</Text>
            <Text style={styles.infoValue}>{profile?.contact_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{profile?.address}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="settings" size={16} color={colors.primary} /> Account Actions
          </Text>

          <TouchableOpacity style={styles.actionBtn} onPress={() => setPasswordModalVisible(true)}>
            <Ionicons name="key" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}
            onPress={() => router.push('/(dashboard)/registrar')}>
            <Ionicons name="home" size={20} color="#4CAF50" />
            <Text style={styles.actionText}>Back to Dashboard</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.white} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Hiraya App v1.0.0</Text>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {[
                { label: 'First Name *', key: 'first_name' as const, keyboard: 'default' },
                { label: 'Last Name *', key: 'last_name' as const, keyboard: 'default' },
                { label: 'Email *', key: 'email' as const, keyboard: 'email-address' },
                { label: 'Contact Number', key: 'contact_number' as const, keyboard: 'phone-pad' },
              ].map(({ label, key, keyboard }) => (
                <View key={key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(editForm as any)[key]}
                    onChangeText={(text) => setEditForm({ ...editForm, [key]: text })}
                    placeholder={label.replace(' *', '')}
                    placeholderTextColor="#999"
                    keyboardType={keyboard as any}
                    autoCapitalize={key === 'email' ? 'none' : 'sentences'}
                  />
                </View>
              ))}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.address}
                  onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                  placeholder="Enter address"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdateProfile} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={colors.white} /> :
                    <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Password Modal */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {[
                { label: 'Current Password *', key: 'currentPassword' as const },
                { label: 'New Password *', key: 'newPassword' as const },
                { label: 'Confirm New Password *', key: 'confirmPassword' as const },
              ].map(({ label, key }) => (
                <View key={key} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(passwordForm as any)[key]}
                    onChangeText={(text) => setPasswordForm({ ...passwordForm, [key]: text })}
                    placeholder={label.replace(' *', '')}
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>
              ))}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setPasswordModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]}
                  onPress={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? <ActivityIndicator size="small" color={colors.white} /> :
                    <Text style={styles.saveButtonText}>Update</Text>}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.md, color: '#666', fontSize: typography.sizes.md },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  profileCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg,
    alignItems: 'center', marginBottom: spacing.md, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: typography.sizes.xxxl, fontWeight: 'bold', color: colors.primary },
  name: { fontSize: typography.sizes.xl, fontWeight: 'bold', color: colors.text },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '15', paddingHorizontal: spacing.md,
    paddingVertical: 4, borderRadius: 12, marginTop: spacing.sm,
  },
  roleText: { fontSize: typography.sizes.xs, fontWeight: '600', color: colors.primary },
  email: { fontSize: typography.sizes.sm, color: '#666', marginTop: spacing.sm },
  section: {
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    marginBottom: spacing.md, elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.text },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '10', paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, borderRadius: 8,
  },
  editButtonText: { color: colors.primary, fontSize: typography.sizes.sm, fontWeight: '500' },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: typography.sizes.sm, color: '#666' },
  infoValue: {
    fontSize: typography.sizes.sm, fontWeight: '500',
    color: colors.text, flex: 1, textAlign: 'right',
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: spacing.md,
  },
  actionText: { flex: 1, fontSize: typography.sizes.sm, color: colors.text, fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F44336', padding: spacing.md, borderRadius: 10,
    gap: spacing.sm, marginTop: spacing.sm,
  },
  logoutText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '600' },
  version: {
    textAlign: 'center', fontSize: typography.sizes.xs,
    color: '#999', marginTop: spacing.lg, marginBottom: spacing.xl,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: 'bold', color: colors.text },
  modalBody: { maxHeight: '90%' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: spacing.md, fontSize: typography.sizes.md,
    color: colors.text, backgroundColor: '#f9f9f9',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.md,
  },
  modalButton: { flex: 1, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5' },
  cancelButtonText: { color: colors.text, fontSize: typography.sizes.md, fontWeight: '500' },
  saveButton: { backgroundColor: colors.primary },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: '600' },
});