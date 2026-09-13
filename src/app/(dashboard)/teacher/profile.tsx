import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TeacherProfile = {
  id: string;
  user_id: string;
  employee_id: string;
  specialization: string;
  phone: string;
  address: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
};

export default function TeacherProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    specialization: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        setLoading(false);
        return;
      }

      // 1. Get user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        console.error('User not found:', userError);
        setLoading(false);
        return;
      }

      // 2. Get teacher record
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (teacherError) {
        console.error('Teacher lookup error:', teacherError);
      }

      const profileData: TeacherProfile = {
        id: teacherData?.id || userData.id,
        user_id: userData.id,
        employee_id: teacherData?.employee_id || 'N/A',
        specialization: teacherData?.specialization || 'N/A',
        phone: teacherData?.phone || 'N/A',
        address: teacherData?.address || 'N/A',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        created_at: userData.created_at,
      };

      setProfile(profileData);
      setEditForm({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone === 'N/A' ? '' : profileData.phone,
        address: profileData.address === 'N/A' ? '' : profileData.address,
        specialization: profileData.specialization === 'N/A' ? '' : profileData.specialization,
      });
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setSaving(true);
    try {
      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.user_id);

      if (userError) throw userError;

      // Update teachers table (if teacher record exists)
      if (profile?.id && profile.id !== profile.user_id) {
        const { error: teacherError } = await supabase
          .from('teachers')
          .update({
            phone: editForm.phone.trim() || null,
            address: editForm.address.trim() || null,
            specialization: editForm.specialization.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (teacherError) throw teacherError;
      }

      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      await loadProfile();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('password')
        .eq('id', profile?.user_id)
        .single();

      if (userData?.password !== passwordForm.currentPassword) {
        Alert.alert('Error', 'Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ password: passwordForm.newPassword })
        .eq('id', profile?.user_id);

      if (error) throw error;

      Alert.alert('Success', 'Password changed successfully!');
      setPasswordModalVisible(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userEmail');
              router.replace('/(auth)/login');
            } catch {
              Alert.alert('Error', 'Failed to logout.');
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!profile) return 'T';
    return `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase() || 'T';
  };

  const getFullName = () => {
    if (!profile) return 'Teacher';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'Teacher';
  };

  const getSpecializationColor = (spec: string) => {
    switch (spec.toLowerCase()) {
      case 'science': return '#4CAF50';
      case 'english': return '#2196F3';
      case 'mathematics': return '#FF9800';
      case 'esp': return '#9C27B0';
      case 'filipino': return '#E91E63';
      default: return colors.primary;
    }
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

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No profile found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const specColor = getSpecializationColor(profile.specialization);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity onPress={loadProfile} style={styles.refreshButton}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: specColor }]}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.profileName}>{getFullName()}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: specColor + '20' }]}>
            <Ionicons name="briefcase" size={14} color={specColor} />
            <Text style={[styles.roleText, { color: specColor }]}>
              {profile.specialization}
            </Text>
          </View>
        </View>

        {/* Teacher Information */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Teacher Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
              <Ionicons name="create" size={16} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{profile.employee_id}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="briefcase" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Specialization</Text>
              <Text style={styles.infoValue}>{profile.specialization}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="mail" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{profile.address}</Text>
            </View>
          </View>

          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.changePasswordButton} onPress={() => setPasswordModalVisible(true)}>
          <Ionicons name="key" size={20} color={colors.primary} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.first_name}
                  onChangeText={(t) => setEditForm({ ...editForm, first_name: t })}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.last_name}
                  onChangeText={(t) => setEditForm({ ...editForm, last_name: t })}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Specialization</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.specialization}
                  onChangeText={(t) => setEditForm({ ...editForm, specialization: t })}
                  placeholder="e.g., Science, English, Mathematics"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.phone}
                  onChangeText={(t) => setEditForm({ ...editForm, phone: t })}
                  placeholder="09123456789"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editForm.address}
                  onChangeText={(t) => setEditForm({ ...editForm, address: t })}
                  placeholder="Enter address"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateProfile} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveButtonText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal animationType="slide" transparent visible={passwordModalVisible} onRequestClose={() => setPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.currentPassword}
                  onChangeText={(t) => setPasswordForm({ ...passwordForm, currentPassword: t })}
                  placeholder="Enter current password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.newPassword}
                  onChangeText={(t) => setPasswordForm({ ...passwordForm, newPassword: t })}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirmPassword}
                  onChangeText={(t) => setPasswordForm({ ...passwordForm, confirmPassword: t })}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setPasswordModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveButtonText}>Update</Text>}
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
  loadingText: { marginTop: spacing.md, fontSize: typography.sizes.md, color: '#666' },
  retryButton: {
    marginTop: spacing.md, backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8,
  },
  retryButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  refreshButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  profileCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 32, fontWeight: typography.weights.bold, color: colors.white },
  profileName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.md },
  profileEmail: { fontSize: typography.sizes.sm, color: '#666', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 20, marginTop: spacing.sm, gap: spacing.xs,
  },
  roleText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  infoCard: {
    backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8,
  },
  editButtonText: { color: colors.primary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  infoItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoContent: { flex: 1, marginLeft: spacing.md },
  infoLabel: { fontSize: typography.sizes.xs, color: '#666' },
  infoValue: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },
  changePasswordButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    gap: spacing.sm, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  changePasswordText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: typography.weights.medium },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: 12, padding: spacing.md,
    gap: spacing.sm, marginBottom: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  logoutText: { fontSize: typography.sizes.md, color: colors.error, fontWeight: typography.weights.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: spacing.lg, maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  modalBody: { maxHeight: '90%' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text, marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    padding: spacing.md, fontSize: typography.sizes.md,
    color: colors.text, backgroundColor: '#f9f9f9',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  modalButton: { flex: 1, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5' },
  cancelButtonText: { color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  saveButton: { backgroundColor: colors.primary },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});