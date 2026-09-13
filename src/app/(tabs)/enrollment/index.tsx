import { supabase } from '@/lib/supabase/client';
import { colors, spacing, typography } from '@/styles';
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

  // Detect logged-in user — required for Old Student
  useEffect(() => {
    const checkAuth = async () => {
      const email = await AsyncStorage.getItem('userEmail');
      setLoggedInEmail(email);
      if (email) {
        // Pre-fill email for old students
        setForm(prev => ({ ...prev, email: prev.email || email }));
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // If they pick "Old Student" and aren't logged in, redirect to login
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

    // Validation
    if (!firstName || !lastName || !email || !gradeLevel) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Transferee / New Student need previous school info
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
      // 1. Check if email already exists in users
      const { data: existingUser } = await supabase
        .from('users').select('id').eq('email', email).maybeSingle();

      if (existingUser && form.studentType !== 'Old Student') {
        Alert.alert('Error', 'This email is already registered. Please login instead.');
        setLoading(false);
        return;
      }

      // 2. Check if student already exists
      const { data: existingStudent } = await supabase
        .from('students').select('id, student_type').eq('email', email).maybeSingle();

      let studentId: string;

      if (existingStudent) {
        // Already a student → update + create new enrollment request
        studentId = existingStudent.id;

        // Update student info
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
        // New student → create record
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

      // 3. Create enrollment record — this is what shows in the Registrar's "Enrollees & Admissions" tab
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

      // 4. Upload documents
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

      // 5. Notify registrar / admin
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
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/home'),
        },
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
    <TouchableOpacity style={styles.uploadButton} onPress={onPress}>
      <View style={styles.uploadContent}>
        <Ionicons
          name={value ? 'checkmark-circle' : 'cloud-upload'}
          size={24}
          color={value ? colors.success : colors.primary}
        />
        <Text style={[styles.uploadText, value && styles.uploadTextSuccess]}>
          {value ? value.name || 'File uploaded' : label}
        </Text>
      </View>
      {value && (
        <TouchableOpacity onPress={() => {
          if (label.includes('Form 138')) setForm({ ...form, form138: null });
          else if (label.includes('PSA')) setForm({ ...form, psaBirth: null });
          else if (label.includes('Good Moral')) setForm({ ...form, goodMoral: null });
        }}>
          <Ionicons name="close-circle" size={20} color={colors.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
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
                  t === 'New Student' ? 'person-add'
                  : t === 'Transferee' ? 'swap-horizontal'
                  : 'refresh';
                const color =
                  t === 'New Student' ? '#2196F3'
                  : t === 'Transferee' ? '#FF9800'
                  : '#4CAF50';

                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.studentTypeOption,
                      isActive && { borderColor: color, backgroundColor: color + '15' },
                    ]}
                    onPress={() => handleStudentTypeChange(t)}
                  >
                    <Ionicons name={icon as any} size={24} color={isActive ? color : '#999'} />
                    <Text style={[styles.studentTypeText, isActive && { color, fontWeight: '700' }]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isOldStudent && (
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#4CAF50" />
                <Text style={styles.infoText}>
                  You're enrolled as an <Text style={{ fontWeight: '700' }}>Old Student</Text>.
                  Your previous records will be reused. Just confirm your details and submit.
                </Text>
              </View>
            )}

            {form.studentType === 'Transferee' && (
              <View style={[styles.infoBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="information-circle" size={20} color="#FF9800" />
                <Text style={[styles.infoText, { color: '#E65100' }]}>
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
                  placeholderTextColor="#999"
                  value={form.firstName}
                  onChangeText={(text) => setForm({ ...form, firstName: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Last Name" required />
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                  value={form.middleName}
                  onChangeText={(text) => setForm({ ...form, middleName: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Suffix" />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Jr., III"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                  value={form.lrn}
                  onChangeText={(text) => setForm({ ...form, lrn: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Email" required />
                <TextInput
                  style={[styles.input, isOldStudent && { backgroundColor: '#f0f0f0' }]}
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                  value={form.age}
                  onChangeText={(text) => setForm({ ...form, age: text })}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Gender" />
                <View style={styles.genderContainer}>
                  {genders.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderOption, form.gender === g && styles.genderOptionActive]}
                      onPress={() => setForm({ ...form, gender: g })}
                    >
                      <Text style={[styles.genderOptionText, form.gender === g && styles.genderOptionTextActive]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Civil Status" />
                <View style={styles.civilContainer}>
                  {civilStatuses.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.civilOption, form.civilStatus === c && styles.civilOptionActive]}
                      onPress={() => setForm({ ...form, civilStatus: c })}
                    >
                      <Text style={[styles.civilOptionText, form.civilStatus === c && styles.civilOptionTextActive]}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Nationality" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter nationality"
                  placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                <View style={styles.gradeContainer}>
                  {gradeLevels.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.gradeOption, form.gradeLevel === g && styles.gradeOptionActive]}
                      onPress={() => setForm({ ...form, gradeLevel: g })}
                    >
                      <Text style={[styles.gradeOptionText, form.gradeLevel === g && styles.gradeOptionTextActive]}>
                        {g.replace('Grade ', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              {showStrand && (
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <SectionTitle title="Strand" required />
                  <View style={styles.strandContainer}>
                    {strands.map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.strandOption, form.strand === s && styles.strandOptionActive]}
                        onPress={() => setForm({ ...form, strand: s })}
                      >
                        <Text style={[styles.strandOptionText, form.strand === s && styles.strandOptionTextActive]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                  placeholderTextColor="#999"
                  value={form.previousSchool}
                  onChangeText={(text) => setForm({ ...form, previousSchool: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Previous Grade" required={form.studentType !== 'Old Student'} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Grade 10"
                  placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
                  value={form.parentName}
                  onChangeText={(text) => setForm({ ...form, parentName: text })}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <SectionTitle title="Parent Contact" />
                <TextInput
                  style={styles.input}
                  placeholder="09123456789"
                  placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
              <Ionicons name="information-circle" size={24} color={colors.primary} />
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
            >
              {(loading || uploading) ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {uploading ? 'Uploading Documents...' : 'Submit Enrollment'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  container: { flex: 1, padding: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  backButton: { padding: spacing.sm },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerPlaceholder: { width: 40 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  halfWidth: { flex: 1 },
  inputGroup: { marginBottom: spacing.md },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
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

  // Student type selector
  studentTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  studentTypeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.gray,
    alignItems: 'center',
    gap: 4,
  },
  studentTypeText: {
    fontSize: typography.sizes.xs,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },

  genderContainer: { flexDirection: 'row', gap: spacing.sm },
  genderOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
    alignItems: 'center',
  },
  genderOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderOptionText: { fontSize: typography.sizes.sm, color: colors.text },
  genderOptionTextActive: { color: colors.white },

  civilContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  civilOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
  },
  civilOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  civilOptionText: { fontSize: typography.sizes.xs, color: colors.text },
  civilOptionTextActive: { color: colors.white },

  gradeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  gradeOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
  },
  gradeOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  gradeOptionText: { fontSize: typography.sizes.xs, color: colors.text },
  gradeOptionTextActive: { color: colors.white },

  strandContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  strandOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray,
  },
  strandOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  strandOptionText: { fontSize: typography.sizes.xs, color: colors.text },
  strandOptionTextActive: { color: colors.white },

  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.gray,
  },
  uploadContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  uploadText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  uploadTextSuccess: { color: colors.success },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '10',
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: 10,
    gap: spacing.sm,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  loginLink: { marginTop: spacing.md, alignItems: 'center' },
  loginLinkText: { fontSize: typography.sizes.sm, color: colors.textSecondary },
  loginLinkHighlight: { color: colors.primary, fontWeight: typography.weights.semibold },
});