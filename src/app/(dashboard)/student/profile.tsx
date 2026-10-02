import ChatbotFab from '@/components/ChatbotFab';
import NotificationBell from '@/components/NotificationBell';
import { supabase } from '@/lib/supabase/client';
import { logLogout, logMyActivity } from '@/services/activityLog';
import { spacing, typography } from '@/styles';
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

type StudentProfile = {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  suffix: string;
  lrn: string;
  grade_level: string;
  strand: string;
  section: string;
  gender: string;
  date_of_birth: string;
  age: string;
  address: string;
  parent_name: string;
  parent_contact: string;
  parent_id: string | null;
  contact_number: string;
  documents_status: string;
  enrollment_status: string;
  created_at: string;
};

type ParentInfo = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number: string;
};

const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
  danger: '#EF4444',
};

export default function StudentProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [parentInfo, setParentInfo] = useState<ParentInfo | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [createParentModalVisible, setCreateParentModalVisible] = useState(false);
  const [creatingParent, setCreatingParent] = useState(false);

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    address: '',
    contact_number: '',
    parent_name: '',
    parent_contact: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [parentForm, setParentForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    contact_number: '',
    password: '',
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
        .select('*')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        setLoading(false);
        return;
      }

      let studentData: any = null;

      if (userData.student_id) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, last_name, first_name, middle_name, suffix,
            date_of_birth, age, gender, contact_number, email,
            address, parent_name, parent_contact, parent_id,
            grade_level, strand, section_id, documents_status, enrollment_id,
            sections:section_id (name, room)
          `)
          .eq('id', userData.student_id)
          .maybeSingle();
        studentData = data;
      }

      if (!studentData) {
        const { data } = await supabase
          .from('students')
          .select(`
            id, lrn, last_name, first_name, middle_name, suffix,
            date_of_birth, age, gender, contact_number, email,
            address, parent_name, parent_contact, parent_id,
            grade_level, strand, section_id, documents_status, enrollment_id,
            sections:section_id (name, room)
          `)
          .eq('email', email)
          .maybeSingle();
        studentData = data;
      }

      let enrollmentStatus = 'Not Enrolled';
      if (studentData?.documents_status === 'complete') enrollmentStatus = 'Enrolled';
      else if (studentData?.documents_status === 'Pending') enrollmentStatus = 'Pending';
      else if (studentData?.documents_status) enrollmentStatus = studentData.documents_status;

      const sectionRel = studentData?.sections
        ? Array.isArray(studentData.sections)
          ? studentData.sections[0]
          : studentData.sections
        : null;

      const profileData: StudentProfile = {
        id: studentData?.id || userData.id,
        user_id: userData.id,
        email: userData.email || studentData?.email || '',
        first_name: userData.first_name || studentData?.first_name || '',
        last_name: userData.last_name || studentData?.last_name || '',
        middle_name: studentData?.middle_name || '',
        suffix: studentData?.suffix || '',
        lrn: studentData?.lrn || 'N/A',
        grade_level: studentData?.grade_level || 'N/A',
        strand: studentData?.strand || 'N/A',
        section: sectionRel?.name || 'No Section',
        gender: studentData?.gender || 'N/A',
        date_of_birth: studentData?.date_of_birth || 'N/A',
        age: studentData?.age?.toString() || 'N/A',
        address: studentData?.address || 'N/A',
        parent_name: studentData?.parent_name || 'N/A',
        parent_contact: studentData?.parent_contact || 'N/A',
        parent_id: studentData?.parent_id || null,
        contact_number: studentData?.contact_number || 'N/A',
        documents_status: studentData?.documents_status || 'N/A',
        enrollment_status: enrollmentStatus,
        created_at: userData.created_at,
      };

      setProfile(profileData);

      if (studentData?.parent_id) {
        const { data: parentData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .eq('id', studentData.parent_id)
          .maybeSingle();

        if (parentData) {
          setParentInfo({
            id: parentData.id,
            first_name: parentData.first_name || '',
            last_name: parentData.last_name || '',
            email: parentData.email || '',
            contact_number: studentData.parent_contact || 'N/A',
          });
        } else {
          setParentInfo(null);
        }
      } else {
        setParentInfo(null);
      }

      setEditForm({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        address: profileData.address === 'N/A' ? '' : profileData.address,
        contact_number:
          profileData.contact_number === 'N/A' ? '' : profileData.contact_number,
        parent_name: profileData.parent_name === 'N/A' ? '' : profileData.parent_name,
        parent_contact:
          profileData.parent_contact === 'N/A' ? '' : profileData.parent_contact,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
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
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.user_id);

      if (userError) throw userError;

      if (profile?.id && profile.id !== profile.user_id) {
        const { error: studentError } = await supabase
          .from('students')
          .update({
            first_name: editForm.first_name.trim(),
            last_name: editForm.last_name.trim(),
            address: editForm.address.trim() || null,
            contact_number: editForm.contact_number.trim() || null,
            parent_name: editForm.parent_name.trim() || null,
            parent_contact: editForm.parent_contact.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);

        if (studentError) throw studentError;
      }

      await logMyActivity(
        'profile_updated',
        '✏️ Profile Updated',
        'Your personal information was updated.',
        { screen: '/student/profile' }
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

  const handleCreateParent = async () => {
    if (!parentForm.first_name.trim() || !parentForm.last_name.trim()) {
      Alert.alert('Error', 'First and last name are required');
      return;
    }
    if (!parentForm.email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    if (!parentForm.password || parentForm.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (!profile?.id) {
      Alert.alert('Error', 'Student record not found');
      return;
    }

    setCreatingParent(true);
    try {
      const cleanEmail = parentForm.email.trim().toLowerCase();

      const { data: existing } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      let parentUserId: string;

      if (existing) {
        if (existing.role !== 'parent') {
          Alert.alert(
            'Email Already Used',
            `This email is already registered as a ${existing.role}.`
          );
          setCreatingParent(false);
          return;
        }
        parentUserId = existing.id;
      } else {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: cleanEmail,
            password: parentForm.password,
            first_name: parentForm.first_name.trim(),
            last_name: parentForm.last_name.trim(),
            role: 'parent',
          })
          .select('id')
          .single();

        if (createError || !newUser) {
          throw new Error(createError?.message || 'Failed to create parent account');
        }
        parentUserId = newUser.id;
      }

      const { error: linkError } = await supabase
        .from('students')
        .update({
          parent_id: parentUserId,
          parent_name: `${parentForm.first_name.trim()} ${parentForm.last_name.trim()}`,
          parent_contact: parentForm.contact_number.trim() || null,
        })
        .eq('id', profile.id);

      if (linkError) throw linkError;

      await logMyActivity(
        'parent_linked',
        '👨‍👩‍👧 Parent Linked',
        `${parentForm.first_name} ${parentForm.last_name} is now linked to your account.`,
        { screen: '/student/profile' }
      );

      Alert.alert('Success', 'Parent account created and linked!');
      setCreateParentModalVisible(false);
      setParentForm({
        first_name: '',
        last_name: '',
        email: '',
        contact_number: '',
        password: '',
      });
      await loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create parent');
    } finally {
      setCreatingParent(false);
    }
  };

  const handleUnlinkParent = () => {
    Alert.alert('Unlink Parent', 'Remove the link between this student and their parent?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlink',
        style: 'destructive',
        onPress: async () => {
          if (!profile?.id) return;
          const { error } = await supabase
            .from('students')
            .update({ parent_id: null })
            .eq('id', profile.id);

          if (error) {
            Alert.alert('Error', error.message);
            return;
          }

          await logMyActivity(
            'parent_unlinked',
            '🔗 Parent Unlinked',
            'The parent account was unlinked from your profile.',
            { screen: '/student/profile' }
          );

          Alert.alert('Success', 'Parent unlinked.');
          await loadProfile();
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
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

      await logMyActivity(
        'password_changed',
        '🔒 Password Changed',
        'Your account password was changed.',
        { screen: '/student/profile' }
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
          try {
            await logLogout();
            await AsyncStorage.removeItem('userEmail');
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout.');
          }
        },
      },
    ]);
  };

  const getInitials = () => {
    if (!profile) return 'S';
    return (
      `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase() ||
      'S'
    );
  };

  const getFullName = () => {
    if (!profile) return 'Student';
    const middle = profile.middle_name ? ` ${profile.middle_name.charAt(0)}.` : '';
    const suffix = profile.suffix ? ` ${profile.suffix}` : '';
    return (
      `${profile.first_name}${middle} ${profile.last_name}${suffix}`.trim() ||
      profile.email?.split('@')[0] ||
      'Student'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled':
        return '#22C55E';
      case 'Pending':
        return '#F59E0B';
      case 'Rejected':
        return '#EF4444';
      case 'Not Enrolled':
        return NEU.textMuted;
      default:
        return NEU.textMuted;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="small" color={NEU.accent} />
          </View>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color={NEU.text} />
          </TouchableOpacity>
          <Text style={styles.title}>My Profile</Text>
          <View style={styles.headerActions}>
            <NotificationBell route="/student/notifications" size={18} />
            <TouchableOpacity onPress={loadProfile} style={styles.iconBtn}>
              <Ionicons name="refresh" size={18} color={NEU.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.profileName}>{getFullName()}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(profile.enrollment_status) + '20' },
            ]}
          >
            <Text style={[styles.statusText, { color: getStatusColor(profile.enrollment_status) }]}>
              {profile.enrollment_status}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
              <Ionicons name="create" size={14} color={NEU.accent} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="card" size={16} color={NEU.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>LRN</Text>
              <Text style={styles.infoValue}>{profile.lrn}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="school" size={16} color={NEU.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Grade & Section</Text>
              <Text style={styles.infoValue}>
                {profile.grade_level}
                {profile.strand !== 'N/A' ? ` • ${profile.strand}` : ''}
                {' • '}
                {profile.section}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="person" size={16} color={NEU.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{profile.gender}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="calendar" size={16} color={NEU.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>
                {profile.date_of_birth !== 'N/A'
                  ? new Date(profile.date_of_birth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'N/A'}
                {profile.age !== 'N/A' ? ` (${profile.age} years old)` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="call" size={16} color={NEU.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{profile.contact_number}</Text>
            </View>
          </View>

          <View style={[styles.infoItem, styles.infoItemLast]}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="location" size={16} color={NEU.accent} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{profile.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parent Information</Text>
            {parentInfo && (
              <TouchableOpacity style={styles.editButton} onPress={handleUnlinkParent}>
                <Ionicons name="unlink" size={14} color={NEU.danger} />
                <Text style={[styles.editButtonText, { color: NEU.danger }]}>Unlink</Text>
              </TouchableOpacity>
            )}
          </View>

          {parentInfo ? (
            <>
              <View style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="people" size={16} color={NEU.accent} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Parent/Guardian</Text>
                  <Text style={styles.infoValue}>
                    {parentInfo.first_name} {parentInfo.last_name}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="mail" size={16} color={NEU.accent} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Parent Email</Text>
                  <Text style={styles.infoValue}>{parentInfo.email}</Text>
                </View>
              </View>

              <View style={[styles.infoItem, styles.infoItemLast]}>
                <View style={styles.infoIconWrap}>
                  <Ionicons name="call" size={16} color={NEU.accent} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{parentInfo.contact_number}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noParentContainer}>
              <View style={styles.noParentIcon}>
                <Ionicons name="person-add" size={28} color={NEU.accent} />
              </View>
              <Text style={styles.noParentText}>No parent linked yet</Text>
              <Text style={styles.noParentSubtext}>
                Create a parent account so they can monitor your grades, attendance, and schedule.
              </Text>
              <TouchableOpacity
                style={styles.createParentButton}
                onPress={() => setCreateParentModalVisible(true)}
              >
                <Ionicons name="add-circle" size={18} color={NEU.accent} />
                <Text style={styles.createParentButtonText}>Create Parent Account</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={() => setPasswordModalVisible(true)}
        >
          <Ionicons name="key" size={18} color={NEU.accent} />
          <Text style={styles.changePasswordText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={18} color={NEU.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <ChatbotFab />

      {/* Edit Profile Modal */}
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
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={NEU.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.first_name}
                  onChangeText={(text) => setEditForm({ ...editForm, first_name: text })}
                  placeholder="Enter first name"
                  placeholderTextColor={NEU.textFaint}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.last_name}
                  onChangeText={(text) => setEditForm({ ...editForm, last_name: text })}
                  placeholder="Enter last name"
                  placeholderTextColor={NEU.textFaint}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.contact_number}
                  onChangeText={(text) => setEditForm({ ...editForm, contact_number: text })}
                  placeholder="Enter contact number"
                  placeholderTextColor={NEU.textFaint}
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
                  placeholderTextColor={NEU.textFaint}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Parent/Guardian Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.parent_name}
                  onChangeText={(text) => setEditForm({ ...editForm, parent_name: text })}
                  placeholder="Enter parent name"
                  placeholderTextColor={NEU.textFaint}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Parent Contact</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.parent_contact}
                  onChangeText={(text) => setEditForm({ ...editForm, parent_contact: text })}
                  placeholder="Enter contact number"
                  placeholderTextColor={NEU.textFaint}
                  keyboardType="phone-pad"
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
                    <ActivityIndicator size="small" color={NEU.accent} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Create Parent Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={createParentModalVisible}
        onRequestClose={() => setCreateParentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Parent Account</Text>
              <TouchableOpacity
                onPress={() => setCreateParentModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={NEU.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalHelpText}>
                This will create a parent account and link it to your student profile. Your parent
                will be able to log in using the email and password you set below.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.first_name}
                  onChangeText={(text) => setParentForm({ ...parentForm, first_name: text })}
                  placeholder="Enter parent first name"
                  placeholderTextColor={NEU.textFaint}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.last_name}
                  onChangeText={(text) => setParentForm({ ...parentForm, last_name: text })}
                  placeholder="Enter parent last name"
                  placeholderTextColor={NEU.textFaint}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.email}
                  onChangeText={(text) => setParentForm({ ...parentForm, email: text })}
                  placeholder="parent@email.com"
                  placeholderTextColor={NEU.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.contact_number}
                  onChangeText={(text) => setParentForm({ ...parentForm, contact_number: text })}
                  placeholder="Enter contact number"
                  placeholderTextColor={NEU.textFaint}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password * (min 6 characters)</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.password}
                  onChangeText={(text) => setParentForm({ ...parentForm, password: text })}
                  placeholder="Create a password"
                  placeholderTextColor={NEU.textFaint}
                  secureTextEntry
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setCreateParentModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleCreateParent}
                  disabled={creatingParent}
                >
                  {creatingParent ? (
                    <ActivityIndicator size="small" color={NEU.accent} />
                  ) : (
                    <Text style={styles.saveButtonText}>Create & Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={passwordModalVisible}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity
                onPress={() => setPasswordModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={NEU.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) =>
                    setPasswordForm({ ...passwordForm, currentPassword: text })
                  }
                  placeholder="Enter current password"
                  placeholderTextColor={NEU.textFaint}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.newPassword}
                  onChangeText={(text) =>
                    setPasswordForm({ ...passwordForm, newPassword: text })
                  }
                  placeholder="Enter new password"
                  placeholderTextColor={NEU.textFaint}
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: text })
                  }
                  placeholder="Confirm new password"
                  placeholderTextColor={NEU.textFaint}
                  secureTextEntry
                />
              </View>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setPasswordModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color={NEU.accent} />
                  ) : (
                    <Text style={styles.saveButtonText}>Update</Text>
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
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  container: { flex: 1, padding: spacing.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOrb: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.8, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  loadingText: {
    marginTop: spacing.md, fontSize: typography.sizes.md,
    color: NEU.textMuted, fontWeight: '600',
  },
  retryButton: {
    marginTop: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderRadius: 14, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  retryButtonText: { color: NEU.accent, fontSize: typography.sizes.md, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, paddingTop: spacing.md,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  title: { fontSize: typography.sizes.lg, fontWeight: '700', color: NEU.text },

  profileCard: {
    borderRadius: 24, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.md,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: NEU.accent },
  profileName: {
    fontSize: typography.sizes.xl, fontWeight: '800',
    color: NEU.text, marginTop: spacing.md,
  },
  profileEmail: { fontSize: typography.sizes.sm, color: NEU.textMuted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: 12, marginTop: spacing.sm,
  },
  statusText: { fontSize: typography.sizes.xs, fontWeight: '700' },

  infoCard: {
    borderRadius: 20, padding: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 5,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '700', color: NEU.text },
  editButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 10,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  editButtonText: { color: NEU.accent, fontSize: typography.sizes.sm, fontWeight: '700' },

  infoItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(209,217,230,0.6)',
  },
  infoItemLast: { borderBottomWidth: 0 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  infoContent: { flex: 1, marginLeft: spacing.md },
  infoLabel: { fontSize: typography.sizes.xs, color: NEU.textMuted },
  infoValue: {
    fontSize: typography.sizes.sm, color: NEU.text,
    fontWeight: '600', marginTop: 2,
  },

  noParentContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noParentIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg, marginBottom: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 6, elevation: 3,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  noParentText: {
    fontSize: typography.sizes.md, color: NEU.text,
    fontWeight: '700', marginTop: spacing.sm,
  },
  noParentSubtext: {
    fontSize: typography.sizes.xs, color: NEU.textMuted,
    textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md,
  },
  createParentButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: 14, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  createParentButtonText: {
    color: NEU.accent, fontSize: typography.sizes.sm, fontWeight: '700',
  },

  changePasswordButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, padding: spacing.md, gap: spacing.sm,
    marginBottom: spacing.sm, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  changePasswordText: { fontSize: typography.sizes.md, color: NEU.accent, fontWeight: '700' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, padding: spacing.md, gap: spacing.sm,
    marginBottom: spacing.lg, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  logoutText: { fontSize: typography.sizes.md, color: NEU.danger, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(46,58,77,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: NEU.bg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, maxHeight: '88%',
    shadowColor: NEU.darkShadow, shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
    borderTopWidth: 1, borderTopColor: NEU.lightShadow,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: NEU.bgDark,
  },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: '800', color: NEU.text },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  modalHelpText: {
    fontSize: typography.sizes.xs, color: NEU.textMuted,
    marginBottom: spacing.md, lineHeight: 18,
    padding: spacing.sm, borderRadius: 12, backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  modalBody: { maxHeight: '90%' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: {
    fontSize: typography.sizes.sm, fontWeight: '600',
    color: NEU.text, marginBottom: spacing.xs,
  },
  input: {
    borderRadius: 12, padding: spacing.md,
    fontSize: typography.sizes.md, color: NEU.text,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: {
    flexDirection: 'row', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.md,
  },
  modalButton: { flex: 1, padding: spacing.md, borderRadius: 14, alignItems: 'center' },
  cancelButton: {
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  cancelButtonText: { color: NEU.text, fontSize: typography.sizes.md, fontWeight: '600' },
  saveButton: {
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  saveButtonText: { color: NEU.accent, fontSize: typography.sizes.md, fontWeight: '700' },
});