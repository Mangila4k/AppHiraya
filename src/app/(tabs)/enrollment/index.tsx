import { supabase } from '@/lib/supabase/client';
import { spacing, typography } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StudentType = 'New Student' | 'Transferee' | 'Old Student';

type EnrollmentForm = {
  studentType: StudentType;
  firstName: string;
  lastName: string;
  middleName: string;
  suffix: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  gradeLevel: string;
  strand: string;
  previousSchool: string;
  previousGrade: string;
  lastSchoolYear: string;
  address: string;
  parentName: string;
  parentContact: string;
  lrn: string;
  age: string;
  civilStatus: string;
  nationality: string;
  religion: string;
  form138: any;
  psaBirth: any;
  goodMoral: any;
};

// ===== Neumorphic palette =====
const NEU = {
  bg: '#E8EDF2',
  bgDark: '#D1D9E6',
  lightShadow: '#FFFFFF',
  darkShadow: '#A3B1C6',
  text: '#2E3A4D',
  textMuted: '#7A8699',
  textFaint: '#A0ACBE',
  accent: '#4C6FFF',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export default function EnrollmentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  const [form, setForm] = useState<EnrollmentForm>({
    studentType: 'New Student',
    firstName: '',
    lastName: '',
    middleName: '',
    suffix: '',
    email: '',
    phone: '',
    birthDate: '',
    gender: 'Male',
    gradeLevel: 'Grade 11',
    strand: 'HUMSS',
    previousSchool: '',
    previousGrade: '',
    lastSchoolYear: '',
    address: '',
    parentName: '',
    parentContact: '',
    lrn: '',
    age: '',
    civilStatus: 'Single',
    nationality: 'Filipino',
    religion: '',
    form138: null,
    psaBirth: null,
    goodMoral: null,
  });

  const studentTypes: StudentType[] = ['New Student', 'Transferee', 'Old Student'];
  const gradeLevels = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const strands = ['HUMSS', 'GAS', 'STEM', 'ABM', 'TVL-Cookery', 'TVL-ICT', 'TVL-HE'];
  const genders = ['Male', 'Female'];
  const civilStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];

  const showStrand = form.gradeLevel === 'Grade 11' || form.gradeLevel === 'Grade 12';
  const isOldStudent = form.studentType === 'Old Student';

  useEffect(() => {
    const checkAuth = async () => {
      const email = await AsyncStorage.getItem('userEmail');
      setLoggedInEmail(email);
      if (email) {
        setForm(prev => ({ ...prev, email: prev.email || email }));
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  const handleStudentTypeChange = (type: StudentType) => {
    if (type === 'Old Student' && !loggedInEmail) {
      Alert.alert(
        'Login Required',
        'Old students must log in to their account before re-enrolling. Go to login now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    setForm({ ...form, studentType: type });
  };

  const pickDocument = async (type: 'form138' | 'psaBirth' | 'goodMoral') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setForm({ ...form, [type]: asset });
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const uploadDocument = async (file: any, studentId: string, type: string) => {
    if (!file) return null;
    try {
      const fileExt = file.name?.split('.').pop() || 'pdf';
      const fileName = `${studentId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `documents/${studentId}/${type}/${fileName}`;

      const response = await fetch(file.uri);
      const blob = await response.blob();

      const { error } = await supabase.storage
        .from('enrollment-documents')
        .upload(filePath, blob, {
          contentType: file.mimeType || 'application/pdf',
          upsert: true,
        });

      if (error) {
        console.error(`Upload error for ${type}:`, error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('enrollment-documents')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      return null;
    }
  };

  const handleSubmit = async () => {
    const {
      firstName, lastName, email, gradeLevel,
      previousSchool, previousGrade, lastSchoolYear,
    } = form;

    if (!firstName || !lastName || !email || !gradeLevel) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if ((form.studentType === 'Transferee' || form.studentType === 'New Student')) {
      if (!previousSchool || !previousGrade || !lastSchoolYear) {
        Alert.alert('Error', 'Please fill in your previous school information');
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!form.form138) {
      Alert.alert('Error', 'Please upload Form 138 / JHS Report Card');
      return;
    }
    if (!form.psaBirth) {
      Alert.alert('Error', 'Please upload PSA Certificate of Live Birth');
      return;
    }
    if (!form.goodMoral) {
      Alert.alert('Error', 'Please upload Certificate of Good Moral Character');
      return;
    }

    setLoading(true);
    try {
      const { data: existingUser } = await supabase
        .from('users').select('id').eq('email', email).maybeSingle();

      if (existingUser && form.studentType !== 'Old Student') {
        Alert.alert('Error', 'This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      const { data: existingStudent } = await supabase
        .from('students').select('id, student_type').eq('email', email).maybeSingle();

      let studentId: string;

      if (existingStudent) {
        studentId = existingStudent.id;

        await supabase
          .from('students')
          .update({
            first_name: firstName,
            last_name: lastName,
            middle_name: form.middleName || null,
            suffix: form.suffix || null,
            contact_number: form.phone || null,
            date_of_birth: form.birthDate || null,
            age: form.age ? parseInt(form.age) : null,
            gender: form.gender || null,
            civil_status: form.civilStatus || null,
            nationality: form.nationality || null,
            religion: form.religion || null,
            address: form.address || null,
            parent_name: form.parentName || null,
            parent_contact: form.parentContact || null,
            lrn: form.lrn || null,
            grade_level: form.gradeLevel,
            strand: showStrand ? form.strand : null,
            student_type: form.studentType,
          })
          .eq('id', studentId);
      } else {
        const { data: newStudent, error: studentError } = await supabase
          .from('students')
          .insert({
            first_name: firstName,
            last_name: lastName,
            middle_name: form.middleName || null,
            suffix: form.suffix || null,
            email: email,
            contact_number: form.phone || null,
            date_of_birth: form.birthDate || null,
            age: form.age ? parseInt(form.age) : null,
            gender: form.gender || null,
            civil_status: form.civilStatus || null,
            nationality: form.nationality || null,
            religion: form.religion || null,
            address: form.address || null,
            parent_name: form.parentName || null,
            parent_contact: form.parentContact || null,
            lrn: form.lrn || null,
            grade_level: form.gradeLevel,
            strand: showStrand ? form.strand : null,
            documents_status: 'pending',
            student_type: form.studentType,
          })
          .select()
          .single();

        if (studentError || !newStudent) {
          throw new Error(studentError?.message || 'Failed to create student record');
        }
        studentId = newStudent.id;
      }

      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          grade_level: gradeLevel,
          strand: showStrand ? form.strand || null : null,
          previous_school: previousSchool,
          previous_grade: previousGrade,
          last_school_year: lastSchoolYear,
          status: 'pending',
          email: email,
          first_name: firstName,
          last_name: lastName,
          student_type: form.studentType,
        })
        .select()
        .single();

      if (enrollmentError) {
        console.error('Enrollment error:', enrollmentError);
        throw enrollmentError;
      }

      setUploading(true);

      const form138Url = await uploadDocument(form.form138, studentId, 'form138');
      const psaBirthUrl = await uploadDocument(form.psaBirth, studentId, 'psa_birth');
      const goodMoralUrl = await uploadDocument(form.goodMoral, studentId, 'good_moral');

      const allUploaded = form138Url && psaBirthUrl && goodMoralUrl;

      const updateData: any = {
        documents_status: allUploaded ? 'complete' : 'pending',
      };
      if (form138Url) updateData.form_138_url = form138Url;
      if (psaBirthUrl) updateData.psa_birth_url = psaBirthUrl;
      if (goodMoralUrl) updateData.good_moral_url = goodMoralUrl;

      await supabase.from('students').update(updateData).eq('id', studentId);

      await supabase.from('notifications').insert({
        title: 'New Enrollment Application',
        message: `${form.studentType}: ${firstName} ${lastName} has submitted an enrollment application. Please review.`,
        type: 'info',
        is_read: false,
      });

      setUploading(false);

      const message =
        form.studentType === 'Old Student'
          ? 'Your re-enrollment request has been submitted. The registrar will review it shortly.'
          : 'Your enrollment application has been submitted. Please wait for approval.';

      Alert.alert('Enrollment Submitted!', message, [
        { text: 'OK', onPress: () => router.push('/(tabs)/home') },
      ]);
    } catch (error: any) {
      console.error('Enrollment error:', error);
      Alert.alert('Enrollment Failed', error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const SectionTitle = ({ title, required }: { title: string; required?: boolean }) => (
    <Text style={styles.sectionTitle}>
      {title} {required && <Text style={styles.required}>*</Text>}
    </Text>
  );

  const DocumentUploadButton = ({
    label, value, onPress,
  }: { label: string; value: any; onPress: () => void }) => (
    <TouchableOpacity style={styles.uploadButton} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.uploadContent}>
        <View style={[styles.uploadIconWrap, value && styles.uploadIconWrapSuccess]}>
          <Ionicons
            name={value ? 'checkmark-circle-outline' : 'cloud-upload-outline'}
            size={20}
            color={value ? NEU.success : NEU.accent}
          />
        </View>
        <Text
          style={[styles.uploadText, value && styles.uploadTextSuccess]}
          numberOfLines={1}
        >
          {value ? value.name || 'File uploaded' : label}
        </Text>
      </View>
      {value && (
        <TouchableOpacity onPress={() => {
          if (label.includes('Form 138')) setForm({ ...form, form138: null });
          else if (label.includes('PSA')) setForm({ ...form, psaBirth: null });
          else if (label.includes('Good Moral')) setForm({ ...form, goodMoral: null });
        }}>
          <Ionicons name="close-circle-outline" size={20} color={NEU.danger} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (checkingAuth) {
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/home')}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={NEU.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Enrollment Form</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <View style={styles.card}>
            {/* ================= STUDENT TYPE ================= */}
            <Text style={styles.cardTitle}>Student Type</Text>
            <Text style={styles.cardSubtitle}>Please select your student category</Text>

            <View style={styles.studentTypeContainer}>
              {studentTypes.map((t) => {
                const isActive = form.studentType === t;
                const icon =
                  t === 'New Student' ? 'person-add-outline'
                  : t === 'Transferee' ? 'swap-horizontal-outline'
                  : 'refresh-outline';

                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.studentTypeOption, isActive && styles.studentTypeOptionActive]}
                    onPress={() => handleStudentTypeChange(t)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={icon as any}
                      size={22}
                      color={isActive ? NEU.accent : NEU.textMuted}
                    />
                    <Text style={[styles.studentTypeText, isActive && styles.studentTypeTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isOldStudent && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={NEU.success} />
                <Text style={styles.infoText}>
                  You're enrolled as an <Text style={{ fontWeight: '700' }}>Old Student</Text>.
                  Your previous records will be reused. Just confirm your details and submit.
                </Text>
              </View>
            )}

            {form.studentType === 'Transferee' && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={18} color={NEU.warning} />
                <Text style={styles.infoText}>
                  Transferee from another school. Please provide your previous school details.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            {/* ================= STUDENT INFO ================= */}
            <Text style={styles.cardTitle}>Student Information</Text>
            <Text style={styles.cardSubtitle}>Please fill in all required fields</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="First Name" required />
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  placeholderTextColor={NEU.textFaint}
                  value={form.firstName}
                  onChangeText={(text) => setForm({ ...form, firstName: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Last Name" required />
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  placeholderTextColor={NEU.textFaint}
                  value={form.lastName}
                  onChangeText={(text) => setForm({ ...form, lastName: text })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Middle Name" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter middle name"
                  placeholderTextColor={NEU.textFaint}
                  value={form.middleName}
                  onChangeText={(text) => setForm({ ...form, middleName: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Suffix" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Jr., III"
                  placeholderTextColor={NEU.textFaint}
                  value={form.suffix}
                  onChangeText={(text) => setForm({ ...form, suffix: text })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="LRN" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter LRN"
                  placeholderTextColor={NEU.textFaint}
                  value={form.lrn}
                  onChangeText={(text) => setForm({ ...form, lrn: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Email" required />
                <TextInput
                  style={[styles.input, isOldStudent && styles.inputDisabled]}
                  placeholder="Enter email address"
                  placeholderTextColor={NEU.textFaint}
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isOldStudent}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Contact Number" />
                <TextInput
                  style={styles.input}
                  placeholder="09123456789"
                  placeholderTextColor={NEU.textFaint}
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Date of Birth" />
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={NEU.textFaint}
                  value={form.birthDate}
                  onChangeText={(text) => setForm({ ...form, birthDate: text })}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Age" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter age"
                  placeholderTextColor={NEU.textFaint}
                  value={form.age}
                  onChangeText={(text) => setForm({ ...form, age: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Gender" />
                <View style={styles.pillRow}>
                  {genders.map((g) => {
                    const active = form.gender === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setForm({ ...form, gender: g })}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Civil Status" />
                <View style={styles.pillWrap}>
                  {civilStatuses.map((c) => {
                    const active = form.civilStatus === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[styles.pillSmall, active && styles.pillActive]}
                        onPress={() => setForm({ ...form, civilStatus: c })}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.pillTextSmall, active && styles.pillTextActive]}>
                          {c}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Nationality" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter nationality"
                  placeholderTextColor={NEU.textFaint}
                  value={form.nationality}
                  onChangeText={(text) => setForm({ ...form, nationality: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <SectionTitle title="Religion" />
              <TextInput
                style={styles.input}
                placeholder="Enter religion"
                placeholderTextColor={NEU.textFaint}
                value={form.religion}
                onChangeText={(text) => setForm({ ...form, religion: text })}
              />
            </View>

            <View style={styles.divider} />

            {/* ================= EDUCATION ================= */}
            <Text style={styles.cardTitle}>Education Information</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Grade Level" required />
                <View style={styles.pillWrap}>
                  {gradeLevels.map((g) => {
                    const active = form.gradeLevel === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        style={[styles.pillSmall, active && styles.pillActive]}
                        onPress={() => setForm({ ...form, gradeLevel: g })}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.pillTextSmall, active && styles.pillTextActive]}>
                          {g.replace('Grade ', '')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {showStrand && (
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <SectionTitle title="Strand" required />
                  <View style={styles.pillWrap}>
                    {strands.map((s) => {
                      const active = form.strand === s;
                      return (
                        <TouchableOpacity
                          key={s}
                          style={[styles.pillSmall, active && styles.pillActive]}
                          onPress={() => setForm({ ...form, strand: s })}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.pillTextSmall, active && styles.pillTextActive]}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle
                  title={form.studentType === 'Old Student' ? 'Current School' : 'Previous School'}
                  required={form.studentType !== 'Old Student'}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter school name"
                  placeholderTextColor={NEU.textFaint}
                  value={form.previousSchool}
                  onChangeText={(text) => setForm({ ...form, previousSchool: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Previous Grade" required={form.studentType !== 'Old Student'} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Grade 10"
                  placeholderTextColor={NEU.textFaint}
                  value={form.previousGrade}
                  onChangeText={(text) => setForm({ ...form, previousGrade: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <SectionTitle title="Last School Year" required={form.studentType !== 'Old Student'} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 2024-2025"
                placeholderTextColor={NEU.textFaint}
                value={form.lastSchoolYear}
                onChangeText={(text) => setForm({ ...form, lastSchoolYear: text })}
              />
            </View>

            <View style={styles.divider} />

            {/* ================= PARENT INFO ================= */}
            <Text style={styles.cardTitle}>Parent/Guardian Information</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Parent Name" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter parent name"
                  placeholderTextColor={NEU.textFaint}
                  value={form.parentName}
                  onChangeText={(text) => setForm({ ...form, parentName: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Parent Contact" />
                <TextInput
                  style={styles.input}
                  placeholder="09123456789"
                  placeholderTextColor={NEU.textFaint}
                  value={form.parentContact}
                  onChangeText={(text) => setForm({ ...form, parentContact: text })}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <SectionTitle title="Address" />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your address"
                placeholderTextColor={NEU.textFaint}
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.divider} />

            {/* ================= DOCUMENTS ================= */}
            <Text style={styles.cardTitle}>Required Documents</Text>
            <Text style={styles.cardSubtitle}>Please upload the following documents</Text>

            <DocumentUploadButton
              label="Form 138 / JHS Report Card *"
              value={form.form138}
              onPress={() => pickDocument('form138')}
            />
            <DocumentUploadButton
              label="PSA Certificate of Live Birth *"
              value={form.psaBirth}
              onPress={() => pickDocument('psaBirth')}
            />
            <DocumentUploadButton
              label="Certificate of Good Moral Character *"
              value={form.goodMoral}
              onPress={() => pickDocument('goodMoral')}
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={NEU.accent} />
              <Text style={styles.infoText}>
                After approval, you'll be notified. Your application will appear in the registrar's
                <Text style={{ fontWeight: '700' }}> Enrollees & Admissions </Text>
                tab for review.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={loading || uploading}
              activeOpacity={0.8}
            >
              {(loading || uploading) ? (
                <ActivityIndicator color={NEU.accent} />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color={NEU.accent} />
                  <Text style={styles.submitButtonText}>
                    {uploading ? 'Uploading Documents...' : 'Submit Enrollment'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkHighlight}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEU.bg },
  keyboardView: { flex: 1 },
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

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.7, shadowRadius: 8, elevation: 4,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  headerTitle: {
    fontSize: typography.sizes.lg, fontWeight: '700', color: NEU.text,
  },
  headerPlaceholder: { width: 44 },

  // Card
  card: {
    backgroundColor: NEU.bg, borderRadius: 24,
    padding: spacing.lg, marginBottom: spacing.lg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 14, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  cardTitle: {
    fontSize: typography.sizes.md, fontWeight: '700',
    color: NEU.text, marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs, color: NEU.textMuted,
    marginBottom: spacing.md,
  },

  row: { flexDirection: 'row', gap: spacing.md },
  halfWidth: { flex: 1 },
  inputGroup: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.sm, fontWeight: '600',
    color: NEU.text, marginBottom: spacing.xs, paddingLeft: 4,
  },
  required: { color: NEU.danger },

  // Inset input
  input: {
    borderRadius: 12, padding: spacing.md,
    fontSize: typography.sizes.sm, color: NEU.text,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
    borderBottomWidth: 1, borderRightWidth: 1,
    borderBottomColor: NEU.lightShadow,
    borderRightColor: NEU.lightShadow,
  },
  inputDisabled: {
    color: NEU.textMuted,
    opacity: 0.8,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },

  // Student type selector
  studentTypeContainer: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md,
  },
  studentTypeOption: {
    flex: 1, paddingVertical: spacing.md, borderRadius: 14,
    alignItems: 'center', gap: 6, backgroundColor: NEU.bg,
    // inset by default
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
  },
  studentTypeOptionActive: {
    // raised when active
    shadowColor: NEU.darkShadow, shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6, shadowRadius: 8, elevation: 4,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
    borderBottomWidth: 1, borderRightWidth: 1,
    borderBottomColor: 'rgba(163,177,198,0.3)',
    borderRightColor: 'rgba(163,177,198,0.3)',
  },
  studentTypeText: {
    fontSize: typography.sizes.xs, color: NEU.textMuted,
    textAlign: 'center', fontWeight: '600',
  },
  studentTypeTextActive: { color: NEU.accent, fontWeight: '800' },

  // Pills (gender, civil status, grade, strand)
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  pill: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: 12,
    alignItems: 'center', backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
  },
  pillSmall: {
    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 10,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
  },
  pillActive: {
    shadowColor: NEU.darkShadow, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 3,
    borderTopColor: NEU.lightShadow,
    borderLeftColor: NEU.lightShadow,
  },
  pillText: { fontSize: typography.sizes.sm, color: NEU.text, fontWeight: '600' },
  pillTextSmall: { fontSize: 11, color: NEU.text, fontWeight: '600' },
  pillTextActive: { color: NEU.accent, fontWeight: '800' },

  // Upload buttons
  uploadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm,
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.5)',
    borderLeftColor: 'rgba(163,177,198,0.5)',
  },
  uploadContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  uploadIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  uploadIconWrapSuccess: {
    borderTopColor: 'rgba(34,197,94,0.4)',
    borderLeftColor: 'rgba(34,197,94,0.4)',
  },
  uploadText: {
    fontSize: typography.sizes.sm, color: NEU.textMuted, flex: 1,
  },
  uploadTextSuccess: { color: NEU.success, fontWeight: '600' },

  divider: { height: 1, backgroundColor: NEU.bgDark, marginVertical: spacing.md },

  infoBox: {
    flexDirection: 'row', borderRadius: 12, padding: spacing.md,
    gap: spacing.sm, marginVertical: spacing.md, alignItems: 'flex-start',
    backgroundColor: NEU.bg,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 2,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: 'rgba(163,177,198,0.4)',
    borderLeftColor: 'rgba(163,177,198,0.4)',
  },
  infoText: {
    flex: 1, fontSize: typography.sizes.xs,
    color: NEU.textMuted, lineHeight: 18,
  },

  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: NEU.bg, paddingVertical: spacing.md, borderRadius: 16,
    gap: spacing.sm, marginTop: spacing.sm,
    shadowColor: NEU.darkShadow, shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 6,
    borderTopWidth: 1, borderLeftWidth: 1,
    borderTopColor: NEU.lightShadow, borderLeftColor: NEU.lightShadow,
  },
  submitButtonText: {
    color: NEU.accent, fontSize: typography.sizes.md,
    fontWeight: '800', letterSpacing: 0.3,
  },
  loginLink: { marginTop: spacing.md, alignItems: 'center' },
  loginLinkText: { fontSize: typography.sizes.sm, color: NEU.textMuted },
  loginLinkHighlight: { color: NEU.accent, fontWeight: '800' },
});