import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
        console.error('User not found:', userError);
        setLoading(false);
        return;
      }

      let studentData: any = null;

      // Try via users.student_id
      if (userData.student_id) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            lrn,
            last_name,
            first_name,
            middle_name,
            suffix,
            date_of_birth,
            age,
            gender,
            contact_number,
            email,
            address,
            parent_name,
            parent_contact,
            parent_id,
            grade_level,
            strand,
            section_id,
            documents_status,
            enrollment_id,
            sections:section_id (
              name,
              room
            )
          `)
          .eq('id', userData.student_id)
          .maybeSingle();

        if (error) console.error('Error fetching student by id:', error);
        studentData = data;
      }

      // Fallback: match by email
      if (!studentData) {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id,
            lrn,
            last_name,
            first_name,
            middle_name,
            suffix,
            date_of_birth,
            age,
            gender,
            contact_number,
            email,
            address,
            parent_name,
            parent_contact,
            parent_id,
            grade_level,
            strand,
            section_id,
            documents_status,
            enrollment_id,
            sections:section_id (
              name,
              room
            )
          `)
          .eq('email', email)
          .maybeSingle();

        if (error) console.error('Error fetching student by email:', error);
        studentData = data;
      }

      // Determine enrollment status from documents_status
      let enrollmentStatus = 'Not Enrolled';
      if (studentData?.documents_status === 'complete') {
        enrollmentStatus = 'Enrolled';
      } else if (studentData?.documents_status === 'Pending') {
        enrollmentStatus = 'Pending';
      } else if (studentData?.documents_status) {
        enrollmentStatus = studentData.documents_status;
      }

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
        section: studentData?.sections?.name || 'No Section',
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

      // 🔥 Fetch parent info if parent_id exists
      // NOTE: public.users only has: id, last_name, first_name, email, password, role, student_id, parent_id, created_at, updated_at
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
            // Contact number comes from students.parent_contact since it doesn't exist on users
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
        contact_number: profileData.contact_number === 'N/A' ? '' : profileData.contact_number,
        parent_name: profileData.parent_name === 'N/A' ? '' : profileData.parent_name,
        parent_contact: profileData.parent_contact === 'N/A' ? '' : profileData.parent_contact,
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
      // Update users table (only columns that exist)
      const { error: userError } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name.trim(),
          last_name: editForm.last_name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.user_id);

      if (userError) throw userError;

      // Update students table
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

      Alert.alert('Success', 'Profile updated successfully!');
      setEditModalVisible(false);
      await loadProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // 🔥 Create / Link parent account
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

      // 1. Check if a user with this email already exists
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
        // 2. Create the new parent in public.users
        // public.users columns: id, last_name, first_name, email, password, role, student_id, parent_id, created_at, updated_at
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

      // 3. Link student → parent
      const { error: linkError } = await supabase
        .from('students')
        .update({
          parent_id: parentUserId,
          parent_name: `${parentForm.first_name.trim()} ${parentForm.last_name.trim()}`,
          parent_contact: parentForm.contact_number.trim() || null,
        })
        .eq('id', profile.id);

      if (linkError) throw linkError;

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
    Alert.alert(
      'Unlink Parent',
      'Remove the link between this student and their parent?',
      [
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
            Alert.alert('Success', 'Parent unlinked.');
            await loadProfile();
          },
        },
      ]
    );
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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
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
            } catch (error) {
              Alert.alert('Error', 'Failed to logout.');
            }
          },
        },
      ]
    );
  };

  const getInitials = () => {
    if (!profile) return 'S';
    return `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase() || 'S';
  };

  const getFullName = () => {
    if (!profile) return 'Student';
    const middle = profile.middle_name ? ` ${profile.middle_name.charAt(0)}.` : '';
    const suffix = profile.suffix ? ` ${profile.suffix}` : '';
    return `${profile.first_name}${middle} ${profile.last_name}${suffix}`.trim()
      || profile.email?.split('@')[0]
      || 'Student';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Enrolled': return '#4CAF50';
      case 'Pending': return '#FF9800';
      case 'Rejected': return '#F44336';
      case 'Not Enrolled': return '#999';
      default: return '#999';
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.profileName}>{getFullName()}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(profile.enrollment_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(profile.enrollment_status) }]}>
              {profile.enrollment_status}
            </Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModalVisible(true)}>
              <Ionicons name="create" size={16} color={colors.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="card" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>LRN</Text>
              <Text style={styles.infoValue}>{profile.lrn}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="school" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Grade & Section</Text>
              <Text style={styles.infoValue}>
                {profile.grade_level}
                {profile.strand !== 'N/A' ? ` • ${profile.strand}` : ''}
                {' • '}{profile.section}
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{profile.gender}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={20} color={colors.primary} />
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
            <Ionicons name="call" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{profile.contact_number}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{profile.address}</Text>
            </View>
          </View>
        </View>

        {/* Parent Information */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parent Information</Text>
            {parentInfo && (
              <TouchableOpacity style={styles.editButton} onPress={handleUnlinkParent}>
                <Ionicons name="unlink" size={16} color={colors.error} />
                <Text style={[styles.editButtonText, { color: colors.error }]}>Unlink</Text>
              </TouchableOpacity>
            )}
          </View>

          {parentInfo ? (
            <>
              <View style={styles.infoItem}>
                <Ionicons name="people" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Parent/Guardian</Text>
                  <Text style={styles.infoValue}>
                    {parentInfo.first_name} {parentInfo.last_name}
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="mail" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Parent Email</Text>
                  <Text style={styles.infoValue}>{parentInfo.email}</Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="call" size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Contact Number</Text>
                  <Text style={styles.infoValue}>{parentInfo.contact_number}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.noParentContainer}>
              <Ionicons name="person-add" size={40} color="#ccc" />
              <Text style={styles.noParentText}>No parent linked yet</Text>
              <Text style={styles.noParentSubtext}>
                Create a parent account so they can monitor your grades, attendance, and schedule.
              </Text>
              <TouchableOpacity
                style={styles.createParentButton}
                onPress={() => setCreateParentModalVisible(true)}
              >
                <Ionicons name="add-circle" size={20} color={colors.white} />
                <Text style={styles.createParentButtonText}>Create Parent Account</Text>
              </TouchableOpacity>
            </View>
          )}
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
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Parent/Guardian Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.parent_name}
                  onChangeText={(text) => setEditForm({ ...editForm, parent_name: text })}
                  placeholder="Enter parent name"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Parent Contact</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.parent_contact}
                  onChangeText={(text) => setEditForm({ ...editForm, parent_contact: text })}
                  placeholder="Enter contact number"
                  placeholderTextColor="#999"
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

      {/* Create Parent Modal */}
      <Modal animationType="slide" transparent visible={createParentModalVisible} onRequestClose={() => setCreateParentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Parent Account</Text>
              <TouchableOpacity onPress={() => setCreateParentModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
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
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name *</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.last_name}
                  onChangeText={(text) => setParentForm({ ...parentForm, last_name: text })}
                  placeholder="Enter parent last name"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={parentForm.email}
                  onChangeText={(text) => setParentForm({ ...parentForm, email: text })}
                  placeholder="parent@email.com"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setCreateParentModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleCreateParent} disabled={creatingParent}>
                  {creatingParent ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveButtonText}>Create & Link</Text>}
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
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
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
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  placeholder="Enter new password"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password *</Text>
                <TextInput
                  style={styles.input}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
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
  retryButton: { marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: 8 },
  retryButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  backButton: { padding: spacing.sm },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text },
  refreshButton: { padding: spacing.sm },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    elevation: 2,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: typography.weights.bold, color: colors.white },
  profileName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.text, marginTop: spacing.md },
  profileEmail: { fontSize: typography.sizes.sm, color: '#666', marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 12, marginTop: spacing.sm },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold, color: colors.text },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '10', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8 },
  editButtonText: { color: colors.primary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  infoItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoContent: { flex: 1, marginLeft: spacing.md },
  infoLabel: { fontSize: typography.sizes.xs, color: '#666' },
  infoValue: { fontSize: typography.sizes.sm, color: colors.text, fontWeight: typography.weights.medium },

  // No parent state
  noParentContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  noParentText: {
    fontSize: typography.sizes.md,
    color: '#666',
    fontWeight: typography.weights.medium,
    marginTop: spacing.sm,
  },
  noParentSubtext: {
    fontSize: typography.sizes.xs,
    color: '#999',
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  createParentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 10,
  },
  createParentButtonText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
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
    elevation: 2,
  },
  changePasswordText: { fontSize: typography.sizes.md, color: colors.primary, fontWeight: typography.weights.medium },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    elevation: 2,
  },
  logoutText: { fontSize: typography.sizes.md, color: colors.error, fontWeight: typography.weights.medium },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.text },
  modalHelpText: {
    fontSize: typography.sizes.xs,
    color: '#666',
    marginBottom: spacing.md,
    lineHeight: 18,
    backgroundColor: colors.primary + '10',
    padding: spacing.sm,
    borderRadius: 8,
  },
  modalBody: { maxHeight: '90%' },
  inputGroup: { marginBottom: spacing.md },
  inputLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.text, marginBottom: spacing.xs },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.md, fontSize: typography.sizes.md, color: colors.text, backgroundColor: '#f9f9f9' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.md },
  modalButton: { flex: 1, padding: spacing.md, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f5f5f5' },
  cancelButtonText: { color: colors.text, fontSize: typography.sizes.md, fontWeight: typography.weights.medium },
  saveButton: { backgroundColor: colors.primary },
  saveButtonText: { color: colors.white, fontSize: typography.sizes.md, fontWeight: typography.weights.semibold },
});