import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/hooks/useAuth';
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

type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
  address: string;
  role: string;
};

type Child = {
  id: string;
  full_name: string;
  grade_level: string;
  strand: string;
  lrn: string;
  section_name: string;
  parent_contact: string;
  parent_name: string;
};

export default function ParentProfile() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    address: '',
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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role, contact_number, address')
        .eq('email', email)
        .maybeSingle();

      if (userError) console.error('Error fetching user:', userError);

      if (!userData) {
        setLoading(false);
        return;
      }

      const { data: kids, error: kidsError } = await supabase
        .from('students')
        .select(`
          id, first_name, last_name, lrn, grade_level, strand,
          parent_contact, parent_name,
          sections:section_id (name)
        `)
        .eq('parent_id', userData.id);

      if (kidsError) console.error('Error fetching children:', kidsError);

      const mappedKids: Child[] = (kids || []).map((k: any) => {
        const sectionRel = Array.isArray(k.sections) ? k.sections[0] : k.sections;
        return {
          id: k.id,
          full_name: `${k.first_name || ''} ${k.last_name || ''}`.trim() || 'Unknown',
          grade_level: k.grade_level || 'N/A',
          strand: k.strand || 'N/A',
          lrn: k.lrn || 'N/A',
          section_name: sectionRel?.name || 'No Section',
          parent_contact: k.parent_contact || '',
          parent_name: k.parent_name || '',
        };
      });

      setChildren(mappedKids);

      const contact =
        userData.contact_number ||
        mappedKids.find((k) => k.parent_contact)?.parent_contact ||
        'N/A';

      const profileData: Profile = {
        id: userData.id,
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || email,
        contact_number: contact,
        address: userData.address || 'N/A',
        role: userData.role || 'parent',
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
    if (!editForm.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }

    setSaving(true);
    try {
      const cleanEmail = editForm.email.trim().toLowerCase();

      const { error: userError } = await supabase
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

      if (userError) throw userError;

      if (children.length > 0) {
        await supabase
          .from('students')
          .update({
            parent_name: `${editForm.first_name.trim()} ${editForm.last_name.trim()}`,
            parent_contact: editForm.contact_number.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .in('id', children.map((c) => c.id));
      }

      if (cleanEmail !== profile?.email) {
        await AsyncStorage.setItem('userEmail', cleanEmail);
      }

      await logMyActivity(
        'profile_updated',
        '✏️ Profile Updated',
        'Your personal information was updated.',
        { screen: '/parent/profile' }
      );

      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      await loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logLogout();
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
    ? `${(profile.first_name || '').charAt(0)}${(profile.last_name || '').charAt(0)}`.toUpperCase() ||
      'P'
    : 'P';

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim() || 'Parent'
    : 'Parent';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <NotificationBell route="/parent/notifications" size={20} />
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{fullName}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="people" size={12} color={colors.primary} />
            <Text style={styles.roleText}>Parent</Text>
          </View>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="person" size={16} color={colors.primary} /> Personal Information
            </Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditModalVisible(true)}
            >
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
            <Ionicons name="school" size={16} color={colors.primary} /> My Children ({children.length})
          </Text>

          {children.length > 0 ? (
            children.map((c) => (
              <View key={c.id} style={styles.childItem}>
                <View style={styles.childAvatar}>
                  <Text style={styles.childInitial}>
                    {c.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{c.full_name}</Text>
                  <Text style={styles.childMeta}>LRN: {c.lrn}</Text>
                  <Text style={styles.childMeta}>
                    Grade {c.grade_level}
                    {c.strand !== 'N/A' ? ` • ${c.strand}` : ''} • {c.section_name}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noData}>No children linked yet.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="settings" size={16} color={colors.primary} /> Actions
          </Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(dashboard)/parent/grades')}
          >
            <Ionicons name="school" size={20} color={colors.primary} />
            <Text style={styles.actionText}>View Children's Grades</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(dashboard)/parent/attendance')}
          >
            <Ionicons name="calendar" size={20} color="#4CAF50" />
            <Text style={styles.actionText}>View Attendance</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(dashboard)/parent/schedule')}
          >
            <Ionicons name="time" size={20} color="#9C27B0" />
            <Text style={styles.actionText}>View Schedule</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={colors.white} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Hiraya App v1.0.0</Text>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
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
                  onChangeText={(text) => setEditForm({ ...editForm, first_name: text })}
                  placeholder="Enter first name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.last_name}
                  onChangeText={(text) => setEditForm({ ...editForm, last_name: text })}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.email}
                  onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.contact_number}
                  onChangeText={(text) => setEditForm({ ...editForm, contact_number: text })}
                  placeholder="Enter contact number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

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
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdateProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },

  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: spacing.sm,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  email: {
    fontSize: typography.sizes.sm,
    color: '#666',
    marginTop: spacing.sm,
  },

  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
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

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: typography.sizes.sm, color: '#666' },
  infoValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },

  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: spacing.md,
  },
  childAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  childInitial: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  childName: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  childMeta: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginTop: 2,
  },
  noData: {
    fontSize: typography.sizes.sm,
    color: '#999',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  logoutText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.sizes.xs,
    color: '#999',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '85%',
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
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