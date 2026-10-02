import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { logLogout, logMyActivity } from '@/services/activityLog';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UserProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  created_at: string;
};

export default function AdminProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    getLoggedInUser();
  }, []);

  const getLoggedInUser = async () => {
    try {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) {
        setUserEmail(email);
        fetchUserProfile(email);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
          fetchUserProfile(user.email);
        } else {
          setFetching(false);
        }
      }
    } catch (error) {
      console.error('Error getting logged in user:', error);
      setFetching(false);
    }
  };

  const fetchUserProfile = async (email: string) => {
    setFetching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        setFetching(false);
        return;
      }

      if (data) {
        setProfile({
          id: data.id,
          email: data.email,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          role: data.role || 'User',
          phone: data.phone || 'N/A',
          created_at: data.created_at,
        });
        setEditForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      Alert.alert('Error', 'First name and last name are required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          phone: editForm.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) throw error;

      if (editForm.email !== profile?.email) {
        await AsyncStorage.setItem('userEmail', editForm.email.trim().toLowerCase());
        await supabase
          .from('users')
          .update({ email: editForm.email.trim().toLowerCase() })
          .eq('id', profile?.id);
      }

      await logMyActivity(
        'profile_updated',
        '✏️ Profile Updated',
        'Your personal information was updated.',
        { screen: '/admin/profile' }
      );

      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      await fetchUserProfile(editForm.email.trim().toLowerCase());
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
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
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('password')
        .eq('id', profile?.id)
        .single();

      if (userError) throw userError;

      if (userData.password !== passwordForm.currentPassword) {
        Alert.alert('Error', 'Current password is incorrect');
        setChangingPassword(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ password: passwordForm.newPassword })
        .eq('id', profile?.id);

      if (error) throw error;

      await logMyActivity(
        'password_changed',
        '🔒 Password Changed',
        'Your account password was changed.',
        { screen: '/admin/profile' }
      );

      Alert.alert('Success', 'Password changed successfully!');
      setPasswordModalVisible(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await logLogout();
            await AsyncStorage.removeItem('userEmail');
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const getInitials = () => {
    if (!profile) return 'U';
    return `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  const getFullName = () => {
    if (!profile) return 'User';
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0] || 'User';
  };

  if (fetching) {
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
          <TouchableOpacity style={styles.retryButton} onPress={() => getLoggedInUser()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
          <Text style={styles.title}>My Profile</Text>
          <NotificationBell route="/admin/notifications" size={20} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{getFullName()}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield" size={14} color={colors.primary} />
            <Text style={styles.roleText}>{profile.role}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
              <Ionicons name="create" size={18} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{getFullName()}</Text>
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
            <Ionicons name="shield" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{profile.role}</Text>
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
            <Ionicons name="calendar" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>
                {new Date(profile.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.changePasswordButton} onPress={() => setPasswordModalVisible(true)}>
          <Ionicons name="key" size={20} color={colors.primary} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loading}>
          <Ionicons name="log-out" size={20} color={colors.error} />
          <Text style={styles.logoutText}>{loading ? 'Logging out...' : 'Logout'}</Text>
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
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                  value={editForm.first_name}
                  onChangeText={(text) => setEditForm({ ...editForm, first_name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                  value={editForm.last_name}
                  onChangeText={(text) => setEditForm({ ...editForm, last_name: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor="#999"
                  value={editForm.email}
                  onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  value={editForm.phone}
                  onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                  keyboardType="phone-pad"
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
                  placeholder="Enter current password"
                  placeholderTextColor="#999"
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password (min 6 chars)"
                  placeholderTextColor="#999"
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  secureTextEntry
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setPasswordModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleChangePassword} disabled={changingPassword}>
                  {changingPassword ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveButtonText}>Update Password</Text>}
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
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: { marginBottom: spacing.md },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.white,
  },
  profileName: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  profileEmail: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoLabel: {
    fontSize: typography.sizes.xs,
    color: '#666',
  },
  infoValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  changePasswordText: {
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    fontSize: typography.sizes.md,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
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
    maxHeight: '80%',
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
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalBody: { maxHeight: '90%' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#f5f5f5' },
  cancelButtonText: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
  },
  saveButton: { backgroundColor: colors.primary },
  saveButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});